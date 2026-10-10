//! Canonical knowledge entries and authenticated bounded views of pinned snapshots.
//! Storage, indexing and search are external. Membership and hashes confer no proof authority.
use crate::{
    laws::{self, Catalogue, Law},
    LangResult,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};
pub const SNAPSHOT_SEMANTICS: &str = "ink-knowledge-snapshot-v1";
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Kind {
    Definition,
    Theorem,
    Rewrite,
    Implementation,
    Representation,
    Maintenance,
    Bridge,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Interface {
    pub parameters: BTreeMap<String, Value>,
    pub result: Value,
    pub operations: Vec<String>,
    pub effects: Vec<String>,
    pub conditions: Vec<Value>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Entry {
    pub schema: u32,
    pub kind: Kind,
    pub semantics: String,
    pub dependencies: Vec<String>,
    pub interface: Interface,
    pub payload: Value,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Snapshot {
    pub schema: u32,
    pub semantics: String,
    pub root: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Sibling {
    pub sibling: String,
    pub left: bool,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Membership {
    pub entries: Vec<String>,
    pub path: Vec<Sibling>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Bundle {
    pub schema: u32,
    pub snapshot: Snapshot,
    pub roots: Vec<String>,
    pub objects: BTreeMap<String, Entry>,
    pub membership: BTreeMap<String, Membership>,
}
fn identifier(id: &str) -> LangResult<()> {
    crate::knowledge::identity(id)
}
pub fn canonical<T: Serialize>(value: &T) -> LangResult<Vec<u8>> {
    let v = serde_json::to_value(value).map_err(|e| e.to_string())?;
    fn check(v: &Value, d: usize) -> LangResult<()> {
        if d > 128 {
            return Err("canonical value depth limit".into());
        }
        match v {
            Value::Number(n) if !n.is_u64() && !n.is_i64() => {
                return Err("canonical knowledge forbids floating JSON numbers".into())
            }
            Value::Array(xs) => {
                for x in xs {
                    check(x, d + 1)?
                }
            }
            Value::Object(xs) => {
                for x in xs.values() {
                    check(x, d + 1)?
                }
            }
            _ => {}
        }
        Ok(())
    }
    check(&v, 0)?;
    serde_json::to_vec(&v).map_err(|e| e.to_string())
}
pub fn identity<T: Serialize>(v: &T) -> LangResult<String> {
    use sha2::{Digest, Sha256};
    Ok(format!("{:x}", Sha256::digest(canonical(v)?)))
}
fn sorted(xs: &[String]) -> bool {
    xs.windows(2).all(|w| w[0] < w[1])
}
fn operations(v: &Value, out: &mut BTreeSet<String>) {
    match v {
        Value::Object(m) => {
            if let Some(op) = m
                .get("node")
                .and_then(|n| n.get("Op"))
                .and_then(|a| a.get(0))
                .and_then(Value::as_str)
            {
                out.insert(op.into());
            }
            for (key, prefix, index) in [
                ("Binary", "binary:", 0),
                ("Call", "call:", 0),
                ("Method", "method:", 1),
            ] {
                if let Some(v) = m.get(key) {
                    let name = if v.is_array() {
                        v.get(index).and_then(Value::as_str)
                    } else if key == "Binary" {
                        v.get("op").and_then(Value::as_str)
                    } else if key == "Call" {
                        v.get("function").and_then(Value::as_str)
                    } else {
                        None
                    };
                    if let Some(n) = name {
                        out.insert(format!("{prefix}{n}"));
                    }
                }
            }
            for x in m.values() {
                operations(x, out)
            }
        }
        Value::Array(xs) => {
            for x in xs {
                operations(x, out)
            }
        }
        _ => {}
    }
}
impl Entry {
    /// Transport for a mathematical declaration, with an exact searchable
    /// interface. This constructs bytes; it does not admit the declaration.
    pub fn from_declaration(
        declaration: &crate::logic::Declaration,
        dependencies: Vec<String>,
    ) -> LangResult<Self> {
        let value = serde_json::to_value(declaration).map_err(|e| e.to_string())?;
        let body = value
            .as_object()
            .and_then(|m| m.values().next())
            .ok_or("declaration object")?;
        let payload = json!({"declaration": declaration});
        let mut ops = BTreeSet::new();
        operations(&payload, &mut ops);
        let pairs: Vec<(String, Value)> =
            serde_json::from_value(body.get("params").cloned().unwrap_or(json!([])))
                .map_err(|e| e.to_string())?;
        let mut dependencies = dependencies;
        dependencies.sort();
        dependencies.dedup();
        Ok(Self {
            schema: 1,
            kind: if matches!(declaration, crate::logic::Declaration::Theorem { .. }) {
                Kind::Theorem
            } else {
                Kind::Definition
            },
            semantics: crate::library::SEMANTICS.into(),
            dependencies,
            interface: Interface {
                parameters: pairs.into_iter().collect(),
                result: body.get("result").cloned().unwrap_or(Value::Null),
                operations: ops.into_iter().collect(),
                effects: vec![],
                conditions: serde_json::from_value(
                    body.get("conditions").cloned().unwrap_or(json!([])),
                )
                .map_err(|e| e.to_string())?,
            },
            payload,
        })
    }
    pub fn from_law(law: &Law) -> LangResult<Self> {
        let mut payload = serde_json::to_value(law).map_err(|e| e.to_string())?;
        let m = payload.as_object_mut().ok_or("law object")?;
        m.remove("schema");
        m.remove("semantics");
        m.remove("dependencies");
        let mut ops = BTreeSet::new();
        operations(&payload, &mut ops);
        let mut dependencies = law.dependencies.clone();
        dependencies.sort();
        dependencies.dedup();
        Ok(Self {
            schema: 1,
            kind: Kind::Rewrite,
            semantics: law.semantics.clone(),
            dependencies,
            interface: Interface {
                parameters: law
                    .params
                    .iter()
                    .map(|(n, s)| {
                        Ok((
                            n.clone(),
                            serde_json::to_value(s).map_err(|e| e.to_string())?,
                        ))
                    })
                    .collect::<LangResult<_>>()?,
                result: serde_json::to_value(&law.from.sort).map_err(|e| e.to_string())?,
                operations: ops.into_iter().collect(),
                effects: vec![],
                conditions: law
                    .conditions
                    .iter()
                    .map(|c| serde_json::to_value(c).map_err(|e| e.to_string()))
                    .collect::<Result<_, _>>()
                    .map_err(|e| e.to_string())?,
            },
            payload,
        })
    }
    pub fn law(&self) -> LangResult<Law> {
        if self.kind != Kind::Rewrite || self.semantics != laws::SEMANTICS {
            return Err("entry is not an executable rewrite".into());
        }
        let mut payload = self.payload.clone();
        let m = payload
            .as_object_mut()
            .ok_or("rewrite payload must be an object")?;
        for key in ["schema", "semantics", "dependencies"] {
            if m.contains_key(key) {
                return Err("payload duplicates entry header".into());
            }
        }
        m.insert("schema".into(), json!(1));
        m.insert("semantics".into(), json!(self.semantics));
        m.insert("dependencies".into(), json!(self.dependencies));
        let law: Law = serde_json::from_value(payload).map_err(|e| e.to_string())?;
        if canonical(&Self::from_law(&law)?)? != canonical(self)? {
            return Err("rewrite interface differs from typed payload".into());
        }
        Ok(law)
    }
}
fn check_interface(e: &Entry, body: &Value) -> LangResult<()> {
    let params = body.get("params").cloned().unwrap_or(json!([]));
    let pairs: Vec<(String, Value)> = serde_json::from_value(params).map_err(|x| x.to_string())?;
    let parameters: BTreeMap<_, _> = pairs.into_iter().collect();
    let result = body.get("result").cloned().unwrap_or(Value::Null);
    let conditions = body.get("conditions").cloned().unwrap_or(json!([]));
    let mut ops = BTreeSet::new();
    operations(&e.payload, &mut ops);
    if canonical(&parameters)? != canonical(&e.interface.parameters)?
        || result != e.interface.result
        || conditions != json!(e.interface.conditions)
        || ops.into_iter().collect::<Vec<_>>() != e.interface.operations
        || !e.interface.effects.is_empty()
    {
        return Err("mathematical entry interface mismatch".into());
    }
    Ok(())
}
#[derive(Debug)]
pub struct CheckedBundle {
    bundle: Bundle,
    order: Vec<String>,
    snapshot_id: String,
}
fn admit_first_order(context: &mut crate::logic::Context, id: &str, e: &Entry) -> LangResult<()> {
    if !matches!(e.kind, Kind::Definition | Kind::Theorem) {
        return Err("first-order entry kind".into());
    }
    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Payload {
        declaration: crate::logic::Declaration,
    }
    let d: Payload = serde_json::from_value(e.payload.clone()).map_err(|x| x.to_string())?;
    let value = serde_json::to_value(&d.declaration).map_err(|x| x.to_string())?;
    let body = value
        .as_object()
        .and_then(|m| m.values().next())
        .ok_or("declaration object")?;
    let theorem = matches!(d.declaration, crate::logic::Declaration::Theorem { .. });
    if (e.kind == Kind::Theorem) != theorem {
        return Err("declaration kind mismatch".into());
    }
    check_interface(e, body)?;
    let mut local = context.subset(&e.dependencies)?;
    local.declare(id.to_owned(), &d.declaration)?;
    context.import(&local, id)?;
    Ok(())
}

impl CheckedBundle {
    pub fn check(b: &Bundle) -> LangResult<Self> {
        if b.schema != 1
            || b.snapshot.schema != 1
            || b.snapshot.semantics != SNAPSHOT_SEMANTICS
            || b.objects.len() > 1024
            || b.roots.len() > 1024
            || canonical(b)?.len() > 16_000_000
        {
            return Err("knowledge view schema/size limit".into());
        }
        identifier(&b.snapshot.root)?;
        if !sorted(&b.roots) || b.membership.keys().ne(b.objects.keys()) {
            return Err("knowledge roots or membership set mismatch".into());
        }
        for (id, obj) in &b.objects {
            identifier(id)?;
            if obj.schema != 1
                || obj.semantics.is_empty()
                || !obj.payload.is_object()
                || obj.dependencies.len() > 128
                || !sorted(&obj.dependencies)
                || !sorted(&obj.interface.operations)
                || !sorted(&obj.interface.effects)
                || identity(obj)? != *id
            {
                return Err("knowledge entry schema/content mismatch".into());
            }
            for d in &obj.dependencies {
                identifier(d)?
            }
            let witness = &b.membership[id];
            if witness.entries.len() > 64
                || !sorted(&witness.entries)
                || !witness.entries.contains(id)
                || witness.path.len() > 64
            {
                return Err("invalid snapshot membership proof".into());
            }
            for i in &witness.entries {
                identifier(i)?
            }
            let mut hash = identity(&json!({"schema":1,"entries":witness.entries}))?;
            for step in &witness.path {
                identifier(&step.sibling)?;
                hash = if step.left {
                    identity(&json!({"schema":1,"left":step.sibling,"right":hash}))?
                } else {
                    identity(&json!({"schema":1,"left":hash,"right":step.sibling}))?
                };
            }
            if hash != b.snapshot.root {
                return Err("entry is not in pinned snapshot".into());
            }
        }
        fn visit(
            id: &str,
            b: &Bundle,
            active: &mut BTreeSet<String>,
            done: &mut BTreeSet<String>,
            out: &mut Vec<String>,
            depth: usize,
        ) -> LangResult<()> {
            if depth > 64 {
                return Err("knowledge dependency depth limit".into());
            }
            if done.contains(id) {
                return Ok(());
            }
            if !active.insert(id.into()) {
                return Err("cyclic knowledge dependencies".into());
            }
            let e = b.objects.get(id).ok_or("missing knowledge dependency")?;
            for d in &e.dependencies {
                visit(d, b, active, done, out, depth + 1)?
            }
            active.remove(id);
            done.insert(id.into());
            out.push(id.into());
            Ok(())
        }
        let mut order = vec![];
        let mut active = BTreeSet::new();
        let mut done = BTreeSet::new();
        for id in &b.roots {
            visit(id, b, &mut active, &mut done, &mut order, 0)?
        }
        if done.len() != b.objects.len() {
            return Err("unreferenced knowledge objects".into());
        }
        Ok(Self {
            bundle: b.clone(),
            order,
            snapshot_id: identity(&b.snapshot)?,
        })
    }
    pub fn snapshot_id(&self) -> &str {
        &self.snapshot_id
    }
    pub fn bundle(&self) -> &Bundle {
        &self.bundle
    }
    pub fn catalogue(&self) -> LangResult<Catalogue> {
        Ok(Catalogue {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            roots: self.bundle.roots.clone(),
            objects: self
                .bundle
                .objects
                .iter()
                .map(|(i, e)| Ok((i.clone(), e.law()?)))
                .collect::<LangResult<_>>()?,
        })
    }
    /// A checked bounded first-order scope for semantic correspondence.
    /// Snapshot membership alone does not create this context. Mixed domains
    /// must be projected externally into a compatible dependency closure.
    pub fn first_order_context(&self) -> LangResult<crate::logic::Context> {
        let mut context = crate::logic::Context::default();
        for id in &self.order {
            let entry = &self.bundle.objects[id];
            if entry.semantics != crate::library::SEMANTICS {
                return Err("first-order scope contains an incompatible domain".into());
            }
            admit_first_order(&mut context, id, entry)
                .map_err(|e| format!("first-order entry {id}: {e}"))?;
        }
        Ok(context)
    }

    /// Common evidence admission for mathematical entries. Program rewrites still require application proofs.
    pub fn verify(&self, p: &crate::core::Program) -> LangResult<Vec<String>> {
        let mut first = crate::logic::Context::default();
        let mut scalar = crate::equality::Context::default();
        let mut semantic_objects = BTreeMap::new();
        let mut semantic_roots = vec![];
        for id in &self.order {
            let e = &self.bundle.objects[id];
            match e.semantics.as_str() {
                laws::SEMANTICS => {
                    semantic_objects.insert(id.clone(), e.law()?);
                    semantic_roots.push(id.clone());
                }
                crate::library::SEMANTICS => {
                    admit_first_order(&mut first, id, e)?;
                }
                crate::knowledge::SEMANTICS => {
                    check_interface(e, &e.payload)?;
                    let mut local = scalar.subset(&e.dependencies)?;
                    if e.kind == Kind::Definition {
                        #[derive(Deserialize)]
                        #[serde(deny_unknown_fields)]
                        struct D {
                            params: Vec<(String, crate::core::Type)>,
                            result: crate::core::Type,
                            body: crate::core::Expr,
                        }
                        let d: D =
                            serde_json::from_value(e.payload.clone()).map_err(|x| x.to_string())?;
                        local.define(id.clone(), &d.params, &d.result, &d.body)?;
                    } else if e.kind == Kind::Theorem {
                        #[derive(Deserialize)]
                        #[serde(deny_unknown_fields)]
                        struct T {
                            params: Vec<(String, crate::core::Type)>,
                            conditions: Vec<crate::equality::Equation>,
                            from: crate::core::Expr,
                            to: crate::core::Expr,
                            proof: crate::equality::Proof,
                        }
                        let t: T =
                            serde_json::from_value(e.payload.clone()).map_err(|x| x.to_string())?;
                        local.prove_under(
                            id.clone(),
                            &t.params,
                            &t.conditions,
                            &t.from,
                            &t.to,
                            &t.proof,
                        )?;
                    } else {
                        return Err("scalar entry kind".into());
                    }
                    scalar.import(&local, id)?;
                }
                _ => {
                    return Err(
                        "entry requires an implemented program-specific admission domain".into(),
                    )
                }
            }
        }
        if !semantic_roots.is_empty() {
            crate::laws::CheckedCatalogue::check(
                &Catalogue {
                    schema: 1,
                    semantics: laws::SEMANTICS.into(),
                    roots: semantic_roots,
                    objects: semantic_objects,
                },
                p,
            )?;
        }
        Ok(self.order.clone())
    }
}
/// Construct a pinned in-memory view for proof producers and focused tests.
pub fn from_catalogue(c: &Catalogue) -> LangResult<Bundle> {
    let objects = c
        .objects
        .iter()
        .map(|(id, l)| Ok((id.clone(), Entry::from_law(l)?)))
        .collect::<LangResult<BTreeMap<_, _>>>()?;
    let ids = objects.keys().cloned().collect::<Vec<_>>();
    if ids.len() > 64 {
        return Err(
            "in-memory producer leaf limit; use the knowledge store for larger snapshots".into(),
        );
    }
    let snapshot = Snapshot {
        schema: 1,
        semantics: SNAPSHOT_SEMANTICS.into(),
        root: identity(&json!({"schema":1,"entries":ids}))?,
    };
    let membership = ids
        .iter()
        .map(|i| {
            (
                i.clone(),
                Membership {
                    entries: ids.clone(),
                    path: vec![],
                },
            )
        })
        .collect();
    let mut roots = c.roots.clone();
    roots.sort();
    roots.dedup();
    Ok(Bundle {
        schema: 1,
        snapshot,
        roots,
        objects,
        membership,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn program() -> crate::core::Program {
        crate::syntax::parse("module test;fn id(x:u64)->u64{return x;}").unwrap()
    }
    fn view(e: Entry) -> Bundle {
        let id = identity(&e).unwrap();
        let entries = vec![id.clone()];
        Bundle {
            schema: 1,
            snapshot: Snapshot {
                schema: 1,
                semantics: SNAPSHOT_SEMANTICS.into(),
                root: identity(&json!({"schema":1,"entries":entries})).unwrap(),
            },
            roots: entries.clone(),
            objects: BTreeMap::from([(id.clone(), e)]),
            membership: BTreeMap::from([(
                id,
                Membership {
                    entries,
                    path: vec![],
                },
            )]),
        }
    }
    fn theorem() -> Entry {
        Entry {
            schema: 1,
            kind: Kind::Theorem,
            semantics: crate::library::SEMANTICS.into(),
            dependencies: vec![],
            interface: Interface {
                parameters: BTreeMap::from([("x".into(), json!("U64"))]),
                result: Value::Null,
                operations: vec![],
                effects: vec![],
                conditions: vec![],
            },
            payload: json!({"declaration":{"Theorem":{"params":[["x","U64"]],"conditions":[],"from":{"Var":"x"},"to":{"Var":"x"},"proof":{"Refl":{"Var":"x"}}}}}),
        }
    }
    #[test]
    fn canonical_identity_matches_shared_json_contract() {
        assert_eq!(
            canonical(&json!({"b":2,"a":true})).unwrap(),
            br#"{"a":true,"b":2}"#
        );
        assert!(canonical(&json!(1.5)).is_err());
    }
    #[test]
    fn immutable_membership_and_snapshot_pins_are_checked() {
        let mut b = view(theorem());
        CheckedBundle::check(&b)
            .unwrap()
            .verify(&program())
            .unwrap();
        b.snapshot.root = "0".repeat(64);
        assert!(CheckedBundle::check(&b).is_err());
        let mut b = view(theorem());
        let id = b.roots[0].clone();
        b.objects.get_mut(&id).unwrap().semantics = "forged".into();
        assert!(CheckedBundle::check(&b).is_err());
    }
    #[test]
    fn rehashing_false_proofs_or_false_interfaces_does_not_grant_authority() {
        let mut e = theorem();
        e.payload["declaration"]["Theorem"]["to"] = json!({"U64":1});
        assert!(CheckedBundle::check(&view(e))
            .unwrap()
            .verify(&program())
            .is_err());
        let mut e = theorem();
        e.interface.parameters.insert("x".into(), json!("Bool"));
        assert!(CheckedBundle::check(&view(e))
            .unwrap()
            .verify(&program())
            .is_err());
        let mut e = theorem();
        e.kind = Kind::Definition;
        assert!(CheckedBundle::check(&view(e))
            .unwrap()
            .verify(&program())
            .is_err());
    }
    #[test]
    fn mathematical_domains_share_entry_and_evidence_admission() {
        let b = view(theorem());
        assert_eq!(
            CheckedBundle::check(&b)
                .unwrap()
                .verify(&program())
                .unwrap(),
            b.roots
        );
        let e = Entry {
            schema: 1,
            kind: Kind::Theorem,
            semantics: crate::knowledge::SEMANTICS.into(),
            dependencies: vec![],
            interface: Interface {
                parameters: BTreeMap::from([("x".into(), json!("U64"))]),
                result: Value::Null,
                operations: vec![],
                effects: vec![],
                conditions: vec![],
            },
            payload: json!({"params":[["x","U64"]],"conditions":[],"from":{"Var":"x"},"to":{"Var":"x"},"proof":{"Refl":{"Var":"x"}}}),
        };
        CheckedBundle::check(&view(e))
            .unwrap()
            .verify(&program())
            .unwrap();
    }
    #[test]
    fn exact_closure_and_unknown_domains_are_rejected() {
        let mut b = view(theorem());
        b.roots.clear();
        assert!(CheckedBundle::check(&b).is_err());
        let mut e = theorem();
        e.dependencies.push("0".repeat(64));
        assert!(CheckedBundle::check(&view(e)).is_err());
        let mut e = theorem();
        e.semantics = "invented-proof-authority".into();
        assert!(CheckedBundle::check(&view(e))
            .unwrap()
            .verify(&program())
            .is_err());
    }
}
