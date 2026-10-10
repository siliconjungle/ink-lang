# Ink web proof batch 10 — 10 October 2026

Two proof authors and an independent reviewer supplied **21 fresh checked proofs**, growing the database **914→935**. All **103 knowledge tests pass** in 225.554 seconds. Six U32 representatives are measured with the same frozen compiler and complete calls, alongside original-algorithm JavaScript/Rust-Wasm controls.

| Proof family | Instances | Transformation |
|---|---:|---|
| Cubic/quartic/quintic second differences | 9 | `(x+k)^n-2*x^n+(x-k)^n` becomes a smaller exact polynomial |
| Nested left zip and postmap | 4 | Nested same-source zip stages become one map, preserving arithmetic order |
| Nested right zip and postmap | 4 | Right nested zip stages become one map, preserving arithmetic order |
| Two mapped lists, multiplicative zip, postmap | 4 | All stages become one map with the same per-element callback expressions/product/postmap |

The finite-difference laws cover U32/I32/U64 wrapping rings modulo 2^32 or 2^64. They are word computations, with no floating-point derivative/accuracy claim. Targets are `6*x*k*k`, `2*k*k*(6*x*x+k*k)` and `10*x*k*k*(2*x*x+k*k)`; the same final calibration offset is retained. Timed representative outputs remain input-dependent at steps 7/-3. Collection laws also cover F32 and preserve exact source operation grouping and exceptional-value behavior. Their callbacks are pure and total in the modeled semantics; no effectful callback elimination is asserted.

All typed laws admit, default-select, replay and reify. Old914 applies zero laws to the actual benchmark sources and retains all six original bodies. The new default selection applies one fresh law per kernel. [Author evidence](../../knowledge/research/web-stack-proofs-10/), [publication](publication.json), [full tests](knowledge-tests.log) and [independent review](../../knowledge/research/web-stack-proofs-10/review.md) preserve receipts and false controls. Typed correctness coverage is broader than the U32 timing scope.

Prior snapshot `f4ecec9af452c37bff54696504e01e28aa7cc201bb6eb01d11c7107efb00331c`; new snapshot `b53c0605b882a94fdd29e88c0d54c838e62a2c31ef75d9f55a72df121b897c48`; compiler `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`. [Metadata](metadata.json) freezes 87 artifacts. All 102 guarded compiler/core/runtime/planner/backend source hashes remain unchanged. Generated functions trust callers; no validators or optional checking wrappers are added.

Thirteen correctness inputs include empty/singleton, U32 boundaries, zero/unit factors and random words. Timed shapes combine small/full-width words with lengths 32/4096/65536, offsets 509/0x9e3779b9 and steps 7/2^32-3. No artificial repeat loops are added. Independent Python unbounded even-binomial expansion/collection closed forms check complete outputs; literal wrapping operations/stages corroborate all boundary words and the first four other words. Original numeric controls preserve exact source AST association; collection controls preserve all original stages. Normal JIT/release optimizations are allowed.

Complete calls include exactly one full typed-input snapshot, applicable Wasm input copies/public output conversion, await and checksum consumption. GPU includes actual upload, dispatch and readback. Startup and first calls are separate. Rust reuses final input/output storage; intermediate Vec stages receive ordinary release optimization. These control/boundary choices limit cross-language comparisons. Expert already-factored/fused controls, native Rust and general language rankings are outside scope.

Control preflight passes 78 original-JS complete outputs and 276 Python literal values; CPU prevalidation passes 858 exact comparisons. Seven shuffled paired rounds follow calibration/discarded warmup. No compiler/test/analysis jobs run during sequential Node/browser timing. Individual 95% paired intervals are exploratory and unadjusted for multiplicity; correlated runtime/direct views are not independent replications.

Largest full-width browser prior/new complete-call ratios (above 1 favors new proofs):

| Kernel | Runtime JS | Wasm | Comparable actual GPU |
|---|---:|---:|---:|
| cubic_difference | 1.304× [1.232, 1.478] | 0.981× [0.962, 1.013] | 1.049× [1.000, 1.152] |
| quartic_difference | 1.316× [1.308, 1.342] | 1.007× [1.000, 1.033] | 0.994× [0.970, 1.012] |
| quintic_difference | 1.300× [1.267, 1.354] | 1.001× [0.994, 1.027] | 0.976× [0.882, 0.994] |
| nested_left_route | 1.757× [1.733, 1.780] | 1.027× [1.013, 1.027] | Prior fallback; checked shader eligible |
| nested_right_route | 1.348× [1.323, 1.366] | 1.006× [0.983, 1.024] | Prior fallback; checked shader eligible |
| multiplicative_pair | 2.039× [2.013, 2.040] | 1.027× [1.013, 1.040] | Prior fallback; checked shader eligible |

[Profitability profiles](profitability.json): **{'faster': 153, 'inconclusive': 79, 'slower': 2}**; per backend {'js': {'faster': 72}, 'direct_js': {'faster': 72}, 'wasm': {'inconclusive': 63, 'faster': 8, 'slower': 1}, 'gpu': {'inconclusive': 16, 'faster': 1, 'slower': 1}}. Unsupported/adverse comparisons recommend retaining the prior candidate. This does not implement automatic target selection. All adverse comparisons are retained:

| Host | Kernel/input | Backend | Prior/new interval |
|---|---|---|---:|
| node | nested_left_route/small-65536 | wasm | 0.992× [0.952, 0.999] |
| browser | quintic_difference/full-65536 | gpu | 0.976× [0.882, 0.994] |

Actual WebGPU has **72 variant/cells and 504 timed samples**; 36 fallback records remain excluded. Each actual vector call reports one dispatch, `4*N+24` upload bytes and `4*N` readback bytes. Three original collection pipelines have unsupported nested receivers; new direct maps become shader-eligible. Eligibility alone provides no prior/new GPU speed ratio.

[Routing evidence](backend-routing.json) records 72 current CPU/GPU intervals. Fastest checked-backend median counts: {'js': 36}. GPU-resident pipelines and automatic routing are unmeasured/unimplemented.

Uncompressed emitted sizes:

| Artifact | Old914 | Checked | Reduction |
|---|---:|---:|---:|
| program.mjs | 4762 | 3661 | 23.1% |
| cpu.c | 12656 | 9693 | 23.4% |
| cpu.wasm | 28841 | 22885 | 20.7% |

Plans/runtime/compressed transfer are excluded. Shader count changes 3→6, so aggregate WGSL size is not like-for-like.

Importing **288 authenticated Wasm observations** grows canonical observations **4734→5022**, preserving the proof pin. Memory means exported Wasm linear-memory highwater only; host/JS/GPU memory is unmeasured, so latency/counter data remains archived without invented memory records. [Import receipt](observation-import.json) records identities and source hashes.

[Node report](node-REPORT.md): 2772 timed samples, 1254 exact comparisons and 144 observations. Raw trials, warmups, calibration, checksums, nonmutation and fallback reasons are archived.
[Browser report](browser-REPORT.md): 3276 timed samples, 1362 exact comparisons and 144 observations. Raw trials, warmups, calibration, checksums, nonmutation and fallback reasons are archived.

[Independent interval audit](root-interval-verification.json) recomputes 828 intervals. [Final verification](verification.json) authenticates all members, frozen artifacts, guarded source files and imported observations. Everything remains local; no commit, push or PR is created.

Independent GPU confirmation: 0 of 1 nominal main GPU gains replicate under separate same-input timing; 1 remain unconfirmed. Individual intervals are exploratory and unadjusted for multiplicity. Independent repeat reuses byte-identical main word arrays, scalar parameters and expected outputs, narrowing only timed cases/shapes. Corresponding shader/runtime/device files are identical. [Receipt](gpu-confirmation.json) and [separate report](../web-stack-proofs-10-gpu-confirmation-2026-10-10/browser-REPORT.md) retain the repeat. No timings are pooled and no repeat observations are imported.
