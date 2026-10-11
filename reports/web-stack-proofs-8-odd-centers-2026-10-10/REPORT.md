# Ink web proof batch 8 — 10 October 2026

Two proof authors and an independent reviewer contributed **20 fresh checked proofs**, growing the catalogue **875→895 entries**. All **85 knowledge tests pass**. Every measured JavaScript runtime and direct-output pair improves over old875 on both hosts. Largest full-width browser sixth/eighth wrapping-word moments improve **4.38× / 5.08×**; Node improves **8.14× / 9.06×**. Collection pipeline elimination improves largest browser JS **1.47–1.95×** and supplies a host-specific **2.6% Wasm gain** for projection elimination. These are static polynomial and collection models with no artificial repeat loops.

Generated JS is **45.6% smaller**, C **37.0% smaller** and Wasm **7.6% smaller**. Actual WebGPU is measured, but **no GPU speedup is established by this batch**. The matrix retains **152 supported gains, 77 inconclusive comparisons and five regressions**; these include correlated runtime/direct JS views and are exploratory individual intervals, not independent replications. Correctness, applicability, eligibility and profitability remain distinct.

## Mathematical objects and executable coverage

| Family | Instances | Checked transformation |
|---|---:|---|
| Centered fourth moment | 3 | Expanded alternating binomial polynomial becomes `(x-d)^4` via compact products |
| Centered sixth moment | 3 | Expanded alternating binomial polynomial becomes `(x-d)^6` via compact products |
| Centered eighth moment | 3 | Expanded alternating binomial polynomial becomes `(x-d)^8` via compact products |
| Discarded left map/projection and postmap | 4 | `map(xs,f).zip(xs,second).map(g) → map(xs,g)` |
| Discarded right map/projection and postmap | 4 | `xs.zip(map(xs,f),first).map(g) → map(xs,g)` |
| Complemented zip and postmap | 3 | `map(xs,d-x).zip(xs,+).map(g) → map(xs,fn(x)=>g(d))` |

Numeric families cover U32/I32/U64 wrapping rings using the existing Normalize proof term. Alternating coefficient vectors are `[1,4,6,4,1]`, `[1,6,15,20,15,6,1]` and `[1,8,28,56,70,56,28,8,1]`. They are word moment models modulo 2^32 or 2^64, not floating-point statistical moment or accuracy claims. F32 reassociation is excluded. Compact targets use balanced repeated products; no runtime exponent loop or synthetic iteration count is introduced.

Projection laws cover U32/I32/U64/F32, quantifying arbitrary pure total unary maps. Mapping preserves length/order; the selecting zip discards the mapped value and returns the original element, then applies the same postmap. List induction checks Nil and Cons, preserving exact F32 exceptional bits. Complement conservation covers words only: `(d-x)+x=d` is exact in their wrapping ring; F32 rounding/exceptional values would invalidate cancellation. Constant output maps still traverse/allocate/write one result per input element and retain complete input transport.

All 20 instances admit, default-select, replay and reify. Old875 applies zero laws to the actual benchmark sources and retains their original bodies. New895 applies exactly six fresh laws, one per kernel, and changes all six bodies. Numeric evidence includes 36 original/selected interpreter frames and 5,472 independent ordered-literal versus unbounded-power word cases. Collection evidence includes 57 complete-array interpreter frames with seeded random inputs, boundaries, empty lists and F32 NaN, ±Infinity and signed zero. Five hash-valid false controls reject for semantic mismatch.

[Compute notes](../../knowledge/research/web-stack-proofs-8/compute/notes.md), [compute receipts](../../knowledge/research/web-stack-proofs-8/compute/evidence.json), [collection proofs/receipts](../../knowledge/research/web-stack-proofs-8/collection/NOTES.md), [publication](publication.json), [independent review](../../knowledge/research/web-stack-proofs-8/review.md) and [full test log](knowledge-tests.log) preserve evidence. The full 85-test suite passes in 154.729 seconds; validation duration is not benchmark timing. Typed correctness coverage is broader than the six U32 performance representatives. All 102 guarded compiler/core/runtime/planner/backend source hashes are unchanged. Generated functions trust callers; no validators or optional checker wrappers are added.

## Frozen odd-center comparison

Prior snapshot: `7236d0bffbe86aa0fac98bd47c12d2345b864043cb7bde3a8a7b67b3ee27d1ca`. New895 snapshot: `752d024a92fbd44f29d31441375e43c21542cb38a62e2df8bddf176f549f347e`. Frozen compiler SHA256: `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`. [Metadata](metadata.json) freezes 83 artifacts and records selection replay, toolchains, commands and shader manifests.

Apple M2, Node 26.1.0 and headed Chrome 154/Apple Metal-3 run six kernels. Thirteen correctness inputs include empty/singleton, word boundaries, zero/unit factors and odd random vectors. Timed cells combine small/full-width words with lengths 32/4096/65536. Centers are **509** and **0x9e3779b9 (2654435769)**, both odd, to avoid zeroing high cross terms with power-of-two centers. Performance remains specific to those input/scalar profiles; correctness is checked for varied other centers.

An [initial preparation](../web-stack-proofs-8-2026-10-10/metadata.json) used the historical centers 512/2^31 and remains immutable and **untimed**. The reviewer identified their cross-term degeneracy before timing. The primary preparation has new profiles: [correction receipt](profile-correction.json) verifies all 83 original hashes and 70 identical artifacts, including core/selections, original JS/Rust sources and emitted JS/C/WGSL. Rebuilt Wasm and plan metadata differ; there is no cross-preparation speed comparison or pooled measurement. The original full test log is preserved and copied byte-for-byte into this report.

Each complete call includes exactly one full typed-input snapshot, applicable Wasm input copying/public output conversion, await and checksum consumption. GPU includes actual upload, dispatch and readback. Startup and first calls are archived separately. Original JS/Rust controls retain left-associated polynomial factors and alternating accumulation, and separate mapped/zip/postmap collection stages. Normal JIT/release optimizations, including shared-subexpression elimination, are allowed. JS/Rust moment controls are emitted from the original source expression AST to preserve association; independent Python oracles use modular powers rather than that expansion. Rust reuses final input/output storage while intermediate Vec stages receive ordinary optimization.

Seven shuffled paired rounds follow calibration and discarded warmup. Individual paired bootstrap 95% intervals are exploratory and unadjusted for multiple comparisons. No compiler, test or analysis jobs run during sequential Node/browser timing. Original control preflight passes 78 JS outputs and 276 Python source-stage values; compiled CPU prevalidation passes 858 exact comparisons. Python modular powers/collection closed forms verify complete outputs, while ordered wrapping evaluators corroborate all boundary words and the first four other vector elements.

[Node report](node-REPORT.md) retains **2,772 timed samples / 1,254 exact backend comparisons**. [Browser report](browser-REPORT.md) retains **3,276 samples / 1,362 comparisons**. All raw rounds, calibration, warmup, startup, first validation calls, nonmutation and checksum evidence remain archived.

## Measured improvements and retained adverse results

Browser largest full-width prior/new complete-call ratios:

| Workload | Runtime JS | Wasm | Comparable actual GPU |
|---|---:|---:|---:|
| centered_fourth_moment | 1.250× [1.241, 1.302] | 1.007× [0.993, 1.020] | 0.994× [0.953, 1.006] |
| centered_sixth_moment | 4.385× [4.331, 4.497] | 0.993× [0.993, 1.013] | 1.008× [0.978, 1.047] |
| centered_eighth_moment | 5.083× [4.743, 5.211] | 1.020× [1.000, 1.040] | 1.002× [0.961, 1.012] |
| projected_right | 1.857× [1.786, 1.882] | 1.026× [1.014, 1.039] | Prior fallback; new eligible |
| projected_left | 1.467× [1.410, 1.498] | 0.988× [0.977, 1.006] | Prior fallback; new eligible |
| complemented_total | 1.951× [1.865, 1.964] | 1.017× [0.997, 1.024] | Prior fallback; new eligible |

Ratios above 1 favor new output; intervals containing 1 remain unresolved. All **144 runtime/direct JS same-backend comparisons** are supported gains. Largest Node runtime JS ratios are fourth 1.451×, sixth 8.140×, eighth 9.063×, projected-right 2.754×, projected-left 1.568× and complemented-total 3.022×, with intervals excluding 1. These are specific algorithms/profiles, not general language rankings. No cause is inferred for the different degree-specific JS effect sizes without engine profiling.

Wasm has **eight supported gains, 61 inconclusive comparisons and three regressions** across both hosts. Browser projected-right full65536 gains **1.02586× [1.01420,1.03854]**; Node projected-left full65536 gains **1.02246× [1.01336,1.03446]**. Node complemented-total full65536 is **1.01263× [1.00020,1.04593]**, with a borderline lower endpoint. Those results support host/profile-specific improvements, not uniform Wasm acceleration.

All five adverse cells remain archived:

| Host | Workload / input | Backend | Prior/new ratio and exploratory interval |
|---|---|---|---:|
| node | centered_fourth_moment / full-4096 | wasm | 0.986× [0.976, 0.998] |
| browser | centered_eighth_moment / small-32 | wasm | 0.963× [0.910, 0.999] |
| browser | centered_sixth_moment / small-4096 | gpu | 0.964× [0.946, 0.996] |
| browser | projected_right / small-4096 | wasm | 0.990× [0.983, 0.996] |
| browser | centered_sixth_moment / full-4096 | gpu | 0.973× [0.963, 0.998] |

[Profitability profiles](profitability.json) recommend retaining the prior candidate wherever the measured difference is adverse or unresolved. The two GPU regressions affect sixth moments at 4096 small/full words; there are no supported GPU gains. These profiles are evidence, not an implemented general target-specific selection policy. Fewer operations or smaller files alone do not establish speed.

## Actual GPU execution and routes

The three numeric kernels have old/new shaders for same-backend comparisons. Three collection sources originally use unsupported nested receivers; checked fusion yields direct maps and real shader eligibility. Eligibility gains supply no old/new GPU ratio. The browser records **72 actual GPU variant/cells, 504 timed GPU samples, 72 warmups and 72 calibration rows**. Each full vector call has one dispatch, `4*N+24` upload bytes and `4*N` readback bytes; accumulated trial/warmup/calibration counters pass. All **36 original/prior collection fallback records** remain excluded from GPU timing.

Current runtime JS has the lowest median in all 36 browser cells. All 72 paired current CPU/GPU intervals favor CPU, with maximum upper bound about 0.79435. [Routing evidence](backend-routing.json) includes real transport/output costs. GPU-resident pipelines, an automatic routing policy and an already-optimized target-code control are unmeasured/unimplemented. No repeat was used to promote an unresolved GPU effect.

## Sizes, original controls and database

[Uncompressed emitted sizes](artifact-sizes.json): JS **6,493→3,534 bytes (45.6% smaller)**, C **15,447→9,732 (37.0% smaller)** and Wasm **25,609→23,662 (7.6% smaller)**. Plans/runtime/compressed network transfer are excluded. Shader count changes 3→6; aggregate WGSL bytes are not a like-for-like size comparison.

Checked direct JS beats the original-algorithm handwritten JS control in all 36 cells on each host. Checked Wasm is slower than the original-algorithm Rust-Wasm control in all 36 cells on each host. Ordinary optimizer behavior and storage/boundary choices differ; expert already-factored/fused controls, native Rust and general language rankings are outside scope.

Importing **288 authenticated measured Wasm observations** increases the canonical database **4,158→4,446**, preserving the 895-entry proof snapshot and all earlier archives. Canonical memory means exported Wasm linear-memory highwater only. Host/JS/GPU memory remains unmeasured; those latency/counter/routing records stay archived without fabricated memory observations. [Import receipt](observation-import.json) records every identity and source hash.

Total evidence: **6,048 timed samples**, **2,616 exact backend comparisons**, **504 actual GPU samples** and **828 independently recomputed paired intervals**. All 83 primary frozen artifacts and 102 guarded source hashes pass. [Final verification](verification.json), [interval audit](root-interval-verification.json), [source harness](../../bench/web-stack-proofs-8.py) and [independent review](../../knowledge/research/web-stack-proofs-8/review.md) retain evidence and limits. No new trusted optimization rules, compiler/runtime/backend changes, caller checks, commits, pushes or PRs were added. Everything remains local.
