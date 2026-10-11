# Checked collection edits and cheaper compiler traversal

Ink can eliminate redundant private buffer edits using its existing functions
and element types. These are knowledge entries and general proof machinery;
there is no OT/CRDT protocol, operation format or operation-aware host layer.

```ink
// Discard a private write whose value is overwritten before observation.
buffer(xs).set(i, a).set(i, b).freeze()
// becomes
buffer(xs).set(i, b).freeze()

// Avoid creating and copying an owner to write back the value already present.
buffer(xs).set(i, xs.at_or(i, fallback)).freeze()
// becomes
xs

buffer(xs).truncate(n).truncate(n).freeze()
// becomes
buffer(xs).truncate(n).freeze()
```

Each identity covers every u32 index, including zero, out-of-range indices and
u32::MAX. Float transport values retain their exact bit patterns: unchanged
NaNs and negative zero are not interpreted as numeric equalities.

The first rule also eliminates the computation of `a` when it is a pure total
Ink expression. `examples/collection-edits.ink` demonstrates removing an entire
fold whose result would immediately be overwritten. A transaction can call the
optimized function; committed events, versions, errors and rollback still occur
as before. The rules do not combine separate actions or discard observations.
As elsewhere in executable equality admission, allocation identity/failure and
fuel consumption are outside the total-value equality domain.

## General compiler machinery

`semantic::try_map_children` reconstructs a node once, processing its children
in their original order. Substitution, beta reduction, hole extraction, scope
opening/closing and semantic normalization use it. Previously each child
replacement cloned the whole parent and all its siblings again. Binder rules,
work accounting and existing resource limits are preserved. The planner uses
the same traversal strategy in its untrusted shift and substitution machinery.

The semantic proof checker now supports quantified structural induction:

- `GeneralizedInduction` names a natural/list induction variable and other
  parameters to quantify in its induction hypothesis.
- `GeneralizedHypothesis` instantiates exactly those parameters with terms of
  the declared sorts. Its recursive argument stays the immediate predecessor
  or tail; the certificate cannot choose another recursive argument.
- The hypothesis exists only in the step branch. Fixed conditions and inherited
  schemas cannot depend freely on the newly quantified variables. Existing
  schema-bound variables are distinguished from their free variables.
- Duplicate, unknown and recursive parameters, stale schema indices, missing or
  extra arguments and mismatched endpoint terms are rejected. Quantified
  parameter count is capped at 64 and combined hypothesis/schema count at 128.

This is the semantic counterpart of the existing first-order generalized
induction rule, not a collection-edit recognizer in the compiler. It enables
proofs whose index or accumulator changes during traversal. `at_or` on a list
constructor unfolds its existing fixed meaning with a lazy zero-index test,
including when the index is symbolic.

These rules are part of the trusted Rust checker implementation. They do not
constitute a mechanized proof of that checker or of the lowerings.

## Knowledge publication and selection

`knowledge/producers/collection_edit_laws.py` produces 24 checked portable
entries: three identities for each of U32, U64, I32, F32, Bool, String, Int and
Unit. The installed producer supplies the same proof for structural and nominal
carriers found in a program. Nominal declarations use the existing exact
portable definition context. Discovery labels and content hashes confer no
mathematical authority; the compiler rechecks the actual certificates.

The canonical snapshot grows from 3,460 to 3,484 entries. Publication preserves
all earlier entries, names and the previous immutable snapshot. Bounded planner
search proposes applications through existing pattern matching, cost estimation
and checked selection. No emitter contains an edit-law matcher. Profile data
can guide profitability but cannot establish a proof premise.

This applies the general lessons of reducing allocation and coalescing private
work from [Seph Gentle's optimization account](https://josephg.com/blog/crdts-go-brrr/)
and buffered edits in Jumprope. It does not import distributed causality or merge
semantics from [Eg-walker](https://arxiv.org/html/2409.14252v1).

## Evidence and reproduction

`reports/collection-edits` contains raw measurements and publication receipts.
The traversal comparisons reproduce the previous algorithm inside the same
process; they are not a comparison against a different compiler build.

| Measurement | Previous traversal | Single reconstruction |
| --- | ---: | ---: |
| Rust substitution, width 128 / branch depth 16 | 23.16 ms; 635,139 allocations | 0.161 ms; 4,103 allocations |
| Python planner shift, width 64 / branch depth 8 | 154.50 ms | 2.58 ms |

Both Rust traversals consume the same 4,225 proof-work steps and return exactly
identical terms. Measurements use nine samples, reporting medians. These
synthetic traversal gains are not whole-compilation speed claims. Checking all
24 new entries, including process startup, typing and their proofs, measured
about 105 ms in a debug compiler on this host. Search and target compilation are
separate costs.

The generated JavaScript benchmark uses the public trusted-values call ABI,
without JSON conversion. At 100,000 elements, an unchanged write measured about
1.824 ms before selection versus 0.119 microseconds after selection: returning
`xs` avoids a buffer copy entirely. This intentionally measures that identity
case, not general database throughput. Removing the overwritten fold measured
about 1.933 ms versus 1.848 ms; the remaining buffer copy dominates. Small cases
show no consistent gain for that rule. Raw results must not be interpreted as a
uniform speedup for every edit or backend.

```sh
cargo test --manifest-path core/Cargo.toml
PYTHONPATH=planner:knowledge python3 -m unittest discover -s planner/tests
INK_COMPILER="$PWD/target/debug/ink" PYTHONPATH=knowledge:planner \
  python3 -m unittest discover -s knowledge/tests -p test_collection_edit_laws.py
INK_PARITY_REQUIRE_ALL=1 INK_TEST_WGPU=1 INK_TEST_ZIG=/path/to/zig \
  cargo test --test collection_edit_optimisation -- --nocapture
cargo test --test owned_optimisation --test local_collection_optimisation \
  --test action_optimisation
cargo run --manifest-path core/Cargo.toml --release --example semantic_rebuild_bench
python3 tools/bench_collection_edit_planner.py
ink build examples/collection-edits.ink --target javascript -o baseline.mjs
node tools/bench_collection_edits.mjs baseline.mjs \
  build/collection-edit-selection/program.mjs
```

Validation: 81 standalone core tests, all 55 planner tests, the new knowledge
admission/nominal/forgery test, existing owned-transform/fold-until/producer/store
checks, and nine existing action/local-collection/owned-selection integration
tests passed. Conformance checks 18 values/outcomes and exact portable snapshots
across reference, native C/Rust, JS, C Wasm, Rust Wasm and the wgpu host, including
three actual GPU calls. Bit-sensitive float fixtures explicitly use the CPU lane.

An exploratory run of all 258 historical knowledge research tests had 65 errors
and 115 skips because it requires archived report inputs and research compiler
paths absent from a fresh checkout. This is not reported as a passing full
knowledge suite. The relevant tests above use the current compiled compiler.
