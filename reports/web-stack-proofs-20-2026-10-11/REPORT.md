# Checked web-stack proof batch 20

**15 new generic laws across four reusable families**, four additional composed endpoints using prior mathematics, and nine new checked static applications have been added. One old-only application is shared by both comparison catalogues. The canonical catalogue grows from 1,343 to **1,372 entries**; these 29 entries are not 29 independent optimization mechanisms.

JavaScript shows the most consistent prior/current gains. Wasm gains concentrate in captured-condition reductions; native gains concentrate in paired-fold and vector consumers. **Broad superiority over optimized handwritten Rust, Wasm or JavaScript is not established.** All **66 adverse prior/current comparisons** are retained. The new vector WebGPU paths lose to expert JS in all 12 timed cells on this machine.

## General laws and proof sketches

Callbacks below are arbitrary pure total functions; `c` is a captured Boolean independent of elements and fold accumulators. All finite list lengths and runtime values are covered under the stated primitive semantics.

| Family | Checked equality | Generic entries / types |
|---|---|---|
| Gate mapped sum | `sum(xs.map(x => choose(c,f(x),0))) = choose(c,sum(xs.map(f)),0)` | 3 / U32, I32, U64 |
| Gate filtered count | `count(xs.filter(x => choose(c,p(x),false))) = choose(c,count(xs.filter(p)),0u64)` | 4 / U32, I32, U64, F32 inputs; exact U64 count |
| Gate ordered fold | `foldr(xs,z,x => a => choose(c,g(x)(a),a)) = choose(c,foldr(xs,z,g),z)` | 4 / U32, I32, U64, F32 |
| Self-zip into ordered fold | `foldr(xs.zip(xs,h),z,g) = foldr(xs,z,x => a => g(h(x,x))(a))` | 4 / U32, I32, U64, F32 |
| Independent zip then map | `xs.zip(ys,h).map(g) = xs.zip(ys,a => b => g(h(a,b)))` | 4 / U32, I32, U64, F32; composed from prior identity-map and zip laws |

The gate proofs split on `c` and induct on the list. With `c=false`, each mapped contribution is zero, every filtered item is excluded, or each reducer step returns its accumulator. With `c=true`, each head and tail is the original operation. Explicit normalization bridges connect the branch goals to the existing list-induction checker. Sum uses wrapping-word normalization and excludes F32 reassociation; count and ordered fold preserve their exact semantics.

Self-zip/fold inducts on the list: the empty result is `z`; each head reduces `h(x,x)` against the equal tail fold. Self-zip has exactly the source length, so no truncation is introduced. Right-fold order and per-operation F32 grouping are preserved. Global evaluation of `h` changes from eager forward materialization to reverse consumption; this requires pure total callbacks, not effectful callbacks.

Independent zip/map preserves the shorter-input length and each value `g(h(a,b))`. Its four endpoints compose already-checked prior laws; they are useful new reusable DB endpoints but not new primitive mathematics. Empty/unequal inputs and F32 bit-pattern edge cases are covered in author evidence.

Sources: [algebra producer](../../knowledge/producers/web_algebra20_laws.py), [ordered-fold/zip producer](../../knowledge/producers/web_reduction20_laws.py), [static applications](../../knowledge/producers/web_static20_laws.py). The sum application also composes with historical mapped-sum word laws to produce an allocation-free ordered fold. That extra static certificate is not an additional generic law. Formal objects and dependency closures are identified in [publication.json](publication.json).

## Admission, application and fair prior

Historical snapshot: `6f99dae6d3ca740006f5840d179e17afcb43c5a99c34b5ffb1c02b73d207b177` (1,343 entries). Effective prior: `040dbd8c1fca6812bb15262bc6fd20e08a8146e25b958a5f6db01e9dc8c6fbce` (1,344 entries). Current: `1846f49f86f1451f7e4a21406ff48327691563f0bb36787925439d348c41da91` (1,372 entries).

The frozen subjects were offered to 784 prior typed semantic candidates. One old-only static certificate was proposed, checked and shared by **both** catalogues. Freshness is measured against this effective prior, leaving 28 current-only entries: 19 generic/composed endpoints and nine static applications. This is bounded derivation/search, not exhaustive discovery of every consequence of the historical catalogue. Prior output already receives its applicable mapped-sum optimization.

All 19 generic endpoints were admitted. Of 11 new static attempts, nine were admitted and two were rejected because their apparent gate depended on the bound accumulator/value. The checker rejected an unbound semantic index; those failed attempts remain archived and are excluded. In total, 31 individual checks produced 29 accepted entries and two rejections; the accepted dependency closure was checked again.

All **32 compact selection packages** authenticate and replay minimal dependency closures. Every one of the eight measured current CPU bodies differs from its fair prior and uses a fresh static certificate. Application uses ordinary normalization, a checked law and capture-safe shared beta normalization. There is no export-name whitelist, new trusted theorem rule or whole-module exemption. The compiler, backends, runtime and planner remain unchanged across all 102 guarded files.

Seven focused proof tests pass. Author evidence covers 22 typed gate applications plus six sum/fold alternatives, and 16 ordered-fold/zip applications: **328 exact frames and 656 actual interpreter executions**. Six deliberate false controls reject, including rehashed wrong endpoints and a wrong gate fallback. Typed test applications beyond the measured U32 applications remain research evidence, not extra catalogue padding. Kernel admission, semantic fixtures and measured profitability remain distinct.

## Frozen performance protocol

Eight U32 recipes: gated mapped sum, exact U64 predicate count, two captured-gate ordered folds, two self-zip ordered folds and two independent zip/postmap vector consumers. Three alternate callbacks are preset holdouts, not an external production corpus. First six have `(xs,seed,k)` signatures; last two declare `(xs,ys,seed,k)`. Common native/Rust adapters retain an unused second-list slot for single-list functions but capture only declared inputs.

There are **128 complete fixtures and 72 timed cells** at lengths 32, 4,096 and 65,536 under small/full-width distributions. The first four recipes have explicit enabled/disabled condition profiles. Fixtures include empty, singleton, extrema, zero factors, equal parameters and all-below/all-above thresholds; vectors add empty-left/right and unequal lengths. The donor `xs` arrays are unchanged. Independent `ys` donors use a preset prefix of length `N-max(1,floor(N/8))` for full-width profiles (7N/8 at timed sizes) and full length for small profiles. Therefore the independent arrays are not claimed to be unchanged complete donor arrays. Every input hash, parameter and branch profile was frozen before timing; not all non-gated callback branches are balanced.

Literal controls preserve original eager stages. Expert JS/Rust controls already hoist gates and fuse the paired consumers, preserve right-fold order and allow destination reuse. Expert JS counts as Number then converts once to BigInt; no per-item BigInt handicap. Exact Wasm U64 count uses two output words. A shared Rust `bench_scalar` implementation serves both native and Wasm; native Rust returns its scalar directly rather than performing unnecessary output-store/reload work. Native Ink also uses the scalar result boundary.

Captured JS, borrowed JS, Wasm transport, native resident/snapshot and GPU calls remain separate. Declared inputs are fully captured/copied even when computation is disabled. Full result consumption, generated allocations and cleanup are timed; resident/borrowed views expose work skipping separately. Generated native C uses Apple Clang 14 `-O3`/native CPU, Rust uses Rust 1.96 / LLVM 22.1.2 `-O3`/native CPU. This is not an Ink-to-Rust emitter comparison or equal-LLVM-version experiment. Shared-library timing boundaries are matched without cross-library LTO. Each shared native driver invocation performs one result check and three untimed algorithm prewarm calls before its clock interval; these apply equally to every variant and are distinct from the two journaled warmup phases.

Compiler SHA: `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`. CPU/GPU cost-model bytes remain those of batch19. All **926 prepared artifacts** and **52 policy/author/control/analysis bindings** were frozen before timing. No measurement informed proof, fixture, expert, source or cost-policy edits. Native, Node and two disjoint browser contexts ran sequentially with all author/audit jobs stopped. JS/Wasm modules and GPU pipelines are warm; startup/prevalidation costs are recorded separately.

Each host uses nine shuffled rounds, two warmups and a 15 ms sample target. Native calibration begins at one call, journals clock-resolution zeros and grows adaptively with maximum growth factor 16; zero-duration trials force a factor of 16. Measured/warmup durations must be positive. Its 3,581 calibration trials are retained. All trials and samples are retained without restart, selective dropping or pooling. Totals are **22,464 samples**, **6,040 complete benchmark comparisons**, and **2,016 independently recomputed saved intervals**. Complete output equality is validated before timing and at per-cell availability checks; timed vectors consume length/sum/weighted checksums rather than comparing every element on every iteration. Paired median bootstrap uses 4,000 draws with Random(0). Individual 95% intervals are exploratory and unadjusted; boundary views are correlated. No pooled suite average or general language ranking is asserted.

## Prior/current outcomes

A win has a paired prior/current interval entirely above 1; a regression entirely below 1; other outcomes are inconclusive.

| Target / boundary | Current faster | Current slower | Inconclusive |
|---|---:|---:|---:|
| Node JS | 63 | 1 | 8 |
| Browser JS | 56 | 2 | 14 |
| Node Wasm | 31 | 8 | 33 |
| Browser Wasm | 31 | 4 | 37 |
| Native C resident | 16 | 35 | 21 |
| Native C snapshot | 16 | 16 | 40 |

Median ratios among confirmed winning cells, **not suite-wide ranges or averages**:

- Node JS: 1.021–14.689×.
- Browser JS: 1.013–7.264×.
- Node Wasm: 1.008–1.688×.
- Browser Wasm: 1.047–1.545×.
- Native C resident: 1.067–1.970×.
- Native C snapshot: 1.054–1.606×.

Disabled gates account for 23/24 JS wins on each web host and 19/24 Node Wasm / 18/24 browser Wasm wins. Enabled gates improve JS in 19/24 Node and 17/24 browser cells, and Wasm in 12/24 Node and 13/24 browser cells. The ungated paired consumers improve JS in 21/24 Node and 16/24 browser cells, but show **zero confirmed Wasm gains**. Native gains are all ungated paired consumers (16/24 per mode); all 24 disabled resident native gate cells regress. Code-shape evidence and fixed-overhead limits must qualify the theoretical work-skipping law.

The 66 adverse rows comprise Node JS1, browser JS2, Node Wasm8, browser Wasm4, native resident35 and native snapshot16. All are saved in [fresh-regressions.json](fresh-regressions.json). [profitability.json](profitability.json) records measured web recommendations to retain prior output in losing/inconclusive cells. These recommendations are DB evidence for future external selection, not an installed adaptive runtime optimizer or tuned default policy.

## Optimized handwritten controls

| Current Ink / expert boundary | Ink faster | Expert faster | Inconclusive |
|---|---:|---:|---:|
| Node captured JS / expert JS | 10 | 47 | 15 |
| Browser captured JS / expert JS | 6 | 38 | 28 |
| Node Wasm / expert Rust Wasm | 1 | 65 | 6 |
| Browser Wasm / expert Rust Wasm | 0 | 55 | 17 |
| Native C resident / expert Rust | 3 | 59 | 10 |
| Native C snapshot / expert Rust | 8 | 35 | 29 |
| New vector GPU / expert JS | 0 | 12 | 0 |

Borrowed JS gives Node14/49/9 and browser13/45/14 Ink-win/expert-win/inconclusive outcomes. These views correlate with captured calls and must not be pooled. Gains over original eager literal code and prior Ink do not establish gains over an expert who already applies the same algebra. Complete per-cell intervals remain in [all-expert-comparisons.json](all-expert-comparisons.json).

## Actual WebGPU and generated code

GPU prevalidation issued 384 variant/fixture requests: **83 actual GPU paths and 301 CPU fallbacks**. The count recipe has 57 GPU fixture paths across baseline/prior/current; its prior/current selected GPU core and shaders are identical and apply no new proof. Its 12 matched timed cells are explicitly **reference measurements**, excluded from fresh-proof gains. A significant timing difference between identical kernels does not become a new optimization claim.

The two vector recipes add 26 current GPU fixture paths and 12 new timed cells. Their prior versions fall back to CPU, so there are **zero fresh same-backend prior/current GPU cells**. All 48 timed GPU variant/cells have positive-input dispatch evidence, producing 432 GPU timing samples: 36 count-reference variant/cells and 12 new vector cells. Empty vector fixture paths may report GPU without dispatch. Upload, dispatch, readback and complete output consumption are charged. There is no independent handwritten WGSL expert in this campaign. New vector GPU loses to expert JS in 12/12 cells; count-reference expert outcomes remain separately labelled. [backend-routing.json](backend-routing.json) contains current forced CPU/GPU complete-call intervals, not a newly installed routing policy.

Generated-code counts and native gate overhead are independently recorded in [code-shape-review.json](code-shape-review.json) and its [explanation](code-shape-review.md). Across the eight CPU-policy bodies, JS/C allocation sites fall from seven to three and loop sites from 12 to eight. Three scalar packed-result bridge allocations remain outside these body counts; direct native scalar timings bypass those bridges. Counts include filter empty-array allocations and are static sites, not dynamic allocation bytes. Self-zip folds remove an intermediate paired array while retaining exact ordered reduction. Independent zip/map uses one necessary output array. Enabled count still compacts a filter array; reusable vector callbacks can retain JS IIFEs and redundant C loads.

For the four gated recipes, all CPU-policy algorithm loops/allocations lie under captured gates, so disabled direct functions do constant work in emitted source. The prior emitted source retains gates in callbacks; its native optimizer may already hoist/eliminate that work. Static source inspection does not establish assembly-level savings or explain the measured native regressions. These are compile-time checked rewrites; fewer loops/allocations do not guarantee a faster lowered program, as Wasm/native regressions show.

## Database, reviews and limits

**720 complete-call Wasm observations**, 360 per web host, bring the canonical ledger and disposable SQLite index to **12,306 observations**. Each matches exact archived samples, workload/program/plan/proof bindings and exported-memory scope. JS/native/GPU results remain archived here; only observations with exported Wasm-memory scope are imported. Exported linear-memory peaks are not total process memory.

Untimed author/preparation failures remain archived: initial algebra induction attempts needed explicit normalization bridges; two invalid static gate attempts were excluded individually before publication. Original frozen analysis helpers remain byte-identical; separately bound reviewed helpers classify unchanged GPU count as reference before performance began. No frozen algorithms, proof bytes, targets or policies were edited after timing started. Historical batch19 evidence is preserved.

Independent receipts: [catalogue](catalogue-review.json), [native intervals/journal](native-final-review.json), [code shape](code-shape-review.json), [protocol/final prose](protocol-final-review.json), [web intervals](root-interval-verification.json), [final verification](verification.json). Proof/admission/interpreter archives remain under `knowledge/research/web-stack-proofs-20/`.

These laws generalize mathematically across their callback/type conditions. Measurements cover one machine/browser, eight U32 recipes and preset distributions, not arbitrary workloads or devices. The broad native-performance goal remains open; this campaign identifies reusable wins and target-dependent regressions rather than claiming it achieved that goal. No input validation wrappers, new runtime checks or load/state-dependent optimizer were added. `choose(c,...)` is the original algorithm's condition moved out of repeated work, not caller validation. No commit, push or PR was performed.
