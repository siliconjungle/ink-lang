# Implementation and evaluation plan

The objective is to implement the language specified in docs/language-specification-draft.md and evaluate it against C, C++ and Rust. The full objective remains active until its implementation and evaluation requirements are satisfied. Early benchmark kernels are milestones, not substitutes for the language.

## Requirements and evidence

- [ ] Small compiler core has no built-in optimisation catalogue. All language-level rewrites, incremental algorithms and representation choices come from checked database entries; new entries work without rebuilding the compiler. See `docs/small-core-and-knowledge.md` for the binding architecture and migration audit.

- [ ] Parser and diagnostic coverage for the specified surface language, including the complete inventory example.
- [ ] Types, effects, ownership, totality and contract checking with negative cases.
- [ ] Reference interpreter for pure functions, collections, transactions, events and queries.
- [ ] Native code generation with declared compiler/runtime trust boundaries.
- [ ] Built-in proof checking and reusable, locally checked knowledge packages.
- [x] Actual imported knowledge changes an eligible compilation plan. Evidence: native-phase1 generated C/LLVM and plan IDs; modular rewrite validation and benchmark improvement. Stateful package selection also changes maintained execution.
- [ ] Incremental sum/count maintenance covers insert, replace, remove, batches, errors and abort.
- [ ] Representation changes preserve future update behaviour and observable event sequences.
- [ ] Persistence, restoration, recovery and native/Wasm interchange.
- [x] WebAssembly execution with a documented host ABI. Evidence: `docs/wasm-abi.md` and `reports/state-wasm-phase1`; five stateful modules pass bidirectional native/Wasm continuation in Node and an actual browser. Pure kernels retain their separate ABI.
- [ ] Adaptive selection, bounded search, migration and safe implementation fallback.
- [ ] Reproducible benchmarks against equivalently optimised C, C++ and Rust.
- [ ] Workloads include pure kernels, update/query mixes, changing distributions, memory limits and durability.
- [ ] Final report includes raw measurements, correctness validation, toolchains, limitations and fair algorithm-matched comparisons.

## Current implementation sequence

1. Establish a real Rust frontend, independent reference evaluator, bounded arithmetic proof checker and native compilation path. Benchmark pure collection programs without hardcoded workload recognition.
2. Implement the inventory/state language and correctness suite; add checked incremental implementations and compare against manually maintained C/C++/Rust.
3. Add portable snapshots and Wasm; implement safe runtime migration and adaptation.
4. Broaden language coverage, verification and workloads, then audit every requirement above.

LLVM code generation initially runs through emitted portable C and Clang. This is a transparent bootstrap path, not a claim that the handwritten C intermediate or backend is formally verified. LLVM IR is retained for inspection. The semantic frontend and knowledge checker remain independent of this backend.

## Verified progress after phase two

The full inventory example is executable in the reference runtime. Records, IDs, nullary enums, Option/Result, u32 and exact Int support its transactions, effects and queries. An undo journal handles rollback and event staging. Domain-specific certificates validate actual aggregate update expressions, and imported knowledge selects maintained sums/counts for row-local pipelines. Tests compare 2,000 mixed operations against recomputation and exercise snapshot restoration and implementation switching.

Pure programs also compile to WebAssembly and pass 2,856 independent arithmetic checks in Node/V8. Subsequent work added native stateful compilation and benchmarks, plus canonical binary snapshots that transfer between native representations and the reference runtime. Stateful Wasm now has a documented ABI and verified native interchange in Node and an actual browser. Durable recovery remains unfinished. These milestones do not close the broader unchecked requirements above.

## Next concrete work

1. Prioritise the user's small-core architecture: externalise optimisation knowledge and proof production, define the general checking boundary, and demonstrate independently evolving database entries. The first total-scalar proof-term path now loads external Boolean laws without recompiling (archived in `reports/database-equality`). Reusable acyclic scalar definitions and pinned theorem dependencies now compose in a checked seven-object example. Scoped conditional equality proofs and complete application proofs now preserve short-circuit observations. A first-order proof library now checks database-defined datatypes, structurally recursive functions, list-traversal composition by induction and generic tree-copy identity. The exact map/sum/count/foldr bridge now installs induction-checked whole-function database candidates, and the baseline no longer fuses collections automatically. Its latest benchmark reaches combined C/C++/Rust loop performance. The bridge now also handles filter, lazy choose, acyclic source calls and nested collection computations. The external filtered producer supplies four checked candidates; its dedicated native benchmark improves traversal workloads by 3.43× and matches combined C/C++/Rust, with the constant-time case reported separately. The broader pure Wasm path passes 4,476 checks in each of Node and an actual browser. Next migrate arithmetic, aggregate and representation laws, and extend general stateful refinement. Higher-order/type-polymorphic logic remains pending. Existing hardcoded transformation mechanisms are transitional, not the intended core. Hunchroom research informs proof obligations but does not automatically authorise compiler transformations.
2. Initial native state comparison is complete: all baselines maintain totals and compare observable state, errors, versions and ordered events. The range-checked cache and exact native query view improve performance, but handwritten Rust remains faster overall. Next reduce transactional bookkeeping and redundant work, explore physical layouts, and broaden workloads to distribution shifts and memory limits. Preserve algorithm-matched baselines.
3. Portable native snapshots now transfer logical state across implementation choices. The same format/state machine now executes in Wasm and passes bidirectional native interchange. Next add durable recovery and measured selection with safe migration through the database architecture.
4. Broaden the language and proof core against the original draft. Keep the outstanding acceptance criteria intact.

### Arithmetic migration milestone

An external SAT producer now supplies arithmetic theorems to a fixed circuit encoder and bounded hinted RUP checker. The compiler checks exact scoped premises and source replacement proofs; no solver or arithmetic identity catalogue is added to the core. The package contains nine theorems, including a conditional equality, and eight unconditional replacements. Arithmetic proof reuse composes with list induction. Nine database revisions change C output under one compiler identity. The complete Rust suite passes 54 tests; native validation checks 42,920 outcomes and an independent Python/SAT encoding suite checks 2,534 assignments. The 560-sample scalar-call benchmark shows identical baseline/checked ARM64 bodies and no runtime speedup because LLVM already recognises these simple identities.

Next extend external proof production to useful arithmetic inside collection/state algorithms and replace the remaining legacy polynomial authority, rather than claiming that the new path alone completes its migration. General finite-map/state-transition refinement and database-defined representations remain the main architectural work; those need future-update, abort and event evidence as well as competitive benchmarks. The full unchecked acceptance list above remains binding.

### Exact-sum proof foundation

The next dependency is now checked: a 35-object database-defined exact-integer/list model with 23 universal induction proofs, including group laws and sum insertion/replacement/removal at arbitrary positions. The unchanged kernel checks it without a new arithmetic primitive, ring axiom or aggregate rule. Deterministic replay and 57 passing tests are recorded in `reports/exact-sum-proof-foundation`; full import takes roughly 6 ms on this machine.

The source-update bridge now pins these definitions and checks actual candidate update expressions through database proof terms. Version-2 certificates authorise canonical and commuted arithmetic without invoking the legacy polynomial checker. The 62-test suite and `reports/database-maintenance-phase1` include real native execution, checkpoints, signed values and the maintained C/C++/Rust comparison. Its 756 samples show no new runtime algorithm gain: canonical legacy/database certificates emit identical runtime source, and bounded Ink still takes 1.75× handwritten Rust time.

Next broaden exact arithmetic to multiplication/efficient large literals, migrate row-pipeline recognition and cache/transaction protocols to general checked state-transition/representation objects, and remove legacy aggregate authority. Table/source correspondence and complete transaction refinement remain unfinished. The broader architecture, language and benchmark requirements above remain binding.

### Cache lowering and profile-sensitive delta selection

Two new universal database theorems now authorise `total + (new - old)` under the original compiler, without adding a core optimisation law. A separate base-lowering change borrows exact operands instead of cloning them redundantly and preserves expression semantics; bounded emitted source is unchanged. The full suite passes 63 tests across all three exact candidates, including signed data, rollback/events and future checkpoints.

The controlled inventory report (`reports/cache-lowering-phase1`) compares eight maintained variants in 1,008 samples and 16,040 independent native checks. Its small-integer changes are minor; bounded Ink still takes 1.77× Rust u128 time. The wide-Int report (`reports/wide-cache-phase1`) adds 448 samples, 4,096 native oracle comparisons and separate allocation instrumentation. Borrowed lowering improves by 1.23× overall. Delta-first helps the small-changing-row profile by 1.05× and is slightly worse on the wide-changing-row profile. Handwritten Rust remains faster. This is actual profile-dependent evidence for retaining multiple proved alternatives, not automatic adaptation or a fastest-language result.

Next address remaining cache/row copies and transactional work through general state-transition/refinement evidence; make measured selection and migration part of the database architecture. Preserve rollback, tentative reads, commit exhaustion, events and future changes. Continue the arithmetic, full language, durability and broader workload requirements rather than closing the objective around these kernels.

### Database-defined reversible journal milestone

The exact cache journal now takes saved-value, apply and restore expressions from version-3 database evidence. The bridge checks actual forward equivalence and inverse identity over arbitrary signed totals, in addition to the original source/list-sum proofs. External full-snapshot and reversible-difference candidates work under one compiler; two new universal theorem objects pass the preserved original generic kernel. No cancellation-law catalogue or solver was added to the core.

The reference runtime and native backend execute the selected journals. All 65 tests pass, including multi-table aborts, repeated writes/removals, tentative reads, signed values, events, future checkpoints, exhausted commit counters and bounded fallback. The wide-Int report contains 448 samples and 4,096 native oracle checks: 1.31× improvement for small-changing-row profiles, essentially no benefit for wide changes, and 2.54× handwritten Rust time overall. Allocation instrumentation confirms one fewer call/update for small changes beside a large total; wide changes can allocate more. The companion C/C++/Rust inventory report contains 756 samples and 12,030 native comparisons; bounded Ink remains 1.77× Rust u128 time. Executed audits preserve and replay the measured binaries and regenerate both candidates.

Next use checked evidence to remove remaining owned-result/row copies, support mutable storage reuse and measured selection/migration, and broaden general table/transaction/representation proofs. One exact saved integer is a fragment, not the complete state design. Reverse scheduling, table/source correspondence, bounded representations and the backend remain trusted. Keep durability, broad language coverage and every unchecked acceptance criterion above active.

### Owned integer lowering and operational-model review

The native backend now consumes the final use of the cached BigInt in forward and inverse expressions, copying earlier uses and preserving the AST/evaluation order. This is base ownership lowering; the proof kernel, source bridge, database candidates and reference transaction protocol are unchanged. All 65 tests pass, with repeated-owner multiplication coverage. Bounded inventory emission is byte-identical to the prior milestone.

The 560-sample storage experiment compares old/current compilers and both checked journals, with 5,120 native oracle comparisons. Journal speed improves by 1.36× overall, 1.73× on small-changing-row profiles and 1.06× on wide changes. The 8192-exponent small-row update-only case improves by 2.12× and goes from 1.492 to zero measured update allocations, but overall Ink still takes 1.90× handwritten Rust time. The companion 756-sample C/C++/Rust inventory report leaves bounded Ink at 1.77× Rust time. Executed audits preserve/replay timed binaries and all 40 separate allocation cases.

`reports/hunchroom-review-20261010` indexes every public submission in the captured catalog (427 submissions, 114 modules). Selected operational families provide templates for exact runtime admission, actual physical candidate installation, invariant-preserving all-future replacement, sticky-error/capture/effect preservation and cost-aware replanning. Site verification is not compiled-Ink correspondence. The exhaustive 2^n reference cost planner should not enter the core; search quality and safety must remain separate.

Next build the source-to-state transition/refinement bridge around actual table updates, undo scheduling, tentative queries, poison errors, event order and commit exhaustion. Lift one-step correspondence to traces. Then admit database-defined representations at transaction boundaries with exact rejected/accepted behavior and bounded measured selection that charges import, checking, migration and final observation. Keep partial-effect fusion, durable recovery, general syntax/types and the broader benchmark acceptance criteria active; these cache kernels do not complete the language.

### Keyed contribution-table transition/history milestone

The generic checker now supports generalised induction, allowing a structurally decreasing trace proof to instantiate its hypothesis with changed initial state. Typed branch-local hypotheses, complete constructors and fixed-premise independence preserve its scope; no arithmetic/transaction optimisation axiom was added. The 63-object database package proves actual first-match keyed writes maintain exact sums and that every finite initialized write history equals independent recomputation, recording every intermediate contribution state. Version-4 checking pins the model and actual submitted update expressions. Both reversible/snapshot choices work under one compiler. Numeric keys and 128-bit IDs are represented; unsupported key domains retain scanning.

All 70 tests pass, including an independent 384-intermediate-state mathematical oracle, rehashed legitimate-but-wrong definitions, source arithmetic/model mismatch, old certificate compatibility and actual reference/native integration. The 756-sample maintained C/C++/Rust report adds 12,030 native and 4,010 reference checks; bounded Ink takes 1.77× Rust time. Emitted runtime code for the benchmark is identical to the prior v3 implementation. Executed audits replay the original timed binaries and both produced candidates.

This is contribution-table write refinement, not complete stateful source/native correspondence. Next formalize the actual map/projection abstraction and transaction/undo transitions, including failed operations, tentative queries, nested poison errors, staged/published events and commit exhaustion. Then prove accepted/rejected physical replacement and measured selection. The current bridge is a restricted schema; general layouts, durable recovery, broad language coverage and all outstanding acceptance criteria above remain active.
