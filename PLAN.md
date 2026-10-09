# Implementation and evaluation plan

The objective is to implement the language specified in docs/language-specification-draft.md and evaluate it against C, C++ and Rust. The full objective remains active until its implementation and evaluation requirements are satisfied. Early benchmark kernels are milestones, not substitutes for the language.

## Requirements and evidence

- [ ] Parser and diagnostic coverage for the specified surface language, including the complete inventory example.
- [ ] Types, effects, ownership, totality and contract checking with negative cases.
- [ ] Reference interpreter for pure functions, collections, transactions, events and queries.
- [ ] Native code generation with declared compiler/runtime trust boundaries.
- [ ] Built-in proof checking and reusable, locally checked knowledge packages.
- [ ] Actual imported knowledge changes an eligible compilation plan.
- [ ] Incremental sum/count maintenance covers insert, replace, remove, batches, errors and abort.
- [ ] Representation changes preserve future update behaviour and observable event sequences.
- [ ] Persistence, restoration, recovery and native/Wasm interchange.
- [ ] WebAssembly execution with a documented host ABI.
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
