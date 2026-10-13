# Buffer and device parity evidence

The recorded Chrome 154.0.8037.98 run matches 181 comparisons with 35 actual
WebGPU calls. The owned-buffer fixture carries core identity
`d76eaddb2ddac1308c17b4035134769a1af7edaf897ac170021b72242cbd6276`. Complete CPU conformance additionally matches
47 replies and exact snapshots on C, Rust, JavaScript, C-Wasm and Rust-Wasm,
with 29 actual native wgpu calls. `browser.json` retains device counters and
aliased-swap/fallback receipts.

`examples/parallel-execution.ink` and `tests/bend_features.rs` retain the input programs
and independent expected values. `tests/temporary_lowering.rs` exercises packed
C under AddressSanitizer/UndefinedBehaviorSanitizer. The GPU package's
`tests/temporary_bounds.rs` checks split provenance, branch merges, loop growth
and explicit oversized-operation fallback; `tests/device_graph.mjs` verifies
command ordering, allocation cleanup and counters independently of shaders.

The executable conformance workflow builds both Wasm variants, prepares exact
browser artifacts with `bench/gpu/prepare-lowering-parity-browser.py`, then runs
`bench/gpu/lowering-parity-browser.mjs`. Browser replay also checks the private
buffer callbacks through their packed C-Wasm fallback bundles.

These are semantic/resource regression checks, not performance evidence or a
formal backend proof. Native Rust alone currently schedules CPU mapping on
threads; C, JavaScript and Wasm preserve ordered sequential value semantics.
