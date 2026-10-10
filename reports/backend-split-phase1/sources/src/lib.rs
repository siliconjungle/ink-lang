//! Distribution facade. Semantic core has no lowering dependency.
pub use ink_core::*;
pub use ink_lowering_c::native;
pub use ink_lowering_gpu::gpu;
pub use ink_lowering_rust::{definition_native, ordered_storage};
pub mod state_native {
    pub use ink_lowering_rust::state_native::*;
    pub const WASM_ABI: &str = ink_lowering_wasm::STATE_ABI;
}
pub mod machine {
    pub use ink_core::machine::*;
    pub use ink_lowering_rust::machine_native::{emit, lower, Emission, Evidence};
}

pub mod snapshot {
    pub use ink_core::snapshot::*;
    pub use ink_lowering_rust::snapshot_code::schema_code;
}
