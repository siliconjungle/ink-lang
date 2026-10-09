# Ink

Ink is a language for data, computation and explicit state changes, with implementation choices justified by locally checked proofs. This repository implements [the design draft](docs/language-specification-draft.md), incrementally. The full implementation is **in progress**. [STATUS.md](STATUS.md) describes the current executable subset; [PLAN.md](PLAN.md) preserves the full acceptance criteria.

The implementation includes a Rust frontend and reference evaluator, pure native compilation through C and Clang/LLVM, stateful compilation through generated Rust, and an independently versioned catalogue of checked proofs and implementations. Both compilation paths also target WebAssembly. The current pure baseline materialises collection stages; an explicit checked database proposal can select a single-fold implementation. It does not recognise benchmark names or substitute handwritten benchmark kernels.

```text
module demo;

pub fn total(xs: List<u64>, scale: u64) -> u64 {
    return sum(xs.map(fn(x) => x * scale).filter(fn(y) => y < 1000));
}
```

## Build and run

Requirements: a Rust toolchain, Clang, Python 3, and a C++ compiler for comparison. The current benchmark harness targets macOS; the compiler's C backend can be adapted to other hosts.

```sh
git submodule update --init knowledge
cargo test
cargo build --release
target/release/ink check examples/kernels.lang
target/release/ink prove knowledge/ring.lang -o build/ring.json
target/release/ink knowledge verify build/ring.json
target/release/ink build examples/kernels.lang -o build/kernels.o --knowledge build/ring.json --native-cpu
python3 bench/run.py
```

On this workspace, Rust is installed outside the system PATH at `../../work/toolchain/cargo/bin` relative to the repository. The benchmark harness detects that isolated installation automatically. `dev.py` provides the same detection for Cargo commands:

```sh
python3 dev.py test
python3 dev.py build --release
```

To evaluate a program with the independent interpreter, put an array of function arguments in a JSON file, then run `ink run SOURCE FUNCTION ARGUMENTS.json`. For example, the arguments to `affine` are `[[1,2,3],3,11]`, whose result is 51.

The build emits a native object, its readable C intermediate, LLVM IR, and a plan manifest containing the identities of applied certificates and the trust boundary. Proof packages can be validated offline. The `lang` executable remains available for existing benchmark scripts and archived reproduction commands.

## Compiler and knowledge repositories

[ink-lang](https://github.com/siliconjungle/ink-lang) contains the executable
language, general checkers, base runtime, lowering and integration tests.
[ink-knowledge](https://github.com/siliconjungle/ink-knowledge) contains the JSON
catalogue, candidate packages, untrusted proof generators and Lean research.
The `knowledge` directory is a submodule pinned to an exact commit. It is not
part of the compiler executable, and the compiler does not fetch updates.

```sh
git clone --recurse-submodules https://github.com/siliconjungle/ink-lang.git
python3 knowledge/tools/catalogue.py list
python3 knowledge/tools/catalogue.py verify --compiler target/debug/ink
```

A compiler-only checkout builds without initialising the submodule. Full
integration tests and catalogue examples require the pinned knowledge checkout.
Installed compilers also accept lockfiles and proposals from an unrelated local
checkout using `--library`, `--database` and `--implementation`; paths are explicit.

The split establishes independent ownership, not completion of the small-core
migration. The legacy polynomial checker, aggregate schema, bounded-cache
analysis and layout-specific lowering remain documented migration work in
[the architectural boundary](docs/small-core-and-knowledge.md).

## Meaning of verified in this milestone

[Source row models](docs/source-row-models.md) now bind actual nested record types, key words and contribution expressions to checked mathematical definitions. Four external rollback libraries instantiate two schemas under the same compiler; the previous kernel also checks them. The full suite passes 83 tests. These bindings still require native-map and complete transaction correspondence before they can authorise representation changes.

[Row/column layout models](docs/column-layout-models.md) now prove complete ordered sequence roundtrips, lookup/write correspondence, alignment and arbitrary future write histories for two source schemas. Both packages reproduce under the preserved compiler; 512 prefixes compare their transitions with four native storage variants and a tree oracle. Native binary search, sorted-map invariants and full transaction correspondence remain separate obligations. The full suite passes 86 tests; runtime and benchmark code are unchanged.

[Sorted layout models](docs/sorted-layout-models.md) now prove that the row algorithm preserves strict order and uniqueness through every finite write history, and that aligned columns preserve the same validity condition. Both packages reproduce and check under the preserved earlier kernel. All 89 tests pass, including reversed/duplicate/mismatched-lane witnesses and twelve rehashed false invariant packages. Native search/index and complete source/protocol correspondence remain unfinished; performance measurements are unchanged.

The legacy arithmetic path normalises polynomials over the ring of integers modulo 2^64. A newer database path reconstructs fixed Boolean/u64 circuits and checks external hinted RUP refutations; it has no solver or arithmetic-law catalogue in the compiler. Both Rust checkers remain trusted implementations and have not themselves been mechanically proved correct. The legacy path is still available and needs migration before the full small-core architecture can be claimed.

Collection lowering, emitted C and Clang/LLVM are currently trusted. Native behaviour is checked against an independently implemented mathematical reference and the interpreter; those tests are not an end-to-end formal proof. General equality and induction checking now exist for restricted fragments; richer contracts and general state-transition refinement remain work to do.

## Compact native storage

The proof database also contains [whole-row rollback evidence](docs/whole-row-undo.md), checked under the unchanged compiler. It proves payload/cache restoration in an abstract keyed model for arbitrary finite histories. Native representation admission still needs the source/map/codec correspondence bridge. The full suite now passes 78 tests.

An external policy selects contiguous row/column buffers and optional promotion to a tree. The backend moves rows into undo/storage and offers a borrowed event-result API. [The design and trust boundary](docs/compact-storage.md) explain the implementation. [The current controlled benchmark](reports/borrowed-outcomes-phase1/REPORT.md) shows gains for small tables, while matching-layout handwritten Rust remains faster and large mutation-heavy flat tables can be much slower. All 75 tests pass; tree/row/column snapshots also transfer and continue across native and browser WebAssembly. Policies are checked typed data, not proofs of the physical runtime implementation.

## Benchmarks

`bench/run.py` builds six variants: language without imported knowledge, language with imported knowledge, C loops, C++ standard algorithms, Rust iterators and Rust loops. They use identical modular-u64 semantics and the same separately compiled C timing driver. The current language baseline materialises collection stages, while these older handwritten baselines combine passes; use `bench/collection-proof.py` below to compare both staged and combined algorithms in every language. The archived phase-one report measured the earlier fused backend. Every result is consumed, and interprocedural optimisation is disabled across the driver/kernel boundary.

The benchmark validates outputs before measuring, randomises variant order, calibrates batch duration and records all samples and commands. Full mode covers seven workloads, four input sizes and two data distributions. `--quick` reduces input coverage for development.

Results are under `bench/results`. They are an evaluation of a small pure-kernel milestone, not proof that the full proposed language exists or that it is universally faster than other languages.

The [lifecycle benchmark](reports/lifecycle-phase1/REPORT.md) extends the state comparison to construction, timed growth/promotion, changing update distributions, clearing, final observation and destruction. Its separate allocation probes distinguish live rows from retained capacity and event logs. After building the compiler, check reproduction inputs with `python3 bench/state/lifecycle.py --validate-inputs-only`, then run into a fresh report directory with `python3 bench/state/lifecycle.py --output reports/NEW`. The harness requires identical generated implementations and records the actual toolchain targets. Replays use the preserved binaries via `python3 tools/audit_lifecycle_report.py --execute`; they do not replace timing samples.

## Stateful execution and maintenance

The complete [inventory program](examples/inventory.lang) from the draft now runs in the reference runtime:

```sh
python3 dev.py build --bin lang
target/debug/ink check examples/inventory.lang
target/debug/ink prove-maintenance knowledge/sum-maintenance.lang -o build/maintenance.json
target/debug/ink verify-maintenance build/maintenance.json
target/debug/ink execute examples/inventory.lang examples/inventory-script.json --maintenance build/maintenance.json --snapshot-out build/inventory.json
python3 bench/state_runtime.py
```

The legacy package's three exact-integer update functions are validated against a fixed finite-map induction schema. The newer database-backed path below checks the actual update expressions through generic induction proofs. Eligible sum/count queries can then use maintained totals. The runtime preserves transaction failure, nested aborts, events and tentative reads. Portable reference snapshots omit physical caches and restore logical state independently of the selected implementation.

[State-runtime measurements](reports/state-runtime-phase2/REPORT.md) show both update overhead and query savings. These compare two modes of the reference evaluator, not generated native stateful code against C/C++/Rust.

The stateful subset also has a typed native backend:

```sh
target/debug/ink emit-state examples/inventory.lang --maintenance build/maintenance.json -o build/inventory-native
python3 dev.py build --release --offline --manifest-path build/inventory-native/Cargo.toml
build/inventory-native/target/release/compiled-state examples/inventory-script.json
```

This produces a standalone Rust crate with no interpreter dependency. Omit `--maintenance` to emit recomputing queries. The generated crate retains its source and plan manifest for inspection. Tests compare six generated implementations with the reference across 36,048 outcomes, including nested failures and exact arithmetic. Portable binary checkpoints transfer state between these implementations and the reference runtime, with another 3,000 future-call comparisons. Live native implementation switching remains pending; see [snapshot format](docs/portable-snapshot.md).

Add `--bounded-totals` to derive eligible aggregate bounds from the declared key and value types. A successful bound permits a u128 cache while preserving exact Int semantics. Direct bounded aggregate queries also receive an allocation-free native word-pair interface. This conservative analysis currently handles sums of a single unsigned record field; other cases keep BigInt storage. See [the lowering argument and trust boundary](docs/native-state-backend.md).

`python3 bench/state/run.py` builds the generated application, C, C++ and two Rust baselines, checks them against an independent Python state model, and measures them through one C driver. All maintain totals incrementally. The [latest stateful report](reports/native-state-phase3-native-abi/REPORT.md) contains 756 samples across 18 workload cells and 12,030 native correctness comparisons. The checked bounded representation and native query interface improve the generated implementation by 1.71× geometric mean, but it still takes 1.75× the handwritten Rust baseline's time overall. This is useful compiler progress, not a fastest-language claim.

## WebAssembly

`python3 bench/wasm.py` builds and validates the pure kernels using an installed Zig toolchain, or this workspace's isolated installation. The resulting modules need no WASI imports and have passed 2,856 checks in Node/V8. See the [ABI](docs/wasm-abi.md) and [validation results](reports/wasm-phase3-literal/validation.json). Stateful programs also compile to Wasm through `emit-state --wasm-abi`. Five implementations pass bidirectional native/Wasm checkpoint transfer and future observations in Node/V8 and an actual browser. [Stateful ABI and reproduction](docs/wasm-abi.md), [Node evidence](reports/state-wasm-phase1/validation.json), [browser evidence](reports/state-wasm-phase1/browser-validation.json). Run `python3 bench/state-wasm.py` to rebuild and validate them.

## Next implementation work

Improve the measured stateful bottlenecks: transactional bookkeeping, repeated lookups, storage layout and unnecessary speculative work. Add durable recovery and broader WebAssembly benchmarks to that state machine, add measured adaptive selection, and complete the broader syntax and verification requirements in PLAN.md.

## Proof-term database prototype

The new path loads explicit equality proofs from immutable objects, without putting Boolean optimisation laws in the compiler:

```sh
python3 knowledge/tools/boolean_proofs.py knowledge/boolean-rules.json knowledge/boolean
python3 dev.py build
target/debug/ink verify-database knowledge/boolean/lock.json
target/debug/ink build examples/boolean.lang --database knowledge/boolean/lock.json -o build/boolean.o
python3 tools/check_database.py
```

The last command checks unchanged-compiler extension, generated-code differences and native results with zero, one and two database rules. It is not a speed benchmark. This first proof calculus covers total scalar expressions, Boolean cases, acyclic definitions, reusable theorems and conditional equality proofs. It cannot yet replace the legacy polynomial/aggregate checkers. `python3 knowledge/tools/composed_proofs.py knowledge/composed` produces a seven-object library with one selected rewrite; `python3 tools/check_composition.py` validates its native output and dependency closure. `python3 knowledge/tools/conditional_proofs.py knowledge/conditional` produces laws with explicit premises; `python3 tools/check_conditional.py` checks their scoped use and native results. See [architecture and limits](docs/small-core-and-knowledge.md).


The first-order inductive proof library adds database-defined constructors, recursive computations and induction:

```sh
python3 knowledge/tools/inductive_proofs.py knowledge/inductive
target/debug/ink verify-library knowledge/inductive/lock.json
python3 tools/check_induction.py
```

Its twelve objects prove list-traversal composition and tree-copy identity, with reused theorem instances. This is a checked mathematical foundation; connecting those definitions to source collection rewrites and replacing the remaining built-in optimisation authority is still in progress. [Scope and rules](docs/small-core-and-knowledge.md), [extension and rejection evidence](reports/database-induction/result.json).

## Checked collection implementations

An untrusted external producer now proposes complete collection-function replacements. The compiler checks exact correspondence between source operations and database-defined recursive models, then checks an unconditional induction theorem before installing each candidate. The baseline no longer automatically fuses collections.

```sh
python3 knowledge/tools/collection_proofs.py knowledge/collections
python3 dev.py build --bin lang
target/debug/ink build knowledge/collections/kernels.lang --implementation knowledge/collections/proposal.json -o build/checked-collections.o
python3 bench/collection-proof.py
python3 bench/collection-wasm.py
```

The [collection benchmark](reports/collection-proof-phase1/REPORT.md) contains 1,344 samples across 24 cells, with 8,320 native oracle comparisons. Checked replacements run 6.17× faster than the staged baseline by geometric mean and take essentially the same time as combined C/C++/Rust loops. This measures selection of a better algorithm, not a universal performance advantage or a new optimisation unavailable to C. The same compiler binary accepts five independently selected database revisions. Import-free Wasm passes 4,416 value/ownership checks, including memory growth and nested calls.

## Filtered pipelines and pure calls

`choose(condition, when_true, when_false)` evaluates one scalar branch. The general proof kernel supports conditional terms, case analysis over an arbitrary Boolean expression and substitution of a proved equality into a typed context. These rules also let database proofs justify filtered pipelines without a built-in fusion rule. The correspondence bridge now checks acyclic source calls and exact callee bodies, including calls within collection lambdas. Changing a callee invalidates a stale proposal even when the caller's source text is unchanged.

```sh
python3 knowledge/tools/filter_proofs.py knowledge/filtered
python3 dev.py build --bin ink
target/debug/ink build knowledge/filtered/kernels.lang --implementation knowledge/filtered/proposal.json -o build/filtered-checked.o
python3 bench/filter-proof.py
python3 bench/filter-wasm.py
```

The producer supplies 36 immutable objects and four induction-checked candidates: map/filter/sum, filter/map/sum, filtered count and a map that ignores its element. The [filtered benchmark](reports/filter-proof-phase1/REPORT.md) contains 5,376 samples across 96 cells and 8,320 native oracle comparisons. Across the three traversal workloads, checked replacements run 3.43× faster than Ink's staged baseline and approximately match combined C/C++/Rust implementations. The constant map is reported separately because LLVM eliminates its traversal entirely; this is not a new optimisation unavailable to the other languages.

Five selected database revisions produce distinct C programs with the same compiler binary. The [filtered Wasm suite](reports/filter-proof-wasm-phase1/REPORT.md) passes 4,476 checks in each of Node and an actual browser, including conditional laziness, nested collections, input preservation and memory growth. Run `python3 bench/filtered/serve.py` and open its printed URL to reproduce the browser checks. Automatic profitability selection, stateful refinement and migration of the remaining legacy optimisation authority are still unfinished.

## Arithmetic proof certificates

```sh
target/release/ink verify-library knowledge/bitvector/lock.json
target/release/ink build knowledge/bitvector/kernels.ink --implementation knowledge/bitvector/proposal.json --native-cpu -o build/arithmetic.o
python3 bench/bitvector-proof.py
python3 tools/audit_bitvector_report.py --execute
```

The [arithmetic package](knowledge/bitvector/README.md) supplies nine theorems and eight exact source replacements through untrusted external SAT proof production. Ink independently checks the certificates, scoped premises and complete replacement proofs. Arithmetic theorems also compose with list induction. A conditional theorem cannot authorise an unguarded rewrite.

The [benchmark report](reports/bitvector-proof-phase1/REPORT.md) records 560 timing samples, 42,920 native oracle checks, 2,534 independent SAT/encoding checks and nine database revisions under one compiler. All eight baseline/checked ARM64 function bodies are identical: LLVM already recognises these elementary identities, so this produces no demonstrated runtime speedup. The full library checks in about 22 ms including fresh-process startup and warm file I/O. This extends the proof boundary; the next performance gains need algorithms and representations that skip substantial work.

## Exact-sum proof foundation

The [exact-integer package](knowledge/exact-integers/README.md) adds 35 database objects and 23 universally quantified induction proofs with the unchanged kernel. Its group laws prove insert/replace/remove sum equations at arbitrary positions in finite lists, including negative weights. The [verification report](reports/exact-sum-proof-foundation/REPORT.md) records deterministic replay, 57 passing tests and about 6 ms for a complete import.

This mathematical package alone does not authorise source/table transformations. The separate bridge below now checks actual maintenance arithmetic; complete transaction and representation refinement remain necessary.

## Database-backed state maintenance

```sh
python3 knowledge/tools/maintenance_proofs.py build/exact-maintenance-replay
target/release/ink prove-maintenance knowledge/exact-maintenance/canonical.ink --evidence knowledge/exact-maintenance/canonical.evidence.json -o build/database-maintenance.json
target/release/ink emit-state examples/inventory.lang --maintenance build/database-maintenance.json -o build/database-inventory
python3 bench/state/run.py --maintenance knowledge/exact-maintenance/canonical.json --output reports/database-maintenance-phase1 --build-directory build/database-maintenance-bench
python3 tools/audit_maintenance_report.py --execute --compiler build/cache-lowering-original/lang
```

[Two checked packages](knowledge/exact-maintenance/README.md) select actual update expressions through the generic proof kernel. The source bridge pins exact integer/list meanings, translates the proposed arithmetic, and checks each insertion/replacement/removal equality. Proof production and maintenance laws remain database data. The self-contained certificate carries immutable checked objects; no solver runs during import.

The [native report](reports/database-maintenance-phase1/REPORT.md) records 756 samples, 12,030 independent native state comparisons, replayed code/plans and about 6 ms certificate checking. The complete suite passes 62 tests, including signed 512-bit runtime/native values, aborts, tentative queries, events and checkpoint continuation. Bounded Ink takes 1.75× handwritten Rust time and 2.57× the fastest baseline's time by geometric mean. Canonical legacy/database certificates produce identical runtime source; this step changes checking authority, not performance.

Full transaction/representation proofs, multiplication and efficient large proof literals remain work. The legacy polynomial authority, pipeline recogniser and representation analysis are still present. The compiler does not yet meet the complete small-core design.

## Exact cache performance and data profiles

The [delta package](knowledge/delta-maintenance/README.md) adds two universal proofs and selects `total + (new - old)` under the original unchanged compiler. A separate base-lowering improvement borrows exact operands and keeps arithmetic temporaries owned, reducing redundant copies without inserting an algebraic rewrite into the core.

```sh
python3 knowledge/tools/delta_maintenance_proofs.py build/delta-maintenance-replay
python3 bench/cache-lowering.py
python3 bench/wide-cache.py
python3 tools/cache_allocations.py
python3 tools/audit_cache_reports.py --execute
```

The [inventory comparison](reports/cache-lowering-phase1/REPORT.md) records 1,008 samples in 18 cells and 16,040 independent native comparisons across eight variants. It separates the old emitted BigInt code, borrowed lowering and delta choice from the bounded/C/C++/Rust baselines. Small-integer differences are mostly minor; bounded Ink still takes 1.77× Rust u128 time by geometric mean.

The [wide signed-Int report](reports/wide-cache-phase1/REPORT.md) records 448 samples in 16 cells plus 4,096 native oracle comparisons. Borrowing runs 1.23× faster than the old lowering overall. Delta ordering helps the small-changing-row profile by 1.05× overall, and the 8192-exponent update-only case by 1.17×; it is about 3% slower on the wide-changing-row profile. It still takes 2.98× handwritten Rust BigInt time overall. Separate allocation instrumentation confirms fewer allocations; those instrumented binaries are not used for timing. All 63 tests pass, including the new delta path on signed values, aborts, tentative reads and continued checkpoints.

These benchmarks require the recorded original compiler at `build/cache-lowering-original/lang` for before/after reproduction. Current and original identities, measured sources, exact emitted projects and raw observations are archived. The audit replays 208 native streams and the unchanged-compiler proof extension. Full transition/representation verification, measured adaptive selection and the broader language requirements remain open.

## Database-defined reversible journals

Version-3 maintenance evidence supplies actual saved-value, forward and restore expressions, with proofs of forward equivalence and inverse identity. The same fixed compiler accepts a full-total snapshot candidate and a smaller reversible-difference candidate; neither journal algorithm is installed as a core optimisation law. The generic kernel and library checker remain unchanged. See [the design and trust boundary](docs/reversible-cache-journals.md).

The full suite passes 65 tests, including reference/native multi-table aborts, repeated writes, tentative reads, ordered events, future checkpoints and exhausted commit counters. [Wide signed-Int measurements](reports/reversible-cache-phase1/REPORT.md) record 448 samples and 4,096 independent native comparisons. The difference journal improves the small-changing-row profile by 1.31× but gives essentially no gain on the wide-changing-row profile; it still takes 2.54× handwritten Rust time overall. Separate instrumented builds confirm one fewer allocation per update for small changes beside an 8192-exponent total. [Inventory measurements](reports/reversible-inventory-phase1/REPORT.md) add 756 samples against maintained C/C++/Rust; bounded Ink still takes 1.77× Rust u128 time.

`python3 tools/audit_reversible_reports.py --execute` replays measured binaries, emitted source/plans, both database candidates, the original-kernel theorem extension and instrumented allocations. Full state refinement, adaptive selection/migration, durability and broader language coverage remain unfinished.

## Exact integer storage reuse and Hunchroom review

Native lowering now moves a cache's BigInt into its final use while preserving the selected expression tree and evaluation order. Earlier uses copy it. The database arithmetic/journal choices, exact source bridge and generic kernel are unchanged; bounded emitted inventory code is byte-identical. See [the lowering and trust boundary](docs/integer-storage-reuse.md).

The [controlled experiment](reports/storage-reuse-phase1/REPORT.md) compares the preserved previous compiler and current compiler across both checked journals: 560 samples and 5,120 independent native comparisons. The difference journal improves by 1.36× overall and 1.73× on the small-changing-row profile. Its 8192-exponent update-only small-row case improves by 2.12×, eliminates measured update allocations, and takes 1.16× handwritten Rust time. Across all cells it still takes 1.90× Rust time. [The inventory report](reports/storage-inventory-phase1/REPORT.md) adds 756 samples against C/C++/Rust; bounded Ink remains at 1.77× Rust time. All 65 tests pass; `python3 tools/audit_storage_reports.py --execute` replays 188 measured native streams, code/plans, both database candidates and 40 separate allocation cases.

The [Hunchroom review](reports/hunchroom-review-20261010/REVIEW.md) indexes all 427 public submissions and 114 modules in the captured catalog, including failed/partial attempts and reported secondary-check errors. Its strongest applicable ideas are exact runtime admission, invariant-preserving physical replacement, all-future transaction refinement, failure-preserving fusion and bounded measured selection. The review distinguishes complete corpus triage from deeper reading of selected models; it is not an independent recheck of the entire Lean corpus.

The [complete-row journal contribution](reports/hunchroom-row-journal/README.md), published as [Hunchroom module 144](https://hunchroom.com/modules/144), proves arbitrary history restoration and adjacent same-key coalescing in Lean. It preserves complete payloads, cache deltas and existing journals. This abstract model does not yet authorize native coalescing or establish a speedup.

## Keyed table transition proofs

[Version-4 evidence](docs/keyed-table-proofs.md) binds the actual cache arithmetic to a pinned keyed contribution-table model and checks universal one-step and finite write-history equalities. Generic generalised induction allows the history proof to recurse from changed rows; it introduces no optimisation law. A 63-object database package supplies reversible/snapshot candidates under one compiler. All 70 tests pass, including independent model traces, forged-but-valid alternative definitions, numeric/128-bit keys, source arithmetic binding and existing native/reference abort/event/checkpoint integration. Unsupported key domains retain scanning.

The [fresh C/C++/Rust report](reports/table-transition-inventory-phase1/REPORT.md) contains 756 samples, 12,030 native comparisons and 4,010 reference outcomes. Bounded Ink remains at 1.77× Rust time. For this application emitted runtime code is identical to the prior version-3 implementation: stronger verification adds compilation work without adding runtime work. `python3 tools/audit_table_report.py --execute` replays measured binaries, code/plans and both database candidates. Actual native map/projection correspondence and complete error/event/rollback transition proofs remain unfinished; the full objective stays open.
