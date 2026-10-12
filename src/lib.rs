//! Distribution facade. Semantic core has no lowering dependency.
pub use ink_abi as abi;
pub use ink_core::*;
pub use ink_lowering_c::{compute, native};
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
    pub fn emit_gpu(p: &ink_core::syntax::Program, dir: &std::path::Path) -> ink_core::LangResult<()> {
        ink_runtime::emit_gpu(p, dir)?;
        install_pipeline_planner(dir, PIPELINE_PLANNER)
    }
    pub fn emit_selected(s: &ink_core::optimisation::CheckedSelection, dir: &std::path::Path) -> ink_core::LangResult<()> {
        ink_runtime::emit_selected(s, dir)?;
        install_pipeline_planner(dir, PIPELINE_PLANNER)
    }
    pub fn emit_routed(r: &ink_core::source_routing::CheckedRouting, dir: &std::path::Path) -> ink_core::LangResult<()> {
        ink_runtime::emit_routed(r, dir)?;
        install_pipeline_planner(dir, PIPELINE_PLANNER)
    }
}

pub mod distribution;
/// Filesystem/source module assembly belongs to the distribution.
pub mod modules;

pub mod representations;

pub mod compiled_plans;
