# Implementation status

The full goal remains open. This file describes executable behaviour and its limits.

## Native pure computation

- Rust lexer, parser, type checker and independent reference evaluator.
- Expression-returning functions over `u64`, `Bool` and `List<u64>`.
- Modular arithmetic, comparisons, Boolean short circuiting, lambdas, `map`, `filter`, `sum`, `count` and scalar calls.
- Fused native loops through emitted C and Clang/LLVM, retaining generated C, LLVM IR and a plan manifest.
- Bounded modular-polynomial proof checking, content-identified knowledge packages and locally validated rewrite application.
- Algorithm-matched C/C++/Rust benchmarks: 2,352 samples and 8,568 native correctness comparisons in the archived phase-one report.

## Stateful reference execution

- The complete inventory application from the design draft parses, type-checks and executes.
- Nominal IDs, records, nullary enums, strings, `u32`, exact `Int`, `Option` and `Result` in stateful declarations.
- Table state, atomic changes, read-only queries, derived values, local immutable bindings, branches and staged events.
- Declared effect checking, conservative key-presence reasoning, dependency-cycle rejection and bounded execution.
- Undo-journal rollback of multiple writes and cached aggregates. A nested change error poisons the enclosing transaction even when its result is ignored.
- Exact aggregate maintenance selected by an imported certificate. The package's actual insert/replace/remove arithmetic is checked against fixed finite-map invariant obligations.
- Eligible row-local sum/count pipelines, including filters, can switch between scanning and maintenance at transaction boundaries. State-dependent projections remain unoptimised.
- Portable reference JSON snapshots bind to the program AST identity and preserve logical tables, commit position and pending events. Restoration validates schema and values. This is not yet the draft's compact binary format.
- In-memory transactional outbox with acknowledgement. No crash-safe storage adapter or write-ahead log yet.
- 2,000 deterministic mixed operations compare scanning and maintained execution, including aborts, future changes, tentative queries, filtered aggregates, restoration and implementation switching.

The reference state runtime evaluates the AST. Its archived benchmark is explicitly not a cross-language performance claim.

## Native stateful compilation

- `lang emit-state` generates a standalone Rust crate with typed records, nominal IDs, enums, tables, changes, queries and events. Execution does not include this compiler crate or an AST evaluator.
- Table writes use generated undo entries. Nested failures abort the transaction; rollback restores tables, staged events and maintained values. Exact integers use `num-bigint`.
- An optional verified maintenance certificate emits its actual update arithmetic into native code. All certificate subexpressions use exact arithmetic, including constant-only subtrees.
- Three generated implementations (scanning, ordinary maintenance and an algebraically equivalent maintenance package with large constants) match the reference on 6,008 calls each: 18,024 observed outcome comparisons, covering 2,000 mixed operations plus intermediate queries and boundaries.
- The basic inventory example also builds and executes in release mode.
- This is a bootstrap backend: collection scans materialise intermediate vectors, storage uses BTreeMap, and generated code performs conservative clones. Native snapshots, migration, execution budgets and performance comparisons remain pending.

Generated Rust lowering, runtime support, dependencies and Rust/LLVM remain trusted; the tests are not a machine-code correctness proof.

## WebAssembly

- Pure programs compile to freestanding wasm32 modules with SIMD through Zig's Clang/linker toolchain.
- The pure-function pointer/length ABI is documented in `docs/wasm-abi.md`.
- Both the plain and knowledge-enabled modules passed 2,856 independent BigInt checks in Node/V8.
- Stateful Wasm execution, browser integration and native/Wasm snapshot interchange remain unimplemented.

## Remaining scope

- Complete surface syntax, generic functions, refinements, local mutation, ownership rules, all numeric types and floating-point semantics.
- Unified type inference across the pure native and broader stateful reference subsets. Unsupported combinations are rejected.
- General proof terms, a dependent-type kernel, contract proving and comprehensive transition simulation certificates. Existing decision procedures and induction schemas remain in the trusted Rust implementation.
- Broader native stateful lowering, specialised physical layouts and fair stateful C/C++/Rust baselines.
- Durable recovery, binary snapshots and stateful Wasm interoperability.
- Automatic profiling-based selection, search budgets beyond the current checkers, native-code migration and registry retrieval.
- The complete performance matrix: changing distributions, memory constraints, concurrent workloads and durability.

Unsupported source is rejected rather than silently omitted from compilation. The full acceptance list is in PLAN.md.
