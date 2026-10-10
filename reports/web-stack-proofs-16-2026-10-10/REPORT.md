# Checked web-stack proofs, batch 16

**75 checked entries** grow the local knowledge catalogue from **1,089 to 1,164**: 21 general typed laws in six reusable families and 54 static callback certificates. The output is leaner and several kernels are faster across JavaScript, Wasm and native code. **Broad superiority over expert JavaScript or native Rust is not established.** Wasm and native regressions remain in the evidence; this batch establishes no new WebGPU performance gain.

The transformations and certificates are checked at compile time. No runtime optimizer, caller validation, checker wrapper, core-specific optimization rule, backend or runtime change was introduced. The only guarded implementation change is a generic cost estimate in the external planner. The measured code and models were frozen before usable timings.

## General proofs

The notation below abbreviates typed semantic objects. `xs` is a finite value list, `f` and `g` are arbitrary pure total numeric callbacks, `p` is an arbitrary pure total predicate, and `z`, `k`, `d` are scalars. `foldr(g,z,xs)` applies the reducer from right to left, with the head value as its first argument. Numeric fold accumulators have the same type as the elements in the current semantic model.

| Family | Checked equality | Types |
|---|---|---|
| Filter into ordered fold | `foldr(g,z,filter(p,xs)) = foldr((x,a)=>choose(p(x),g(x,a),a),z,xs)` | U32, I32, U64, F32 |
| Map/filter into ordered fold | `foldr(g,z,filter(p,map(f,xs))) = foldr((x,a)=>let y=f(x); choose(p(y),g(y,a),a),z,xs)` | U32, I32, U64, F32 |
| Filter/map into ordered fold | `foldr(g,z,map(f,filter(p,xs))) = foldr((x,a)=>choose(p(x),g(f(x),a),a),z,xs)` | U32, I32, U64, F32 |
| Shared weighted addition | `sum(map(x=>f(x)*k+f(x)*d,xs)) = sum(map(f,xs))*(k+d)` | U32, I32, U64 |
| Shared weighted subtraction | `sum(map(x=>f(x)*k-f(x)*d,xs)) = sum(map(f,xs))*(k-d)` | U32, I32, U64 |
| Masked shared weighted addition | `sum(map(x=>choose(p(x),f(x)*k+f(x)*d,0),xs)) = sum(map(x=>choose(p(x),f(x),0),xs))*(k+d)` | U32, I32, U64 |

Each row is proved by structural list induction. Empty lists reduce to the seed or zero. In ordered fusion, the head predicate splits the induction step: rejected heads leave the accumulator unchanged; accepted heads invoke exactly the same reducer on the inductively equal tail result. Map/filter fusion substitutes the same mapped value into predicate and reducer. **Reducer order is preserved; no associativity of `g` is assumed.** This permits noncommutative and floating-point reducers without reassociating floating-point arithmetic.

Weighted laws use the inductive tail equality and the existing fixed-width ring normalizer to distribute and factor coefficients. Overflow is modular arithmetic, rather than an exceptional condition. The masked law additionally splits the predicate case; rejected heads contribute zero. These weight identities are **not admitted for F32**. Purity/totality are semantic preconditions, not generated input checks. Logical callback sharing does not guarantee one physical evaluation after inlining.

Machine-readable producers: [ordered folds](../../knowledge/producers/web_fold16_laws.py), [shared contributions](../../knowledge/producers/web_reduction16_laws.py). Author evidence: [fold](../../knowledge/research/web-stack-proofs-16/fold/evidence.json), [reduction](../../knowledge/research/web-stack-proofs-16/reduction/evidence.json). The two author suites each pass three tests, exercise 162/126 typed semantic frames respectively, and reject two/three correctly hashed false proofs. These finite checks supplement the inductive proofs; they do not establish the universal equalities by sampling.

The [publication receipt](publication.json) binds all 75 new objects, their complete admitted dependency closure, the frozen compiler and preserved historical snapshot. The 54 callback certificates compose checked normalization and law applications: **40 use only old laws and are supplied symmetrically to prior/current; 14 use new laws**. The same old-only bounded derivation procedure is run on original subjects. Known lambda syntax is specialized offline; free lists/scalars remain quantified. These certificates are untrusted proof objects, not a new automatic normalization pass for every future program. [Standalone producer binding](standalone-producer-bindings.json) and [identity check](standalone-producer-check.json) bind the knowledge-owned witness data to the originally published objects. Original publication wrappers remain archived in `published-producers/`.

## Fair compilation and generated output

| Catalogue | Entries | Snapshot |
|---|---:|---|
| Historical prior | 1,089 | `57bbee1835725fd3af939cf11e3dda25ac51e12001fde0f006aeb64bb9ab2378` |
| Effective prior with 40 shared old-only certificates | 1,129 | `5afe7eee81b7f9ceda8cf973e5f22fb2b45639ed3dc258009a3a4c2997e51de7` |
| Current | 1,164 | `cc8308b40f651cdc3e5ece5b32ea94cea81bc2596046680384138fa16dd8ed9a` |

CPU and GPU searches use separate frozen general operation prices, with identical prices for each prior/current pair. CPU prices are map60/filter80/sum12/foldr1/apply20 and callback repetition estimate16. GPU prices are map12/filter60/sum10/foldr80/apply20 and the unchanged default repetition estimate1. The optional estimate multiplies callback work when an operation has a value-list first operand and arrow last operand. It contains no law, recipe or backend whitelist. Prices are hypotheses, not measured timings or guaranteed profits.

The initial flat CPU model tied inside-loop and post-loop coefficient work and failed the fresh-effect preparation gate. That attempt is preserved in [initial-flat-cost-attempt](initial-flat-cost-attempt/). The generic estimate and final prices were then frozen **before any usable performance measurement**, as recorded in [policy-freeze](policy-freeze.json). No post-timing tuning occurred. Seven scoped planner tests pass. The full planner suite has nine passing tests and one legacy discovery error: its unrelated research-query test recursively scans the large archive and hits a discovery file-count limit. [Full output](planner-tests.log), [discovery failure](planner-discovery-failure.log). The full historical suite was not rerun.

All **120 final CPU/GPU selections** have compact dependency-closed bundles, unchanged proof applications, compiler replay receipts and zero exhausted searches. Twelve new recipe pairs change their CPU bodies and depend on new checked objects. The other **18 round15 inputs and prior/current root bodies are preserved exactly**; their timing differences do not establish new-proof causality. The source guard verifies 101/102 existing files unchanged; only `planner/ink_planner/semantic_search.py` changes. Core, checker, lowerings and runtime remain unchanged.

| Kernel source shape, 30 tasks | Unselected | Prior | Current |
|---|---:|---:|---:|
| No intermediate allocation | 6 | 21 | 25 |
| One loop | 6 | 19 | 23 |
| Intermediate allocation sites | 38 | 14 | 6 |
| Loop sites | 74 | 46 | 38 |

[Independent source review](code-shape-review.md) binds all 90 C files. All six new weighted recipes already have one allocation-free prior loop: their new benefit is moving coefficient multiplication outside it. Ordered filtered-only recipes remove one allocation/traversal; filtered-map recipes remove two; map-filter recipes remove the filter stage but retain the mapped array in two cases. Some reference kernels retain filters or two allocation-free traversals under the final model. No blanket allocation-free or SIMD claim follows.

Three primary ordered sources use `quot_or(seed,2,0)` to balance branch exercise. This differs from the author probe callback but is a valid generic instantiation, frozen before timings and identical in all language controls. All 18 primary timed profiles exercise both reducer branches. Nine small-distribution held-out profiles exercise only the false branch; nine full-word held-out profiles exercise both. [Fixture profile](fixture-profile.json) preserves these qualifications. Generated schema2 web bridges allocate a scalar result word; native calls omit that bridge in all variants. Expert controls compute an invariant cutoff outside the loop; generated code leaves guarded division in the loop source, which LLVM may or may not hoist.

## Workloads, boundaries and saved evidence

The suite contains **30 recipes, 390 full fixtures and 180 timed input cells**. Eighteen round15 recipes/234 fixtures are exact references. Twelve new recipes/156 fixtures instantiate six families with discovery and preset alternate callbacks. Each recipe has small/full-word distributions at 32, 4,096 and 65,536 elements. **Fresh result counts below refer to 72 cells per target**, rather than 72 independent algorithms. Performance is U32 only; typed proof coverage is broader.

The independent Python oracle verifies all 390 source results, exercising 4,180,398 input values; literal/expert JavaScript controls pass 780 complete preflight comparisons. The fixtures include empty/singleton, overflow and coefficient/predicate edges. [Preflight](preflight-final-receipt.json), [methodology](../../bench/methodology.py), [immutable source metadata](metadata.json).

| Run | Timing samples | Complete output comparisons |
|---|---:|---:|
| Node | 19,440 | 6,840 |
| Browser | 21,708 | 7,380 |
| Native | 16,200 | 1,950 |
| Total | **57,348** | **16,170** |

All runs use nine shuffled paired rounds, one warmup and calibrated 15ms targets. Builds, tests and proof jobs stop during sequential timing. Web captured calls include one input snapshot, Wasm copying, scalar transport, result conversion, scheduling and output consumption. Borrowed JS omits input snapshots equally on both sides. GPU calls include upload, dispatch, readback and synchronization; startup/first-call costs are separately saved. Native emitted C and handwritten Rust share a separately compiled C timing driver and shared-library boundary without cross-library LTO. Resident and snapshot modes are separate; snapshot mode charges copying. Cleanup/output consumption remain timed.

Environment: Apple M2/macOS26.5.2, Node26.1.0, browser Chrome154, Apple/metal-3 WebGPU adapter, Zig0.15.2, Rust1.96.0/LLVM22 and Apple Clang14. The C/Rust compiler versions are not matched. Rust Wasm uses optimized SIMD-enabled flags; actual vectorized instructions are not established by source review. Dirty checkout identities and exact tool/source/output hashes are recorded.

The initial monolithic browser attempt failed with Wasm memory-allocation exhaustion. It contains no saved usable partial dataset, although earlier trials may have executed; none are pooled. [Failure record](browser-failed-oom-results.json), [screenshot](browser-failed-oom.png). Five sequential six-task browser contexts then run unchanged frozen programs, inputs, controls and parameters. The random seed resets per context; startup totals sum five contexts, and detailed first-call information remains in each raw part. The merged first-validation-call map contains only the first context; use the five raw maps for per-context cold calls. Their 390 fixture/180 cell union is exact and disjoint. [Batch manifest](browser-batches/manifest.json), [fixture binding](browser-batches/fixture-binding.json), [raw parts](browser-batches/).

The first merge rejected differing GPU feature iteration order. The merger now compares sorted feature sets plus identical adapter identity, preserving all raw metadata; changed features/vendors remain rejected. Both helper versions and the rejected merge are archived. All five successful parts are concatenated; no successful part is selected away. Raw records are immutable. The main 6,267 artifact bindings, full phase checksums/counters/medians and all **3,708 web intervals** are independently audited. Native's 1,440 intervals have a separate independent audit. Individual 95% paired-bootstrap intervals use 4,000 draws, seed0 and percentile indices100/3,899. They are exploratory and unadjusted for multiple comparisons.

## New-proof gains over prior Ink

A supported gain requires the entire prior/current ratio interval above1; a regression requires it below1. Supported median ranges describe winning cells only.

| Target | Faster | Slower | Inconclusive | Supported median gain range |
|---|---:|---:|---:|---|
| Node captured JS | 43 | 0 | 29 | 1.04–3.33× |
| Browser captured JS | 34 | 2 | 36 | 1.01–3.26× |
| Node captured Wasm | 21 | 13 | 38 | 1.02–2.07× |
| Browser captured Wasm | 20 | 19 | 33 | 1.03–1.88× |
| Native resident | 42 | 15 | 15 | 1.01–3.40× |
| Native snapshot | 42 | 15 | 15 | 1.01–2.43× |

[Web profitability](profitability.json) records 118 fresh gains, 34 regressions and 136 inconclusive views, plus separate reference/anchor outcomes. [Outcome tables](outcome-tables.json) add native/discovery/held-out/family counts. [Every fresh regression](fresh-regressions.json) remains visible, including 30 native-mode views. The report's recommendation to retain prior output for regressions/inconclusive cells is an offline recommendation, **not a newly installed runtime policy**.

Ordered fusion accounts for 30/36 browser JS gains with no regressions; shared weights give 4/36 gains, two regressions and 30 inconclusive cells. In native mode each family has regressions: ordered gives25 wins/7 losses/4 inconclusive and shared weights17/8/11. A smaller source does not establish a faster compiled loop. Backend-specific code generation and input distribution matter; these measurements do not isolate instruction-level causes of the regressions.

## Handwritten expert comparisons

Experts already fuse stages, skip rejected work, reuse scratch where applicable and keep scalar coefficient work outside reductions. Literal controls preserve the original eager algorithm. Algorithms, modular semantics and input/result boundaries are frozen consistently across variants. Expert comparisons are the relevant bar for native-parity claims.

| Fresh target / expert control | Ink faster | Expert faster | Inconclusive |
|---|---:|---:|---:|
| Node captured JS / expert JS | 15 | 38 | 19 |
| Browser captured JS / expert JS | 19 | 35 | 18 |
| Node borrowed JS / expert borrowed JS | 19 | 36 | 17 |
| Browser borrowed JS / expert borrowed JS | 25 | 33 | 14 |
| Node Wasm / expert Rust-Wasm | 15 | 52 | 5 |
| Browser Wasm / expert Rust-Wasm | 16 | 49 | 7 |
| Native resident / expert Rust | 27 | 40 | 5 |
| Native snapshot / expert Rust | 28 | 39 | 5 |

[All expert comparisons](all-expert-comparisons.json), [native summary](native/summary.json), [strong web controls](strong-controls.json). Ink has actual expert wins, but expert code wins more cells on every view. Literal wins or prior-Ink wins do not imply superiority over an optimized handwritten implementation. Current same-type fold accumulators cannot express a general two-field accumulator: the expert weighted dual-consumer loop can retain two accumulators and apply weights at the end. That representational limitation is recorded rather than hidden behind a weaker expert baseline.

## WebGPU and database observations

GPU eligibility across all 30 tasks is baseline12/prior18/current12. All six new shared-weight current plans lose GPU eligibility because their post-reduction scalar multiplication is unsupported; ordered new reducers are unsupported on both sides. Therefore **there are no new-proof same-GPU prior/current pairs**. The checked GPU shader bundles for all 18 reference tasks are byte-identical to round15; this replay cannot establish a fresh GPU rewrite gain. [Shader reference](round15-gpu-shader-reference.json).

The browser nevertheless verifies actual execution: 252 GPU variant/cells, 2,268 timed GPU samples and 288 fallback variant/cells. Upload/dispatch/readback counters are validated in calibration, warmup and trials. Fallbacks are excluded from GPU timing. Full390-fixture prevalidation covers CPU variants; GPU checks cover timed availability/calls. Historical round15 GPU edge validation is a shader-identity reference, not a new exhaustive GPU fixture run. [Raw browser result](browser-results.json), [audited summary](browser-summary.json), [descriptive backend routing](backend-routing.json). This batch adds no GPU profitability confirmation because no fresh same-GPU transformation is selected.

Each host imports 900 independently bound **Wasm** cost observations, adding 1,800 to the canonical database (7,866→9,666). They carry measured finite peak linear-memory scope; no fabricated zero JS/GPU/native memory observation is imported. Peak Wasm linear memories are 1,900,544 bytes for each Ink variant, 2,752,512 literal Rust and 2,097,152 expert Rust on each host. This is linear-memory extent, not total process memory or an allocation-free claim. [Node observations](node-observations.json), [browser observations](browser-observations.json).

The laws are general within the stated typed, pure semantics, but the measured corpus is still numerical list reductions with preset callbacks. It does not cover general applications, codecs, graph algorithms, DOM/editor work or different hardware. The DB gains are concrete and reusable; the broad native-performance goal remains unproven. Proof validity, backend support and measured profitability are recorded separately.

Final independent reviews and bindings: [integrity](final-integrity.json), [performance](final-performance-review.json), [native](native/final-review.json), [root verification](verification.json), [final binding](final-binding.json). Previous reports and failed attempts are preserved.
