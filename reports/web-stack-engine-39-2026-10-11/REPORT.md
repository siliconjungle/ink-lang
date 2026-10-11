# Composed memory, target costs and adaptive execution

The six approved work areas now have implementation or measured evidence. The memory improvements are real, but this suite does **not** establish broad superiority over handwritten Rust, Rust-Wasm or the strongest JavaScript controls. The broad fitted cost models failed heldout evaluation and remain opt-in. The narrow adaptive trial is reported separately below.

## What the twenty regressions show

The original twenty losses were eleven Node and nine browser cells in two composed padded-map/zip pipelines; none was a classified native regression. All original samples were preserved. Three fresh Node processes reproduced a point loss in eight of eleven cells in every process. One fresh browser process classified four cells slower, two faster and three inconclusive. The [complete twenty-case inventory](regressions/diagnosis-twenty-before-costmodel.md) includes every ratio and limitation.

Fusion reduced generated JS arrays from four to one and C destination scratch allocations from three to zero. Helpers were already inlined in emitted source, and both Wasm versions already contained vectorized loops. Module-wide vectorizer disabling sometimes reversed the resident-Wasm loss; that isolates sensitivity to compiler transformations, not absence of SIMD. Native LLVM reports are static compiler evidence, not a native dynamic profile. Instrumented V8 runs were kept outside performance measurements.

The first diagnostic helper controls used a different compilation context. A [matched strict-ESM follow-up](regressions/matched-esm-analysis.md) preserved whole modules, included byte-identical clones, and varied one primary operation. Fused JS still lost at all four large frames in all three process point estimates, including against a staged version without padding allocation. Removing neutral arithmetic did not consistently fix it. Representative primaries reached TurboFan; fused code was smaller and had fewer observed deoptimizations. Extra allocations, missing helper inlining, failure to reach the optimizing tier and more fused deoptimizations are therefore unsupported explanations for those cases. Scheduling/register/representation effects remain hypotheses; the exact machine-code cause was not isolated. No case whitelist or general SIMD penalty was added.

## Facts and memory lowering

The core now derives conservative collection facts from the **actual selected typed definitions**: exact/upper lengths, purity/totality, captures, possible borrowed origins and fresh/borrowed/unknown ownership. Composed calls substitute argument facts into lexical helper scopes. Selection recomputes facts from its resulting program rather than inheriting annotations from the original expression. Analysis is bounded and loses facts on recursion, unsupported constructs or exhausted budgets. See [the source-facts contract](../../docs/collection-facts.md).

JS and C/Wasm lowerings use these facts to materialize shared bindings once and reuse unbound fresh receivers in same-element-type maps, indexed maps and scans. Eligible stages can write into a caller destination and update its logical prefix in place. Terminal alias-only bindings can lower directly into that destination. Actual returned count is independent of its capacity, and unused tails remain untouched. Ordinary returned results retain their lifetimes. Borrowed/shared receivers and callbacks with reachable collection captures keep separate storage. JS F32 destination conversion excludes intermediate reuse when its physical representation differs.

Capacity/disjointness remain the existing trusted destination ABI obligations; same-layout, length-preserving stages can reuse adequate storage without inspecting caller values. No input validation or checker wrapper was generated, and no language syntax was needed. Fixed primitive semantics and general analysis belong in the core; target storage placement remains in independently versioned lowerings. Existing DB equality admission remains separate from the tested trusted emission/ABI boundary. Focused allocation instrumentation verifies eligible chains go to one ordinary output allocation or zero destination allocations; those counts are not timing proofs.

## Broad measurements

Eight tasks cover maps, stable compaction, scans, piecewise maps, noncommutative ordered reductions, neighbor stencils and sparse overwrite batches with a full recomputation control. Sizes, unequal input shapes, distributions, filter selectivity and update density vary independently. There are 338 correctness frames and 198 timed cells. The update operations use a fixed snapshot and dense ABI; they do not demonstrate maintained state across calls. Arbitrary ordered GPU reduction remains serial in the emitted shader.

Strong handwritten controls use fused JS loops, native Rust and Rust-Wasm. Native Ink here means generated C. Captured calls and resident destinations have different ownership/copy boundaries and are reported separately. GPU timings include full owned readback; resident inputs exclude their initial upload/setup. Device counters are reported separately; native peak heap memory was not measured. Cold process startup was not measured. Every timed invocation consumes the full result, and every target is checked against an independent complete-output oracle.

Serial isolated runs collected **8,910 Node, 11,880 browser and 5,940 native samples**. Five within-process paired rounds and exploratory nominal intervals do not give independent-machine/process confidence or multiplicity-corrected significance. All losing cells remain in the [comparison review](benchmark-preparation/general-comparison-review.md).

Selected descriptive ratios below are reference/candidate: above one favors this Ink candidate. Cell geometric means apply only to the specified matrix and boundary.

| Comparison | Boundary | Ratio | Interpretation |
|---|---|---:|---|
| Old Ink / new Ink, native compaction | resident destination | 1.315 | 19 faster, 0 slower, 17 inconclusive cells |
| Native Rust / new Ink, same compaction | resident destination | 0.522 | Ink still trails the fused Rust control |
| Rust-Wasm / new Ink, browser vectors | complete captured owned output | 0.464 | All 180 vector cells classified slower for Ink |
| Rust-Wasm / new Ink, browser vectors | resident destination | 0.904 | Smaller gap, still many losing cells |
| Old Ink / new Ink, browser JS vectors | captured owned output | 1.012 | Broad changes mostly inconclusive |

The sparse JS copy/update control used `Array.from`; an already measured one-loop recomputation control implements the same operation on exactly matching inputs. The [matched-input challenge](benchmark-preparation/general-js-update-control-challenge.json) reduces the browser update ratio from 3.121 to 0.968. These are cross-task-phase comparisons, not same-cell interleaved trials. The stronger control removes a misleading roughly-threefold browser headline. No new control or compiler tuning followed those results.

Every task/version selected **zero DB rewrite applications**. This iteration measures general engine/lowering/runtime behavior; it does not attribute these gains to new DB laws. The knowledge DB received 3,762 immutable timing observations with exact target, compiler, workload and boundary provenance. Their `peak_bytes` is unknown rather than invented zero; observations grant no correctness authority and do not modify the measured semantic snapshot.

## Target-specific costs

The external planner supports thirteen separate untrusted components: invocation, traversal, allocation events/bytes, copies, scalar operations, division/remainder, branches, an expanded-loop-work proxy, GPU dispatch, upload, readback and unknown work. Actual selected helper definitions and parameter signatures are bound in receipts. Unknown shapes retain positive fallback cost. The loop proxy is not a register-pressure measurement, and semantic stage counts do not determine physical GPU algorithms. Existing schema1/default planner policy is unchanged.

Training used only affine, compaction and scan at sizes 32 and 16,384. Size 2,048 and whole other families were held out. All coefficients and 3,762 predictions were frozen before evaluating heldout errors, with controls excluded from fitting and no retuning. Nineteen cohorts fitted only rank five or six out of thirteen; sixteen cohorts lacked training support. Heldout median relative error ranged approximately 55–57% for JS, 75–86% for CPU Wasm, 41–71% for native C and 20–22% for GPU. Of 72 candidate selections among 1,206 comparable heldout choices, 21 were slower than the baseline median. These models are inadequate for default selection. [Calibration method, errors and losses](model-calibration/README.md) remain available in full.

## Adaptive execution

Runtime execution offers saved-profile `policy:'adaptive'` and `policy:'static'` with an explicit backend. Adaptive selection uses size/capacity/residency metadata, a bounded cache and a ten-percent predicted saving threshold. It does not scan values, consult per-call clocks or execute competing implementations. Missing comparable profiles retain CPU. The historical online profiler is explicit `policy:'profile'`. Static JS avoids packed transport and Wasm initialization.

Prepared GPU sessions capture inputs once and retain device buffers/bindings; repeated runs upload zero bytes and return fresh full owned readback. The public host trial supports complete captured requests. A separate external selector prototype compares prepared resident CPU/JS/GPU operations with matched owned results. These are pure pipeline boundaries; stateful switching is not added. [Policy and residency contract](../../docs/adaptive-execution.md).

The fixed narrow trial uses one checked composed pipeline, training sizes 32/65,536 and heldout sizes 2,048/4,096, each with two shapes and two value domains. Actual automatic host paths supply training prices, including JS transport overhead; explicit JS is a separate stronger control. Profiles remain opt-in examples for the recorded target and bundle. [Protocol and reproduction](../../bench/adaptive39.md). Final trial evidence is in `adaptive/summary.json`; the separate no-op selector overhead experiment discloses metadata/Promise/cache/clear costs and cannot stand in for complete pipeline latency.

The fixed fit used 144 training samples and froze profile
`b4645757acdaf2177811aca187622b1185dbf471353d160a55c5def518094d6d`
before 384 heldout samples. Captured selection chose CPU in all eight heldout
frames: static CPU/adaptive geometric mean **0.963**, with one faster, two slower
and five inconclusive comparisons. Resident selection chose JavaScript in all
eight: static CPU/adaptive **1.499**, with eight faster comparisons. Those choices
match the retrospective fastest automatic path in this small matrix, but direct
JavaScript still beats adaptive in seven classified comparisons overall. No
profile was retuned or installed as a global default. All 112 comparisons remain
in [the trial summary](adaptive/summary.json).

Sixteen single first-miss observations include the complete operation and common
consumer. Two recorded zero elapsed time; browser timer quantization prevents an
isolated or precise overhead claim from those observations. The separately gated
proxy collected 144 samples over sixteen metadata contexts, excluding actual
pipeline/device work and retaining the common full-output consumer. Its cache-miss
variant includes explicit cache clearing; no subtraction attributes that cost
solely to selection. The proxy's final audit and per-cell increments are reported
in [the overhead summary](adaptive/overhead-summary.json). Median-of-cell increments
were approximately 1.56 μs for captured cached selection, 0.78 μs for resident
cached selection, and 2.73 μs for a miss plus clearing in either boundary. Some
cell differences were inconclusive or reversed sign; all are retained. These are
batched proxy increments, not a precise per-call constant or total runtime cost.

## Integration and reproduction

Parallel main changes were merged into every affected package rather than dropped. The post-merge compiler is separately frozen. Across eight tasks, generated C/JS bytes and Wasm noncustom executable sections match the measured candidate. GPU shader statements match after removing four unreferenced type declarations; manifests additionally update feedback limitations and shader hashes. Host/device sources changed and passed fresh untimed Node/browser checks: 3,042 and 4,056 validation rows, including 1,014 actual GPU rows and 338 resident capture cases. The source integration does not inherit old full host timings automatically.

Validation includes 39 core unit tests, 44 planner tests, 16 runtime Node tests, focused C/JS memory/destination/composition cases, prepared graph/device tests, standalone runtime dependency resolution and a real-checker representation-selection integration. The JS merge also fixes a synthetic parallel helper binder collision with caller captures. The initial unsupported-layout panic suspicion was disproved by admission tests; fallible error handling was retained defensively. [Integration receipt](integration-completion.json).

Large raw evidence is published with deterministic lossless gzip packaging. Originals remain unmodified locally. On a fresh checkout restore and authenticate them before auditing or serving:

```sh
python3 bench/web-stack-report-archive.py restore --report reports/web-stack-engine-39-2026-10-11
python3 bench/web-stack-general39.py audit --report reports/web-stack-engine-39-2026-10-11/general-final --host node --audit-output /tmp/ink39-node-audit.json
python3 bench/web-stack-general39.py audit --report reports/web-stack-engine-39-2026-10-11/general-final --host browser --audit-output /tmp/ink39-browser-audit.json
python3 bench/web-stack-general39.py native-audit --report reports/web-stack-engine-39-2026-10-11/general-final --audit-output /tmp/ink39-native-audit.json
```

Use fresh report/output paths for new timing runs and serialize all workers before granting metadata-bound timing gates. The baseline/final measured compilers, fixtures, chosen cores, targets, raw journals, optimization reports, instrumented profiles, predeclared splits and frozen coefficients are retained. Compilers/native executables are macOS arm64 artifacts; other hosts must rebuild and report new measurements. `knowledge-snapshot.json` pins the measured DB snapshot; newer main entries from parallel work are distinct. File hashes associate exact evidence and detect drift; they do not establish mathematical correctness.

The next general performance work should address full-call transport and literal multi-pass lowering, and improve physical target feature estimates with better training coverage. The unresolved fusion regressions still need a more precise scheduling/representation experiment. These measured gaps are more useful than enabling optimistic prices that fail on unseen workloads.
