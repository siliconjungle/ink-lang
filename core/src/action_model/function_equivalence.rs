//! Complete pure-computation correspondence using the existing total calculus.
//! Producers supply algorithms and proofs; this only re-derives their endpoints.
use super::*;

pub const FUNCTION_SEMANTICS: &str = "ink-source-functions-v1";

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FunctionModel {
    pub function: String,
    pub params: Vec<(String, Sort)>,
    pub result: Sort,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FunctionProjection {
    pub schema: u32,
    pub semantics: String,
    pub source: String,
    pub functions: BTreeMap<String, FunctionModel>,
    pub objects: BTreeMap<String, Entry>,
}

impl FunctionProjection {
    pub fn derive(module: &CheckedModule, names: &BTreeSet<String>) -> LangResult<Self> {
        if names.is_empty() || names.len() > 128 {
            return Err("pure projection function count limit".into());
        }
        let p = module.program();
        let typed = CheckedActions::elaborate_with_frozen_roots(module)?;
        let mut lower = Lower::new(p, &typed);
        lower.intern_declarations = true;
        lower.structural_imports = true;
        lower.prepare_recursive_records()?;
        for name in names {
            let index = p.functions.iter().position(|f| &f.name == name)
                .ok_or("pure projection function missing")?;
            lower.pure_roots.insert(index);
            // Establish the shared source interface before body-dependent
            // helper discovery, without projecting unrelated unsupported
            // functions or changing legacy action projections.
            let function = &p.functions[index];
            for (_, ty) in &function.params { lower.sort(ty)?; }
            lower.sort(&function.result)?;
        }
        lower.prepare_pure_definitions()?;
        let mut functions = BTreeMap::new();
        for name in names {
            lower.work = MAX_WORK;
            let index = p.functions.iter().position(|f| &f.name == name).unwrap();
            let function = lower.pure_function(index)?;
            let declaration: Declaration = serde_json::from_value(
                lower.objects[&function].payload["declaration"].clone()
            ).map_err(|e| e.to_string())?;
            let Declaration::Function { params, result, .. } = declaration else {
                return Err("pure projection definition role".into());
            };
            functions.insert(name.clone(), FunctionModel { function, params, result });
        }
        let mut pending = functions.values().map(|f| f.function.clone()).collect::<Vec<_>>();
        let mut objects = BTreeMap::new();
        while let Some(id) = pending.pop() {
            if objects.contains_key(&id) { continue; }
            let entry = lower.objects.get(&id).ok_or("pure projection dependency missing")?;
            pending.extend(entry.dependencies.iter().cloned());
            objects.insert(id, entry.clone());
        }
        Ok(Self { schema: 1, semantics: FUNCTION_SEMANTICS.into(), source: module.identity()?, functions, objects })
    }

    pub fn context(&self) -> LangResult<Context> { definition_context(&self.objects) }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FunctionReplacement {
    pub schema: u32,
    pub semantics: String,
    pub input_core_sha256: String,
    pub selected: serde_json::Value,
    pub knowledge: registry::Bundle,
    pub proofs: BTreeMap<String, Proof>,
}

/// Pure pointwise equality is unconditional. No action/state premise, profile,
/// producer hint or source annotation supplies an additional assumption.
pub fn check_functions(module: &CheckedModule, request: &FunctionReplacement) -> LangResult<CheckedModule> {
    if request.schema != 1 || request.semantics != FUNCTION_SEMANTICS
        || request.input_core_sha256 != module.identity()?
        || registry::canonical(request)?.len() > registry::MAX_VIEW_BYTES {
        return Err("pure replacement input/semantics/byte limit".into());
    }
    let selected = CheckedModule::from_bytes(&serde_json::to_vec(&request.selected).map_err(|e| e.to_string())?)?;
    let a = module.program(); let b = selected.program();
    if a.functions.len() != b.functions.len() { return Err("pure replacement changes function declarations".into()); }
    let mut changed = BTreeSet::new();
    for (old, new) in a.functions.iter().zip(&b.functions) {
        let mut signature = old.clone(); signature.body = new.body.clone();
        if registry::canonical(&signature)? != registry::canonical(new)? {
            return Err("pure replacement changes function interface".into());
        }
        if registry::canonical(&old.body)? != registry::canonical(&new.body)? { changed.insert(old.name.clone()); }
    }
    let mut same = a.clone(); same.functions = b.functions.clone();
    if registry::canonical(&same)? != registry::canonical(b)? {
        return Err("pure replacement changes non-function source".into());
    }
    if changed.is_empty() || changed.len() > 128 || request.proofs.keys().ne(changed.iter()) {
        return Err("pure replacement requires exactly every changed function proof".into());
    }
    let before = FunctionProjection::derive(module, &changed)?;
    let after = FunctionProjection::derive(&selected, &changed)?;
    let checked = registry::CheckedBundle::check(&request.knowledge)?;
    let context = checked.first_order_context()?;
    for projection in [&before, &after] {
        for (id, expected) in &projection.objects {
            let actual = request.knowledge.objects.get(id).ok_or("missing source-bound pure definition")?;
            if registry::canonical(expected)? != registry::canonical(actual)? {
                return Err("wrong source-bound pure definition".into());
            }
            let declaration: Declaration = serde_json::from_value(expected.payload["declaration"].clone()).map_err(|e| e.to_string())?;
            context.matches_definition(id, &declaration)?;
        }
    }
    for name in &changed {
        let a = &before.functions[name]; let b = &after.functions[name];
        if a.params != b.params || a.result != b.result { return Err("pure projected signature changed".into()); }
        if !request.knowledge.roots.contains(&a.function) || !request.knowledge.roots.contains(&b.function) {
            return Err("pure source definitions must be enabled roots".into());
        }
        let args = a.params.iter().map(|(name,_)|v(name)).collect::<Vec<_>>();
        context.check(&a.params, &[], &call(&a.function,args.clone()), &call(&b.function,args), &request.proofs[name])
            .map_err(|e|format!("pure function {name}: {e}"))?;
    }
    Ok(selected)
}
