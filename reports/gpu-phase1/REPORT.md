# u32 and GPU execution evidence

Validated on 2026-10-10 on macOS 15.7.4, arm64, Apple M4 Pro. Native execution
uses wgpu 30.0.1; browser execution uses Chrome 154.0.8037.98 and actual WebGPU
with the harness's unsafe-WebGPU enablement flag. Other OS/device combinations
were not exercised. No all-device acceleration claim follows.

- All 111 Cargo tests pass with the repository's pinned knowledge revision.
- The compiler library and ink executable build offline without a knowledge directory.
- Native GPU/compiled CPU: 1,332 comparisons against the independent Python oracle.
- Native GPU disabled: the same 1,332 comparisons pass on compiled CPU fallback.
- Browser WebGPU/compiled Wasm: 1,332 comparisons, 487 actual eligible GPU calls.
- Each host rejects four invalid argument cases. Oversized filtered input falls
  back, and a smaller later call of that function still executes on GPU.
- Browser adapter absence and deliberately invalid WGSL preserve compiled CPU results.
- Stateful reference/generated Rust agree on u32 wrapping/empty lists, count,
  folds, opaque exact Int/String/records and Boolean-list inputs.
- Input preservation and concurrent browser CPU calls pass. Native profiles are
  reused, then recalibrated after 32 uses.

The auto selector retained the four-element workload on CPU in both hosts. For
1,048,576 elements with 64 nonlinear arithmetic rounds per element, native
profiles recorded about 30.25 ms CPU and 2.15 ms GPU; browser profiles recorded
30.0 ms CPU and 2.1 ms GPU. Both selected GPU and returned 4,294,443,008.
GPU samples include allocation, packing/upload, dispatches, synchronization and
readback. Adapter/shader setup is reported separately and amortised over the
configured 32-call horizon; common input validation is outside both timings.
These medians of three runtime samples demonstrate the mechanism on one machine,
not a controlled hardware ranking or a prediction for other workloads/devices.

`metadata.json` pins source/toolchain identities, core semantics, generated C,
Wasm and shaders. `checks.json`, individual receipts and Cargo/compiler logs
record validation. Input generation and exact commands are in
[the backend guide](../../docs/gpu-backend.md) and `bench/gpu/`.
The GPU bridge and primitive implementation are trusted engineering code,
not machine-checked correctness proofs. Existing archived reports are unchanged.
