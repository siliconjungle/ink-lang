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

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Definition {
    pub params: Vec<(String, Type)>,
    pub result: Type,
    pub body: Term,
    pub callees: BTreeMap<String, String>,
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
    pub definitions: BTreeMap<String, BoundDefinition>,
    pub records: BTreeMap<String, Vec<(String, Type)>>,
    pub enums: BTreeMap<String, Vec<String>>,
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
            definitions: BTreeMap::new(),
            records: p.records.clone(),
            enums: p.enums.clone(),
        };
        fn visit(
            name: &str,
            p: &Program,
            names: &BTreeSet<String>,
            out: &mut DefinitionContext,
            active: &mut BTreeSet<String>,
        ) -> LangResult<()> {
            if out.definitions.contains_key(name) {
                return Ok(());
            }
            if active.len() >= 64 || active.len() + out.definitions.len() >= 128 {
                return Err("definition context closure limit".into());
            }
            if !active.insert(name.to_owned()) {
                return Err("cyclic definition context".into());
            }
            let f = p
                .functions
                .iter()
                .find(|f| f.name == name)
                .ok_or("definition context function missing")?;
            let body = s::elaborate(&f.body, &crate::check::params_env(&f.params)?, p, &f.result)?;
            let mut deps = BTreeSet::new();
            calls(&body, names, &mut deps);
            for dep in &deps {
                visit(dep, p, names, out, active)?;
            }
            let definition = Definition {
                params: f.params.clone(),
                result: f.result.clone(),
                body,
                callees: deps
                    .into_iter()
                    .map(|n| {
                        let id = out.definitions[&n].sha256.clone();
                        (n, id)
                    })
                    .collect(),
            };
            let sha256 = crate::registry::identity(&definition)?;
            out.definitions
                .insert(name.to_owned(), BoundDefinition { sha256, definition });
            active.remove(name);
            Ok(())
        }
        for root in roots {
            visit(root, p, &names, &mut out, &mut BTreeSet::new())?;
        }
        out.check()?;
        Ok(out)
    }

    /// Reconstruct only the supplied definitions, with no authority from the
    /// admission caller's module. Missing names, cycles and invalid bodies fail.
    pub fn check(&self) -> LangResult<Program> {
        if self.schema != 1
            || self.definitions.len() > 128
            || crate::registry::canonical(self)?.len() > 4_000_000
        {
            return Err("definition context schema/size limit".into());
        }
        let names = self.definitions.keys().cloned().collect();
        for (name, bound) in &self.definitions {
            crate::knowledge::identity(&bound.sha256)?;
            if crate::registry::identity(&bound.definition)? != bound.sha256 {
                return Err("definition context content hash mismatch".into());
            }
            let mut deps = BTreeSet::new();
            calls(&bound.definition.body, &names, &mut deps);
            if deps != bound.definition.callees.keys().cloned().collect() {
                return Err("definition context callee set mismatch".into());
            }
            for (callee, id) in &bound.definition.callees {
                if self.definitions.get(callee).map(|d| &d.sha256) != Some(id) {
                    return Err(format!(
                        "definition context callee identity mismatch: {name}"
                    ));
                }
            }
        }
        let mut p = Program {
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
        self.matches(p)?;
        Ok(p.clone())
    }

    /// Applicability is exact executable correspondence, not hash trust or
    /// equality-by-normalisation. Changed same-name definitions must re-prove.
    pub fn matches(&self, p: &Program) -> LangResult<()> {
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
                return Err(format!("definition context body differs: {name}"));
            }
        }
        Ok(())
    }
}
