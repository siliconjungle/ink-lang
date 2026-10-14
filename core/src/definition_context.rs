//! Portable pure definition contexts for ordinary executable equality proofs.
//! Hashes bind definitions; they never establish an equality. The existing
//! type checker and proof rules check the reconstructed context independently.
use crate::{
    core::{CheckedModule, Expr, Function, Program, Type},
    semantic::{self as s, Term},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug)]
pub struct Definition {
    pub params: Vec<(String, Type)>,
    pub result: Type,
    pub body: Term,
    pub callees: BTreeMap<String, String>,
    /// Transport choice only. Inline contexts retain their existing identities.
    pub compact_body: bool,
}

#[derive(Serialize)]
#[serde(untagged)]
enum BodyRef<'a> { Inline(&'a Term), Flat(&'a crate::flat_term::FlatTree) }
#[derive(Deserialize)]
#[serde(untagged)]
enum Body { Inline(Term), Flat(crate::flat_term::FlatTree) }
#[derive(Serialize)]
struct DefinitionRef<'a> {
    params: &'a Vec<(String, Type)>, result: &'a Type,
    body: BodyRef<'a>, callees: &'a BTreeMap<String, String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct DefinitionWire {
    params: Vec<(String, Type)>, result: Type, body: Body,
    callees: BTreeMap<String, String>,
}
impl Serialize for Definition {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let flat = if self.compact_body {
            Some(crate::flat_term::FlatTree::encode(&self.body).map_err(serde::ser::Error::custom)?)
        } else { None };
        DefinitionRef { params: &self.params, result: &self.result,
            body: flat.as_ref().map(BodyRef::Flat).unwrap_or(BodyRef::Inline(&self.body)),
            callees: &self.callees }.serialize(serializer)
    }
}
impl<'de> Deserialize<'de> for Definition {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let wire = DefinitionWire::deserialize(deserializer)?;
        let (body, compact_body) = match wire.body {
            Body::Inline(body) => (body, false),
            Body::Flat(flat) => (flat.decode().map_err(serde::de::Error::custom)?, true),
        };
        Ok(Self { params: wire.params, result: wire.result, body,
            callees: wire.callees, compact_body })
    }
}
fn compact_body(body: &Term) -> LangResult<bool> {
    let value = serde_json::to_value(body).map_err(|e| e.to_string())?;
    let mut pending = vec![(&value, 0usize)];
    while let Some((value, depth)) = pending.pop() {
        if depth > 80 { return Ok(true); }
        match value {
            serde_json::Value::Object(fields) => pending.extend(fields.values().map(|v| (v, depth + 1))),
            serde_json::Value::Array(values) => pending.extend(values.iter().map(|v| (v, depth + 1))),
            _ => {},
        }
    }
    Ok(false)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BoundDefinition {
    pub sha256: String,
    pub definition: Definition,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DefinitionContext {
    pub schema: u32,
    // Empty omission preserves identities of existing portable contexts.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub ids: Vec<String>,
    pub definitions: BTreeMap<String, BoundDefinition>,
    pub records: BTreeMap<String, Vec<(String, Type)>>,
    pub enums: BTreeMap<String, Vec<String>>,
    /// A cycle binds all member bodies together. Internal references use this
    /// group identity, avoiding circular content hashes of individual members.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub recursive_groups: BTreeMap<String, Vec<String>>,
}

fn group_identity(definitions: &BTreeMap<String, BoundDefinition>, members: &[String]) -> LangResult<String> {
    let mut bodies = BTreeMap::new();
    for name in members {
        let mut definition = definitions.get(name).ok_or("recursive context member missing")?.definition.clone();
        definition.callees.retain(|callee, _| !members.contains(callee));
        bodies.insert(name.clone(), definition);
    }
    crate::registry::identity(&("ink-recursive-definitions-v1", bodies))
}

fn calls(t: &Term, names: &BTreeSet<String>, out: &mut BTreeSet<String>) {
    if let s::Node::Op(n, _) = &t.node {
        if let Some(n) = n.strip_prefix("call:") {
            if names.contains(n) {
                out.insert(n.to_owned());
            }
        }
    }
    for child in s::children(t) {
        calls(child, names, out);
    }
}

impl DefinitionContext {
    /// Capture a bounded transitive closure from an already checked module.
    /// Formal parameter names and exact typed bodies are part of the identity;
    /// unrelated function bodies and source/module names are not.
    pub fn capture(module: &CheckedModule, roots: &[String]) -> LangResult<Self> {
        let p = module.program();
        let names = p.functions.iter().map(|f| f.name.clone()).collect();
        let mut out = Self {
            schema: 1,
            ids: p.ids.clone(),
            definitions: BTreeMap::new(),
            records: p.records.clone(),
            enums: p.enums.clone(),
            recursive_groups: BTreeMap::new(),
        };
        let mut pending = roots.to_vec();
        let mut bodies = BTreeMap::new();
        while let Some(name) = pending.pop() {
            if bodies.contains_key(&name) { continue; }
            if bodies.len() >= 128 {
                return Err("definition context closure limit".into());
            }
            let f = p
                .functions
                .iter()
                .find(|f| f.name == name)
                .ok_or("definition context function missing")?;
            let body = s::elaborate(&f.body, &crate::check::params_env(&f.params)?, p, &f.result)?;
            let mut deps = BTreeSet::new();
            calls(&body, &names, &mut deps);
            pending.extend(deps.iter().cloned());
            bodies.insert(name, Definition {
                params: f.params.clone(),
                result: f.result.clone(),
                compact_body: compact_body(&body)?,
                body,
                callees: deps.into_iter().map(|name| (name, String::new())).collect(),
            });
        }
        let mut units = vec![];
        let mut grouped = BTreeSet::new();
        for group in crate::analysis::recursive_function_groups(p)? {
            let mut members = group.into_iter().map(|i| p.functions[i].name.clone()).collect::<Vec<_>>();
            if !members.iter().any(|name| bodies.contains_key(name)) { continue; }
            members.sort();
            if members.iter().any(|name| !bodies.contains_key(name)) {
                return Err("recursive definition context closure incomplete".into());
            }
            grouped.extend(members.iter().cloned()); units.push(members);
        }
        units.extend(bodies.keys().filter(|name| !grouped.contains(*name)).map(|name| vec![name.clone()]));
        while !units.is_empty() {
            let ready = units.iter().position(|members| members.iter().all(|name| bodies[name].callees.keys()
                .all(|callee| members.contains(callee) || out.definitions.contains_key(callee))))
                .ok_or("definition context component dependency cycle")?;
            let members = units.remove(ready);
            let cyclic = grouped.contains(&members[0]);
            for name in &members {
                let mut definition = bodies.remove(name).unwrap();
                for (callee, id) in &mut definition.callees {
                    if !members.contains(callee) { *id = out.definitions[callee].sha256.clone(); }
                }
                out.definitions.insert(name.clone(), BoundDefinition { sha256: String::new(), definition });
            }
            let group = if cyclic { Some(group_identity(&out.definitions, &members)?) } else { None };
            for name in &members {
                let bound = out.definitions.get_mut(name).unwrap();
                if let Some(group) = &group {
                    for (callee, id) in &mut bound.definition.callees {
                        if members.contains(callee) { *id = group.clone(); }
                    }
                }
                bound.sha256 = crate::registry::identity(&bound.definition)?;
            }
            if let Some(group) = group { out.recursive_groups.insert(group, members); }
        }
        out.check()?;
        Ok(out)
    }

    /// Reconstruct only the supplied definitions, with no authority from the
    /// admission caller's module. Missing names, invalid cycle bindings and
    /// unproved recursion fail; group hashes themselves prove no equation.
    pub fn check(&self) -> LangResult<Program> {
        if self.schema != 1
            || self.definitions.len() > 128
            || crate::registry::canonical(self)?.len() > 4_000_000
        {
            return Err("definition context schema/size limit".into());
        }
        let names = self.definitions.keys().cloned().collect();
        let mut group_of = BTreeMap::new();
        for (group, members) in &self.recursive_groups {
            crate::content::identity(group)?;
            if members.is_empty() || !members.windows(2).all(|pair| pair[0] < pair[1])
                || group_identity(&self.definitions, members)? != *group {
                return Err("recursive definition group identity/membership mismatch".into());
            }
            for name in members {
                if group_of.insert(name.as_str(), group.as_str()).is_some() {
                    return Err("recursive definition belongs to multiple groups".into());
                }
            }
        }
        for (name, bound) in &self.definitions {
            crate::content::identity(&bound.sha256)?;
            if crate::registry::identity(&bound.definition)? != bound.sha256 {
                return Err("definition context content hash mismatch".into());
            }
            let mut deps = BTreeSet::new();
            calls(&bound.definition.body, &names, &mut deps);
            if deps != bound.definition.callees.keys().cloned().collect() {
                return Err("definition context callee set mismatch".into());
            }
            for (callee, id) in &bound.definition.callees {
                let expected = if group_of.get(name.as_str()).is_some()
                    && group_of.get(name.as_str()) == group_of.get(callee.as_str()) {
                    group_of.get(name.as_str()).copied()
                } else { self.definitions.get(callee).map(|d| d.sha256.as_str()) };
                if expected != Some(id.as_str()) {
                    return Err(format!(
                        "definition context callee identity mismatch: {name}"
                    ));
                }
            }
        }
        let mut p = Program {
            ids: self.ids.clone(),
            records: self.records.clone(),
            enums: self.enums.clone(),
            functions: self
                .definitions
                .iter()
                .map(|(name, d)| Function {
                    name: name.clone(),
                    params: d.definition.params.clone(),
                    result: d.definition.result.clone(),
                    body: Expr::Unit,
                })
                .collect(),
            ..Program::default()
        };
        // Reification needs signatures, but obtains no unvalidated executable
        // body from these temporary declarations. Full module checking follows.
        for i in 0..p.functions.len() {
            let d = &self.definitions[&p.functions[i].name].definition;
            let env = d
                .params
                .iter()
                .map(|(n, t)| (n.clone(), s::value(t.clone())))
                .collect();
            s::validate(&d.body, &env, &p, &mut s::Budget::new())?;
            if d.body.sort != s::value(d.result.clone()) {
                return Err("definition context result mismatch".into());
            }
            p.functions[i].body = s::reify(&d.body, &p)?;
        }
        let checked = CheckedModule::from_source(p)?;
        let p = checked.program();
        let actual = crate::analysis::recursive_function_groups(p)?.into_iter().map(|group| {
            let mut members = group.into_iter().map(|i| p.functions[i].name.clone()).collect::<Vec<_>>();
            members.sort(); members
        }).collect::<BTreeSet<_>>();
        if actual != self.recursive_groups.values().cloned().collect() {
            return Err("recursive definition groups differ from actual call components".into());
        }
        self.matches(p)?;
        Ok(p.clone())
    }

    /// Applicability is exact executable correspondence, not hash trust or
    /// equality-by-normalisation. Changed same-name definitions must re-prove.
    pub fn matches(&self, p: &Program) -> LangResult<()> {
        for name in &self.ids {
            if !p.ids.contains(name) {
                return Err(format!("definition context ID differs: {name}"));
            }
        }
        for (name, fields) in &self.records {
            if p.records.get(name) != Some(fields) {
                return Err(format!("definition context record differs: {name}"));
            }
        }
        for (name, variants) in &self.enums {
            if p.enums.get(name) != Some(variants) {
                return Err(format!("definition context enum differs: {name}"));
            }
        }
        for (name, bound) in &self.definitions {
            let f = p
                .functions
                .iter()
                .find(|f| f.name == *name)
                .ok_or_else(|| format!("definition context function missing: {name}"))?;
            let d = &bound.definition;
            if f.params != d.params || f.result != d.result {
                return Err(format!("definition context signature differs: {name}"));
            }
            let body = s::elaborate(&f.body, &crate::check::params_env(&f.params)?, p, &f.result)?;
            if body != d.body {
                fn mismatch(a: &Term, b: &Term, path: &mut Vec<usize>) -> String {
                    if a.sort != b.sort { return format!("{path:?}: sort {:?} versus {:?}", a.sort, b.sort) }
                    let left=s::children(a); let right=s::children(b);
                    if left.len()==right.len() {
                        for (index,(a,b)) in left.iter().zip(right).enumerate() {
                            if a!=&b {path.push(index);return mismatch(a,b,path)}
                        }
                    }
                    fn head(node:&s::Node)->String { match node {
                        s::Node::Op(name,_)=>name.clone(),
                        s::Node::Lambda(_)=>"lambda".into(),
                        other=>format!("{other:?}"),
                    } }
                    format!("{path:?}: {} versus {}",head(&a.node),head(&b.node))
                }
                return Err(format!("definition context body differs: {name}, {}",mismatch(&body,&d.body,&mut vec![])));
            }
        }
        Ok(())
    }
}
