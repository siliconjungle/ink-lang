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

1. Prioritise the user's small-core architecture: externalise optimisation knowledge and proof production, define the general checking boundary, and demonstrate independently evolving database entries. The first total-scalar proof-term path now loads external Boolean laws without recompiling (archived in `reports/database-equality`). Reusable acyclic scalar definitions and pinned theorem dependencies now compose in a checked seven-object example. Scoped conditional equality proofs and complete application proofs now preserve short-circuit observations. Next add inductive/recursive definitions and induction, then migrate legacy rules and representations through that logic. Existing hardcoded transformation mechanisms are transitional, not the intended core. Hunchroom research informs proof obligations but does not automatically authorise compiler transformations.
2. Initial native state comparison is complete: all baselines maintain totals and compare observable state, errors, versions and ordered events. The range-checked cache and exact native query view improve performance, but handwritten Rust remains faster overall. Next reduce transactional bookkeeping and redundant work, explore physical layouts, and broaden workloads to distribution shifts and memory limits. Preserve algorithm-matched baselines.
3. Portable native snapshots now transfer logical state across implementation choices. The same format/state machine now executes in Wasm and passes bidirectional native interchange. Next add durable recovery and measured selection with safe migration through the database architecture.
4. Broaden the language and proof core against the original draft. Keep the outstanding acceptance criteria intact.
