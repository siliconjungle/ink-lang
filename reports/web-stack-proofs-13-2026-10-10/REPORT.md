# Ink web proof batch 13 — 10 October 2026

Two proof authors and an independent reviewer supplied **21 fresh checked proofs**, growing the catalogue **977→998**. Six U32 representatives were measured with the same frozen compiler. Browser JavaScript benefits are clear on the largest inputs, but Node has adverse workloads. **No confirmed GPU speedup is established:** the one nominal main-run GPU gain fails a separate same-input repeat.

These remain targeted proof benchmarks. The collection equations are reusable for arbitrary pure total unary callbacks, while the 6/12/24-term geometric prefixes are specialised word-polynomial patterns. This batch measures representative instances, not the whole compiler or a broad application suite. It does not establish a general ranking of Ink, JavaScript, Wasm or Rust.

| Proof family | Instances | Transformation |
|---|---:|---|
| Mixed-radix geometric prefixes with 6/12/24 terms | 9 | Expanded sums/products become compact shared-power factor products |
| Mapped-value left gate | 4 | Bind the left mapped predicate value once; skip an unused right callback and fuse output stages |
| Mapped-value right gate | 4 | Bind the right mapped predicate value once; retain the original comparison and fuse output stages |
| Nested weighted gate | 4 | Fuse nested zip/postmap and skip unused weighting work |

Numeric laws cover U32/I32/U64 rings modulo 2^32 or 2^64. For m=1/2/3, the divisor-free identity is `S_(3*2^m)(x) = (1+x+x²)*product(1+x^(3*2^j), j=0..m-1)`, where `S_N(x)=1+x+...+x^(N-1)`. Source sums and products are explicitly balanced, with no shared-power source locals. Targets share x²/x³/x⁶/x¹² through existing typed Lets; both versions retain final `*k+seed`. Mathematical powers here are notation: compiled sources have no runtime exponent loop, artificial repeat or division, and x=1 is valid. These are arbitrary wrapping-word models, excluding F32 and real-series numerical-accuracy claims.

Actual source/selected scalar AST counts, including calibration and each local binding expression:

| Kernel | Multiplications | Additions | Selected existing Lets |
|---|---:|---:|---:|
| mixed_prefix6 | 11→4 | 6→4 | 2 |
| mixed_prefix12 | 56→6 | 12→5 | 3 |
| mixed_prefix24 | 254→8 | 24→6 | 4 |

These are structural operations, not machine instructions or speed ratios. Normal JIT/release/compiler/driver common-expression elimination is allowed for both versions; an original backend may already remove much of this work. Sharing uses existing beta/Let semantics rather than a new trusted optimisation rule.

Collection laws also cover F32. The first two gates depend on mapped values, so selected code binds the relevant callback result once for both comparison and output. Replacing that predicate with an original-input predicate would be wrong. The nested gate retains the original `x+(x*k)` grouping. Original `<` and exact per-element primitive grouping/rounding are preserved, including NaNs, infinities and signed zeros; `<` false includes unordered NaN outcomes and is not generally equivalent to `>=`. Pure total callbacks permit global scheduling changes and omission of unused invocations; effectful or divergent callbacks are outside this model. Mapped-value families remove three intermediate lists, and the nested family removes two. Full output allocation/writes/transport remain O(N).

All 21 statements admit through the existing generic kernel, default-select, replay and reify. Immutable old977 selects zero applications and leaves all six actual benchmark bodies unchanged; new default planning applies exactly one fresh law per function. IDs and exact statement endpoints are checked for prior-catalogue duplicates. Hashes and pins identify evidence rather than establish mathematical truth. [Numeric evidence](../../knowledge/research/web-stack-proofs-13/compute/evidence.json) authenticates 85 author artifacts; [collection notes/receipts](../../knowledge/research/web-stack-proofs-13/collection/NOTES.md), [selection metadata](metadata.json) and [publication](publication.json) retain commands and evidence.

**Current validation: 21 tests pass**, comprising six numeric tests, three collection tests and twelve store/publisher/performance regressions. The authenticated earlier **112-test full suite is historical**; the complete 130-test suite was not rerun for this batch. [Test scope](test-scope.json) records this distinction. Numeric execution covers 36 frames/72 original-selected runs and 396 scalar output checks, plus 5,472 independent literal/unbounded/factor/recurrence oracle cases. Collection evidence contains 72 complete-array interpreter comparisons across all four types, with exceptional F32 values. Three numeric and two collection content-hash-valid false objects reject semantically rather than for identity mismatch.

Prior snapshot `a7ca4c89c1f610ee997319a7e13601b263ee187515ecb5e0f7a506cb40c6636c`; new snapshot `30e427bcb8524fe3760881a3a5722c7445f9fdab3d2818a707b8d8508e80c110`; frozen compiler `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`. The same compiler emits no-selection, prior977 and new998 variants. All 81 frozen artifacts and 102 guarded compiler/core/runtime/planner/backend source files remain unchanged. No production core/backend/runtime/planner changes, caller validators, optional checker wrappers or new trusted proof rules are introduced. Functions retain the trusted-caller contract.

Measurements use Apple M2/macOS, Node v26.1.0 and Chrome 154 with an Apple Metal-3 adapter. Thirteen correctness fixtures cover empty/singleton, wrapping boundaries, zero/unit factors and random words. Timed arrays contain 32/4096/65536 small/full-width words, offsets 509/0x9e3779b9 and factors 7/2^32-3. All timed outputs are nonconstant; mapped-value and original-input gates exercise both outcomes in each timed input. [Fixture profiles](fixture-profile.json) record branch counts. Independent Python unbounded geometric/collection references check complete outputs; ordered literal word operations/stages corroborate boundary words and the first four other words.

Complete calls include one full typed-input snapshot per implementation, applicable Wasm ingress copies/public output conversion, await and checksum consumption. Actual GPU calls include upload, dispatch and readback. Direct compiled JS uses the same snapshot/checksum boundary as the handwritten original JS control. Startup, lazy Wasm first calls and shader preparation are separate. Rust reuses final input/output storage; intermediate Vec stages receive normal release/library optimisation. Numeric controls preserve exact balanced expanded source trees; collection controls retain eager original map/zip/postmap stages. Normal JIT/release optimisation is allowed.

Current original-algorithm control comparisons, derived from archived individual paired intervals (checked/control latency; lower favours checked):

| Host | Runtime Ink JS / original JS | Direct Ink JS / original JS | Ink Wasm / original Rust-Wasm |
|---|---|---|---|
| node | checked faster: 36, inconclusive: 0, control faster: 0 | checked faster: 36, inconclusive: 0, control faster: 0 | checked faster: 0, inconclusive: 0, control faster: 36 |
| browser | checked faster: 36, inconclusive: 0, control faster: 0 | checked faster: 36, inconclusive: 0, control faster: 0 | checked faster: 0, inconclusive: 0, control faster: 36 |

Each host has 36 workload cells. [Comparison scope](comparison-scope.json) binds the current summaries and exact comparison ranges. These compare the archived original algorithms and implementation boundaries. No already-factored/fused expert JS control or native Rust control is measured in this batch. Wasm toolchains/boundaries differ, so language/compiler effects are not isolated. The [older native collection experiment](../collection-proof-phase1/REPORT.md) found near parity with combined-loop Rust (Ink/Rust elapsed ratio 0.991 across 24 cells), using an older compiler on an M4 Pro shared interactive machine, without confidence intervals or CPU pinning. Some older benchmark code contains a retired path; that does not erase this archived native evidence, which also does not establish current broad native parity. Generalisation requires a broader current application suite, fair expert controls and native measurements; the current targeted results alone do not support a general language ranking.

Largest full-width browser prior/new complete-call ratios (above 1 favours new proofs):

| Kernel | Runtime JS | Wasm | Comparable actual GPU |
|---|---:|---:|---:|
| mixed_prefix6 | 1.295× [1.237, 1.330] | 1.000× [0.993, 1.013] | 1.010× [0.971, 1.070] |
| mixed_prefix12 | 4.258× [4.177, 4.342] | 1.000× [0.993, 1.007] | 1.012× [0.964, 1.030] |
| mixed_prefix24 | 4.341× [4.178, 4.427] | 1.000× [0.987, 1.033] | 1.006× [0.947, 1.012] |
| value_gated_left | 1.287× [1.287, 1.320] | 1.051× [1.038, 1.085] | Prior CPU fallback; new shader eligible |
| value_gated_right | 1.298× [1.281, 1.325] | 1.067× [1.032, 1.081] | Prior CPU fallback; new shader eligible |
| nested_gated_route | 1.462× [1.405, 1.490] | 1.064× [1.039, 1.084] | Prior CPU fallback; new shader eligible |

At the same largest browser inputs, comparisons with original-language controls and current GPU routing are:

| Kernel | Original JS / direct Ink JS | Ink Wasm / original Rust-Wasm | GPU / runtime Ink JS |
|---|---:|---:|---:|
| mixed_prefix6 | 4.689× [4.477, 4.780] | 1.667× [1.645, 1.700] | 6.844× [6.624, 7.002] |
| mixed_prefix12 | 4.599× [4.513, 4.886] | 1.678× [1.656, 1.700] | 6.390× [6.268, 6.715] |
| mixed_prefix24 | 4.481× [4.452, 4.706] | 1.645× [1.614, 1.700] | 6.310× [6.151, 6.619] |
| value_gated_left | 5.508× [5.505, 5.544] | 1.667× [1.614, 1.699] | 3.618× [3.535, 3.815] |
| value_gated_right | 5.368× [5.231, 5.581] | 1.657× [1.616, 1.711] | 3.535× [3.429, 3.603] |
| nested_gated_route | 2.942× [2.886, 2.981] | 1.680× [1.650, 1.732] | 4.369× [4.253, 4.545] |

Thus direct Ink JS is roughly 2.9–5.5× faster than these original-stage JS controls; original Rust-Wasm is roughly 1.65–1.68× faster than Ink Wasm. Actual GPU complete calls take roughly 3.5–6.8× the runtime-JS latency, including transfers. The intervals and exact control scope above matter; these are workload-specific comparisons.

[Main profitability profiles](profitability.json) classify 234 measured prior/new views:

| Backend | Faster | Inconclusive | Slower |
|---|---:|---:|---:|
| js | 61 | 3 | 8 |
| direct_js | 60 | 4 | 8 |
| wasm | 33 | 39 | 0 |
| gpu | 1 | 15 | 2 |
| Total | 155 | 61 | 18 |

The 18 adverse views comprise 16 correlated runtime/direct-JS views over **nine distinct Node workloads**, plus two browser GPU views. They are not 18 independent Node workloads. Node regressions affect the smaller prefix and some mapped-gate shapes; all six largest browser runtime-JS cells improve. Structural operation savings do not guarantee host/JIT profitability. Every adverse view is retained:

| Host | Kernel/input | Backend | Prior/new 95% interval |
|---|---|---|---:|
| node | mixed_prefix6/small-32 | js | 0.945× [0.922, 0.979] |
| node | mixed_prefix6/small-32 | direct_js | 0.957× [0.929, 0.977] |
| node | mixed_prefix6/small-4096 | js | 0.942× [0.931, 0.947] |
| node | mixed_prefix6/small-4096 | direct_js | 0.934× [0.922, 0.942] |
| node | value_gated_left/small-4096 | js | 0.915× [0.891, 0.933] |
| node | value_gated_left/small-4096 | direct_js | 0.913× [0.910, 0.917] |
| node | mixed_prefix6/small-65536 | js | 0.918× [0.906, 0.940] |
| node | mixed_prefix6/small-65536 | direct_js | 0.928× [0.895, 0.951] |
| node | mixed_prefix6/full-32 | direct_js | 0.965× [0.913, 0.998] |
| node | mixed_prefix6/full-4096 | js | 0.927× [0.922, 0.934] |
| node | mixed_prefix6/full-4096 | direct_js | 0.922× [0.916, 0.935] |
| node | value_gated_left/full-4096 | js | 0.975× [0.956, 0.997] |
| node | value_gated_right/full-4096 | js | 0.952× [0.939, 0.960] |
| node | value_gated_right/full-4096 | direct_js | 0.958× [0.934, 0.980] |
| node | mixed_prefix6/full-65536 | js | 0.933× [0.911, 0.962] |
| node | mixed_prefix6/full-65536 | direct_js | 0.911× [0.896, 0.944] |
| browser | mixed_prefix6/small-4096 | gpu | 0.985× [0.973, 0.998] |
| browser | mixed_prefix6/full-4096 | gpu | 0.839× [0.777, 0.882] |

Profiles recommend retaining prior candidates for adverse/unresolved comparisons. These proof-candidate recommendations are separate from the existing bounded backend selector described below. Individual 95% paired intervals are exploratory and unadjusted for multiplicity; correlated runtime/direct views are not independent replications.

[Control preflight](control-preflight.json) passes 78 original-JS complete-output comparisons and 276 Python literal checks. CPU prevalidation passes 858 comparisons. The first console stdout redirection collided with the node-written JSON filename; the damaged receipt is preserved, and validation was rerun successfully with a distinct console log. [Rerun receipt](validation-rerun.json) authenticates both files; this was an evidence-file collision, not a proof/source failure.

Seven shuffled paired rounds follow calibration and discarded warmup, with a 15 ms calibration target. [Pre-timing receipt](pre-timing.json) records stopped author/compiler/test jobs before sequential Node/browser timing. Raw results retain calibration, warmups, output checksums, nonmutation, actual backend, fallback reason and per-call counters.

Main actual WebGPU execution covers **72 variant/cells and 504 timed samples**; 36 unsupported original/prior collection fallback records are excluded from GPU timings. Each real vector call reports one dispatch, `4*N+24` upload bytes and `4*N` readback bytes. Three original collection pipelines become shader-eligible direct maps. This is eligibility evidence, not a comparison between two GPU shaders.

Only mixed_prefix24/full-32 has a nominal main GPU interval excluding equality in favour of the new code. Its separate same-input confirmation and a small-32 companion are:

| Kernel/input | Separate prior/new complete-call ratio | Verdict |
|---|---:|---|
| mixed_prefix24/small-32 | 1.006× [0.967, 1.045] | inconclusive |
| mixed_prefix24/full-32 | 0.998× [0.935, 1.011] | inconclusive |

The nominal main result was 1.020× [1.007, 1.040]; the full-32 repeat is 0.997565× [0.935484, 1.010956], including equality. **Zero of one nominal GPU gains replicate; no confirmed GPU speedup is established.**

[Confirmation receipt](gpu-confirmation.json) authenticates a separate run with 196 timed samples, 171 exact comparisons, 42 actual GPU samples, 30 independently recomputed intervals and 69 frozen artifacts. [Confirmation preflight](gpu-confirmation-preflight.json) checks all 13 correctness input arrays/scalars/expected outputs and 9 corresponding shader/runtime/device files against the main run. The repeat narrows timed case/shapes only. No pooling or repeat observation import occurs. [Separate report](../web-stack-proofs-13-gpu-confirmation-2026-10-10/browser-REPORT.md) retains the results.

The repeat screenshot displays a read-only saved-result `evidence.html` viewer: the original browser tab was closed during user steering. It is presentation evidence rather than a fresh timing run; authenticated machine JSON, input identities and artifact hashes establish the saved result.

[Routing evidence](backend-routing.json) records 72 current JS/Wasm-to-GPU intervals. All favour CPU under the measured complete-call boundary; JS has the lowest checked median in all 36 browser workload cells. Batch13 forces explicit backends, so these measurements do not test automatic selector behaviour or GPU-resident pipelines.

Ink already has bounded automatic backend selection. In [ink-runtime host code](../../runtime/hosts/backend-selection.mjs), `auto` compares eligible pure compiled JavaScript, Wasm CPU and WebGPU candidates using measured prepared execution and setup costs; shared input capture/plan preparation occurs before profiling. It uses three alternating trials, amortises setup over `expectedCalls` (default 32), caches up to 32 shapes, rechecks after `recheckEvery` uses (default 32), and requires a 10% cost saving before switching. [Browser selection documentation](../../docs/javascript-backend.md#browser-backend-selection) describes the boundary. The policy is currently implemented in the JavaScript host, not authored as an Ink algorithm. Benchmark algorithms are written in Ink and database proofs are applied at compile time. This existing selector is not a generalised load-aware optimiser or state-migration system, and this batch does not measure its automatic decisions.

Uncompressed emitted file sizes:

| Artifact | Prior977 bytes | New998 bytes | Reduction |
|---|---:|---:|---:|
| program.mjs | 11548 | 4253 | 63.2% |
| cpu.c | 26934 | 10531 | 60.9% |
| cpu.wasm | 47680 | 26011 | 45.4% |

Plans/runtime and compressed transfer are excluded. Shader count changes 3→6, so aggregate WGSL bytes are not a like-for-like reduction claim.

[Observation import](observation-import.json) adds 288 authenticated main-run Wasm observations, growing **5598→5886**, retaining the new proof pin. Memory means exported Wasm linear-memory highwater only; host/JS/GPU memory is unmeasured. Confirmation contributes no canonical observations.

[Node report](node-REPORT.md): 2772 timed samples, 1254 exact comparisons, 144 observations. [Raw results](node-results.json) preserve trials and validation receipts.
[Browser report](browser-REPORT.md): 3276 timed samples, 1362 exact comparisons, 144 observations. [Raw results](browser-results.json) preserve trials and validation receipts.

Main totals are **6048 timed samples and 2616 exact comparisons**. [Independent main interval audit](root-interval-verification.json) recomputes all 828 intervals and authenticates 81 frozen artifacts. Final [independent verification](verification.json) authenticates members, source guards, imported observations and confirmation separately. Work remains local; no commit, push or PR was created.
