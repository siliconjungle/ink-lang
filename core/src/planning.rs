//! Replayable composition of independently checked optimisation steps. Layer
//! order and repetition are external search choices, never admission rules.
use crate::{
    core::CheckedModule, definition::Replacement, optimisation, physical, property, representation,
    source_routing, resources, LangResult,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
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
    Functions(crate::action_model::FunctionReplacement),
    Extension(crate::source_extension::Request),
    Representation(representation::Request),
    Definitions(DefinitionSelection),
    Properties(property::Package),
    Physical(physical::Plan),
    Routing(Route),
    Resources(resources::Plan),
    Maintained(crate::maintained::Package),
    Protocol(crate::protocol::Plan),
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Package {
    pub schema: u32,
    pub semantics: String,
    pub input_core_sha256: String,
    pub steps: Vec<Step>,
}
pub fn from_bytes(bytes:&[u8])->LangResult<Package>{crate::bounded_json::decode(bytes)}
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
    maintained: Option<Arc<crate::maintained::CheckedViews>>,
    protocol: Option<crate::protocol::CheckedProtocol>,
    package: Arc<Package>,
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
    pub fn protocol(&self)->Option<&crate::protocol::CheckedProtocol>{self.protocol.as_ref()}
    pub fn maintained(&self) -> Option<&crate::maintained::CheckedViews> { self.maintained.as_deref() }
    /// Emitters declare support explicitly; an admitted choice cannot disappear.
    pub fn require_source_storage_capability(&self,folds:bool,dense:bool)->LangResult<()>{
        self.require_source_storage_capabilities(folds,dense,false)
    }
    pub fn require_source_storage_capabilities(&self,folds:bool,dense:bool,dictionaries:bool)->LangResult<()>{
        if !folds&&self.protocol.is_some(){return Err("target does not support selected state protocol".into());}
        if !folds&&self.maintained.is_some(){return Err("target does not support maintained source folds".into());}
        if !dense&&self.physical.as_ref().is_some_and(|p|!p.plan().dense_prefixes.is_empty()){return Err("target does not support dense source table prefixes".into());}
        if !dictionaries&&self.physical.as_ref().is_some_and(|p|!p.plan().dictionary_tables.is_empty()){return Err("target does not support source dictionary tables".into());}
        Ok(())
    }
    pub fn require_record_elision_capability(&self, supported:bool)->LangResult<()> {
        self.require_source_layout_capabilities(supported,false)
    }
    pub fn require_source_layout_capabilities(&self, records:bool, sums:bool)->LangResult<()> {
        self.require_source_layout_and_boundary_capabilities(records,sums,false)
    }
    pub fn require_source_layout_and_boundary_capabilities(&self, records:bool, sums:bool, boundaries:bool)->LangResult<()> {
        if !records && self.physical.as_ref().is_some_and(|p|!p.plan().record_elisions.is_empty()) {return Err("target does not support source record elision".into());}
        if !sums && self.physical.as_ref().is_some_and(|p|!p.plan().sum_spines.is_empty()) {return Err("target does not support source sum spines".into());}
        if !boundaries && self.physical.as_ref().is_some_and(|p|!p.plan().boundary_readers.is_empty()) {return Err("target does not support checked literal boundary readers".into());}
        Ok(())
    }
    pub fn package(&self) -> &Package {
        &self.package
    }
}
fn interface(original: &CheckedModule, selected: &CheckedModule) -> LangResult<()> {
    let a = original.program();
    let b = selected.program();
    if a.contracts.action_protocols != b.contracts.action_protocols
        || a.module != b.module
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
/// Stable JSON transport for complete source-bearing plans. Frozen executable
/// rows may contain ordinary finite JSON float inputs. This is distinct from
/// integer-only canonical knowledge: each embedded bundle still authenticates
/// its objects and replays their independent domain checks.
/// Integer-only historical packets retain exactly their existing bytes.
pub fn canonical(package: &Package) -> LangResult<Vec<u8>> {
    let value = serde_json::to_value(package).map_err(|e| e.to_string())?;
    let mut pending = vec![(&value, 0usize)];
    while let Some((value, depth)) = pending.pop() {
        if depth > 256 { return Err("compiled plan transport depth limit".into()); }
        match value {
            serde_json::Value::Array(values) => pending.extend(values.iter().map(|v| (v, depth+1))),
            serde_json::Value::Object(values) => pending.extend(values.values().map(|v| (v, depth+1))),
            _ => {},
        }
    }
    serde_json::to_vec(&value).map_err(|e| e.to_string())
}
pub fn identity(package: &Package) -> LangResult<String> {
    use sha2::{Digest, Sha256};
    Ok(format!("{:x}", Sha256::digest(canonical(package)?)))
}
/// Bind the incoming JSON request, retaining explicitly supplied optional fields.
/// This is source-packet transport; embedded knowledge still checks separately.
pub fn wire_identity(bytes:&[u8])->LangResult<String>{
    use sha2::{Digest,Sha256};
    let value:serde_json::Value=crate::bounded_json::decode(bytes)?;
    Ok(format!("{:x}",Sha256::digest(serde_json::to_vec(&value).map_err(|e|e.to_string())?)))
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
    if canonical(package)?.len() > crate::registry::MAX_VIEW_BYTES {
        return Err("compiled plan byte limit".into());
    }
    let done = seed.as_ref().map_or(0, |s| s.package.steps.len());
    let packet = Arc::new(package.clone());
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
        protocol: None,
        package: packet.clone(),
    });
    checked.package = packet;
    for step in &package.steps[done..] {
        match step {
            Step::Functions(p) => {
                let selected = crate::action_model::check_functions(&checked.module, p)?;
                interface(original, &selected)?;
                checked.module = selected;
                checked.representation = None;
                checked.physical = None;
                checked.properties.clear();
                checked.definitions.clear();
                checked.route = None;
                checked.resources = None;
                checked.maintained = None;
                checked.protocol = None;
            }
            Step::Extension(p) => {
                let selected=crate::source_extension::check(&checked.module,p)?;
                interface(original,&selected)?;
                checked.module=selected;
                checked.representation=None;checked.physical=None;checked.properties.clear();
                checked.definitions.clear();checked.route=None;checked.resources=None;
                checked.maintained=None;checked.protocol=None;
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
                checked.protocol = None;
            }
            Step::Representation(p) => {
                if checked.maintained.is_some(){return Err("maintained source folds cannot compose with a definition representation".into());}
                let mut r = representation::check(&checked.module, p)?;
                r.set_snapshot_module(original);
                checked.representation = Some(r);
                checked.protocol = None;
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
                checked.protocol = None;
                checked.physical = None;
            }
            Step::Properties(p) => checked
                .properties
                .push(property::check(&checked.module, p)?),
            Step::Physical(p) => {
                if p.dense_prefixes.iter().any(|d|checked.protocol.as_ref().is_some_and(|p|p.plan().columns.iter().any(|c|c.table==d.table))){return Err("column and boxed dense prefixes cannot select the same table".into());}
                checked.physical = Some(physical::check(
                    &checked.module,
                    checked.representation.as_ref(),
                    p,
                )?)
            }
            Step::Resources(p) => {
                checked.resources = Some(resources::check(checked.route.as_ref().ok_or("resource plan needs a checked graph")?, p)?);
            }
            Step::Protocol(p) => {
                if checked.representation.is_some(){return Err("state protocol requires source tables".into());}
                if p.columns.iter().any(|c|checked.physical.as_ref().is_some_and(|p|p.plan().dense_prefixes.iter().any(|d|d.table==c.table))){return Err("column and boxed dense prefixes cannot select the same table".into());}
                checked.protocol=Some(crate::protocol::check(&checked.module,p,checked.maintained())?);
            }
            Step::Maintained(p) => {
                if checked.representation.is_some(){return Err("maintained folds require source tables".into());}
                checked.maintained=Some(Arc::new(crate::maintained::check(&checked.module,p)?));
                checked.protocol=None;
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
        if canonical(package)?.len() > crate::registry::MAX_VIEW_BYTES {
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
                if &canonical(&prefix)? == bytes {
                    seed = Some(checked.clone());
                    self.reused = length;
                }
            }
        }
        let checked = check_from(&self.original, package, seed)?;
        let bytes = canonical(package)?;
        // Large admitted mathematical closures must remain eligible for prefix
        // reuse. Keep the same finite byte bound as admission. Sealed maintained
        // witnesses and packets are shared, not deep-cloned for each cache hit.
        const LIMIT: usize = crate::registry::MAX_VIEW_BYTES;
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
