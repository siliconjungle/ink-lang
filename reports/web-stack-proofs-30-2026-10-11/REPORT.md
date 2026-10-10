# Checked DB proof batch 30

Implemented two general ordered-list identities and published **24 checked DB objects**. They remove intermediate list stages without changing the compiler. The cheaper map–filter–map recipe improves JavaScript in both measured hosts; other recipes and targets have regressions. **These are useful transformation choices, not universally profitable defaults. Broad superiority over efficient handwritten Rust/JS has not been achieved.**

```ink
xs.filter(p).concat(ys.filter(p))
    == xs.concat(ys).filter(p)

xs.map(f).filter(p).map(g)
    == xs.filter(x => p(f(x))).map(x => g(f(x)))
```

These equations illustrate the proved endpoints, not new syntax. Both identities preserve output order for arbitrary independent lists and pure total same-type callbacks. They cover U32/I32/U64/F32. Float arithmetic grouping is preserved; no reassociation or numeric cancellation is assumed. Callback scheduling changes, which pure total semantics permits.

## Implementation and admission

The new objects comprise eight typed generic optimization endpoints and sixteen definition-bound deployment certificates: two identities × four types × two source recipes. No proof-support padding or old-law deployments are counted as new work. Global certificates bind helper declarations and transitive callees by content hash. The reusable [producer](../../knowledge/producers/web_pipeline30_laws.py) and its [tests](../../knowledge/tests/test_web_pipeline30_laws.py) live in the knowledge layer. Existing list induction and predicate case analysis prove both identities; no axioms or checker rules were added.

All 355 previously pinned source files and the frozen engine28 compiler are byte-identical. Core language, emitter, planner, runtime and GPU lowering are unchanged. No runtime input checks or optional checker wrappers were added. The separate [harness](../../bench/web-stack-proofs-30.py) supplies evidence.

All eight forward/reverse generic endpoints are absent from the prior 1,867-object catalogue. An old-only search offered all 1,308 semantic laws (1,277 module-applicable per timed recipe) and found no admitted proposals within four applications / 128 bodies. This is bounded opportunity evidence, not a universal non-derivability result. The fair prior is the exact frozen baseline, without extra deployed old laws. Its immutable copy is `prior-store`; historical proof-assembly paths pointing to canonical knowledge must be interpreted using their recorded snapshot, because canonical knowledge now contains the new objects.

The ordinary automatic planner chooses one new application for each of four timed U32 recipes; the prior chooses zero. Both sides use the identical frozen compiler and generic operation prices from batch27, also reused in batch29. The model is an untrusted compile-time profitability hypothesis. It does not establish that a chosen target will be faster. All measured choices, including expensive callbacks and losses, are retained.

## What the output saves and adds

Both source pipelines have three JS array allocation sites; selected outputs have two. Concat-filter changes four CPU loops to three but copies rejected elements before filtering. Its predicate call count is unchanged. GPU dispatches drop from three to two, but aggregate stage payload capacity remains twice the combined input length. Only one four-byte stage header disappears: actual device live-buffer bytes fall by **4 bytes**, not a full payload buffer.

Map–filter–map changes three CPU loops to two and removes the full mapped-input buffer. However, the first mapper now runs on all N inputs while filtering and again on A accepted inputs: **N+A calls rather than N**. On GPU, maps are parallel but filtering and concat are ordered serial stages. The first mapper moves into the serial filter, then repeats in the final parallel map. GPU dispatches drop three to two and actual live-buffer bytes drop by `4*(N+1)` (262,148 bytes at N=65,536). Upload and final readback sizes stay equal between prior and checked versions.

Efficient handwritten controls use one append pass and compute the mapper once. Ink's selected programs still materialize multiple stages. Fewer stages alone is insufficient for expert parity or universal GPU gains.

## Measured changes versus prior Ink

Each row covers all 24 timed cells: four recipes × sizes 32/4,096/65,536 × low/high acceptance. Values are equal-cell geometric means of paired prior/checked ratios; **above 1 means faster checked output**. Win/loss/uncertain classifications use nominal per-cell 95% paired bootstrap intervals. Aggregate means are descriptive, without aggregate confidence intervals or multiplicity correction.

| Boundary | Prior / checked | Win / loss / uncertain |
|---|---:|---:|
| Node JS, owned full call | 1.065× | 13 / 5 / 6 |
| Browser JS, owned full call | 0.961× | 7 / 13 / 4 |
| Node Wasm, full call | 1.005× | 1 / 1 / 22 |
| Browser Wasm, full call | 0.991× | 2 / 6 / 16 |
| Node Wasm, resident destination | 0.973× | 3 / 10 / 11 |
| Browser Wasm, resident destination | 0.949× | 5 / 13 / 6 |
| Browser WebGPU, instrumented full call | 0.963× | 5 / 7 / 12 |
| Native, resident destination | 1.108× | 8 / 11 / 5 |
| Native, captured destination | 0.979× | 6 / 11 / 7 |

The cheaper map–filter–map recipe (`calibrated_selection_u32`) gives the clearest measured cross-host JS opportunity: all six Node JS cells win, and five browser JS cells win with one uncertain. Its descriptive averages are **1.224× Node JS, 1.264× browser JS**. Its GPU average is 1.064× with two wins/four uncertain; its full-Wasm averages are approximately 1.029× Node and 0.992× browser, predominantly uncertain. Native resident averages 1.093× but includes four losing cells; do not read its mean as a universal win.

The expensive map recipe averages **0.924× Node JS and 0.901× browser JS**; extra mapper calls undermine stage savings. Browser concat-filter recipes average **0.862×** for the simple predicate and **0.867×** for remainder buckets. Their GPU averages are 0.911× and 0.940×. Full per-recipe, density and target breakdowns, including every adverse cell, are in [cohorts](cohorts.json) and [paired analysis](analysis.json).

The source names containing `heldout` denote secondary callback recipes. Both are measured here; this is not a claim of unseen performance generalization. Timed acceptance ranges from approximately 0.089 to 0.906. Unmeasured types have correctness evidence, not speed claims. The evidence identifies a profitability-policy gap: callback cost, selectivity, copy traffic and serial GPU scheduling matter beyond list-stage count. The observations can inform later target/workload selection; this batch does not introduce runtime adaptation or claim the current static cost model handles those factors accurately.

## Efficient handwritten controls

The table uses expert/checked ratios, again above 1 meaning Ink is faster. Natural list-output interfaces, capture ownership and resident destination lifetimes are exercised separately; boundaries and hosts are never pooled as an absolute language ranking.

| Control comparison | Expert / checked | Ink win / loss / uncertain |
|---|---:|---:|
| Node handwritten JS | 0.873× | 2 / 14 / 8 |
| Browser handwritten JS | 0.823× | 3 / 18 / 3 |
| Node Rust-Wasm, full call | 0.441× | 0 / 24 / 0 |
| Browser Rust-Wasm, full call | 0.474× | 0 / 24 / 0 |
| Node Rust-Wasm, resident destination | 0.975× | 6 / 11 / 7 |
| Browser Rust-Wasm, resident destination | 0.932× | 7 / 16 / 1 |
| Native Rust, resident destination | 0.797× | 2 / 17 / 5 |
| Native Rust, captured destination | 0.816× | 2 / 15 / 7 |

These are pipeline workloads on one machine, not general language rankings. Efficient controls still lead overall. WebGPU loses all 48 additional comparisons against expert browser JS and full-call Rust-Wasm. Savings versus staged prior Ink do not establish broad gains versus optimized native algorithms.

## Correctness, protocol and independent review

Producer tests pass (three tests). Sixteen typed primary/secondary sources cover 128 full-array frames / 256 original-selected interpreter executions, including wrapping arithmetic, zero divisors, I32 overflow, high U64 values and F32 exceptional values. Correctly hashed false equalities for reversed concat order and the wrong predicate input are rejected; a rehashed changed helper context rejects stale certificate use.

A separate portability probe uses six unseen helper/type sources across U32/I32/U64. Six private hash-bound source certificates plus eight generic endpoints select all six transformations; 36 interpreter executions and 18 emitted-JS full-output checks pass. The private probe adds **zero canonical objects**. This demonstrates reusable certificate production through composed functions; it does not claim generic-only matching of normalized helper bodies.

The benchmark has 96 full-output fixtures including empty and unequal independent inputs, with independent staged and fused integer oracles. Node validates 1,152 variant/fixture rows; browser validates 1,440; native validates 384 complete-output rows. Changed-input nonmutation and owned-output lifetime checks pass. There are **7,560 accepted timing samples**: 1,728 native, 2,592 Node and 3,240 browser, each group with nine matched randomized rounds. Iteration counts calibrate to eight milliseconds or the 65,536-iteration cap. Web uses two warmups; each native calibration/sample subprocess uses three driver prewarm calls.

Native scratch reset and whole-vector consumption occur inside timing. Web endpoint consumption occurs inside timing, with complete arrays checked outside. Full Wasm includes capture, packing, scheduling and unpack; resident setup is excluded and output spans are borrowed. GPU includes upload, dispatch, readback and per-call counter instrumentation. All 288 GPU availability validations execute on GPU with zero fallback; 648 GPU timing rows check actual backend/counter totals. CPU heap peak is unmeasured and explicitly marked unknown; actual GPU live-buffer bytes are recorded.

Native, Node and browser timing ran sequentially after source/build/test/review jobs stopped. The 4,763 frozen bindings and 355 prior sources are independently audited. Native resident/captured rows are split into authenticated analysis views of the unchanged raw file, so their same-round keys never collide. Per-cell intervals use 4,000 paired-round bootstrap draws. This is one instrumented GPU run and fixed data recipes, without an all-hardware or changing-load claim.

Preparation failures and successful retries remain preserved, including root portability syntax and export-interface fixes. The saved-data audit also corrected two inherited accounting assumptions: full-output totals include changed-input lifetime checks, and canonical object identities differ from newline-terminated file hashes. Failed audit receipts are retained; neither correction changes measured programs or raw timings. No failed timings are substituted into the accepted samples. Timings guide profitability and are never proof premises.

## Evidence and final DB

- [Publication](publication.json), [admission checks](publication-checks.json), [proof evidence](proofs/evidence.json), [portability](portability/evidence.json).
- [Native raw](native/results.json), [Node raw](node-results.json), [browser raw](browser-results.json), [analysis](analysis.json), [cohorts](cohorts.json).
- [Node audit](node-audit.json), [browser audit](browser-audit.json), [native audit](native/audit.json), [saved-data review](review/saved-data-review.json), [independent performance review](review/final-performance-review.json), [author analysis](benchmark-preparation/performance-author-review.json).
- [Measurement plans](measurement-plans.json), [observations](observations.json), [initial pins](initial-pins.json), [timing freeze](timing-freeze.json), [final audit](final-audit.json).

Canonical snapshot: `608c4e67bde5ca82537aa1aad2ef64872b0e4287f7c962579f9776516650b93d`: **1,891 objects / 20,000 observations**. The 840 new observations contain all 7,560 samples and bind actual selected laws, compiler, plans and raw-artifact hashes. Prior 1,867 objects, names and 19,160 observation bytes remain intact. Compiler SHA256: `c0f3651f11c04b2a4f30740a1239f3192af52c3cdff4523076456624cc557bbc`.

Publication is local. No commit, push or pull request was created.
