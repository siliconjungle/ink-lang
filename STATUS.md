# Implementation status

The full goal remains open. This file describes executable behaviour and its limits.

## Native pure computation

- Rust lexer, parser, type checker and independent reference evaluator.
- Expression-returning functions over `u64`, `Bool` and `List<u64>`.
- Modular arithmetic, comparisons, Boolean short circuiting, lambdas, `map`, `filter`, `sum`, `count` and scalar calls.
- Fused native loops through emitted C and Clang/LLVM, retaining generated C, LLVM IR and a plan manifest.
- Bounded modular-polynomial proof checking, content-identified knowledge packages and locally validated rewrite application.
- Algorithm-matched C/C++/Rust benchmarks: 2,352 samples and 8,568 native correctness comparisons in the archived phase-one report.

## External proof-term database (first fragment)

- A bounded equality checker supports reflexivity, symmetry, transitivity, primitive literal computation, binary congruence, Boolean case analysis, acyclic definitions and typed theorem instantiation over total `Bool`/modular `u64` scalar expressions. There are no algebraic optimisation axioms in this checker.
- An external Python producer emits explicit case proofs; immutable SHA-256 objects are loaded through an ordered lockfile and checked locally. `--database` applies them only with typed total-scalar substitutions.
- Boolean absorption and duplicate-predicate elimination are supplied as database data. An end-to-end check added zero, one and two laws under an unchanged compiler SHA-256, obtained three distinct generated C programs and passed 60 native oracle comparisons (`reports/database-equality/result.json`). New laws in this fragment require no compiler changes. A bounded dependency loader now checks reusable definitions and theorems under explicit imports, and records the full closure in build plans. A seven-object example specialises a combined Boolean theorem to a numeric comparison and passes 32 native oracle checks. Every proposed rewrite is rechecked as an exact theorem instantiation before application. Conditional equality theorems now require explicit premise proofs. Short-circuit branch facts justify eligible rewrites, and a complete function proof closes those facts before compilation. The two conditional rules preserve unguarded expressions and pass 168 native checks with and without imported knowledge. First-order inductive definitions and induction now exist in the separate proof-library path below. Connecting that path to source rewrites, richer propositions and stateful refinement remains pending.
- Existing polynomial, aggregate and collection optimisation paths still use their legacy trusted mechanisms. The overall compiler does not yet satisfy the small-core architecture. LLVM remains a separate optimising backend.

## First-order inductive proof library

- Generic monomorphic datatype declarations, typed constructors/exhaustive matches, total structurally recursive functions, capture-avoiding substitution and bounded definitional computation. Datatypes and function bodies come from database objects.
- General equality proofs, constructor/function/primitive congruence, checked theorem application with explicit premises, Boolean cases and induction over each recursive constructor field. Induction hypotheses cannot escape branches or assume variable-dependent outer premises for strict subterms.
- `lang verify-library` checks immutable SHA-256 entries under explicit direct imports and a bounded dependency closure. Untrusted Python production supplies twelve objects proving list-traversal composition, a modular boundary instance and generic tree-copy identity. Thirty-three extension/hostile-object checks pass with an unchanged compiler binary; evidence is in `reports/database-induction`.
- The new checker is a trusted Rust implementation, not yet formally verified itself. It currently verifies mathematical definitions/equalities only. Its correspondence to source collection semantics and installation of compiled transformations remain pending; `--database` still uses the earlier scalar fragment. Higher-order/generic types, dependent propositions and stateful refinement remain unfinished. See `docs/small-core-and-knowledge.md`.

## Stateful reference execution

- The complete inventory application from the design draft parses, type-checks and executes.
- Nominal IDs, records, nullary enums, strings, `u32`, exact `Int`, `Option` and `Result` in stateful declarations.
- Table state, atomic changes, read-only queries, derived values, local immutable bindings, branches and staged events.
- Declared effect checking, conservative key-presence reasoning, dependency-cycle rejection and bounded execution.
- Undo-journal rollback of multiple writes and cached aggregates. A nested change error poisons the enclosing transaction even when its result is ignored.
- Exact aggregate maintenance selected by an imported certificate. The package's actual insert/replace/remove arithmetic is checked against fixed finite-map invariant obligations.
- Eligible row-local sum/count pipelines, including filters, can switch between scanning and maintenance at transaction boundaries. State-dependent projections remain unoptimised.
- Portable reference JSON snapshots bind to the program AST identity and preserve logical tables, commit position and pending events. Restoration validates schema and values. A shared canonical binary format now also transfers state between reference and native implementations; see `docs/portable-snapshot.md`.
- In-memory transactional outbox with acknowledgement. No crash-safe storage adapter or write-ahead log yet.
- 2,000 deterministic mixed operations compare scanning and maintained execution, including aborts, future changes, tentative queries, filtered aggregates, restoration and implementation switching.

The reference state runtime evaluates the AST. Its archived benchmark is explicitly not a cross-language performance claim.

## Native stateful compilation

- `lang emit-state` generates a standalone Rust crate with typed records, nominal IDs, enums, tables, changes, queries and events. Execution does not include this compiler crate or an AST evaluator.
- Table writes use generated undo entries. Nested failures abort the transaction; rollback restores tables, staged events and maintained values. Exact integers use `num-bigint`.
- An optional verified maintenance certificate emits its actual update arithmetic into native code. All certificate subexpressions use exact arithmetic, including constant-only subtrees.
- Six generated implementations (nominal-ID scanning, ordinary maintenance, exact large-constant maintenance, u64-key scanning, bounded maintenance and bounded maintenance with wrapping intermediate values) match the reference on 6,008 calls each: 36,048 observed outcome comparisons, covering 2,000 mixed operations plus intermediate queries and boundaries.
- The basic inventory example also builds and executes in release mode.
- An optional checked range analysis derives the full-domain maximum of eligible sums and selects u128 caches when safe. Certificate expressions execute modulo 2^128 only after exact equivalence and final-range checks justify the representation. Direct bounded keep queries have a generated exact low/high-word interface. A separate wide-value test exercises its high word.
- This is a bootstrap backend: collection scans materialise intermediate vectors, storage uses BTreeMap, and generated code performs conservative clones. Native/reference binary checkpoints rebuild caches and preserve future observations across six migration stages (3,000 additional calls). Live native migration and execution budgets remain pending.

## Native stateful performance evidence

The latest report is `reports/native-state-phase3-native-abi/REPORT.md`: 756 samples, 18 cells, six variants. All variants maintain totals; the common C driver consumes outputs and final state. Independent Python validation checks 2,005 operations per variant (12,030 native comparisons) and 4,010 reference-runtime outcomes. Sources, toolchains, commands, generated code and observations are archived.

The bounded native variant is 1.71× faster than the current BigInt variant by geometric mean. It still takes 1.75× the handwritten Rust u128 baseline's time and 2.56× the fastest baseline's time per cell, aggregated geometrically. C's flat table, C++'s map and Rust's BTreeMap differ in layout and costs; handwritten baselines also eliminate unobservable speculative writes. The reports document these differences. These are warm, single-threaded, in-memory measurements, not durability, concurrency or universal language rankings.

Generated Rust lowering, runtime support, dependencies and Rust/LLVM remain trusted; the tests are not a machine-code correctness proof.

## WebAssembly

- Pure programs compile to freestanding wasm32 modules with SIMD through Zig's Clang/linker toolchain.
- The pure-function pointer/length ABI is documented in `docs/wasm-abi.md`.
- Both the plain and knowledge-enabled modules passed 2,856 independent BigInt checks in Node/V8.
- Stateful programs compile through the typed Rust backend to import-free `wasm32-unknown-unknown` modules. ABI version 1 uses opaque handles, exact JSON requests, atomic changes, ordered outbox inspection/acknowledgement and portable binary checkpoints. `runtime/state-wasm.mjs` works in Node and browsers and preserves integer precision across signed i64 and JavaScript Number boundaries.
- Five Wasm implementations pass a total of 23,794 reference outcome comparisons in each of Node/V8 and actual Chromium 155; native checkpoint handoff steps pass 2,526 additional comparisons. Complete checkpoint bytes match across transfers and future changes. ABI checks cover invalid requests, corrupt/wrong-program snapshots, handle and byte limits, memory growth, high commit counters, commit exhaustion rollback and a poisoned-instance trap policy. Sources, binaries, toolchains and browser evidence are archived in `reports/state-wasm-phase1`. This is functional interoperability evidence, not a new speed result or formal backend proof.
- This initial interface uses synchronous JSON requests. It provides no fuel limit, crash-safe storage, host capabilities, concurrent access or schema evolution. Buffer/state-count limits do not impose a total process-memory ceiling. See `docs/wasm-abi.md`.

## Remaining scope

- Complete surface syntax, generic functions, refinements, local mutation, ownership rules, all numeric types and floating-point semantics.
- Unified type inference across the pure native and broader stateful reference subsets. Unsupported combinations are rejected.
- Correspondence between the first-order inductive proof library and source/implementation IR, higher-order and type-polymorphic logic, a dependent-type kernel, contract proving and comprehensive transition simulation certificates. Existing decision procedures and induction schemas remain in the trusted Rust implementation.
- Broader native stateful lowering, specialised physical layouts and further optimisation against the existing stateful C/C++/Rust baselines.
- Durable recovery, snapshot schema evolution and broader stateful Wasm workload/performance coverage.
- Automatic profiling-based selection, search budgets beyond the current checkers, native-code migration and registry retrieval.
- The complete performance matrix: changing distributions, memory constraints, concurrent workloads and durability.

Unsupported source is rejected rather than silently omitted from compilation. The full acceptance list is in PLAN.md.
