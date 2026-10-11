# Ink web proof batch 12 — 10 October 2026

Two proof authors and an independent reviewer supplied **21 fresh checked proofs**, growing the catalogue **956→977**. Six U32 representatives were measured with the same frozen compiler. CPU results include useful gains and five adverse Node quintic workloads. **No GPU speedup is established:** all 18 comparable GPU intervals include equality.

| Proof family | Instances | Transformation |
|---|---:|---|
| Cubic/quartic/quintic odd centered differences | 9 | Explicit endpoint products become compact wrapping-word polynomials |
| Gated left mapped zip | 4 | Select first, skip an unused pure callback and fuse map/zip/postmap |
| Gated right mapped zip | 4 | Retain the original comparison and fuse selected callback/postmap |
| Mode-selected mapped pair | 4 | Evaluate only the contributing mapped side and fuse output stages |

Numeric laws cover U32/I32/U64 rings modulo 2^32 or 2^64. Their exact identities are `(x+k)^3-(x-k)^3 = 2*k*(3*x*x+k*k)`, `(x+k)^4-(x-k)^4 = 8*x*k*(x*x+k*k)`, and `(x+k)^5-(x-k)^5 = 2*k*(5*xx*(xx+2*kk)+kk*kk)`, with `xx=x*x` and `kk=k*k` each computed once. Powers here are mathematical notation: original kernels contain explicit left-associated products, and both versions retain final `+seed`. These are arbitrary word polynomial models, with no F32 arithmetic reassociation or floating-point derivative/accuracy claim. No artificial repeat loops are used.

Actual source/selected scalar AST counts, including the offset and local binding expressions:

| Kernel | Multiplications | Additions/subtractions | Selected local bindings |
|---|---:|---:|---:|
| cubic_odd_difference | 4→5 | 8→2 | 0 |
| quartic_odd_difference | 6→5 | 10→2 | 0 |
| quintic_odd_difference | 8→8 | 12→3 | 2 |

There is no uniform multiplication reduction. Quintic sharing uses two existing typed Let expressions. These are structural counts, not instruction or speed ratios; normal target common-expression elimination and constant hoisting are allowed.

Collection laws also cover F32. They preserve the original `<` comparison, selected per-element primitive grouping/rounding, order and length, including exceptional values. The false branch of `<` includes unordered NaN comparisons; it is not generally equivalent to `>=`. Callbacks are arbitrary pure total unary functions: global scheduling changes and unused callback invocations may disappear. Effectful or divergent callbacks are outside this model. The gated families eliminate two intermediate lists, and the mode family eliminates three. Full output writes and transport remain O(N).

All 21 laws admit through the existing generic kernel, default-select, replay and reify. Immutable old956 selects zero applications and leaves the six actual benchmark bodies unchanged; new default planning applies exactly one fresh law per function. Fresh IDs and exact statement endpoints were compared against the old catalogue. Hashes identify objects and receipts; they do not establish mathematical truth. [Numeric evidence](../../knowledge/research/web-stack-proofs-12/compute/evidence.json), [collection notes/receipts](../../knowledge/research/web-stack-proofs-12/collection/NOTES.md), [selection metadata](metadata.json) and [publication](publication.json) preserve the evidence.

**Current validation: 21 tests pass**, comprising six numeric tests, three collection tests and twelve store/publisher/performance regressions. The authenticated prior **112-test full suite is historical**; the complete 121-test suite was not rerun for this batch. [Test scope](test-scope.json) records commands/log identities and this distinction. Numeric interpreter coverage is 36 frames/72 original-selected runs with 396 scalar outputs, plus 5,472 independent ordered-literal/unbounded/compact oracle cases. Collection evidence contains 72 complete-array interpreter comparisons across all four types, including NaNs, infinities and signed zeros. Three numeric and two collection content-hash-valid false objects are rejected semantically, rather than for hash mismatch.

Prior snapshot `42bb207446a7ea92fc099ef27d611201f39a1d660c36b147bd11f68fa61a3e90`; new snapshot `a7ca4c89c1f610ee997319a7e13601b263ee187515ecb5e0f7a506cb40c6636c`; frozen compiler `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`. The same compiler emits no-selection, prior956 and new977 variants. All 81 frozen artifacts and 102 guarded compiler/core/runtime/planner/backend source files remain unchanged. No core, backend or runtime changes, new trusted proof rules, caller validators or optional checker wrappers are introduced. Generated functions retain the trusted-caller contract.

Measurements use an Apple M2/macOS host, Node v26.1.0 and Chrome 154 with an Apple Metal-3 adapter. Thirteen correctness fixtures include empty/singleton arrays, wrapping boundaries, random words and zero/unit factors. Timed shapes use 32/4096/65536 elements and small/full-width distributions, offsets 509/0x9e3779b9 and factors 7/2^32-3. Representative outputs remain input-dependent. Independent Python unbounded odd-binomial expansions and collection closed forms check complete outputs; literal wrapping operations/stages corroborate boundary words and the first four other words. Numeric originals preserve exact left-associated endpoint products; collection originals retain eager maps and conditional zip/postmap stages.

Complete calls include one full typed-input snapshot for every implementation, applicable Wasm ingress copies/public output conversion, await and checksum consumption. GPU calls include real upload, dispatch and readback. Direct compiled JS has the same snapshot/checksum boundary as the handwritten original JS control. Startup, lazy Wasm first calls and shader preparation are recorded separately. Rust reuses final input/output storage while intermediate Vec stages receive normal release/library optimization. Original JS/Rust controls implement the original algorithms, with ordinary JIT/release optimization allowed. Already-factored/fused expert controls, native Rust, GPU-resident pipelines and general language rankings are outside scope; different target toolchains/boundaries limit cross-language attribution.

Current original-algorithm control comparisons, derived from archived paired intervals (checked/control latency; lower favors checked):

| Host | Runtime Ink JS / original JS | Direct Ink JS / original JS | Ink Wasm / original Rust-Wasm |
|---|---|---|---|
| node | checked faster: 36, inconclusive: 0, control faster: 0 | checked faster: 36, inconclusive: 0, control faster: 0 | checked faster: 0, inconclusive: 0, control faster: 36 |
| browser | checked faster: 36, inconclusive: 0, control faster: 0 | checked faster: 36, inconclusive: 0, control faster: 0 | checked faster: 0, inconclusive: 0, control faster: 36 |

Each host has 36 workload cells. Under these archived implementations and boundaries, Ink JS beats the original JS controls throughout, while original Rust-Wasm beats Ink Wasm throughout. This does not establish a general ranking of languages.

[Control preflight](control-preflight.json) passes 78 original-JS complete-output comparisons and 276 literal Python checks; CPU prevalidation passes 858 comparisons. Seven shuffled paired rounds follow calibration and discarded warmup, with 15 ms calibration targets. [Pre-timing receipt](pre-timing.json) records stopped author/compiler/test jobs before sequential Node/browser timing. Warmup, calibration, actual backend, fallback reason, checksum/nonmutation and per-call counters remain archived. Individual 95% paired intervals are exploratory and unadjusted for multiple comparisons; runtime/direct views are correlated, not independent replications.

Largest full-width browser prior/new complete-call ratios (above 1 favors the new proofs):

| Kernel | Runtime JS | Wasm | Comparable actual GPU |
|---|---:|---:|---:|
| cubic_odd_difference | 1.276× [1.241, 1.293] | 0.993× [0.981, 1.013] | 0.982× [0.927, 1.034] |
| quartic_odd_difference | 1.296× [1.256, 1.356] | 0.987× [0.974, 1.065] | 0.944× [0.907, 1.012] |
| quintic_odd_difference | 1.259× [1.234, 1.308] | 1.017× [0.984, 1.024] | 0.982× [0.965, 1.037] |
| gated_mapped_left | 1.559× [1.528, 1.579] | 1.053× [1.039, 1.094] | Prior CPU fallback; new shader eligible |
| gated_mapped_right | 1.568× [1.500, 1.618] | 1.039× [1.032, 1.071] | Prior CPU fallback; new shader eligible |
| mode_selected_pair | 2.053× [1.963, 2.067] | 1.007× [0.987, 1.013] | Prior CPU fallback; new shader eligible |

[Profitability profiles](profitability.json) classify 234 measured prior/new views:

| Backend | Faster | Inconclusive | Slower |
|---|---:|---:|---:|
| js | 66 | 1 | 5 |
| direct_js | 66 | 1 | 5 |
| wasm | 21 | 51 | 0 |
| gpu | 0 | 18 | 0 |
| Total | 153 | 71 | 10 |

The ten adverse views are **five Node quintic workloads measured through both runtime and direct JS**. They are not ten independent workloads. The full-width 65,536-element quintic runtime ratio is 0.903 on Node versus 1.259 in the browser: host/JIT differences matter, and not all six kernels improve on Node. Node full-32 quintic is inconclusive. All adverse cells are retained:

| Host | Kernel/input | Backend | Prior/new 95% interval |
|---|---|---|---:|
| node | quintic_odd_difference/small-32 | js | 0.958× [0.951, 0.978] |
| node | quintic_odd_difference/small-32 | direct_js | 0.964× [0.929, 0.978] |
| node | quintic_odd_difference/small-4096 | js | 0.923× [0.901, 0.925] |
| node | quintic_odd_difference/small-4096 | direct_js | 0.914× [0.910, 0.928] |
| node | quintic_odd_difference/small-65536 | js | 0.899× [0.860, 0.946] |
| node | quintic_odd_difference/small-65536 | direct_js | 0.910× [0.883, 0.926] |
| node | quintic_odd_difference/full-4096 | js | 0.913× [0.904, 0.920] |
| node | quintic_odd_difference/full-4096 | direct_js | 0.911× [0.904, 0.925] |
| node | quintic_odd_difference/full-65536 | js | 0.903× [0.881, 0.947] |
| node | quintic_odd_difference/full-65536 | direct_js | 0.914× [0.883, 0.941] |

The profiles recommend retaining the prior candidate for adverse or unresolved comparisons. A general target/host-specific selection policy has not been implemented; correctness alone does not guarantee profitability.

Actual WebGPU execution covers **72 variant/cells and 504 timed samples**. The 36 unsupported original/prior collection fallback records are excluded from GPU timings and comparisons. Each real vector call records one dispatch, `4*N+24` upload bytes and `4*N` readback bytes. Three collection pipelines become direct-map shader eligible, but a prior CPU fallback is not a comparable old GPU shader.

**All 18 comparable GPU prior/new intervals include equality.** No nominal GPU gain survives even the initial interval screen, so no confirmation repeat is needed or performed and no confirmed GPU gain is claimed. Full-call transfer/dispatch latency can dominate reduced scalar work.

[Current-backend routing evidence](backend-routing.json) records 72 JS/Wasm-to-GPU intervals; all favor CPU under this boundary. JS has the lowest checked median in all 36 browser workload cells. GPU-resident batching and automatic routing are outside the measurement/implementation scope.

Uncompressed emitted file sizes:

| Artifact | Prior956 bytes | New977 bytes | Reduction |
|---|---:|---:|---:|
| program.mjs | 4392 | 3839 | 12.6% |
| cpu.c | 11906 | 10012 | 15.9% |
| cpu.wasm | 31046 | 23163 | 25.4% |

Plans/runtime and compressed transfer are excluded. Shader count changes 3→6, so aggregate WGSL bytes are not a like-for-like size reduction.

[Observation import](observation-import.json) adds 288 authenticated Wasm observations, growing **5310→5598**, with the new proof pin retained. These memory records measure exported Wasm linear-memory highwater only. Host/JS/GPU memory is unmeasured; no such memory observations are invented.

[Node report](node-REPORT.md): 2772 timed samples, 1254 exact comparisons, 144 observations. [Raw results](node-results.json) retain rounds, counters and complete validation receipts.
[Browser report](browser-REPORT.md): 3276 timed samples, 1362 exact comparisons, 144 observations. [Raw results](browser-results.json) retain rounds, counters and complete validation receipts.

The main run totals **6048 timed samples and 2616 exact comparisons**. [Independent interval audit](root-interval-verification.json) recomputes all 828 intervals and authenticates 81 frozen artifacts. The final [independent verifier](verify.py) and [receipt](verification.json) authenticate proof members, source guards and imported observations separately. Work remains local; no commit, push or PR was created.
