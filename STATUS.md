# Implementation status

The complete goal remains open. This file reports executable behaviour, not aspirational feature coverage.

## Implemented milestone

- Rust lexer and expression/declaration parser with errors for unsupported syntax.
- Module declarations, scalar/list function parameters and expression-returning pure functions.
- `u64`, `Bool`, `List<u64>`, modular arithmetic, comparisons and Boolean short circuiting.
- `map`, `filter`, `sum`, `count`, lambda binding and scalar function calls.
- Type checking, duplicate/unknown-name rejection, and cycle rejection for the current total fragment.
- Materialising reference evaluator distinct from fused native lowering.
- Native object, C intermediate, LLVM IR and build plan emission.
- Bounded polynomial normalisation, content-identified proof packages, local verification and rule application.
- Algorithm-matched C/C++/Rust benchmarks with independent reference validation.

## Explicitly not implemented yet

- Full surface syntax, records, enums, refinements, generic functions, local mutation and ownership checking.
- Exact `Int`/`Nat`, other machine numeric types and strict floating-point profiles.
- State declarations, transactions, keeps, queries and durable event handling.
- General proof terms, dependent-type kernel, contract proving and transition simulation certificates.
- Incremental state maintenance, representation synthesis, snapshots and recovery.
- WebAssembly module ABI and native/Wasm state interchange.
- Runtime adaptation, live migration, registry retrieval and performance-based selection.

These omissions are tracked in PLAN.md; the compiler rejects unsupported source instead of silently pretending to implement it. The full inventory application in the draft is not accepted yet.
