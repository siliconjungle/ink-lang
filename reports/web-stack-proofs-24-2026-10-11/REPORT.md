# Ink web demand proofs — batch 24

Checked generic demand laws and a forward early-exit lowering are implemented. The tables below separate measured backend gains, proof gains and comparisons with optimized competitors. These measurements cover demand/head/first-match patterns and two unchanged references on one machine; they do not establish a broad victory over native Rust, JavaScript or GPU execution.

The combined changes beat the fair old-only Ink output in **36/40 fresh full-call JS cells in Node and 29/40 in the browser**. Against optimized JS, Ink wins 6/40 fresh full-call cells per host, with many losses or inconclusive comparisons. Wasm is mixed: combined changes win 12/40 Node cells but lose 24/40, and win 13/40 browser cells but lose 21/40. Native output improves over old Ink in 28/40 fresh cells at each boundary, yet optimized Rust wins all 40 fresh resident cells; Ink has no confirmed fresh Rust-Wasm or native-Rust wins. Both optimized CPU controls beat all eight measured GPU reference cells. **The broad native-performance goal remains open.**

## Proofs and implementation

The new generic law is `xs.map(f).at_or(0,f(z)) = f(xs.at_or(0,z))`, for an arbitrary pure total unary mapper and U32, I32, U64 and F32 values. On an empty list both sides return `f(z)`; on a nonempty list both return `f` of the first element. It requires the transformed fallback, preserves each arithmetic expression and F32 grouping, and removes unobserved callback evaluations. There is no fixed-point premise or trusted theorem flag. Four checked deployment compositions combine this law with the previous first-accepted law: `xs.filter(p).map(f).at_or(0,f(z)) = f(foldr(xs,z,x => a => choose(p(x),x,a)))`. These are standard mathematical identities, new against the pinned bounded catalogue search; they are not claimed as mathematical discoveries.

The JS and C emitters now recognize numeric right folds whose choice predicates are independent of the accumulator and whose leaves either retain it or replace it independently. The first replacement in source order overrides every later replacement. A forward loop therefore stops at that replacement, or returns the original default. Lexical dependence detection respects shadowing; unsupported or accumulator-dependent folds keep their original reverse lowering. An explicit break handles replacements equal to the fallback, NaN and negative zero. This is trusted backend refinement backed by differential tests, not a formal machine-code proof. The C change applies to compute-emitter routes: in this fixture set, only the two checked filtered mapped-head C kernels gain early exit. Their old-prior mapped-fold and the standalone first-accepted references still use the unchanged legacy C emitter; those backend comparisons are byte-identical controls. JS routes cover those folds as well. Only two production emitter files changed; the other 100 guarded files, core semantics, checker, planner and runtime are unchanged.

Proof search and selection happen before deployment. Outputs contain ordinary target code, with no runtime proof optimization or added caller validation/checker wrappers. Existing transport boundaries still matter: full-call snapshots and Wasm ingress can traverse the input even when the selected computation stops immediately. Borrowed synchronous JS calls and resident native calls expose a different cost from complete captured calls.

Canonical publication added **36 objects**: four generic optimization endpoints, four deployment compositions, six fresh benchmark source certificates and 22 old-derived certificates made available equally to both catalogues. The immutable historical catalogue has 1,688 entries; the fair old-only comparison catalogue has 1,710; the current catalogue has **1,724**. Source derivation is bounded to four applications and 128 expanded bodies per source; all 52 rejected proposals remain archived. Dynamic-index generalization failed this normalizer and is not published. No semantic core extension was required.

## Measured gains on the four fresh proof tasks

Each cell uses nine interleaved rounds and a paired bootstrap 95% interval. A confirmed gain requires the entire interval to favor the candidate. These are exploratory per-cell intervals, without family-wise adjustment; counts are not a pooled language ranking. A ratio greater than one means old/new speedup for backend, proof and combined comparisons. Expert comparison orientation is Ink/expert, so less than one favors Ink. Absolute medians and every interval remain in the summaries.

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS full call · backend with current proofs | 16/40 | 8 | 16 |
| node | JS full call · proofs on new backend | 30/40 | 1 | 9 |
| node | JS full call · combined versus old prior | 36/40 | 4 | 0 |
| node | Wasm full call · backend with current proofs | 8/40 | 5 | 27 |
| node | Wasm full call · proofs on new backend | 11/40 | 24 | 5 |
| node | Wasm full call · combined versus old prior | 12/40 | 24 | 4 |
| node | JS synchronous borrowed call · backend with current proofs | 16/40 | 16 | 8 |
| node | JS synchronous borrowed call · proofs on new backend | 20/40 | 13 | 7 |
| node | JS synchronous borrowed call · combined versus old prior | 30/40 | 9 | 1 |
| browser | JS full call · backend with current proofs | 10/40 | 8 | 22 |
| browser | JS full call · proofs on new backend | 21/40 | 0 | 19 |
| browser | JS full call · combined versus old prior | 29/40 | 8 | 3 |
| browser | Wasm full call · backend with current proofs | 8/40 | 8 | 24 |
| browser | Wasm full call · proofs on new backend | 12/40 | 20 | 8 |
| browser | Wasm full call · combined versus old prior | 13/40 | 21 | 6 |
| browser | JS synchronous borrowed call · backend with current proofs | 15/40 | 17 | 8 |
| browser | JS synchronous borrowed call · proofs on new backend | 14/40 | 19 | 7 |
| browser | JS synchronous borrowed call · combined versus old prior | 21/40 | 16 | 3 |
| native / resident | backend with current proofs | 17/40 | 15 | 8 |
| native / resident | proofs on new backend | 28/40 | 12 | 0 |
| native / resident | combined versus old prior | 28/40 | 11 | 1 |
| native / snapshot | backend with current proofs | 23/40 | 9 | 8 |
| native / snapshot | proofs on new backend | 28/40 | 11 | 1 |
| native / snapshot | combined versus old prior | 28/40 | 10 | 2 |

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS full call versus optimized JavaScript | 6/40 | 28 | 6 |
| node | Wasm full call versus optimized Rust Wasm | 0/40 | 40 | 0 |
| node | JS synchronous borrowed call versus optimized JavaScript | 19/40 | 15 | 6 |
| browser | JS full call versus optimized JavaScript | 6/40 | 20 | 14 |
| browser | Wasm full call versus optimized Rust Wasm | 0/40 | 26 | 14 |
| browser | JS synchronous borrowed call versus optimized JavaScript | 19/40 | 14 | 7 |
| native / resident | versus optimized native Rust | 0/40 | 40 | 0 |
| native / snapshot | versus optimized native Rust | 0/40 | 32 | 8 |

Mapped-head and filtered mapped-head use primary and held-out callback expressions. The four fresh tasks account for 40 timed cells; four backend/reference tasks account for the other 40. All tasks use one list and runtime scalar captures. Sizes are 32 and 65,536 with two distributions and fixed captures across sizes. Search cases include first, interior, last and absent matches at both sizes. The 4,096-element fixtures are correctness-only. Typed proof tests span all four numeric types, while these performance measurements instantiate U32 operations; the count reference returns U64.

## All tasks, including backend and unchanged references

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS full call · backend with current proofs | 29/80 | 16 | 35 |
| node | JS full call · proofs on new backend | 30/80 | 3 | 47 |
| node | JS full call · combined versus old prior | 52/80 | 13 | 15 |
| node | Wasm full call · backend with current proofs | 8/80 | 10 | 62 |
| node | Wasm full call · proofs on new backend | 13/80 | 27 | 40 |
| node | Wasm full call · combined versus old prior | 13/80 | 27 | 40 |
| node | JS synchronous borrowed call · backend with current proofs | 32/80 | 35 | 13 |
| node | JS synchronous borrowed call · proofs on new backend | 22/80 | 17 | 41 |
| node | JS synchronous borrowed call · combined versus old prior | 46/80 | 27 | 7 |
| browser | JS full call · backend with current proofs | 20/80 | 16 | 44 |
| browser | JS full call · proofs on new backend | 21/80 | 0 | 59 |
| browser | JS full call · combined versus old prior | 42/80 | 16 | 22 |
| browser | Wasm full call · backend with current proofs | 8/80 | 10 | 62 |
| browser | Wasm full call · proofs on new backend | 13/80 | 22 | 45 |
| browser | Wasm full call · combined versus old prior | 17/80 | 22 | 41 |
| browser | JS synchronous borrowed call · backend with current proofs | 32/80 | 33 | 15 |
| browser | JS synchronous borrowed call · proofs on new backend | 15/80 | 20 | 45 |
| browser | JS synchronous borrowed call · combined versus old prior | 37/80 | 32 | 11 |
| native / resident | backend with current proofs | 17/80 | 15 | 48 |
| native / resident | proofs on new backend | 30/80 | 16 | 34 |
| native / resident | combined versus old prior | 30/80 | 15 | 35 |
| native / snapshot | backend with current proofs | 23/80 | 11 | 46 |
| native / snapshot | proofs on new backend | 28/80 | 13 | 39 |
| native / snapshot | combined versus old prior | 28/80 | 14 | 38 |

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS full call versus optimized JavaScript | 7/80 | 57 | 16 |
| node | Wasm full call versus optimized Rust Wasm | 0/80 | 74 | 6 |
| node | JS synchronous borrowed call versus optimized JavaScript | 22/80 | 36 | 22 |
| browser | JS full call versus optimized JavaScript | 8/80 | 41 | 31 |
| browser | Wasm full call versus optimized Rust Wasm | 3/80 | 57 | 20 |
| browser | JS synchronous borrowed call versus optimized JavaScript | 21/80 | 36 | 23 |
| native / resident | versus optimized native Rust | 0/80 | 80 | 0 |
| native / snapshot | versus optimized native Rust | 0/80 | 70 | 10 |

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| browser | GPU reference versus js_expert | 0/8 | 8 | 0 |
| browser | GPU reference versus rust_expert_wasm | 0/8 | 8 | 0 |

GPU evidence is limited to unchanged reference kernels, deduplicated by exact ABI/host/device/WGSL fingerprints. Availability, actual backend, dispatches, upload and readback bytes were recorded; fallback rows are not counted as GPU execution. No fresh WebGPU proof or emitter performance gain is claimed by this batch. Adaptive backend selection is not newly implemented or proved here.

## Fairness and validation

One prior and one checked core were selected per task using the archived semantic checker; each exact selected core was compiled by both the archived and new backends. This yields 16 minimal checked selection packages and 32 target bundles. Both compiler hashes, full proof closure admissions, emitted ABIs, controls, fixtures and policy bytes were pinned before timing. The 2×2 design independently measures backend gains, proof gains and their interactions. Optimized JS and Rust controls already select the first raw value and map once; staged original implementations are validation-only. No benchmark-specific export whitelist is used for the law matcher or emitter.

Both new backend test suites passed **663 interpreter comparisons each**, including F32 bit patterns, overflow, shadowing, accumulator dependencies, empty/default cases and reached-only callback/read counters. Existing backend suites also passed. Proof tests replayed/reified 16 typed functions and compared 96 frames through 192 interpreter calls. Python independently compared original and demand formulations on 208 frames comprising 2,786,840 input values; generated original/expert JS completed 416 output/nonmutation checks. Before timing, all 17 CPU web variants completed 3,536 comparisons and all six native variants completed 1,248. Measured runners also validated complete outputs before measurement and consumed checksums during all trials.

The completed runs contain **28,872 timing samples** (Node: 10,800 samples; browser: 10,872 samples; native: 7,200 samples) and **11,008 complete benchmark comparisons**. Saved independent audits recomputed **5,776 intervals**, including factorial interactions. The machine is Apple M2, macOS 26.5.2 arm64, with Node and the headed Chromium-based in-app browser. Rust is 1.96.0/LLVM22; generated native C uses Apple Clang14, whose upstream LLVM major is unestablished. Toolchain parity is not established, so native ratios compare these actual compiled outputs rather than isolated language properties. Native resident and snapshot boundaries are separate. Timing ran sequentially with author/build/test/audit work stopped. Calibration, recorded warmups, every round, availability and native trial journals are retained. Each native sample invocation also makes three common unrecorded prewarm calls before its measured loop. Common checksum consumption remains timed and can dominate constant-time kernels. Browser startup sums both bounded contexts; merged cold-call evidence covers the first context only. Full results retain **647 adverse backend/proof comparisons**, including noisy unchanged/reference rows; none were removed to improve headline counts.

Canonical imports added **800 Wasm observations** across five variants, 80 cells and two hosts, with actual compiler/Wasm bytes, plans, workload and exported linear-memory evidence. The immutable observation ledger and disposable SQLite index agree on **15,746 observations** and 1,724 entries. Memory scope is exported Wasm linear memory, not total process/GPU memory. Snapshot `a7b97db7e513ae4619176902750c6b58717962660a3f1bcb106a4d46ed9d68fa` preserves prior objects; profitability observations are not theorem authority.

## Preserved corrections and evidence

The initial source-baseline capture raced authorized emitter edits; the failed capture receipt is retained. Exact original emitter copies were recovered without resetting the working tree and match the archived batch23 hashes. An initial C test parser stopped at an inner brace; its failure is retained and the test extractor now balances braces. The initial proof test wrongly assumed no old fallback-normalization opportunities; its failure remains archived and the final fair prior includes all old-only witnesses. Independent prepared audits also required initializing Merkle witnesses before reconstructing serialized byte hashes, matching the preparation order; original audit failures and recovered helpers are preserved. A pretime helper status mismatch was corrected in a separately named helper, leaving frozen originals untouched. A final native audit also encountered an outside-repository compiler-path binding error; its original failure and frozen helper are retained. A separate recovered audit changed only path-key handling and passed all original numerical checks. The final web audit also required normalizing saved JSON lists against the bootstrap helper's tuple return; its frozen original and failure log remain preserved. The recovered audit converts only the comparison container, retaining every original numerical and protocol check. None of these corrections tuned algorithms or measurement recipes using timing results.

Evidence: `publication.json`, `catalogue-review.json`, `protocol-compiled-preflight-review.json`, `protocol-final-review.json`, `native-final-review.json`, `verification.json`, `policy-freeze.json`, `pretime-review-bindings.json`, `metadata.json`, `outcome-tables.json`, `all-comparisons.json`, `all-expert-comparisons.json`, `regressions.json`, `root-interval-verification.json`, `node-summary.json`, `browser-summary.json`, `native/summary.json`, and raw result/trial files. `early-exit.md` documents backend semantics and test commands. No commit, push or PR was made.

The next general improvement needs to address the unchanged legacy C fold route and target-specific profitability: a valid demand rewrite is not consistently profitable for Wasm or a late/absent match. The saved per-location intervals and observations provide evidence for that work.
