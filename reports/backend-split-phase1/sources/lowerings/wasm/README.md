# Ink WebAssembly adapter

The existing single-threaded host ABI for Ink's generated Rust state programs.
`STATE_ABI` supplies the adapter source; the Ink distribution appends it when
`emit-state --wasm-abi` is requested. The ABI is documented in ink-lang's
`docs/wasm-abi.md` and exercised by its native/Wasm interchange tests.

This is an adapter package, not a direct Wasm code generator. Rust/LLVM currently
emits wasm32-unknown-unknown; pure C programs use the C target toolchain. Neither
Ink's core nor its Rust emitter depends on this adapter. A direct Wasm backend
can later consume the same checked program boundary.

No WebGPU or wgpu implementation is claimed here.

Part of the personal siliconjungle Ink repositories. The distribution pins this
repository as a submodule. Core schema/toolchain compatibility must be explicit;
repository identities do not establish correctness.
