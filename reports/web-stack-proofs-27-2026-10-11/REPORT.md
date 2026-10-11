# Ink aligned zip proofs and known-call inlining — batch 27

Three agents and integration added 32 checked objects: eight optimization endpoints (two ordinary fusion identities × four numeric types), eight beta-transport proof supports and sixteen typed primary/held-out source certificates. The DB now has 1,822 entries and 17,346 canonical observations. Mathematical correctness and measured profitability remain separate.

The identities are `zip(zip(xs,ys,h),xs,g) = zip(xs,ys,x=>y=>g(h(x)(y))(x))` and `zip(zip(xs,ys,h),ys,g) = zip(xs,ys,x=>y=>g(h(x)(y))(y))`. They remove one intermediate list and pass for arbitrary pure total callbacks. Unequal/empty lists still truncate to `min(len(xs),len(ys))`; each callback's exact expression grouping and F32 rounding remain. Ordinary functional list induction checks the identities. They are new catalogue endpoints, not new mathematics. All 16 typed applications select, replay and reify under the unchanged frozen cost policy. The complete prior's 1,231 semantic laws were offered to each frozen source in an admitted frontier bounded at four source applications and 128 expanded bodies per task; one Normalize-only named-helper proposal was rejected with `unknown semantic function` by context-free catalogue admission; that complete failed candidate is preserved. No old-only source certificate was admitted, and the fair prior remains 1,790 entries. A separate helper-module knowledge-check, selection replay and reification pass for that same Normalize-only certificate, establishing the contextual opportunity. Reification drops the explicit Let and restores the old emitter hazard. This valid module-local certificate is excluded symmetrically from both context-free catalogues; context declarations are a publication limitation, not a false equality or global non-derivability result. This bounded search does not prove global non-derivability.

The compiler now inlines bounded known pure function calls in C and JavaScript. Arguments are materialized exactly once in source order; the callee receives only its own typed lexical parameters. Lazy bodies, numeric order and list allocations remain. Limits are 2,048 AST nodes per candidate body, depth eight and 16,384 expanded nodes across a module; failed C expansion restores emitted statements, names, depth and budgets before falling back to the ordinary call. All function exports and target ABIs remain. Inlining exposes invariants and target vectorization opportunities; it does not guarantee either or remove source collection stages implicitly. No caller checks, allocator change, runtime optimizer, core/checker/planner/runtime/GPU emitter changes were added. Exactly two production files change, plus disclosed test-only counter instrumentation. Target lowering remains trusted and tested; the checked laws do not prove emitted machine code.

The gains are real but selective. Fresh zip proofs improve all eight native resident cells by 1.16–1.59× and all eight copied-input cells by 1.10–1.36×. Known-call inlining improves the modular-mix reference by 2.44–3.85× natively; browser captured-JS full/65,536 median improves about 2.85×. Most simpler helper cases remain close to parity, and every adverse interval is retained.

Broad native superiority is not established: current Ink wins 1/32 resident and 2/32 copied-input cells against optimized native Rust. Rust Wasm wins 30/32 Node and 31/32 browser captured-call cells, with the remainder inconclusive. GPU now genuinely executes eight fresh zip cells plus sixteen references; optimized JS and Rust Wasm beat its full calls in all 24 cells each. Borrowed JS is more competitive (Ink wins 20/32 Node and 14/32 browser cells), which points toward allocation/transport boundaries as an important next target.

## Fresh proofs: 8 cells per host/boundary

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS captured call · backend on current proofs | 1/8 | 0 | 7 |
| node | JS captured call · proofs on current backend | 6/8 | 2 | 0 |
| node | JS captured call · combined versus old prior | 6/8 | 1 | 1 |
| node | Wasm captured call · backend on current proofs | 0/8 | 0 | 8 |
| node | Wasm captured call · proofs on current backend | 1/8 | 1 | 6 |
| node | Wasm captured call · combined versus old prior | 0/8 | 2 | 6 |
| node | JS synchronous borrowed call · backend on current proofs | 1/8 | 0 | 7 |
| node | JS synchronous borrowed call · proofs on current backend | 6/8 | 1 | 1 |
| node | JS synchronous borrowed call · combined versus old prior | 6/8 | 1 | 1 |
| browser | JS captured call · backend on current proofs | 0/8 | 0 | 8 |
| browser | JS captured call · proofs on current backend | 2/8 | 0 | 6 |
| browser | JS captured call · combined versus old prior | 1/8 | 0 | 7 |
| browser | Wasm captured call · backend on current proofs | 0/8 | 0 | 8 |
| browser | Wasm captured call · proofs on current backend | 0/8 | 0 | 8 |
| browser | Wasm captured call · combined versus old prior | 0/8 | 0 | 8 |
| browser | JS synchronous borrowed call · backend on current proofs | 0/8 | 0 | 8 |
| browser | JS synchronous borrowed call · proofs on current backend | 6/8 | 0 | 2 |
| browser | JS synchronous borrowed call · combined versus old prior | 6/8 | 0 | 2 |
| native / resident | backend on current proofs | 0/8 | 2 | 6 |
| native / resident | proofs on current backend | 8/8 | 0 | 0 |
| native / resident | combined versus old prior | 8/8 | 0 | 0 |
| native / snapshot | backend on current proofs | 0/8 | 0 | 8 |
| native / snapshot | proofs on current backend | 8/8 | 0 | 0 |
| native / snapshot | combined versus old prior | 8/8 | 0 | 0 |

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS captured call versus optimized JavaScript | 3/8 | 4 | 1 |
| node | Wasm captured call versus optimized Rust Wasm | 0/8 | 8 | 0 |
| node | JS synchronous borrowed call versus optimized JavaScript | 8/8 | 0 | 0 |
| browser | JS captured call versus optimized JavaScript | 0/8 | 4 | 4 |
| browser | Wasm captured call versus optimized Rust Wasm | 0/8 | 8 | 0 |
| browser | JS synchronous borrowed call versus optimized JavaScript | 4/8 | 0 | 4 |
| native / resident | versus optimized native Rust | 0/8 | 8 | 0 |
| native / snapshot | versus optimized native Rust | 0/8 | 7 | 1 |

## All eight families: 32 cells per host/boundary

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS captured call · backend on current proofs | 6/32 | 2 | 24 |
| node | JS captured call · proofs on current backend | 8/32 | 2 | 22 |
| node | JS captured call · combined versus old prior | 10/32 | 1 | 21 |
| node | Wasm captured call · backend on current proofs | 3/32 | 1 | 28 |
| node | Wasm captured call · proofs on current backend | 3/32 | 3 | 26 |
| node | Wasm captured call · combined versus old prior | 5/32 | 2 | 25 |
| node | JS synchronous borrowed call · backend on current proofs | 7/32 | 1 | 24 |
| node | JS synchronous borrowed call · proofs on current backend | 7/32 | 3 | 22 |
| node | JS synchronous borrowed call · combined versus old prior | 10/32 | 2 | 20 |
| browser | JS captured call · backend on current proofs | 5/32 | 0 | 27 |
| browser | JS captured call · proofs on current backend | 2/32 | 1 | 29 |
| browser | JS captured call · combined versus old prior | 6/32 | 1 | 25 |
| browser | Wasm captured call · backend on current proofs | 4/32 | 1 | 27 |
| browser | Wasm captured call · proofs on current backend | 0/32 | 0 | 32 |
| browser | Wasm captured call · combined versus old prior | 4/32 | 1 | 27 |
| browser | JS synchronous borrowed call · backend on current proofs | 8/32 | 0 | 24 |
| browser | JS synchronous borrowed call · proofs on current backend | 7/32 | 1 | 24 |
| browser | JS synchronous borrowed call · combined versus old prior | 11/32 | 1 | 20 |
| native / resident | backend on current proofs | 4/32 | 7 | 21 |
| native / resident | proofs on current backend | 10/32 | 4 | 18 |
| native / resident | combined versus old prior | 13/32 | 6 | 13 |
| native / snapshot | backend on current proofs | 7/32 | 3 | 22 |
| native / snapshot | proofs on current backend | 8/32 | 4 | 20 |
| native / snapshot | combined versus old prior | 13/32 | 5 | 14 |

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS captured call versus optimized JavaScript | 6/32 | 21 | 5 |
| node | Wasm captured call versus optimized Rust Wasm | 0/32 | 30 | 2 |
| node | JS synchronous borrowed call versus optimized JavaScript | 20/32 | 8 | 4 |
| browser | JS captured call versus optimized JavaScript | 0/32 | 22 | 10 |
| browser | Wasm captured call versus optimized Rust Wasm | 0/32 | 31 | 1 |
| browser | JS synchronous borrowed call versus optimized JavaScript | 14/32 | 9 | 9 |
| native / resident | versus optimized native Rust | 1/32 | 25 | 6 |
| native / snapshot | versus optimized native Rust | 2/32 | 24 | 6 |

Nominal interval differences on byte-identical target code are run variation rather than compiler gains. The emission review records actual target equality/difference for each fixed proof core. Reference tasks have identical prior/current selected cores; their proof-factor timing differences are not newly checked mathematical improvements. Whole paired 95% intervals are exploratory per-cell evidence without family-wise correction; task families are related U32 kernels on one machine, not a broad application corpus or universal language ranking.

## Actual WebGPU

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| browser | Actual ink_old_checked_gpu versus js_expert | 0/8 | 8 | 0 |
| browser | Actual ink_old_checked_gpu versus rust_expert_wasm | 0/8 | 8 | 0 |
| browser | Actual ink_old_prior_gpu versus js_expert | 0/16 | 16 | 0 |
| browser | Actual ink_old_prior_gpu versus rust_expert_wasm | 0/16 | 16 | 0 |

Only actual dispatch/upload/readback counts as GPU execution; CPU fallback remains separate. Identical ABI/device/host/WGSL fingerprints are deduplicated. Fresh versus reference attribution follows the actual selected cores and manifests. Full calls include transfers, readback and result consumption; no GPU-only kernel ranking is substituted for those boundaries.

## Frozen workloads and optimized controls

Two fresh independent nested zips and six helper references cover calibrated maps, indexed output, ordered checksum, filtered projection, independent paired processing and the exact batch26 modular-mix continuity. Three natural two-list ABIs capture both arrays, with distinct donor values and a 3N/4 right-hand timing length. Empty, unequal, zero-divisor, wrapping and branch-profile cases compare complete arrays and verify source nonmutation. Sizes 32 and 65,536 are timed; 4,096 is correctness-only. Captures and distributions were chosen before timing and stay fixed across sizes. Small ordered-checksum data yields one true accumulator gate and 65,535 false gates at the large size; no balanced-branch claim is made.

Preflight caught repeated evaluation of a directly consumed list-returning helper in the old C/Wasm emitter, before any timing. The entire failed preparation and the later syntax/context failures are preserved in `../web-stack-proofs-27-single-evaluation-preparation-2026-10-11/`. The filtered-projection source now explicitly binds its accepted list once before map. Both compiler states consume this same source; original/expert controls, complete fixtures and captures are exact unchanged bytes. Emission review requires one old-root producing-helper call. The benchmark therefore does not credit inlining for eliminating that accidental repeated work.

Staged original JS/Rust controls validate source equivalence only. Strong experts already inline helpers, hoist legal captured calculations (including calibration bias), fuse legal passes, preserve accumulator-dependent reverse-fold order, and use exact fixed-modulus conditional reduction in the continuity case. Vector experts reuse output scratch; generated arrays allocate. That ownership/lifetime advantage is disclosed, not hidden by weakening the expert. Captured JS/Wasm calls, synchronous borrowed JS calls, and native resident/copied-input calls are separate boundaries. Both native scalar implementations return through the same common driver ABI. Generated C/Clang and Rust use different LLVM toolchains, not isolated language semantics. Native driver makes three unrecorded prewarm calls in addition to two recorded warmup phases.

The modular mix retains the exact source and four timed input/capture/golden frames from batch26, but timing is a new run. It performs sixteen fixed stages (65 original word primitives); it is a bounded arithmetic reference, not a cryptographic claim or timing-tuned workload.

## Verification and provenance

Completed evidence contains 11,736 timing samples, 7,110 complete benchmark comparisons and 2,352 independently recomputed paired/interaction intervals. The 16 checked selections and 32 compiler/proof bundles use the same exact selected core across compiler states. Source/control preflight validates 148 complete fixtures and 296 original/expert JS calls, plus nonmutation. Typed proof tests cover 168 frames / 336 original-selected interpreter runs, independent U32 oracles, F32 NaN/Inf/signed zero, lexical capture and rejected hash-valid wrong-alignment controls. The known-call differential suites cover 318 interpreter frames per emitter plus operational lazy/read/allocation/order counters, bounds and C transactional rollback; full existing package suites and preserved first-attempt test-counter failures are linked in backend evidence. Finite tests do not establish a machine-code theorem.

Timing used nine shuffled rounds, two recorded warmups and a 15 ms target. All authors, builds, tests and audits stopped during the sequential Node/native/browser timings. Bounded browser partitions retain every frozen fixture/cell and raw phase log. Exported Wasm memory is not total process/GPU memory. Every inconclusive and all 76 adverse attribution rows remain archived.

Snapshot `160342b7cc75899a4a485d6ff659b9d6233d8af3e83985cd0dd107391e88049a`. Ledger and disposable index agree; 320 exact Wasm observation records were imported only after timing. Previous catalogue/history and unrelated dirty work are preserved. No commit, push or PR was made.

[Raw comparisons](all-comparisons.json), [regressions](regressions.json), [protocol audit](protocol-final-review.json), [native audit](native-final-review.json), [catalogue audit](catalogue-review.json), [emission review](emission-review.json), [final integrity](verification.json).
