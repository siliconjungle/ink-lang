# Ink GPU lowering

Shared literal WGSL lowering plus WebGPU (browser) and wgpu (native) runtimes.
The existing u32 map/filter and sum/count fragment retains each source stage.
All functions have a compiled C CPU fallback, compiled to Wasm in the browser.
Capability checks identify supported emission; they are not optimisation proofs.

The runtime measures allocation/upload/dispatch/readback costs before selecting
whole-function CPU or GPU execution. GPU intermediates remain resident within
its supported collection pipeline. Device loss, unsupported functions and limits
fall back to compiled CPU code. Arbitrary cross-backend graph execution is not
implemented yet; ink-core's checked pure routing interface is its foundation.

Rust/C already compile to native machine code or Wasm through existing toolchains.
This package does not introduce architecture-specific assembly compilers.
Backend/host protocols, shader primitives, drivers and target toolchains remain
trusted. See ink-lang/docs/gpu-backend.md for supported semantics and ABI scope.
