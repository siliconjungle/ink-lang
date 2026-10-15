//! Distribution facade. Semantic core has no lowering dependency.
pub use ink_abi as abi;
pub use ink_core::*;
pub use ink_lowering_gpu::gpu;
pub use ink_lowering_js as javascript;
pub use ink_lowering_rust::{definition_native, representation_program};
pub mod state_native {
    pub use ink_lowering_rust::state_native::*;
    pub const WASM_ABI: &str = ink_runtime::STATE_WASM_ABI;
}
pub mod machine {
    pub use ink_core::machine::*;
    pub use ink_lowering_rust::machine_native::{emit, lower, Emission, Evidence};
}

pub mod snapshot {
    pub use ink_core::snapshot::*;
    pub use ink_lowering_rust::snapshot_code::schema_code;
}

pub mod runtime {
    pub use ink_runtime::*;
    const PIPELINE_PLANNER: &str = include_str!("../planner/browser/pipeline-selection.mjs");
    // Complete source modules contain independently emitted GPU bundles. Each
    // bundle needs the distribution's planner asset, including when a browser
    // bundler resolves the optional placement import before execution.
    fn install_planners(dir: &std::path::Path) -> ink_core::LangResult<()> {
        install_pipeline_planner(dir, PIPELINE_PLANNER)?;
        let manifest:serde_json::Value=serde_json::from_slice(&std::fs::read(dir.join("manifest.json")).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
        let mut bundles=std::collections::BTreeSet::new();
        if let Some(functions)=manifest["functions"].as_array(){
            for function in functions {
                if let Some(bundle)=function["bundle"].as_str(){
                    let path=std::path::Path::new(bundle);
                    if bundle.is_empty()||!path.components().all(|c|matches!(c,std::path::Component::Normal(_))){return Err("invalid emitted GPU bundle path".into());}
                    bundles.insert(dir.join(path));
                }
            }
        }
        for bundle in bundles {install_pipeline_planner(&bundle,PIPELINE_PLANNER)?;}
        Ok(())
    }
    pub fn emit_gpu(p: &ink_core::syntax::Program, dir: &std::path::Path) -> ink_core::LangResult<()> {
        ink_runtime::emit_gpu(p, dir)?;
        install_planners(dir)
    }
    pub fn emit_selected(s: &ink_core::optimisation::CheckedSelection, dir: &std::path::Path) -> ink_core::LangResult<()> {
        ink_runtime::emit_selected(s, dir)?;
        install_planners(dir)
    }
    pub use ink_runtime::install_usage_identity;
    pub fn emit_planned(p: &ink_core::planning::CheckedPlan, dir: &std::path::Path) -> ink_core::LangResult<()> {
        ink_runtime::emit_planned(p, dir)?;
        install_planners(dir)
    }
    pub fn emit_routed_planned(p: &ink_core::planning::CheckedPlan, dir: &std::path::Path) -> ink_core::LangResult<()> {
        ink_runtime::emit_routed_planned(p, dir)?;
        install_planners(dir)
    }
    pub fn emit_routed(r: &ink_core::source_routing::CheckedRouting, dir: &std::path::Path) -> ink_core::LangResult<()> {
        ink_runtime::emit_routed(r, dir)?;
        install_planners(dir)
    }
}

pub mod distribution;
/// Filesystem/source module assembly belongs to the distribution.
pub mod modules;

pub mod representations;

pub mod compiled_plans;
