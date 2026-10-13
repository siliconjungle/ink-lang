# Numerical/text capability and performance experiment

- `software.ink` imports ordinary knowledge algorithms and ports bounded gl-matrix
  length semantics; `primitives.ink` covers the fixed numeric/word/text operations.
- `benchmark.mjs --fixtures` records inputs. Run the independent `ink run` evaluator
  to populate the reference directory, then `benchmark.mjs` times complete JS calls
  against saved before-normalisation artifacts and host controls. All results are
  consumed; input/module setup is outside timing. Approximation controls differ in
  numerical semantics and are labelled accordingly.
- `prepare-backend.py` builds the exact emitted C/wgpu host and generated Rust API,
  then runs `backend-bench.rs`. It copies generated host assembly, not algorithms.
- `prepare-wasm.py` builds the same generated code for both Wasm toolchains;
  `wasm-bench.mjs` validates and measures the explicit boundaries described in the
  report. The Rust-Wasm resident export omits host wire transport.
- `planning-probe.py` compares two pinned development stores with a copied compiler,
  quick automatic selection, no supplied observations/plans, and cache off.
- `report.py` retains every cell/loss, calculates geometric means and draws curves.

The report contains raw evidence, generated artifacts, exact laws/views, source
hashes and validation archives. Its original gl-matrix and seed sources are pinned
in `bench/native-f32-epoch` and `bench/real-software-delivery`; original licenses
remain there. Empty inputs and exceptional values are covered by conformance tests;
performance cells use the three documented nonempty sizes. This is not a random
held-out population experiment or a complete application benchmark.
