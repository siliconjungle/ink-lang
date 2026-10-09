# Ink

Ink is a language for data, computation and explicit state changes, with implementation choices justified by locally checked proofs. This repository implements [the design draft](docs/language-specification-draft.md), incrementally. The full implementation is **in progress**. [STATUS.md](STATUS.md) describes the current executable subset; [PLAN.md](PLAN.md) preserves the full acceptance criteria.

The implementation includes a Rust frontend and reference evaluator, pure native compilation through C and Clang/LLVM, stateful compilation through generated Rust, and local databases of checked proofs and implementations. Both compilation paths also target WebAssembly. The current pure baseline materialises collection stages; an explicit checked database proposal can select a single-fold implementation. It does not recognise benchmark names or substitute handwritten benchmark kernels.

```text
module demo;

pub fn total(xs: List<u64>, scale: u64) -> u64 {
    return sum(xs.map(fn(x) => x * scale).filter(fn(y) => y < 1000));
}
```

## Build and run

Requirements: a Rust toolchain, Clang, Python 3, and a C++ compiler for comparison. The current benchmark harness targets macOS; the compiler's C backend can be adapted to other hosts.

```sh
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

## Meaning of verified in this milestone

The legacy arithmetic path normalises polynomials over the ring of integers modulo 2^64. A newer database path reconstructs fixed Boolean/u64 circuits and checks external hinted RUP refutations; it has no solver or arithmetic-law catalogue in the compiler. Both Rust checkers remain trusted implementations and have not themselves been mechanically proved correct. The legacy path is still available and needs migration before the full small-core architecture can be claimed.

Collection lowering, emitted C and Clang/LLVM are currently trusted. Native behaviour is checked against an independently implemented mathematical reference and the interpreter; those tests are not an end-to-end formal proof. General equality and induction checking now exist for restricted fragments; richer contracts and general state-transition refinement remain work to do.

## Benchmarks

`bench/run.py` builds six variants: language without imported knowledge, language with imported knowledge, C loops, C++ standard algorithms, Rust iterators and Rust loops. They use identical modular-u64 semantics and the same separately compiled C timing driver. The current language baseline materialises collection stages, while these older handwritten baselines combine passes; use `bench/collection-proof.py` below to compare both staged and combined algorithms in every language. The archived phase-one report measured the earlier fused backend. Every result is consumed, and interprocedural optimisation is disabled across the driver/kernel boundary.

The benchmark validates outputs before measuring, randomises variant order, calibrates batch duration and records all samples and commands. Full mode covers seven workloads, four input sizes and two data distributions. `--quick` reduces input coverage for development.

Results are under `bench/results`. They are an evaluation of a small pure-kernel milestone, not proof that the full proposed language exists or that it is universally faster than other languages.

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

The package's three exact-integer update functions are validated against a fixed finite-map induction schema. Eligible sum/count queries can then use maintained totals. The runtime preserves transaction failure, nested aborts, events and tentative reads. Portable reference snapshots omit physical caches and restore logical state independently of the selected implementation.

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
python3 tools/boolean_proofs.py knowledge/boolean-rules.json knowledge/boolean
python3 dev.py build
target/debug/ink verify-database knowledge/boolean/lock.json
target/debug/ink build examples/boolean.lang --database knowledge/boolean/lock.json -o build/boolean.o
python3 tools/check_database.py
```

The last command checks unchanged-compiler extension, generated-code differences and native results with zero, one and two database rules. It is not a speed benchmark. This first proof calculus covers total scalar expressions, Boolean cases, acyclic definitions, reusable theorems and conditional equality proofs. It cannot yet replace the legacy polynomial/aggregate checkers. `python3 tools/composed_proofs.py knowledge/composed` produces a seven-object library with one selected rewrite; `python3 tools/check_composition.py` validates its native output and dependency closure. `python3 tools/conditional_proofs.py knowledge/conditional` produces laws with explicit premises; `python3 tools/check_conditional.py` checks their scoped use and native results. See [architecture and limits](docs/small-core-and-knowledge.md).


The first-order inductive proof library adds database-defined constructors, recursive computations and induction:

```sh
python3 tools/inductive_proofs.py knowledge/inductive
target/debug/ink verify-library knowledge/inductive/lock.json
python3 tools/check_induction.py
```

Its twelve objects prove list-traversal composition and tree-copy identity, with reused theorem instances. This is a checked mathematical foundation; connecting those definitions to source collection rewrites and replacing the remaining built-in optimisation authority is still in progress. [Scope and rules](docs/small-core-and-knowledge.md), [extension and rejection evidence](reports/database-induction/result.json).

## Checked collection implementations

An untrusted external producer now proposes complete collection-function replacements. The compiler checks exact correspondence between source operations and database-defined recursive models, then checks an unconditional induction theorem before installing each candidate. The baseline no longer automatically fuses collections.

```sh
python3 tools/collection_proofs.py knowledge/collections
python3 dev.py build --bin lang
target/debug/ink build knowledge/collections/kernels.lang --implementation knowledge/collections/proposal.json -o build/checked-collections.o
python3 bench/collection-proof.py
python3 bench/collection-wasm.py
```

The [collection benchmark](reports/collection-proof-phase1/REPORT.md) contains 1,344 samples across 24 cells, with 8,320 native oracle comparisons. Checked replacements run 6.17× faster than the staged baseline by geometric mean and take essentially the same time as combined C/C++/Rust loops. This measures selection of a better algorithm, not a universal performance advantage or a new optimisation unavailable to C. The same compiler binary accepts five independently selected database revisions. Import-free Wasm passes 4,416 value/ownership checks, including memory growth and nested calls.

## Filtered pipelines and pure calls

`choose(condition, when_true, when_false)` evaluates one scalar branch. The general proof kernel supports conditional terms, case analysis over an arbitrary Boolean expression and substitution of a proved equality into a typed context. These rules also let database proofs justify filtered pipelines without a built-in fusion rule. The correspondence bridge now checks acyclic source calls and exact callee bodies, including calls within collection lambdas. Changing a callee invalidates a stale proposal even when the caller's source text is unchanged.

```sh
python3 tools/filter_proofs.py knowledge/filtered
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
