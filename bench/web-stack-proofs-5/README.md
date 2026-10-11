# Fifth web proof batch

Seven U32 representatives compare original compilation, immutable old809 proofs and the extended catalogue using one frozen compiler. Proof objects must be fresh, default selected, replayed and reified; old809 must leave original bodies unchanged. All type instances are checked, but measured claims cover U32 only.

Original handwritten JS and Rust preserve mapped intermediate stages, first-element reads, ordered wrapping reductions and ignored-element folds. Normal JIT/release optimisations are allowed to eliminate work. Python unbounded integer oracles are independent of wrapped source-stage evaluators. Every word and source input nonmutation is validated before timing.

Each complete call pays exactly one full typed input capture, applicable Wasm input copy, result conversion, await and output consumption. A scalar first-read/ignored-input algorithm can become O(1) while the full call still pays O(N) capture/ingress. Rust input/output allocation is reused; original intermediate Vec allocations receive normal release optimisation. Scalar Rust results are returned through one preallocated output word, matching other Wasm control result conversion. Startup and first calls are separate.

WebGPU timings require actual headed-browser shader execution and exact dispatch/upload/readback counter evidence. Scalar source shapes unsupported by the current GPU emitter remain explicit fallback, never GPU samples. The weighted-difference vector function supplies a direct-map shader on both old/new sides. GPU-resident pipelines are unmeasured; this contract pays fresh uploads/readbacks.

Correctness, executable applicability and profitability are separate. Word sum/factoring laws exclude F32 reassociation. Applicable F32 first-read laws preserve expression order/bits; ignored-element folds preserve the exact seed. No runtime caller checks, wrappers or trusted optimisation rules are added.

Preparation, validation, timing and analysis are separate. Stop all test/compiler jobs before sequential Node/browser timing. Seven shuffled paired rounds follow calibration and discarded warmup. Exploratory paired bootstrap95% intervals are unadjusted for multiple comparisons. Preserve every adverse result and recommend prior candidates where benefit is not established; no automatic target-selection policy is implemented.

Wasm exported linear-memory highwater is the only measured memory metric. JS/GPU latency stays archived without invented canonical memory observations. Sources, controls, proof pins, executable artifacts, protocol, hashes, environment, startup, raw trials, calibration, warmup, counters, fallback reasons and observations are archived in a fresh report directory.
