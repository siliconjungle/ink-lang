# Implementation status

## Complete code-data binding and checked view decomposition

The core now checks exact complete source/typed-action images supplied as
individual canonical database entries. An independent producer, authenticated
membership and exact declaration comparisons prevent proofs about other helpers,
schemas or evaluation order from being substituted. This binds code data;
executable logical action and physical implementation correspondence remain open.

Reviewed view proofs automatically establish per-program map/filter sum/count
decomposition with `--prove-views`, falling back explicitly to recomputation when
verification fails. `--require-views` makes failure an error. Native contribution
and cache correctness remain trusted. Twenty additional Lean laws pass local
checking; they have not been submitted or accepted by Hunchroom.

Validation: 218 broad distribution tests, 23 final focused tests, and 28 offline
core tests both in place and in an isolated copy. These are overlapping counts,
not additional distinct tests. Backend/runtime pins and kernel rules are unchanged;
no new speed claim. See [the evidence](reports/source-syntax-phase1/REPORT.md).

Current target coverage is documented in [lowering parity](docs/lowering-parity.md): complete C/Rust/JavaScript/Wasm execution, a common native/Wasm lifecycle ABI, and eligible WebGPU/wgpu collection closures inside mixed modules. Historical milestone sections below retain their original scope.

## Reviewed ownership lowering and independent proof replay

Stateful Rust now uses conservative lexical moves, borrowed lookup keys and
stored-row borrows with field snapshots before conflicts. Callbacks needing
mutable `self` keep the owned baseline. Three focused tests pass, including
3,000-step native/reference comparisons with and without instrumentation.
Journal-elision, direct-outbox and always-abort plans remain proposed database
entries, backed by historical hand-edited measurements.

All 17 catalogue bit-proof refutations pass locally built drat-trim and
lrat-check; both reject all goal-free controls. The audit hook restores its scope
even when a callback unwinds. This checks the exported CNF certificates, not the
source-to-CNF encoding or correctness of every possible proof input.
The combined distribution suite passes 175 tests; the independent offline core
passes 12. See [ownership review](reports/ownership-lowering-review/REPORT.md) and
[independent replay](reports/rup-crosscheck-phase1/REPORT.md).

## Deterministic AST database discovery

The external optimiser discovers individual typed conditional laws and older
scalar theorem objects directly from a database directory, without a per-rule
installation step. Typed AST filtering, scoped condition proofs and deterministic
ordering produce replacements independently checked by the core. The general
matcher uses bounded compositional search; the older scalar producer restarts
after strict expression-size decreases. Checked selections freeze their evidence
for offline replay. Discovery currently assembles a bounded general active view;
large-database projection/indexing, stateful representation queries and measured
ranking remain unfinished. This is not a runtime speed claim.
See [evidence](reports/ast-database-query-phase1/REPORT.md).

## Checker hardening integration

Claude's checker-hardening bundle is integrated with the current compute-v2
evaluator. General substitution charges copied nodes; portable snapshots bound
Int size and schema expansion. Reference evaluation bounds nesting and charges
large copies, with one scope copy per collection operation. Two additional
resource regressions are fixed: exponential Boolean numeric-hint inference and
unsafe unparenthesised/postfix expression-tree depth in source parsing.

The full distribution suite passes 150 tests; the independent offline core
passes seven. Nineteen hardening tests include ten regressions and nine mutation
targets. Two expanded release seeds pass 18,000 mutated inputs overall. The
3,492-byte slow legacy definition now reaches the proof budget in about 6.5ms,
versus the observed 76.9s before the fix. This is diagnostic resource evidence,
not a generated-code performance claim or a proof of checker soundness.
See [the report](reports/checker-hardening-phase1/REPORT.md) and
[resource policy and remaining limits](docs/checker-hardening.md).

Portable snapshots now reject exact integers above 4,096 magnitude bytes;
ordinary exact arithmetic and accepted snapshot encodings are unchanged.
Legacy JSON Int/restore limits and large-module typing costs remain review
items. Full stateful source/representation correspondence, specialised authority
migration, durability and the broader production gates remain unfinished.

## Numeric arrays and resident GPU pipelines

Pure compute now supports `i32`, `f32`, numeric vectors/records, multiple array
inputs, array results, safe indexed reads and bounded loops. WebGPU and native
wgpu hosts can execute typed pipelines whose intermediate arrays stay resident
across steps and iterations, with compiled CPU fallback and measured whole
pipeline selection. The particle example includes velocity/position updates and
a 120-step pipeline. Portable GPU float arithmetic does not promise bitwise CPU
identity. Stateful Wire support for these new types remains future work.
See [compute semantics, pipeline API and limits](docs/gpu-compute.md) and
[validation evidence](reports/gpu-phase2/REPORT.md).

## Literal mixed CPU/GPU execution

A checked source-routing package now connects actual pure source calls to the
separate GPU backend. One graph runs a u32 collection pipeline in WebGPU/wgpu
then a scalar finishing call in Wasm/native C. Identical pure calls can share one
stage: the core reconstructs the graph into the original expression, while the
external database producer discovers sharing and supplies placements.

External bounded candidate selection checks every candidate and a whole-entry
CPU baseline before using complete-call measurements. No profile grants a
semantic fact. This initial simple pipeline selects CPU at all three sampled
sizes, including one million rows: browser medians were approximately 1 ms CPU
versus 3.2 ms mixed. These are three-trial exploratory measurements with bounded
clock calibration, not a broad speed claim.

Evidence in `reports/source-routing-phase1`: native/reference/compiled CPU
comparisons, actual GPU stages on both hosts, no-GPU/shader fallback, captured
inputs, concurrent calls, forged graphs/cost records and bounded selection.
The core has no target knowledge or placement optimiser; backends and physical
transport remain trusted. General resident-buffer graphs, state/effect routing,
representation refinement, ownership and durability remain unfinished.
See [source routing](docs/source-routing.md).

## u32 and browser/native GPU execution

The pure frontend, evaluator and native/Wasm backends now support `u32` words
and collections with checked contextual literals and wrapping intermediates.
`ink build SOURCE --target webgpu --zig PATH -o DIRECTORY` emits literal WGSL
stages, a compiled Wasm CPU fallback and a standalone native `wgpu` project.
The host measures eligible u32 map/filter/sum/count computations and selects CPU
or GPU with explicit cost diagnostics; unsupported features and unavailable GPU
access retain compiled CPU execution. Existing u64 and exact-Int meanings are
unchanged. This is a trusted backend and a bounded host selector, not completed
formal GPU verification or general adaptive state migration.
See [GPU scope, selection, trust and reproduction](docs/gpu-backend.md) and
[validation evidence](reports/gpu-phase1/REPORT.md): 111 Cargo tests, 1,332
CPU/GPU comparisons per host and native no-GPU fallback comparisons.

The full goal remains open. This file describes executable behaviour and its limits.

The latest candidate milestone adds general Rust lowering for checked database
definitions and a pinned, proof-checked entry-selection interface. Database
packages supply combined list passes and row updates performed through columns;
the compiler emits their actual checked bodies without an optimisation law or
representation recogniser. Internal calls retain immutable definitions, so an
equal candidate cannot introduce a cycle by calling a redirected entry.

All 112 tests pass. Native and Wasm execution each pass 1,181 positive value
comparisons, including continued row/ledger updates and representation
conversion, plus malformed-value and forged-package rejection. Nine complete
fixture libraries/selections reproduce byte-identical Rust under the current
compiler. All 28 libraries now appear in recursive discovery and check locally;
the compiler also builds offline without a knowledge checkout and emits the
same selected code from explicitly supplied packages. Evidence is in
`reports/definition-native-phase1/`.

This executes mathematical candidate definitions with a trusted Rust/LLVM
backend; it does not formally verify that backend or admit full Ink source
stateful replacements. The row/column adapter uses boxed data and converts at
each entry. Efficient physical buffers, persistent representation selection,
source errors/aborts/events/commits, snapshots and migration remain required.
There is no new performance claim.

The preceding separation milestone removes the older typed-scalar matcher,
traversal, premise search and application from the compiler. Historical scalar
libraries are verification-only; active compilation accepts complete external
replacement proofs. Boolean/composed/conditional libraries translate and
reproduce under the unchanged general kernel. Actual branch assumptions are
closed in complete proofs; changed guards, missing branches and leaked
hypotheses are rejected atomically. The full 102-test run passes, followed by
three new admission tests. Native architecture checks pass 260 comparisons,
including empty/one/two rule selection under one compiler. New proposals also
check under the preserved previous compiler. Evidence is in
`reports/scalar-replacement-phase1/`. No new timing claim is made.

The preceding separation milestone retires the production modular-polynomial
normaliser and rewrite matcher. An external knowledge tool reuses checked laws
and produces whole-function proofs for scalars and arithmetic within mapped sums;
optional fold fusion is proved by the existing induction kernel. Unsupported
structures, exhausted search and unproved square factoring keep their original
implementation. The full 101-test run passes, plus all four focused tests after
adding fusion coverage. Native validation passes 8,568 kernel comparisons and
2,040 additional scalar/mapped-sum comparisons; WebAssembly passes 2,856 oracle
checks. New packages also check under the preserved previous compiler. Evidence
is in `reports/external-rewrite-phase1/` and `reports/wasm-external-rewrite-phase1/`.
There are no new timing claims. Exact-integer aggregate authority, older scalar
database search, bounded caches and stateful representation admission remain
migration work.

The preceding implementation boundary is `ink-executable-core-v1`: one shared,
bounded, checked program representation for source and serialized input.
`ink-checked-replacement-v1` pins that entire input, its semantic version, the
pure total-value observation domain, and exact proof-library lock bytes before
accepting a replacement. Failed admission leaves the input unchanged. All 100
tests pass, including a fully rehashed false theorem and unchanged state
snapshots after core round trips. Four native compilation paths pass 4,160
independent full-width arithmetic oracle comparisons; source/core paths emit
identical C. The producer lives in the separate knowledge repository. This
establishes a checked interface foundation, not a complete SSA/ownership system,
stateful replacement admission, removal of legacy optimisation machinery, or
a performance improvement. See `reports/core-replacement-phase1/validation.json`
and [the architecture](docs/small-core-and-knowledge.md).

The latest invariant milestone is [source-bound sorted layouts](docs/sorted-layout-models.md). Two packages add 22 objects each and prove order laws, sortedness through all finite row/column write histories and uniqueness. Column validity also checks lane alignment. All 89 tests pass; the packages reproduce byte identically and check under the earlier kernel. New tests cover 128 write prefixes, boundary-key order/equality, reversal/duplicate/mismatched-lane witnesses and twelve fully rehashed false models. Native search/index, buffer operations, source actions/effects, codecs and representation admission remain unfinished. Runtime and performance evidence are unchanged.

The previous layout/proof milestone is [source-bound rows and columns](docs/column-layout-models.md). Two packages add 38 objects each and prove complete sequence roundtrip, lookup/write correspondence, alignment and arbitrary future write histories. Both reproduce under the preserved compiler and check under the earlier kernel. All 86 tests pass; 512 prefixes compare the models with four native storage variants and an independent tree oracle, and ten fully rehashed false models are rejected. Runtime, five benchmark bodies/plans and recorded lifecycle binaries are unchanged. Native binary search, sorted/unique invariants, source actions, effects, codecs and representation admission remain unfinished.

The previous source/proof milestone is [source row models](docs/source-row-models.md). The compiler lowers actual value/key types and row-local contribution expressions into the existing proof language; a bound wrapper must store the complete row and use that projection. Four externally produced packages cover two distinct record/key schemas and both journals. All 83 tests pass; package production reproduces exactly and the preserved previous kernel checks all proofs. Six composite-row native fixtures verify 288 results, 72 aborted checkpoint comparisons and future restored execution. Five benchmark bodies/plans and recorded lifecycle binaries are unchanged. Complete source-action/native-map/protocol correspondence and representation admission remain unfinished.

The latest proof milestone is [whole-row rollback](docs/whole-row-undo.md). Two standalone 96-object libraries prove complete payload/cache restoration at every 128-bit lookup after arbitrary finite write histories, using the actual snapshot/reversible journal expressions. The preserved compiler checks and reproduces both without core changes. All 78 tests pass, including rehashed false definitions, independent map oracles and native payload/event/checkpoint continuation across tree/row/column layouts. The libraries do not yet admit native transformations; source/native map and codec correspondence, ordered enumeration and full transaction/effect proofs remain unfinished. Runtime and performance measurements are unchanged.

The latest evaluation is [whole state lifecycles](reports/lifecycle-phase1/REPORT.md): 462 timing samples and 66 separate allocation profiles across eleven implementations include construction, in-phase promotion, distribution shifts, clearing, final observation and destruction. Small-policy Ink takes 1.25× Rust tree time overall, while permanent flat columns lose badly on large clears and retain excess capacity. All requested implementation bytes return to zero on destruction. Independent counter checks and replay audits pass. The compiler is unchanged, so the preceding 75-test executable milestone remains current; this evaluation does not complete full representation refinement, arenas, adaptation, memory limits or durability.

The latest implementation milestone is [compact storage and borrowed outcomes](docs/compact-storage.md). External typed policies select contiguous rows or separate key/row buffers and an optional promotion threshold. Native lowering moves rows into storage/undo and exposes borrowed event outcomes; the owned API remains available. All 75 tests pass. In the 1,764-sample controlled inventory comparison, the small-column policy takes about 27% less time than Rust tree across the small-table cases, but 28% more time across the full matrix. Matching-layout handwritten Rust remains faster. Six generated variants also pass Node/browser Wasm and cross-layout checkpoint continuation. Physical primitives remain trusted; general ownership/arenas, inline variable-size values, database-proved representations and measured adaptation are unfinished.

The preceding proof milestone is [keyed contribution-table transition proofs](docs/keyed-table-proofs.md): version-4 certificates bind actual arithmetic to checked one-step and arbitrary finite write-history equalities. Generic generalised induction supports changing state. All 70 tests pass; both database journal choices work under one compiler. The fresh 756-sample C/C++/Rust report leaves bounded Ink at 1.77× Rust time, with emitted runtime source identical to the prior version-3 implementation. Native map/projection correspondence, full transaction effects/rollback, representations, adaptation and durability remain unfinished.

The previous milestone is [exact integer storage reuse](docs/integer-storage-reuse.md): native cache lowering consumes the final use of an owned integer, retaining the existing expression tree and database authority. All 65 tests pass. The controlled 560-sample report shows 1.36× overall journal improvement and zero measured update allocations for the 8192-exponent small-changing-row case; overall Ink still takes 1.90× handwritten Rust time. The maintained 756-sample C/C++/Rust inventory report leaves bounded Ink at 1.77× Rust time. Full state refinement, measured adaptation, durability and broad language coverage are still unfinished. The [complete public Hunchroom catalog review](reports/hunchroom-review-20261010/REVIEW.md) identifies operational proof templates for that next work.

## Native pure computation

- Rust lexer, parser, type checker and independent reference evaluator.
- Expression-returning functions over `u32`, `u64`, `Bool` and word lists, with unchanged opaque value types available in the stateful host.
- Modular arithmetic, comparisons, Boolean short circuiting, lambdas, `map`, `filter`, `sum`, `count`, right-fold `foldr`, lazy scalar `choose` and scalar calls.
- Literal materialised collection stages through emitted C and Clang/LLVM, retaining generated C, LLVM IR and a plan manifest. Checked database proposals can select single-fold implementations; the core no longer automatically fuses pipelines.
- External bounded rewrite search over database laws, complete replacement
  proofs checked locally through the general equality/induction/RUP kernel.
  The legacy modular-polynomial certificate path is retired.
- Algorithm-matched C/C++/Rust benchmarks: 2,352 samples and 8,568 native correctness comparisons in the archived phase-one report.

## External proof-term database (first fragment)

- A bounded equality checker supports reflexivity, symmetry, transitivity, primitive literal computation, binary congruence, Boolean case analysis, acyclic definitions and typed theorem instantiation over total `Bool`/modular `u64` scalar expressions. There are no algebraic optimisation axioms in this checker.
- An external Python producer emits explicit case proofs; immutable SHA-256 objects are loaded through an ordered lockfile and checked locally. `--database` applies them only with typed total-scalar substitutions.
- Boolean absorption and duplicate-predicate elimination are supplied as database data. An end-to-end check added zero, one and two laws under an unchanged compiler SHA-256, obtained three distinct generated C programs and passed 60 native oracle comparisons (`reports/database-equality/result.json`). New laws in this fragment require no compiler changes. A bounded dependency loader now checks reusable definitions and theorems under explicit imports, and records the full closure in build plans. A seven-object example specialises a combined Boolean theorem to a numeric comparison and passes 32 native oracle checks. Every proposed rewrite is rechecked as an exact theorem instantiation before application. Conditional equality theorems now require explicit premise proofs. Short-circuit branch facts justify eligible rewrites, and a complete function proof closes those facts before compilation. The two conditional rules preserve unguarded expressions and pass 168 native checks with and without imported knowledge. First-order inductive definitions and induction now exist in the separate proof-library path below. The new `--implementation` bridge connects a restricted collection fragment to exact source replacements; richer propositions and stateful refinement remain pending.
- Existing polynomial and aggregate optimisation paths still use their legacy trusted mechanisms. The overall compiler does not yet satisfy the small-core architecture. LLVM remains a separate optimising backend.

## First-order inductive proof library

- Generic monomorphic datatype declarations, typed constructors/exhaustive matches, total structurally recursive functions, capture-avoiding substitution and bounded definitional computation. Datatypes and function bodies come from database objects.
- General equality proofs, constructor/function/primitive congruence, checked theorem application with explicit premises, Boolean cases and induction over each recursive constructor field. Induction hypotheses cannot escape branches or assume variable-dependent outer premises for strict subterms.
- `lang verify-library` checks immutable SHA-256 entries under explicit direct imports and a bounded dependency closure. Untrusted Python production supplies twelve objects proving list-traversal composition, a modular boundary instance and generic tree-copy identity. Thirty-three extension/hostile-object checks pass with an unchanged compiler binary; evidence is in `reports/database-induction`.
- The new checker is a trusted Rust implementation, not yet formally verified itself. It checks mathematical definitions/equalities, and the separate collection correspondence bridge now authorises exact compiled replacements; `--database` still uses the earlier scalar fragment. Higher-order/generic types, dependent propositions and stateful refinement remain unfinished. See `docs/small-core-and-knowledge.md`.
- `--implementation` uses closed whole-function proposals and a pinned library. It independently checks recursive definitions against source map/filter/sum/count/foldr/choose semantics and acyclic source callees, handles actual lexical captures and shadowing, and checks the exact whole-function theorem with no external hypotheses. Installation is transactional. Unsupported operations and mismatching definitions fail closed. The proof covers total values, excluding allocation/OOM/trap traces.
- The external producer supplies 21 immutable objects and four candidates. Five selected database revisions change generated code without changing the compiler binary. The earlier forty-test milestone included 1,024 before/after interpreter comparisons, forged/stale/wrong-model rejection and right-fold order.
- `reports/collection-proof-phase1` contains 1,344 samples across 24 cells and 8,320 native oracle comparisons. Checked replacements are 6.17× faster than staged baseline execution and take approximately the same time as combined C/C++/Rust. The bootstrap backend still delegates machine optimisation to LLVM.
- `reports/collection-proof-wasm-phase1` contains 4,416 Node/V8 checks over import-free literal, checked and ownership/order fixture modules. Memory growth, input preservation, repeated calls, nested temporary arguments and multiple borrowed inputs pass. This new pure collection path has not yet been independently browser-tested.

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

The original native ABI comparison is `reports/native-state-phase3-native-abi/REPORT.md`: 756 samples, 18 cells, six variants. All variants maintain totals; the common C driver consumes outputs and final state. Independent Python validation checks 2,005 operations per variant (12,030 native comparisons) and 4,010 reference-runtime outcomes. Sources, toolchains, commands, generated code and observations are archived. The latest maintained inventory comparison is `reports/table-transition-inventory-phase1/REPORT.md`; the controlled old/current exact-integer comparison is `reports/storage-reuse-phase1/REPORT.md`.

The bounded native variant is 1.71× faster than the current BigInt variant by geometric mean. It still takes 1.75× the handwritten Rust u128 baseline's time and 2.56× the fastest baseline's time per cell, aggregated geometrically. C's flat table, C++'s map and Rust's BTreeMap differ in layout and costs; handwritten baselines also eliminate unobservable speculative writes. The reports document these differences. These are warm, single-threaded, in-memory measurements, not durability, concurrency or universal language rankings.

Generated Rust lowering, runtime support, dependencies and Rust/LLVM remain trusted; the tests are not a machine-code correctness proof.

## WebAssembly

- Pure programs compile to freestanding wasm32 modules with SIMD through Zig's Clang/linker toolchain.
- The pure-function pointer/length ABI is documented in `docs/wasm-abi.md`.
- Both the plain and knowledge-enabled modules passed 2,856 independent BigInt checks in Node/V8.
- Stateful programs compile through the typed Rust backend to import-free `wasm32-unknown-unknown` modules. ABI version 1 uses opaque handles, exact JSON requests, atomic changes, ordered outbox inspection/acknowledgement and portable binary checkpoints. `lowerings/wasm/runtime/state-wasm.mjs` works in Node and browsers and preserves integer precision across signed i64 and JavaScript Number boundaries.
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

## Ink naming and filtered proof extension

The package and primary executable are named `ink`; `lang` remains a compatibility executable for archived tooling. Source files can use `.ink` (`examples/hello.ink`); existing `.lang` inputs remain accepted.

The first-order kernel now has total typed conditional terms, general congruence via capture-avoiding substitution into a typed fresh-hole context, and exhaustive cases over an arbitrary Bool expression with closed predicate hypotheses. The source bridge supports filter, lazy scalar choose and acyclic pure functions, including exact callee-definition correspondence. This adds general logic/computation mechanisms, not a catalogue of filter optimisations.

The external filtered producer supplies 36 immutable objects and four induction-checked implementations. Tests add 1,024 filtered before/after interpreter comparisons with modular overflow and predicates selecting none/all/some rows; stale callee and forged proposal rejection; closed condition hypotheses; mismatched conditional sorts; lazy branch execution; and warning-free native compilation for ignored lambda arguments.

`reports/filter-proof-phase1` now records 5,376 samples across 96 cells and 8,320 independent native oracle comparisons for eight staged/combined variants. The three traversal workloads improve by 3.43× over Ink staged and approximately match combined C/C++/Rust. The constant-value workload becomes O(1) after LLVM loop elimination and is reported separately. Five database revisions change generated code with one compiler SHA-256; closures grow through 0/11/20/29/36 objects. No core source changed in this benchmark phase. Reporting-only reanalysis preserves original raw measurements and measured source hashes.

`reports/filter-proof-wasm-phase1` records 4,476 shared checks in each of Node/V8 and actual Chromium 155 over three import-free modules, including lazy branches, order-sensitive folds, nested collections, borrowed input preservation and memory growth. A repository-local server now makes browser reproduction self-contained. This is functional evidence, not a Wasm performance ranking or a formal proof of the backend. The full architecture and implementation goal remains open.

## External arithmetic proof production

`bitproof.rs` provides fixed Boolean/wrapping-u64 semantics as Boolean circuits and a bounded hinted RUP refutation checker. `logic.rs` connects that checker to exact equality conclusions and selected in-scope premises, with one shared bit-proof work budget per declaration/check. Solver search, arithmetic identities and source replacements reside outside the core. Only independently checked refutations grant equality; a SAT result or content hash alone grants nothing.

The installed package has ten immutable objects: a list datatype and nine scalar theorems. Eight unconditional whole-function replacements are selected through the existing exact source bridge; a ninth conditional theorem remains library-only. Its premises cannot be silently dropped or invented. Theorems compose with existing constructor equality and list induction. Strict native compilation now accepts valid self-comparisons without needing an optimisation database.

The complete Rust suite passes 54 tests, including six checker/encoding unit tests and five integration tests. Independent external SAT checks compare the exported circuits against Python arithmetic at 2,534 expected/mutated assignments over 15 operations. Five native variants pass 42,920 oracle comparisons. These are engineering checks, not a mechanically verified soundness theorem for the encoder/checker or backend.

`reports/bitvector-proof-phase1` records 560 samples in 16 scalar-call cells, nine independently selected database revisions, replayed compiler plans and disassembly, and fresh-process proof-checking costs. All eight baseline/checked ARM64 bodies are identical; the elementary arithmetic package demonstrates extensibility, not runtime improvement. LLVM already performs those simplifications. The small-core migration, stateful refinement, durability, adaptation and broader language coverage remain unfinished.

## Exact-sum proof foundation

The unchanged generic kernel now checks a database-defined canonical exact-integer model, additive group laws, and arbitrary-position finite-list sum insertion/replacement/removal equations. `knowledge/exact-integers` contains 35 immutable definitions/theorems, including 23 universal induction proofs. No new primitive, ring axiom, solver or aggregate-specific rule enters the core.

Three integration tests supplement those proofs: 1,323 model/BigInt arithmetic checks, 225 sum-update fixtures with negative/duplicate/empty values, and rejection of rehashed false proofs and missing direct imports. The complete suite passes 57 tests. Deterministic production and approximately 6 ms whole-library import cost are recorded in `reports/exact-sum-proof-foundation`.

The unary data is a proof model, not a runtime representation change. Importing the mathematical library alone does not authorise stateful transformations. The separate source-update bridge below now checks actual candidate arithmetic; full transaction/representation refinement remains work and legacy authority is still present.

## Database-backed source maintenance

Version-2 maintenance certificates carry a bounded portable proof library, twelve exact semantic-definition identities and three application proofs. The source bridge checks canonical integer/list definitions, translates actual candidate update expressions, and checks insertion/replacement/removal equations for arbitrary prefixes/suffixes and signed values. Both reference and typed native execution accept the checked package. No optimisation theorem or polynomial normalisation procedure was added to the generic kernel.

`knowledge/exact-maintenance` supplies canonical and commuted candidates through an external producer. Checked raw bundles retain SHA-256, direct imports, closure/byte limits and fail-closed loading. Rehashed false/irrelevant proofs, changed source operations, hidden model imports and altered model meanings are rejected. Five new tests pass, making 62 total; reference/native checks include 512-bit signed data, filtered aggregates/counts, rollback, tentative reads, ordered events and continued checkpoints.

`reports/database-maintenance-phase1` archives 756 samples in 18 cells, 12,030 native oracle comparisons and 4,010 reference outcomes against maintained C/C++/Rust. Replay verifies exact generated source/plans and deterministic production. The canonical v1/v2 runtime source is byte-identical. Bounded Ink takes 1.75× Rust tree time and 2.57× the fastest baseline's time by geometric mean; this is a proof-authority migration with no runtime algorithm gain. Certificate checking takes roughly 6 ms in fresh processes with a warm filesystem. Clang resolves native CPU to apple-m3, Rust to apple-m4, on this Apple M4 Pro host.

The initial bridge supports `+`, `-` and literals up to 32; runtime variables remain unbounded BigInt. Multiplication and efficient large proof literals still use legacy certificates. Row-pipeline recognition, table-to-list correspondence, the transaction/cache protocol, bounded representations and backend lowering remain trusted. Complete transition/representation proofs and removal of legacy authority are unfinished.

## Cache copying and database delta choice

An external producer adds two checked universal theorems and a delta-first update candidate to the exact library. All 37 objects are checked under the original compiler before a separate lowering change. The compiler's generic proof kernel and source correspondence are unchanged. The new base lowering borrows exact cache/input operands while keeping arithmetic temporaries owned; it preserves the expression tree and exact arithmetic. Bounded emitted code remains byte-identical to the previous implementation.

Six database-maintenance tests now cover canonical, commuted and delta candidates. Reversed subtraction, missing new proof roots and incorrect application proofs fail after rehashing. Signed reference/native execution, aborts, tentative reads, filtered sums/counts, events, atomic selection and future checkpoint continuation pass. The complete suite passes 63 tests.

`reports/cache-lowering-phase1` records 1,008 samples over 18 cells and 16,040 independent native checks against the same maintained C/C++/Rust baselines. Old cloned versus borrowed lowering and borrowed versus delta differ little on the small unsigned inventory workload. Bounded Ink still takes 1.77× Rust u128 time overall.

`reports/wide-cache-phase1` uses a real two-row Ink stateful program with signed prepared inputs, fixed `2^bits` anchors and either small or wide changing rows. It records 448 samples over 16 cells and 4,096 native state/integer comparisons. Borrowing is 1.23× faster than old lowering by geometric mean. Delta-first is 1.05× faster on the small-changing-row profile but about 3% slower on the wide-changing-row profile; it still takes 2.98× handwritten Rust BigInt time overall. The 8192-exponent small-row update-only cell improves by 1.17× from delta selection. This experiment omits errors/events and compares arbitrary-precision execution only with Rust; the companion inventory benchmark covers C/C++ and transaction failures/events.

Separate instrumented builds count allocation/reallocation calls and requested bytes over 32 cases. For the 8192-exponent small-row update profile, old lowering averages 3.492 calls/update, borrowed and delta average 2.492, and handwritten Rust reuses existing capacity with zero calls. The instrumentation excludes setup, observations and queries and is never used to infer timing, peak memory or retained memory. Executed audits reproduce counts, exact code/plans, 208 native streams and deterministic proof production under the original compiler. Equality permits safe alternatives; measured profiles must still guide a future selector. General stateful/refinement migration and the full goal remain open.

## Database-defined reversible cache journals

Version-3 evidence now specifies a saved exact integer and actual apply/restore expressions for each insert, replacement and removal. The bridge checks forward equality to the original maintained update and restoration to an arbitrary prior total. The generic kernel/library checker is unchanged. Two external packages select full snapshots or reversible differences without rebuilding the compiler. The reference runtime and native backend execute both, retaining the existing trusted table/transaction scheduling boundary. Bounded u128 caches keep snapshots; richer journal layouts and general state refinement remain unfinished.

All 65 tests pass, including multi-table aborts, repeated writes/removals, wide signed values, tentative reads, ordered events, checkpoints and exhausted commit counters. `reports/reversible-cache-phase1` records 448 samples and 4,096 independent native comparisons. The reversible journal improves by 1.31× on small-changing-row profiles, gives little benefit on wide-changing-row profiles, and remains 2.54× slower than handwritten Rust overall. Separate allocation counters confirm a reduction from 2.492 to 1.492 calls/update for an 8192-exponent anchor with small changes; wide changes can allocate more. `reports/reversible-inventory-phase1` records 756 samples against C/C++/Rust and 12,030 native plus 4,010 reference checks; bounded Ink still takes 1.77× Rust u128 time. See `docs/reversible-cache-journals.md` for precise obligations and reproduction. The full PLAN.md remains binding.


## Independent backend boundary and routing

The semantic/proof crate now builds without knowledge or backend source. Pinned
external C/Rust/GPU/Wasm-adapter repositories supply code generation and target
runtimes to the CLI facade. The existing contextual-u32 GPU work is integrated;
WebGPU and wgpu share lowering, while Rust/C retain native/Wasm toolchains.

Generic definition/machine admission stays in core. The sequential machine
package proves initialisation, relation preservation, reply/query agreement and
snapshot recovery from actual definitions; private generated physical state
persists across calls. Row/ledger column packages and an independent counter
exercise it. Boxed definitions, codecs, protocol and Rust/LLVM remain trusted;
actual Ink source-action admission, flat storage proof and host failures are open.

The pure routing interface checks a bounded acyclic typed composition and its
whole-function equality, with target/domain labels opaque to the core. Arbitrary
mixed Wasm/WebGPU/native graph execution, physical bridge proofs, ownership/async
contracts and database cost search remain open. See docs/backend-packages.md.
No new runtime speedup or universal fastest-language claim follows from this split.

## Composable conditional optimisation

Implemented a shared typed semantic term and checked selection path for all
currently admitted pure-function expression forms, with capture-safe binders,
explicit condition proofs, operational reduction, list/natural induction and
wrapping-word polynomial equality. External indexed bounded search composes
nested rewrites and can discharge premises using checked catalogue lemmas.
CLI `--optimise`/`--selection` connects the result to execution and lowering;
proved source routing uses the same calculus. The example laws are independently
versioned knowledge data. Direct effectful transaction/representation rewrites,
physical bridge proofs, compute-v2 mixed-route execution and global-optimality
claims remain outside this milestone. See `docs/semantic-optimisation.md`.

## Runtime value binding

The checked source model now has a bounded codec for actual runtime inhabitants
and canonical ordered tables. Row/column tests share it instead of hand-building
logical payloads. Nominal identity, u32 widths, UTF-8, member types, duplicate keys
and resource limits are checked. Large Ink integers remain executable even when
the unary proof model cannot encode them. The trusted codec does not establish
complete source-action/effect/native correspondence. The new knowledge laws are
append-only mathematics; payload negation is not a signed join deletion. See
docs/source-value-correspondence.md and reports/source-values-phase1.

The reviewed append-view entries are also published through the canonical Store
API (595-entry snapshot), with readdressed references checked by the registry.
The value bridge is adapted to the physically separate core source tree; planner,
runtime and backend responsibilities stay as defined by the architecture split.
Reports/source-values-canonical records combined validation separately from the
original base's evidence. Action/effect/native refinement remains the next gate.

## JavaScript lowering and browser selection

The independent pinned `ink-lowering-js` package emits literal ES modules for
checked pure numeric, Bool, vector, record and nested-list programs. Ink core
types and canonical identities are unchanged. JavaScript implements word wrapping,
BigInt-backed u64 and separately rounded binary32 operations. Stateful and opaque
stateful values reject. The CLI exposes `build --target javascript`; browser GPU
bundles include JS, Wasm and WGSL, with bounded whole-computation selection in
ink-runtime. Native GPU fallback remains C. Per-stage adaptive placement and
browser source editing remain unfinished. See [the target contract](docs/javascript-backend.md)
and [validation evidence](reports/javascript-phase1/REPORT.md).

## Shared executable change boundary

Reference and generated Rust/Wasm now share the fixed commit decision, sticky
nested-change error propagation and ordered event-coordinate primitives.
A private binding witness checks a canonical database decision definition
against the actual fixed semantics and a checked source change. It does not
bind the action body or install a replacement. Four database theorems cover
domain-error precedence, exhaustion and guarded commits; the snapshot contains
601 entries. Six valid alternative mathematical protocols fail binding and a
fresh authenticated false theorem fails proof admission.

All 189 distribution tests and 20 independent core tests pass. The final
three-seed transaction fixture checks 48 native and 48 compiled Wasm outcomes,
each with exact snapshot comparison, covering nested ignored/captured errors,
tentative reads, short circuits, event order and commit exhaustion. All canonical
entries replay across 37 bounded views using the preserved checker. This makes
no timing or browser claim. Source-body/effect, physical rollback/storage and
replacement admission remain open. See docs/change-boundary-correspondence.md
and reports/change-boundary-phase1.

## Typed ordered actions

The source-bound core artifact now retains concrete types, resolved references
and evaluation order. Reference execution and Rust lowering consume its frozen
adapter. This fixes contextual empty sums returned by changes and native
constructor inference for discarded values. Dead code remains represented and
now requires valid types and declared effects. No proof-kernel rule, database
optimisation catalogue or stateful replacement authority was added.

Combined validation preserves the parallel JavaScript/runtime changes: all
196 distribution tests and 22 independent core tests pass. The isolated core
also passes 22 tests offline without external repositories. The focused fixture
compares 32 native and 32 compiled Wasm outcomes, each with exact snapshots,
against reference execution. No timing or browser claim follows. Whole-action
logical/primitive correspondence, physical rollback and stateful replacement
admission remain open. See docs/typed-actions.md and reports/typed-actions-phase1.

## Source-bound effects and local Result boundaries

The typed action core now derives bounded conservative access and prefix-effect
judgments. A private witness ties them to exact source/action identities. The
database's fixed prefix-composition definitions and six theorems bind to the
actual finite Rust operation; they do not prove the abstract analysis sound or
authorise a stateful replacement. Runtime diagnostics expose observed prefix
flags before commit/rollback. Core proof acceptance rules remain unchanged.

This work exposed and fixed reference/native disagreement for a query's internal
`?`: queries and Result-valued keeps now return local errors as ordinary values,
including when their error type differs from the caller's. Explicit caller `?`
propagates them; nested change errors remain sticky. See docs/action-effects.md
and reports/action-effects-phase1. Whole-action/primitive correspondence, full
ordered observations, physical rollback/refinement and generic stateful
replacement admission remain open; no performance improvement is claimed.

Final validation: all 204 integration tests and 23 independent/isolated core tests
pass. All 612 entries replay on the preserved checker; 12,544 finite composition
cases agree, and 1,000 observed reference prefixes fit their judgments. Native
and compiled Wasm each match 42 outcomes with exact snapshots. The query/keep
error-boundary regression is fixed. No timing or browser claim follows.


## Direct reference actions and reviewed backend integration — 2026-10-10

Reference actions/keeps now execute sealed typed nodes/instructions directly
with resolved slot frames; the source adapter remains available to lowerers.
General primitives and source/action/snapshot identities are preserved. A found
admission gap is fixed: table roots cannot escape into ordinary values or nested
table payloads; only declared roots and capability-checked literal methods admit.
No optimisation catalogue or proof-kernel acceptance rule was added.

Parallel backend main af3c6c4 is integrated with all published pins. Final-tree
validation passes 207 broad tests plus three actual Zig/Wasm/wgpu conformance
tests; the unchanged expensive migration case passed in the earlier broad runs.
Core and an isolated byte-identical offline copy pass 25 tests. All five CPU
paths match 78 cases with exact snapshots; native wgpu matches 68 mixed-module
cases with 21 GPU calls and resident shrinking/empty feedback. Archived Wasm
replay matches 53 calls/snapshots. No timing or browser revalidation claim.

Whole-action logical/primitive correspondence, physical rollback, generic
stateful admission, remaining specialised authority removal and the broader
production/performance goals remain open. Editor support and schema evolution
are excluded. See reports/typed-execution-phase1 and docs/typed-actions.md.
