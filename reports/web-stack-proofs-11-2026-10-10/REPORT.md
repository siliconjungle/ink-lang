# Ink web proof batch 11 — 10 October 2026

Two proof authors and an independent reviewer supplied **21 fresh checked proofs**, growing the database **935→956**. All **112 knowledge tests pass** in 459.934 seconds. Six U32 representatives are measured with the same frozen compiler and complete calls, alongside original-algorithm JavaScript/Rust-Wasm controls.

| Proof family | Instances | Transformation |
|---|---:|---|
| Geometric prefix with 8/16/32 terms | 9 | Balanced unrolled sums become divisor-free power-of-two factor products |
| Right padded prefix zip | 4 | Discard unconsumed concatenated suffix and fuse zip/postmap |
| Right padded mapped zip | 4 | Fuse mapped prefix, concat, zip and postmap with the same per-element expressions |
| Left padded mapped product | 4 | Fuse concat, mapped list, product zip and postmap with the same per-element expressions |

The geometric laws cover U32/I32/U64 wrapping rings modulo 2^32 or 2^64: `sum(x^i, i=0..2^m-1) = product(1+x^(2^j), j=0..m-1)`, for m=3/4/5. Neither source nor target uses an exponentiation primitive, inner loops or word division; x=1 is valid. The same final multiplication by k and offset by seed are retained. Timed representative outputs remain input-dependent at factors 7/-3. Source scalar AST multiplication counts, including k, change 22→7,106→15,466→31; normal target common-subexpression elimination is allowed, so these are not instruction or speed ratios. Collection laws also cover F32 and preserve exact primitive grouping and exceptional-value behavior. Callbacks are pure and total; global scheduling may change, while per-element expressions retain their source order. General suffix ys is arbitrary in admitted proofs; interpreter and timing representatives instantiate ys=xs.

The first fully left-associated 32-term candidate exceeded the existing 128-level canonical JSON nesting bound before compiler admission. Its archive is retained under compute/adverse. Final source ASTs explicitly balance sums and powers to fit the existing envelope. This is an authored equivalent word polynomial, not a relaxed checker limit or an unproved compiler rewrite.

All typed laws admit, default-select, replay and reify. Old935 applies zero laws to the actual benchmark sources and retains all six original bodies. The new default selection applies one fresh law per kernel. [Author evidence](../../knowledge/research/web-stack-proofs-11/), [publication](publication.json), [full tests](knowledge-tests.log) and [independent review](../../knowledge/research/web-stack-proofs-11/review.md) preserve receipts and false controls. Typed correctness coverage is broader than the U32 timing scope.

Prior snapshot `b53c0605b882a94fdd29e88c0d54c838e62a2c31ef75d9f55a72df121b897c48`; new snapshot `42bb207446a7ea92fc099ef27d611201f39a1d660c36b147bd11f68fa61a3e90`; compiler `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`. [Metadata](metadata.json) freezes 81 artifacts. All 102 guarded compiler/core/runtime/planner/backend source hashes remain unchanged. Generated functions trust callers; no validators or optional checking wrappers are added.

Thirteen correctness inputs include empty/singleton, U32 boundaries, zero/unit factors and random words. Timed shapes combine small/full-width words with lengths 32/4096/65536, offsets 509/0x9e3779b9 and factors 7/2^32-3. No artificial repeat loops are added. The reference computes the geometric quotient in unbounded integers before modular reduction, with a reference-only x=1 case; compiled factor products require no divisor premise. Independent Python unbounded integer geometric reference/collection closed forms check complete outputs; literal wrapping operations/stages corroborate all boundary words and the first four other words. Original numeric controls preserve exact source AST association; collection controls preserve all original stages. Normal JIT/release optimizations are allowed.

Complete calls include exactly one full typed-input snapshot, applicable Wasm input copies/public output conversion, await and checksum consumption. GPU includes actual upload, dispatch and readback. Startup and first calls are separate. Rust reuses final input/output storage; intermediate Vec stages receive ordinary release optimization. These control/boundary choices limit cross-language comparisons. Expert already-factored/fused controls, native Rust and general language rankings are outside scope.

Under these control and boundary choices, checked direct Ink JS beats the original-algorithm JS control in all 36 measured cells on each host; original-algorithm Rust-Wasm beats checked Ink Wasm in all 36 cells on each host. Individual paired intervals exclude equality in each comparison. These results compare the archived algorithms/implementations and do not rank languages generally.

Control preflight passes 78 original-JS complete outputs and 276 Python literal values; CPU prevalidation passes 858 exact comparisons. Seven shuffled paired rounds follow calibration/discarded warmup. No compiler/test/analysis jobs run during sequential Node/browser timing. Individual 95% paired intervals are exploratory and unadjusted for multiplicity; correlated runtime/direct views are not independent replications.

Largest full-width browser prior/new complete-call ratios (above 1 favors new proofs):

| Kernel | Runtime JS | Wasm | Comparable actual GPU |
|---|---:|---:|---:|
| geometric_prefix8 | 4.225× [4.139, 4.400] | 1.000× [0.974, 1.000] | 1.012× [0.982, 1.049] |
| geometric_prefix16 | 4.116× [3.984, 4.332] | 1.007× [0.991, 1.028] | 0.994× [0.953, 1.019] |
| geometric_prefix32 | 1.550× [1.511, 1.618] | 1.007× [0.987, 1.027] | 0.988× [0.966, 1.037] |
| bounded_right_prefix | 1.392× [1.189, 1.470] | 1.033× [0.916, 1.135] | Prior fallback; checked shader eligible |
| bounded_mapped_right | 2.065× [1.760, 2.090] | 1.030× [0.884, 1.097] | Prior fallback; checked shader eligible |
| bounded_mapped_product | 1.933× [1.776, 2.096] | 1.014× [0.896, 1.055] | Prior fallback; checked shader eligible |

[Main-run profitability profiles](profitability.json): **{'faster': 157, 'inconclusive': 74, 'slower': 3}**; per backend {'js': {'faster': 72}, 'direct_js': {'faster': 72}, 'wasm': {'inconclusive': 58, 'faster': 11, 'slower': 3}, 'gpu': {'inconclusive': 16, 'faster': 2}}. Unsupported/adverse comparisons recommend retaining the prior candidate. This does not implement automatic target selection. All adverse comparisons are retained:

| Host | Kernel/input | Backend | Prior/new interval |
|---|---|---|---:|
| node | geometric_prefix8/full-4096 | wasm | 0.995× [0.978, 0.999] |
| node | geometric_prefix16/full-4096 | wasm | 0.981× [0.968, 0.998] |
| browser | geometric_prefix32/small-32 | wasm | 0.976× [0.957, 0.995] |

Actual WebGPU has **72 variant/cells and 504 timed samples**; 36 fallback records remain excluded. Each actual vector call reports one dispatch, `4*N+24` upload bytes and `4*N` readback bytes. Three original collection pipelines have unsupported concat/map/zip receivers; new direct maps become shader-eligible. Eligibility alone provides no prior/new GPU speed ratio.

[Routing evidence](backend-routing.json) records 72 current CPU/GPU intervals. Fastest checked-backend median counts: {'js': 36}. GPU-resident pipelines and automatic routing are unmeasured/unimplemented.

Uncompressed emitted sizes:

| Artifact | Old935 | Checked | Reduction |
|---|---:|---:|---:|
| program.mjs | 18175 | 4582 | 74.8% |
| cpu.c | 40838 | 11633 | 71.5% |
| cpu.wasm | 66918 | 28408 | 57.5% |

Plans/runtime/compressed transfer are excluded. Shader count changes 3→6, so aggregate WGSL size is not like-for-like.

Importing **288 authenticated Wasm observations** grows canonical observations **5022→5310**, preserving the proof pin. Memory means exported Wasm linear-memory highwater only; host/JS/GPU memory is unmeasured, so latency/counter data remains archived without invented memory records. [Import receipt](observation-import.json) records identities and source hashes.

[Node report](node-REPORT.md): 2772 timed samples, 1254 exact comparisons and 144 observations. Raw trials, warmups, calibration, checksums, nonmutation and fallback reasons are archived.
[Browser report](browser-REPORT.md): 3276 timed samples, 1362 exact comparisons and 144 observations. Raw trials, warmups, calibration, checksums, nonmutation and fallback reasons are archived.

[Independent interval audit](root-interval-verification.json) recomputes 828 intervals. [Final verification](verification.json) authenticates all members, frozen artifacts, guarded source files and imported observations. Everything remains local; no commit, push or PR is created.

Independent GPU confirmation: 0 of 2 nominal main GPU gains replicate under separate same-input timing; 2 remain unconfirmed. Individual intervals are exploratory and unadjusted for multiplicity. Independent repeat reuses byte-identical main word arrays, scalar parameters and expected outputs, narrowing only timed cases/shapes. Corresponding shader/runtime/device files are identical. [Receipt](gpu-confirmation.json) and [separate report](../web-stack-proofs-11-gpu-confirmation-2026-10-10/browser-REPORT.md) retain the repeat. No timings are pooled and no repeat observations are imported.

GPU repeat intervals (prior/new complete calls):

| Kernel/input | Separate repeat | Verdict |
|---|---:|---|
| geometric_prefix8/small-4096 | 0.978× [0.949, 1.030] | inconclusive |
| geometric_prefix32/small-4096 | 1.009× [0.982, 1.051] | inconclusive |
| geometric_prefix8/full-4096 | 1.026× [0.956, 1.079] | inconclusive |
| geometric_prefix32/full-4096 | 0.982× [0.976, 1.025] | inconclusive |

Main GPU screening gains remain unconfirmed; no repeatable GPU speedup is established.
