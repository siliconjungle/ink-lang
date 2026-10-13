//! Replayable composition of independently checked optimisation steps. Layer
//! order and repetition are external search choices, never admission rules.
use crate::{
    core::CheckedModule, definition::Replacement, optimisation, physical, property, representation,
    source_routing, resources, LangResult,
};
use serde::{Deserialize, Serialize};
pub const SEMANTICS: &str = "ink-compiled-plan-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DefinitionSelection {
    pub request: representation::Request,
    pub proposals: Vec<Replacement>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Route {
    pub package: source_routing::Package,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub equivalence: Option<source_routing::Equivalence>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "kind", content = "package", rename_all = "snake_case")]
pub enum Step {
    Rewrite(optimisation::Package),
    Extension(crate::source_extension::Request),
    Representation(representation::Request),
    Definitions(DefinitionSelection),
    Properties(property::Package),
    Physical(physical::Plan),
    Routing(Route),
    Resources(resources::Plan),
    Maintained(crate::maintained::Package),
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Package {
    pub schema: u32,
    pub semantics: String,
    pub input_core_sha256: String,
    pub steps: Vec<Step>,
}
#[derive(Clone, Debug)]
pub struct CheckedPlan {
    original: CheckedModule,
    module: CheckedModule,
    representation: Option<representation::CheckedRepresentation>,
    physical: Option<physical::CheckedPhysicalPlan>,
    properties: Vec<property::CheckedProperties>,
    definitions: Vec<Vec<Replacement>>,
    route: Option<source_routing::CheckedRouting>,
    resources: Option<resources::CheckedResources>,
    maintained: Option<crate::maintained::CheckedViews>,
    package: Package,
}
impl CheckedPlan {
    pub fn original(&self) -> &CheckedModule {
        &self.original
    }
    pub fn module(&self) -> &CheckedModule {
        &self.module
    }
    pub fn representation(&self) -> Option<&representation::CheckedRepresentation> {
        self.representation.as_ref()
    }
    pub fn physical(&self) -> Option<&physical::CheckedPhysicalPlan> {
        self.physical.as_ref()
    }
    pub fn properties(&self) -> &[property::CheckedProperties] {
        &self.properties
    }
    pub fn route(&self) -> Option<&source_routing::CheckedRouting> {
        self.route.as_ref()
    }
    pub fn resources(&self) -> Option<&resources::CheckedResources> { self.resources.as_ref() }
    pub fn maintained(&self) -> Option<&crate::maintained::CheckedViews> { self.maintained.as_ref() }
    /// Emitters declare support explicitly; an admitted choice cannot disappear.
    pub fn require_source_storage_capability(&self,folds:bool,dense:bool)->LangResult<()>{
        self.require_source_storage_capabilities(folds,dense,false)
    }
    pub fn require_source_storage_capabilities(&self,folds:bool,dense:bool,dictionaries:bool)->LangResult<()>{
        if !folds&&self.maintained.is_some(){return Err("target does not support maintained source folds".into());}
        if !dense&&self.physical.as_ref().is_some_and(|p|!p.plan().dense_prefixes.is_empty()){return Err("target does not support dense source table prefixes".into());}
        if !dictionaries&&self.physical.as_ref().is_some_and(|p|!p.plan().dictionary_tables.is_empty()){return Err("target does not support source dictionary tables".into());}
        Ok(())
    }
    pub fn require_record_elision_capability(&self, supported:bool)->LangResult<()> {
        self.require_source_layout_capabilities(supported,false)
    }
    pub fn require_source_layout_capabilities(&self, records:bool, sums:bool)->LangResult<()> {
        if !records && self.physical.as_ref().is_some_and(|p|!p.plan().record_elisions.is_empty()) {return Err("target does not support source record elision".into());}
        if !sums && self.physical.as_ref().is_some_and(|p|!p.plan().sum_spines.is_empty()) {return Err("target does not support source sum spines".into());}
        Ok(())
    }
    pub fn package(&self) -> &Package {
        &self.package
    }
}
fn interface(original: &CheckedModule, selected: &CheckedModule) -> LangResult<()> {
    let a = original.program();
    let b = selected.program();
    if a.module != b.module
        || crate::snapshot::layout(a)?.roots != crate::snapshot::layout(b)?.roots
        || crate::snapshot::layout(a)?.events != crate::snapshot::layout(b)?.events
        || a.actions.len() != b.actions.len()
        || a.functions.len() > b.functions.len()
        || a.ids.iter().any(|n|!b.ids.contains(n))
        || a.records.iter().any(|(n,v)|b.records.get(n)!=Some(v))
        || a.enums.iter().any(|(n,v)|b.enums.get(n)!=Some(v))
        || crate::registry::canonical(&a.states)? != crate::registry::canonical(&b.states)?
    {
        return Err("composed plan changes the original public state/interface".into());
    }
    for f in &a.functions {
        let g = b
            .functions
            .iter()
            .find(|g| g.name == f.name)
            .ok_or("composed function missing")?;
        if f.params != g.params || f.result != g.result {
            return Err("composed function signature changed".into());
        }
    }
    for f in &a.actions {
        let g = b
            .actions
            .iter()
            .find(|g| g.name == f.name)
            .ok_or("composed action missing")?;
        if f.kind != g.kind
            || f.params != g.params
            || f.result != g.result
            || f.reads != g.reads
            || f.writes != g.writes
            || f.emits != g.emits
        {
            return Err("composed action signature/effects changed".into());
        }
    }
    Ok(())
}
pub fn check(original: &CheckedModule, package: &Package) -> LangResult<CheckedPlan> {
    check_from(original, package, None)
}
fn check_from(
    original: &CheckedModule,
    package: &Package,
    seed: Option<CheckedPlan>,
) -> LangResult<CheckedPlan> {
    if package.schema != 1
        || package.semantics != SEMANTICS
        || package.input_core_sha256 != original.identity()?
    {
        return Err("compiled plan input/semantics mismatch".into());
    }
    if crate::registry::canonical(package)?.len() > crate::registry::MAX_VIEW_BYTES {
        return Err("compiled plan byte limit".into());
    }
    let done = seed.as_ref().map_or(0, |s| s.package.steps.len());
    let mut checked = seed.unwrap_or_else(|| CheckedPlan {
        original: original.clone(),
        module: original.clone(),
        representation: None,
        physical: None,
        properties: vec![],
        definitions: vec![],
        route: None,
        resources: None,
        maintained: None,
        package: package.clone(),
    });
    checked.package = package.clone();
    for step in &package.steps[done..] {
        match step {
            Step::Extension(p) => {
                let selected=crate::source_extension::check(&checked.module,p)?;
                interface(original,&selected)?;
                checked.module=selected;
                checked.representation=None;checked.physical=None;checked.properties.clear();
                checked.definitions.clear();checked.route=None;checked.resources=None;
                checked.maintained=None;
            }
            Step::Rewrite(p) => {
                let selected = optimisation::check(&checked.module, p)?;
                interface(original, selected.module())?;
                checked.module = selected.into_module();
                // A new source image requires new source-bound representations,
                // properties and placements. Their previous proofs are retained
                // in the replay chain but cannot authorise stale final choices.
                checked.representation = None;
                checked.physical = None;
                checked.properties.clear();
                checked.definitions.clear();
                checked.route = None;
                checked.resources = None;
                checked.maintained = None;
            }
            Step::Representation(p) => {
                if checked.maintained.is_some(){return Err("maintained source folds cannot compose with a definition representation".into());}
                let mut r = representation::check(&checked.module, p)?;
                r.set_snapshot_module(original);
                checked.representation = Some(r);
                checked.physical = None;
                checked.definitions.clear();
            }
            Step::Definitions(p) => {
                let previous = checked
                    .representation
                    .as_ref()
                    .ok_or("definition choices require a representation")?;
                if p.request.representation != previous.request().representation {
                    return Err("definition step changes the representation role".into());
                }
                let mut r = representation::check(&checked.module, &p.request)?;
                // Recheck previous equations in the new immutable closure before
                // composing another choice. Missing dependencies reject this step.
                for proposals in &checked.definitions {
                    r.select_definitions(proposals)?;
                }
                r.select_definitions(&p.proposals)?;
                r.set_snapshot_module(original);
                checked.definitions.push(p.proposals.clone());
                checked.representation = Some(r);
                checked.physical = None;
            }
            Step::Properties(p) => checked
                .properties
                .push(property::check(&checked.module, p)?),
            Step::Physical(p) => {
                checked.physical = Some(physical::check(
                    &checked.module,
                    checked.representation.as_ref(),
                    p,
                )?)
            }
            Step::Resources(p) => {
                checked.resources = Some(resources::check(checked.route.as_ref().ok_or("resource plan needs a checked graph")?, p)?);
            }
            Step::Maintained(p) => {
                if checked.representation.is_some(){return Err("maintained folds require source tables".into());}
                checked.maintained=Some(crate::maintained::check(&checked.module,p)?);
            }
            Step::Routing(p) => {
                checked.resources = None;
                checked.route = Some(if let Some(e) = &p.equivalence {
                    source_routing::check_equivalent(&checked.module, &p.package, e)?
                } else {
                    source_routing::check(&checked.module, &p.package)?
                })
            }
        }
    }
    Ok(checked)
}

/// Process-local reuse of sealed prefixes. Exact canonical bytes, not a hash,
/// identify a prefix previously checked under this immutable source module.
/// Rejected continuations never alter the cached witness. Frozen replay still
/// uses `check` and validates the entire chain in a fresh process.
pub struct Checker {
    original: CheckedModule,
    prefixes: std::collections::VecDeque<(Vec<u8>, CheckedPlan)>,
    bytes: usize,
    reused: usize,
}
impl Checker {
    pub fn new(original: CheckedModule) -> Self {
        Self {
            original,
            prefixes: Default::default(),
            bytes: 0,
            reused: 0,
        }
    }
    pub fn reused_steps(&self) -> usize {
        self.reused
    }
    pub fn check(&mut self, package: &Package) -> LangResult<CheckedPlan> {
        if crate::registry::canonical(package)?.len() > crate::registry::MAX_VIEW_BYTES {
            return Err("compiled plan byte limit".into());
        }
        self.reused = 0;
        let mut seed = None;
        for (bytes, checked) in &self.prefixes {
            let length = checked.package.steps.len();
            if length <= package.steps.len() && length >= self.reused {
                let prefix = Package {
                    schema: package.schema,
                    semantics: package.semantics.clone(),
                    input_core_sha256: package.input_core_sha256.clone(),
                    steps: package.steps[..length].to_vec(),
                };
                if &crate::registry::canonical(&prefix)? == bytes {
                    seed = Some(checked.clone());
                    self.reused = length;
                }
            }
        }
        let checked = check_from(&self.original, package, seed)?;
        let bytes = crate::registry::canonical(package)?;
        const LIMIT: usize = 16_000_000;
        if bytes.len() <= LIMIT {
            while self.prefixes.len() >= 8 || self.bytes + bytes.len() > LIMIT {
                if let Some((old, _)) = self.prefixes.pop_front() {
                    self.bytes -= old.len();
                }
            }
            self.bytes += bytes.len();
            self.prefixes.push_back((bytes, checked.clone()));
        }
        Ok(checked)
    }
}
