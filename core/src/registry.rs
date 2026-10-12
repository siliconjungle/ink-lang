//! Canonical knowledge entries and authenticated bounded views of pinned snapshots.
//! Storage, indexing and search are external. Membership and hashes confer no proof authority.
use crate::{
    laws::{self, Catalogue, Law},
    LangResult,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
// Six independent ordered table domains with all nine checked edit pairs use
// 4,730 entries and 107 MB before authentication paths. Keep a finite package
// allowance; individual entries and every kernel computation budget stay fixed.
pub const MAX_VIEW_ENTRIES: usize = 8192;
pub const MAX_VIEW_BYTES: usize = 128_000_000;
pub const MAX_ENTRY_BYTES: usize = 16_000_000;
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
    pub conditions: Vec<Value>,
    pub effects: Vec<String>,
    pub operations: Vec<String>,
    pub parameters: BTreeMap<String, Value>,
    pub result: Value,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Entry {
    pub dependencies: Vec<String>,
    pub interface: Interface,
    pub kind: Kind,
    pub payload: Value,
    pub schema: u32,
    pub semantics: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Snapshot {
    pub root: String,
    pub schema: u32,
    pub semantics: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Sibling {
    pub left: bool,
    pub sibling: String,
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
    pub membership: BTreeMap<String, Membership>,
    pub objects: BTreeMap<String, Entry>,
    pub roots: Vec<String>,
    pub schema: u32,
    pub snapshot: Snapshot,
}
fn identifier(id: &str) -> LangResult<()> {
    crate::content::identity(id)
}
fn check_value(v: &Value, d: usize) -> LangResult<()> {
    if d > 128 {
        return Err("canonical value depth limit".into());
    }
    match v {
        Value::Number(n) if !n.is_u64() && !n.is_i64() => {
            return Err("canonical knowledge forbids floating JSON numbers".into())
        }
        Value::Array(xs) => {
            for x in xs {
                check_value(x, d + 1)?
            }
        }
        Value::Object(xs) => {
            for x in xs.values() {
                check_value(x, d + 1)?
            }
        }
        _ => {}
    }
    Ok(())
}

pub fn canonical<T: Serialize>(value: &T) -> LangResult<Vec<u8>> {
    let v = serde_json::to_value(value).map_err(|e| e.to_string())?;
    check_value(&v, 0)?;
    serde_json::to_vec(&v).map_err(|e| e.to_string())
}
/// Registry wire structs serialize fields in canonical key order. Their maps
/// use sorted keys. Borrow existing JSON instead of constructing a second tree.
/// Keep the same integer and depth checks as generic canonical serialization.
pub fn canonical_bundle(bundle: &Bundle) -> LangResult<Vec<u8>> {
    for entry in bundle.objects.values() {
        check_value(&entry.payload, 3)?;
        check_value(&entry.interface.result, 4)?;
        for value in entry.interface.parameters.values() {
            check_value(value, 5)?;
        }
        for value in &entry.interface.conditions {
            check_value(value, 5)?;
        }
    }
    serde_json::to_vec(bundle).map_err(|e| e.to_string())
}
pub fn bundle_identity(bundle: &Bundle) -> LangResult<String> {
    use sha2::{Digest, Sha256};
    Ok(format!("{:x}", Sha256::digest(canonical_bundle(bundle)?)))
}
pub fn identity<T: Serialize>(v: &T) -> LangResult<String> {
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
        if self.kind != Kind::Rewrite
            || (self.semantics != laws::SEMANTICS && self.semantics != laws::GENERAL_SEMANTICS)
        {
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
    let d = Payload::deserialize(&e.payload).map_err(|x| x.to_string())?;
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
    local
        .declare(id.to_owned(), &d.declaration)
        .map_err(|error| format!("first-order entry {id}: {error}"))?;
    context.import(&local, id)?;
    Ok(())
}

/// Bounded proof views may contain definitions for several physical roots.
impl CheckedBundle {
    pub fn check(b: &Bundle) -> LangResult<Self> {
        let order = Self::authenticate(b)?;
        Ok(Self { bundle: b.clone(), order, snapshot_id: identity(&b.snapshot)? })
    }
    /// Authenticate borrowed bytes through the same complete bounded checks.
    /// The returned topology grants no mathematical authority.
    pub(crate) fn authenticate(b: &Bundle) -> LangResult<Vec<String>> {
        if b.schema != 1
            || b.snapshot.schema != 1
            || b.snapshot.semantics != SNAPSHOT_SEMANTICS
            || b.objects.len() > MAX_VIEW_ENTRIES
            || b.roots.len() > MAX_VIEW_ENTRIES
            || canonical_bundle(b)?.len() > MAX_VIEW_BYTES
        {
            return Err("knowledge view schema/size limit".into());
        }
        identifier(&b.snapshot.root)?;
        if !sorted(&b.roots) || b.membership.keys().ne(b.objects.keys()) {
            return Err("knowledge roots or membership set mismatch".into());
        }
        for (id, obj) in &b.objects {
            identifier(id)?;
            let bytes = canonical(obj)?;
            if obj.schema != 1
                || obj.semantics.is_empty()
                || !obj.payload.is_object()
                || obj.dependencies.len()
                    > if obj.semantics == "ink-implementation-candidate-v1" {
                        MAX_VIEW_ENTRIES
                    } else if obj.semantics == "ink-source-representation-v1" {
                        512
                    } else {
                        128
                    }
                || !sorted(&obj.dependencies)
                || !sorted(&obj.interface.operations)
                || !sorted(&obj.interface.effects)
                || bytes.len() > if obj.semantics=="ink-implementation-candidate-v1" {MAX_VIEW_BYTES}else{MAX_ENTRY_BYTES}
                || format!("{:x}", Sha256::digest(&bytes)) != *id
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
        Ok(order)
    }
    pub(crate) fn checked_first_order_context(b: &Bundle) -> LangResult<crate::logic::Context> {
        let order = Self::authenticate(b)?;
        let mut context = crate::logic::Context::default();
        for id in order {
            let entry = &b.objects[&id];
            if entry.semantics != crate::library::SEMANTICS {
                return Err("first-order scope contains an incompatible domain".into());
            }
            admit_first_order(&mut context, &id, entry)?;
        }
        Ok(context)
    }
    /// Combine two sealed, complete views without reauthenticating old bytes.
    /// No unchecked bundle can enter here; each endpoint has already verified
    /// content identities, membership, dependency closure and topology.
    pub(crate) fn merge(&self, other: Self) -> LangResult<Self> {
        if self.snapshot_id != other.snapshot_id {
            return Err("checker session snapshot mismatch".into());
        }
        let mut bundle = self.bundle.clone();
        bundle.objects.extend(other.bundle.objects);
        bundle.membership.extend(other.bundle.membership);
        bundle.roots.extend(other.bundle.roots);
        bundle.roots.sort();
        bundle.roots.dedup();
        if bundle.objects.len() > MAX_VIEW_ENTRIES
            || bundle.roots.len() > MAX_VIEW_ENTRIES
            || canonical_bundle(&bundle)?.len() > MAX_VIEW_BYTES
        {
            return Err("knowledge view schema/size limit".into());
        }
        // Appending new entries in the other view's topological order keeps
        // every dependency before its user. Complete endpoint closures imply
        // a complete union; their authenticated roots remain reachable.
        let mut order = self.order.clone();
        let mut known: BTreeSet<_> = order.iter().cloned().collect();
        for id in other.order {
            if known.insert(id.clone()) {
                order.push(id);
            }
        }
        Ok(Self {
            bundle,
            order,
            snapshot_id: self.snapshot_id.clone(),
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
            admit_first_order(&mut context, id, entry)?;
        }
        Ok(context)
    }

    /// Common evidence admission for mathematical entries. Contextual rewrites
    /// carry their own bounded definitions; admission here does not establish
    /// applicability to p. Selection separately matches the original module.
    pub fn verify(&self, p: &crate::core::Program) -> LangResult<Vec<String>> {
        let mut first = crate::logic::Context::default();
        let mut scalar = crate::equality::Context::default();
        let mut semantic_objects = BTreeMap::new();
        let mut semantic_roots = vec![];
        for id in &self.order {
            let e = &self.bundle.objects[id];
            match e.semantics.as_str() {
                laws::SEMANTICS | laws::GENERAL_SEMANTICS => {
                    semantic_objects.insert(id.clone(), e.law()?);
                    semantic_roots.push(id.clone());
                }
                crate::library::SEMANTICS => {
                    admit_first_order(&mut first, id, e)?;
                }
                crate::equality::SEMANTICS => {
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
    if c.objects.len() > 1024 || c.roots.len() > 1024 {
        return Err("in-memory catalogue exceeds bounded knowledge view".into());
    }
    let objects = c
        .objects
        .iter()
        .map(|(id, l)| Ok((id.clone(), Entry::from_law(l)?)))
        .collect::<LangResult<BTreeMap<_, _>>>()?;
    let ids = objects.keys().cloned().collect::<Vec<_>>();
    // Use the same bounded leaves and odd-node duplication as the canonical
    // store. This constructs transport witnesses; checking still grants authority.
    let mut membership = BTreeMap::new();
    let mut nodes = vec![];
    for entries in ids.chunks(64) {
        let entries = entries.to_vec();
        for id in &entries {
            membership.insert(
                id.clone(),
                Membership {
                    entries: entries.clone(),
                    path: vec![],
                },
            );
        }
        nodes.push((identity(&json!({"schema":1,"entries":entries}))?, entries));
    }
    if nodes.is_empty() {
        nodes.push((identity(&json!({"schema":1,"entries":[]}))?, vec![]));
    }
    while nodes.len() > 1 {
        let mut next = vec![];
        for pair in nodes.chunks(2) {
            let (left, left_ids) = &pair[0];
            let (right, right_ids) = pair.get(1).unwrap_or(&pair[0]);
            for id in left_ids {
                membership.get_mut(id).unwrap().path.push(Sibling {
                    sibling: right.clone(),
                    left: false,
                });
            }
            let mut parent_ids = left_ids.clone();
            if pair.len() == 2 {
                for id in right_ids {
                    membership.get_mut(id).unwrap().path.push(Sibling {
                        sibling: left.clone(),
                        left: true,
                    });
                }
                parent_ids.extend(right_ids.iter().cloned());
            }
            next.push((
                identity(&json!({"schema":1,"left":left,"right":right}))?,
                parent_ids,
            ));
        }
        nodes = next;
    }
    let snapshot = Snapshot {
        schema: 1,
        semantics: SNAPSHOT_SEMANTICS.into(),
        root: nodes.pop().unwrap().0,
    };
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
    fn borrowed_admission_replays_proofs_and_authentication() {
        let b=view(theorem());
        CheckedBundle::check(&b).unwrap().first_order_context().unwrap();
        CheckedBundle::checked_first_order_context(&b).unwrap();
        let mut false_law=theorem();
        false_law.payload["declaration"]["Theorem"]["to"]=json!({"U64":0});
        let forged=view(false_law);
        let owned=CheckedBundle::check(&forged).unwrap().first_order_context().unwrap_err();
        let borrowed=CheckedBundle::checked_first_order_context(&forged).unwrap_err();
        assert_eq!(owned,borrowed);
        let mut missing=b.clone();missing.membership.clear();
        assert_eq!(CheckedBundle::check(&missing).unwrap_err(),CheckedBundle::checked_first_order_context(&missing).unwrap_err());
    }
    #[test]
    fn enlarged_package_allowance_keeps_entry_and_root_limits_fail_closed() {
        let mut b=view(theorem());
        b.roots=(0..=MAX_VIEW_ENTRIES).map(|i|format!("{i:064x}")).collect();
        assert_eq!(CheckedBundle::check(&b).unwrap_err(),"knowledge view schema/size limit");
        let mut e=theorem();e.payload["padding"]=json!("x".repeat(MAX_ENTRY_BYTES));
        assert_eq!(CheckedBundle::check(&view(e)).unwrap_err(),"knowledge entry schema/content mismatch");
    }
    #[test]
    fn borrowed_bundle_encoding_preserves_bytes_hashes_and_rejection_bounds() {
        let mut b = view(theorem());
        let id = b.roots[0].clone();
        b.membership.get_mut(&id).unwrap().path.push(Sibling {
            sibling: "f".repeat(64),
            left: true,
        });
        for path in 0..4 {
            for depth in [0, 122, 124, 126, 128] {
                let mut value = json!({"z":"🧵\n", "a":[u64::MAX,i64::MIN,true,null]});
                for _ in 0..depth {
                    value = json!([value]);
                }
                let mut trial = b.clone();
                let e = trial.objects.get_mut(&id).unwrap();
                match path {
                    0 => e.payload = value,
                    1 => e.interface.result = value,
                    2 => {
                        e.interface.parameters.insert("extra".into(), value);
                    }
                    _ => e.interface.conditions = vec![value],
                }
                assert_eq!(canonical_bundle(&trial), canonical(&trial));
                if canonical_bundle(&trial).is_ok() {
                    assert_eq!(bundle_identity(&trial).unwrap(), identity(&trial).unwrap());
                }
            }
        }
        for path in 0..4 {
            let mut trial = b.clone();
            let e = trial.objects.get_mut(&id).unwrap();
            match path {
                0 => e.payload = json!(1.5),
                1 => e.interface.result = json!(1.5),
                2 => {
                    e.interface.parameters.insert("bad".into(), json!(1.5));
                }
                _ => e.interface.conditions = vec![json!(1.5)],
            }
            assert_eq!(canonical_bundle(&trial), canonical(&trial));
            assert!(canonical_bundle(&trial).is_err());
        }
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
            semantics: crate::equality::SEMANTICS.into(),
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
