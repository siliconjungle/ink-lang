# Pure function WebAssembly ABI

The current `wasm32` target compiles the same pure collection programs as the native target. Stateful programs are not supported by this target yet.

```sh
lang build examples/kernels.lang --target wasm32 --zig /path/to/zig -o build/kernels.wasm
```

The compiler emits portable C and invokes Zig's Clang/LLD toolchain for a freestanding wasm32 module with SIMD enabled. It requires no WASI or JavaScript imports. JavaScript hosts instantiate it using the standard WebAssembly API.

Each exported source function is named `lang_fn_NAME`. Scalar `u64` parameters and results use Wasm `i64`, exposed as JavaScript BigInt. Interpret the result with `BigInt.asUintN(64, result)` for unsigned semantics. Boolean values use Wasm `i32` with 0/1 values.

A `List<u64>` parameter becomes two `i32` parameters: a byte offset into exported linear memory and an element count. Elements are little-endian 64-bit unsigned integers, eight-byte aligned. The host must supply a valid, non-overflowing range inside memory. A list is read-only for the duration of the call. The module does not retain the pointer.

The host can use exported `__heap_base` as the start of host-owned input buffers and grow exported `memory` as needed. Recreate JavaScript typed-array views after memory growth. Do not place inputs inside the stack or static-data region below `__heap_base`. There is no allocator or concurrent access protocol in this initial pure ABI.

This module format uses the browser-compatible WebAssembly API, but automated execution has so far been validated in Node/V8. Browser integration, stateful persistence, host capabilities and native/Wasm snapshot interchange remain separate acceptance gates.

`python3 bench/wasm.py` builds both the baseline and imported-knowledge variants, validates their binary format and checks them against independent BigInt arithmetic, including overflow and empty arrays. This correctness test is not a browser performance benchmark.
