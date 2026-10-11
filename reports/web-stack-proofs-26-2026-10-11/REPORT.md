# Ink invariant folds and direct JS targets — batch 26

The clearest reusable gain is the JavaScript emitter: ordinary loops, inline callbacks and scalar locals replace runtime helper calls and closures at compilation. Across the 56 preset captured-call cases, the new emitter is faster in **29 Node cases and 24 browser cases**, with zero confirmed captured-call regressions and the rest inconclusive. Synchronous borrowed calls show **36 gains / 4 regressions** in Node and **38 gains / 1 regression** in the browser; the cleanup is therefore not uniformly faster at every boundary.

The newly checked fold identities have mixed marginal profitability on the current backend: **4 gains / 1 regression / 11 inconclusive** in Node and **2 / 2 / 12** in the browser. No fresh fold proof yields a confirmed Wasm gain here. Validity alone does not guarantee profitability, so the negative cells remain in the DB and report.

**Broad superiority over optimized native implementations remains unachieved.** Across all 56 cases, captured generated JS beats the strong JS expert in 1 Node case and 2 browser cases; generated Wasm beats the Rust Wasm expert in 0 cases on either host. Native resident Ink/C beats optimized Rust in 7 cases, loses in 39, and is inconclusive in 10. Actual WebGPU loses all 12 measured reference cells to both optimized JS and Rust Wasm; transfer and readback are included. These findings identify improvements to Ink without establishing a general language ranking.

All optimization work in this batch occurs at compile time. The generated outputs contain direct computation and the existing target bridges; this batch adds no runtime proof search, load-based optimizer or caller validation.

| Task family | Node median old/new JS speed ratio | Browser median old/new JS speed ratio |
|---|---:|---:|
| `invariant_fold_u32` | 1.107× | 1.099× |
| `invariant_fold_heldout_u32` | 1.468× | 1.458× |
| `accepted_repair_u32` | 1.274× | 1.424× |
| `accepted_checksum_u32` | 1.355× | 1.520× |
| `paired_calibrated_u32` | 1.000× | 0.997× |
| `skip_first_accepted_u32` | 1.003× | 1.004× |
| `paired_ordered_score_u32` | 1.003× | 1.006× |
| `reference_indexed_u32` | 1.077× | 1.025× |
| `reference_modular_mix_u32` | 7.302× | 5.323× |

These are medians of per-cell captured-call ratios within each family, not pooled throughput or a cross-language score. A ratio above 1 favors the new emitter. The modular mix is the largest gain (7.30× Node / 5.32× browser by family median), but remains slower than the strong expert.

Two recipes instantiate checked two-live-branch invariant-fold hoisting. Seven unchanged backend references cover filtered repair, ordered checksum/selfzip, independent min-length zip, first-match lookup, indexed output and dependent modular mixing. This is a bounded set of related U32 kernels on one machine, not a broad application corpus or universal language ranking. Strong handwritten experts already apply all these legal reductions and loop improvements.

For arbitrary pure total callbacks and an item/accumulator-independent Boolean `c`, the identities are `map(xs,x => choose(c,f(x),g(x))) = choose(c,map(xs,f),map(xs,g))` and `foldr(xs,z,x => a => choose(c,h(x)(a),j(x)(a))) = choose(c,foldr(xs,z,h),foldr(xs,z,j))`. A case split on `c` and ordinary list induction check the identities. These are two standard identities with four numeric instances each, new to the pinned catalogue, not new mathematics. Eight generic roots, sixteen typed primary/alternate source certificates and eight newly derived old-only certificates make the 32-object publication; one additional shared witness was already historical. All eight typed fold examples select under the frozen cost policy. All eight map examples pass correctness/reification checks but remain unselected because the current model charges both whole-map branches; no map profitability is claimed.

The general identities move a captured Boolean choice outside an arbitrary pure map or arbitrary ordered fold. Both branches are live; either selected reducer still traverses the full list. U32/I32/U64/F32 proofs preserve callback expressions and exact right-fold order. The map identities are checked evidence; benchmark freshness and actual selection are tracked separately for the two fold recipes. Old-only checked specialization opportunities are offered symmetrically, and the same selected core is compiled unchanged by both backends.

The backend change is direct-loop JavaScript emission with scalar statement blocks and typed local sharing. It introduces no mathematical fusion or caller checks. Exactly one guarded production file and its structural test change; the other 100 guarded sources, core/checker/planner/C/Wasm/runtime host stay unchanged. Emitted C sources and Wasm executable sections are authenticated as identical; complete Wasm bytes differ only in old/new DWARF debug paths for each fixed proof core. Source size may grow; fewer closures or callbacks do not establish speed by themselves. For a fixed proof core, unchanged native/Wasm/GPU backend code cannot establish a JS-emitter gain; any measured old/new variation there reflects measurement or build/layout variation. Mathematical proof effects remain separately measured.

## Fresh proof recipes: 16 cells per host/boundary

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS captured call · backend on current proofs | 8/16 | 0 | 8 |
| node | JS captured call · proofs on current backend | 4/16 | 1 | 11 |
| node | JS captured call · combined versus old prior | 4/16 | 2 | 10 |
| node | Wasm captured call · backend on current proofs | 1/16 | 1 | 14 |
| node | Wasm captured call · proofs on current backend | 0/16 | 1 | 15 |
| node | Wasm captured call · combined versus old prior | 1/16 | 1 | 14 |
| node | JS synchronous borrowed call · backend on current proofs | 8/16 | 2 | 6 |
| node | JS synchronous borrowed call · proofs on current backend | 6/16 | 2 | 8 |
| node | JS synchronous borrowed call · combined versus old prior | 6/16 | 5 | 5 |
| browser | JS captured call · backend on current proofs | 8/16 | 0 | 8 |
| browser | JS captured call · proofs on current backend | 2/16 | 2 | 12 |
| browser | JS captured call · combined versus old prior | 2/16 | 1 | 13 |
| browser | Wasm captured call · backend on current proofs | 0/16 | 0 | 16 |
| browser | Wasm captured call · proofs on current backend | 0/16 | 2 | 14 |
| browser | Wasm captured call · combined versus old prior | 1/16 | 0 | 15 |
| browser | JS synchronous borrowed call · backend on current proofs | 10/16 | 1 | 5 |
| browser | JS synchronous borrowed call · proofs on current backend | 3/16 | 3 | 10 |
| browser | JS synchronous borrowed call · combined versus old prior | 2/16 | 4 | 10 |
| native / resident | backend on current proofs | 2/16 | 0 | 14 |
| native / resident | proofs on current backend | 0/16 | 1 | 15 |
| native / resident | combined versus old prior | 0/16 | 1 | 15 |
| native / snapshot | backend on current proofs | 0/16 | 1 | 15 |
| native / snapshot | proofs on current backend | 1/16 | 0 | 15 |
| native / snapshot | combined versus old prior | 0/16 | 0 | 16 |

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS captured call versus optimized JavaScript | 1/16 | 10 | 5 |
| node | Wasm captured call versus optimized Rust Wasm | 0/16 | 10 | 6 |
| node | JS synchronous borrowed call versus optimized JavaScript | 3/16 | 1 | 12 |
| browser | JS captured call versus optimized JavaScript | 0/16 | 8 | 8 |
| browser | Wasm captured call versus optimized Rust Wasm | 0/16 | 8 | 8 |
| browser | JS synchronous borrowed call versus optimized JavaScript | 0/16 | 2 | 14 |
| native / resident | versus optimized native Rust | 4/16 | 3 | 9 |
| native / snapshot | versus optimized native Rust | 2/16 | 3 | 11 |

## All 9 tasks: 56 cells per host/boundary

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS captured call · backend on current proofs | 29/56 | 0 | 27 |
| node | JS captured call · proofs on current backend | 5/56 | 1 | 50 |
| node | JS captured call · combined versus old prior | 25/56 | 3 | 28 |
| node | Wasm captured call · backend on current proofs | 3/56 | 4 | 49 |
| node | Wasm captured call · proofs on current backend | 9/56 | 6 | 41 |
| node | Wasm captured call · combined versus old prior | 3/56 | 4 | 49 |
| node | JS synchronous borrowed call · backend on current proofs | 36/56 | 4 | 16 |
| node | JS synchronous borrowed call · proofs on current backend | 9/56 | 5 | 42 |
| node | JS synchronous borrowed call · combined versus old prior | 33/56 | 5 | 18 |
| browser | JS captured call · backend on current proofs | 24/56 | 0 | 32 |
| browser | JS captured call · proofs on current backend | 5/56 | 3 | 48 |
| browser | JS captured call · combined versus old prior | 18/56 | 1 | 37 |
| browser | Wasm captured call · backend on current proofs | 1/56 | 0 | 55 |
| browser | Wasm captured call · proofs on current backend | 1/56 | 2 | 53 |
| browser | Wasm captured call · combined versus old prior | 3/56 | 0 | 53 |
| browser | JS synchronous borrowed call · backend on current proofs | 38/56 | 1 | 17 |
| browser | JS synchronous borrowed call · proofs on current backend | 6/56 | 5 | 45 |
| browser | JS synchronous borrowed call · combined versus old prior | 31/56 | 5 | 20 |
| native / resident | backend on current proofs | 3/56 | 2 | 51 |
| native / resident | proofs on current backend | 0/56 | 3 | 53 |
| native / resident | combined versus old prior | 2/56 | 2 | 52 |
| native / snapshot | backend on current proofs | 0/56 | 1 | 55 |
| native / snapshot | proofs on current backend | 1/56 | 1 | 54 |
| native / snapshot | combined versus old prior | 0/56 | 2 | 54 |

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS captured call versus optimized JavaScript | 1/56 | 43 | 12 |
| node | Wasm captured call versus optimized Rust Wasm | 0/56 | 45 | 11 |
| node | JS synchronous borrowed call versus optimized JavaScript | 8/56 | 15 | 33 |
| browser | JS captured call versus optimized JavaScript | 2/56 | 33 | 21 |
| browser | Wasm captured call versus optimized Rust Wasm | 0/56 | 36 | 20 |
| browser | JS synchronous borrowed call versus optimized JavaScript | 13/56 | 12 | 31 |
| native / resident | versus optimized native Rust | 7/56 | 39 | 10 |
| native / snapshot | versus optimized native Rust | 4/56 | 33 | 19 |

## Actual GPU comparisons

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| browser | Actual ink_old_prior_gpu versus js_expert | 0/12 | 12 | 0 |
| browser | Actual ink_old_prior_gpu versus rust_expert_wasm | 0/12 | 12 | 0 |

GPU rows are actual execution with dispatch/upload/readback counters, not CPU fallbacks. Exact ABI/device/host/WGSL fingerprints are deduplicated; task role and actual selected cores determine attribution. No fresh GPU gain is implied by a backend-only arithmetic/indexed reference. Full calls include captured input copies, GPU transfer/readback and output consumption.

## Frozen workload and controls

Inputs use sizes 32 and 65,536 for timing and 4,096 for correctness, preset small/full distributions and fixed scalar captures per distribution/profile across sizes. The invariant folds exercise enabled/disabled flags and both branches still traverse. First-match lookup covers first/interior/last/absent matches. The independent zip has two genuine lists, with ys taken from a distinct donor and truncated to 3N/4; every declared list is captured fairly and output truncates to min length. Empty, unequal, wrapping and zero-divisor fixtures compare all outputs and confirm source nonmutation.

Original JS/Rust materialize source stages and validate only. Strong experts hoist invariant flags, fuse repair/paired/indexed passes, preserve accumulator-dependent reverse reduction order, and reuse output scratch. The modular mix uses 16 fixed stages:64 stage primitives plus initial x+seed,65 original word primitives total. Experts precompute 16 captured multipliers and replace remainder by an exact conditional subtraction because the wrapped word is below twice 4,294,967,291. This is a fixed modular-mix reference, not cryptographic security, proof novelty or timing-tuned work.

Full captured JS/Wasm, synchronous borrowed JS and native resident/snapshot are separate cohorts. Borrowed JS calls are synchronous with no per-call promises or snapshots. Native Rust and generated C return scalars through the same common driver boundary; vectors use reusable expert output scratch versus generated allocations. Native measures C/Clang versus Rust with distinct toolchains, not language isolation. Native common invocations make three unrecorded prewarm calls before the clock in addition to two recorded warmup phases. Final output consumption/arena cleanup is timed and may dominate cheap kernels.

## Evidence and limits

There are 18 checked selections and 36 compiler/proof bundles. JS author tests passed 1,972 interpreter comparisons plus operational read/allocation/order/lazy checks; proof author tests passed 168 typed frames through 336 original/selected interpreter calls and two false controls. These finite tests and checked source identities do not formally prove the trusted target emitter. Untimed source/oracle corroboration covers 187 complete fixtures and 2,055,448 input words; original/expert JS validated 374 complete outputs. Completed runs contain 20,268 samples, 9,403 complete comparisons and 4,056 independently recomputed intervals. All 135 adverse attribution rows and all inconclusives remain archived.

Nine shuffled rounds, two recorded warmups and 15 ms target were preset before timing. Timing ran sequentially with other jobs stopped. Three bounded browser contexts preserve every frozen fixture/cell; startup costs sum contexts, while merged cold-call map holds only the first context and raw maps retain the others. Exported Wasm memory is not total process/GPU memory. Favorable whole paired 95% intervals are exploratory per-cell evidence without family-wise adjustment, not pooled language rankings.

Publication added 32 checked objects to 1790 entries, with effective fair prior 1766. Canonical imports added 560 Wasm observations; ledger and index agree on 17,026. Snapshot `a2a756dc7174ab62c2806e09dd0e3769e507f4ed5e455d687346c544cd788abd`. Correctness authority is separate from empirical profitability. No commit, push or PR was made.

A pre-timing audit caught stale default compiler paths in the first preparation. That complete matrix, validations and audit failures are preserved under `../web-stack-proofs-26-mis-pinned-preparation-2026-10-11/`; it supplied zero timing samples. The final preparation explicitly pins the correct compilers. No measured workloads or controls changed in recovery.

[Full raw comparisons](all-comparisons.json), [adverse rows](regressions.json), [independent protocol audit](protocol-final-review.json), [native audit](native-final-review.json), [catalogue audit](catalogue-review.json), [emission review](emission-review.json), [final integrity](verification.json). No general superiority claim follows from this corpus.
