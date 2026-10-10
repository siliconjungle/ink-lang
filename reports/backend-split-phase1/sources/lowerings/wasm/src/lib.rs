//! WebAssembly host adapter for the existing Rust state lowering.
//! It adds no optimisation/proof authority.
pub const STATE_ABI: &str = include_str!("state_wasm_support.rs");
