# Ink web proof batch 9 — 10 October 2026

Two proof authors and an independent reviewer supplied **19 fresh checked proofs**, growing the database **895→914**. All **94 knowledge tests pass** in 186.767 seconds. This batch measures six U32 representatives with the same frozen compiler, complete calls and original-algorithm JavaScript/Rust-Wasm controls.

| Proof family | Instances | Transformation |
|---|---:|---|
| Equal-control Bernstein cubic/quintic/septic | 9 | `Σ C(n,i)·d·x^i·(1-x)^(n-i) → d`, n=3/5/7 |
| Difference of identical mapped lists, then postmap | 3 | `map(f).zip(map(f), subtraction).map(g) → map(g(0))` |
| Complementary scaled maps, then postmap | 3 | `map(a*x).zip(map(d-a*x), addition).map(g) → map(g(d))` |
| Appended suffix ignored by prefix zip | 4 | `xs.concat(ys).zip(xs, addition).map(g) → xs.map(g(x+x))` |

The first three families use exact U32/I32/U64 wrapping rings, modulo 2^32 or 2^64. They do not assert floating-point cancellation or probability semantics. The prefix family also preserves ordered F32 addition, including exceptional values. Its proof quantifies an independent tail ys; timing instantiates ys=xs. Constant-vector results still capture, traverse, allocate, write and transport O(N) data.

All 19 laws admit, default-select, replay and reify. Old895 selects zero applications and retains all six original source bodies; the extended catalogue applies exactly one fresh law per kernel. Numeric evidence includes 36 interpreter frames, 5,472 independent literal/unbounded word checks and three false controls. Collection evidence includes 51 full-array interpreter frames and two false controls. All five hash-valid false controls fail semantically. [Author evidence](../../knowledge/research/web-stack-proofs-9/), [publication](publication.json), [full tests](knowledge-tests.log) and [independent review](../../knowledge/research/web-stack-proofs-9/review.md) retain receipts.

Prior snapshot `752d024a92fbd44f29d31441375e43c21542cb38a62e2df8bddf176f549f347e`; new snapshot `f4ecec9af452c37bff54696504e01e28aa7cc201bb6eb01d11c7107efb00331c`; compiler `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`. [Metadata](metadata.json) freezes 82 artifacts. All 102 guarded compiler/core/runtime/planner/backend source hashes remain unchanged. No caller validators or optional checking wrappers are added.

Thirteen correctness inputs include empty/singleton, U32 boundaries, zero/unit factors and random words. Six timed shapes combine small/full-width basis words with lengths 32/4096/65536; controls are 509 and 0x9e3779b9, factors 7 and 2^32-3. Arbitrary basis words exercise the wrapping-ring Bernstein partition identity. No artificial repetition loop is added. Performance evidence is U32-only, narrower than typed correctness coverage.

Each complete call includes one full typed input snapshot, applicable Wasm copies/public output conversion, await and checksum consumption. Actual GPU includes upload, dispatch and readback. Startup/first-call preparation is separate. Original numeric JS/Rust controls preserve exact AST operation association; collection controls preserve original map/zip/concat/postmap stages with normal JIT/release optimization allowed. Python independent closed forms validate full outputs; literal wrapping stages corroborate boundary words and the first four other words. JS prefix control materializes two ordinary arrays before concat from typed input; Rust collects one padded Vec. This translation choice limits cross-language control comparisons. Rust reuses final input/output storage while intermediates receive ordinary release optimization.

Control preflight passes 78 complete original-JS outputs and 276 Python literal values; compiled CPU prevalidation passes 858 exact comparisons. Seven shuffled paired rounds follow calibration and discarded warmup. No compiler/test/analysis jobs run during sequential timing. Individual 95% paired bootstrap intervals are exploratory and unadjusted for multiple comparisons; correlated runtime/direct views are not independent replications.

Largest full-width browser complete-call prior/new ratios (above 1 favors new proofs):

| Kernel | Runtime JS | Wasm | Comparable actual GPU |
|---|---:|---:|---:|
| bernstein_cubic_constant | 1.307× [1.274, 1.316] | 1.012× [1.000, 1.025] | 1.039× [1.023, 1.074] |
| bernstein_quintic_constant | 4.026× [3.949, 4.105] | 0.994× [0.982, 1.012] | 0.994× [0.968, 1.013] |
| bernstein_septic_constant | 4.403× [4.238, 4.490] | 1.006× [0.976, 1.025] | 1.023× [0.964, 1.072] |
| mapped_difference | 2.187× [2.146, 2.229] | 1.000× [0.982, 1.031] | Prior fallback; checked shader eligible |
| paired_complement | 2.122× [2.095, 2.213] | 1.012× [0.982, 1.044] | Prior fallback; checked shader eligible |
| padded_prefix | 1.316× [1.273, 1.342] | 1.012× [0.988, 1.024] | Prior fallback; checked shader eligible |

Across both hosts/backends, [profitability](profitability.json) retains **{'faster': 157, 'inconclusive': 77}**. Unsupported or adverse intervals recommend retaining the prior candidate. These observations do not implement an automatic target-selection policy. All adverse comparisons follow:

| Host | Kernel/input | Backend | Prior/new interval |
|---|---|---|---:|
| — | No supported adverse cells in this run | — | — |

All 72 runtime-JS intervals support improvement; 71 direct-JS pairs improve and one remains unresolved. Wasm has 13 supported small gains and 59 unresolved pairs. One original/prior-to-new cubic GPU interval is nominally supported, 1.03896× [1.02273,1.07362], among 18 comparable GPU pairs. A separate confirmation below governs the GPU conclusion. These are individual exploratory intervals.
Actual WebGPU records **72 variant/cells and 504 timed samples**; 36 fallback records remain excluded. Each actual vector call reports one dispatch, `4*N+24` upload bytes and `4*N` readback bytes. Three original collection pipelines have unsupported nested receivers; fresh laws make direct maps shader-eligible. Eligibility alone supplies no old/new GPU speedup. [Routing evidence](backend-routing.json) records checked backend medians and 72 CPU/GPU intervals; fastest-median counts are {'js': 36}. GPU-resident pipelines and automatic routing are unmeasured/unimplemented.

Uncompressed emitted sizes:

| Artifact | Old895 | Checked914 | Reduction |
|---|---:|---:|---:|
| program.mjs | 7261 | 2900 | 60.1% |
| cpu.c | 17264 | 8482 | 50.9% |
| cpu.wasm | 30397 | 15828 | 47.9% |

Plans/runtime/compressed transfer are excluded. Shader count changes 3→6, so aggregate WGSL size is not like-for-like. Original-algorithm controls permit optimizer behavior and have different allocation/boundary choices. Expert already-factored/fused controls, native Rust and general language rankings are outside scope.

Importing **288 authenticated Wasm observations** grows canonical observations **4446→4734**, preserving the proof pin. Memory means exported Wasm linear-memory highwater only; host/JS/GPU memory is unmeasured, so their latency/counter data stays archived without invented memory records. [Import receipt](observation-import.json) records identities and source hashes.

[Node report](node-REPORT.md): 2772 timed samples, 1254 exact comparisons and 144 observations. Raw trials, warmups, calibration, checksums, nonmutation and fallback reasons remain archived.
[Browser report](browser-REPORT.md): 3276 timed samples, 1362 exact comparisons and 144 observations. Raw trials, warmups, calibration, checksums, nonmutation and fallback reasons remain archived.

[Independent interval audit](root-interval-verification.json) recomputes 828 paired intervals. [Final verification](verification.json) authenticates all members, frozen artifacts, guarded source files and imported observations. Everything remains local; no commit, push or PR has been created.

Independent GPU confirmation: The original cubic full65536 GPU gain did not replicate: separate prior/new ratio 0.98089× [0.95541, 1.01282], inconclusive. No repeatable GPU performance gain is established by this batch. Separate same-profile confirmation: narrowing cases/sizes changes RNG consumption and both timed word arrays; scalar parameters, distributions and protocol remain the same. Seven correctness inputs match. GPU shader/runtime/device files are byte-identical; this is not an identical-input repeat. [Receipt](gpu-confirmation.json) and [separate browser report](../web-stack-proofs-9-gpu-confirmation-2026-10-10/browser-REPORT.md) retain the repeat. No timings are pooled and no repeat observations are imported.
