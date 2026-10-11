# Composable state optimisation

Ink now has checked storage/repair alternatives, source-bound field skipping,
compositional proof machinery and bounded search that retains different cost
profiles. These are candidates; correctness alone does not select a faster plan.

## Implemented

- Stable partition indexes prove lookup, remove, replace, enumeration and
  encode/decode on **arbitrary** logical table lists, including unsorted keys and
  duplicates. Queries select an even/odd bucket. Remove/replace repair buckets;
  insertion refreshes. The ordinary typed source baseline still uses ordered
  native maps. This candidate does not claim logarithmic lookup or unique keys.
- Product representations retain every component relation and source obligation.
  Query providers execute the chosen component and prove the others unchanged.
  An index composes with a point cache or two filtered aggregate caches. Writes
  execute component repairs independently and publish one source observation.
  Their extra work is visible in lifecycle costs.
- Point repair covers parameter keys and pure projections of fixed point queries.
  Exact guard/key laws prove other-key reuse. Source-bound row-constructor proofs
  preserve cached fields when other fields change. Unsupported shapes refresh.
  The field example carries its value through `active` without recomputing it.
- Repair composition, consecutive repairs, downstream projections, shared ordered
  folds, filtered projections and parameterised group deltas have canonical laws.
  Group sums count every duplicate and use closed, checked word arithmetic.
  `source_grouped_laws.py` additionally binds a parameterised source filter/sum to
  the exact grouped fold and removal/replacement deltas.
- Stable indexed joins require an exact **ordered bucket** obligation. Their law
  preserves full Cartesian multiplicity and left-major/right-major order. Top-k
  laws prove bounded insertion's exact prefix; converting an arbitrary source
  sort still requires its own ordering/source correspondence proof.
- Whole-action replacement composes unobserved repeated replacements/removals.
  Complete replies, errors, versions, events and rollback remain checked.
  Writes that an intervening reply/event observes cannot be erased.
- Typed Rust, dynamic native and JavaScript transaction journals retain one first
  before-image per cell, including remove/reinsert histories. Commit and rollback
  clear that tracking. The reference evaluator remains independent.
- Record facts retain selected fields, lexical aliases, captures and lengths.
  Pure helper summaries are context-sensitive and bounded. Rust borrows lexical
  record paths and clones observed values without copying unrelated record data.
- Planner beams retain scalar-cheap plans and distinct allocation/traversal/copy
  alternatives. Scores are estimates, not byte counts or proof premises. Source
  sharing is priced only where actual bindings establish it.
- Knowledge libraries provide stable indexed joins, shared left-to-right folds,
  grouped shared folds and stable bounded top-k. They are ordinary source code.

## General checking and limits

`Proof::Cases` covers every datatype constructor and substitutes existing premises.
It introduces no induction hypotheses, including for recursive fields. This lets
stored component proofs compose under exact state relations. The checker also
shares successful definitional reductions within one check, keyed by exact term
and expansion depth. Its cache has at most 128 calls and 16,384 retained syntax
nodes; errors and proof acceptance are never cached. Existing work/depth limits
remain. Branch proofs are factored into separately checked bounded lemmas.

Pure helper/action projection now handles the existing Option/Result fold and lazy
choose semantics. No algorithm names or producer classifications grant authority.
Source images, complete observations, universal relations and canonical proof bytes
still determine admission. Abstract assumptions require concrete discharge.

SQLite remains a disposable index. If it indexes another snapshot, reads authenticate
the requested immutable canonical tree instead. Forged witnesses or object bytes
still fail. Old snapshots and evidence are preserved. Current keep fixtures live
under `knowledge/research/composable-state`: keep, point, filtered aggregate,
retained and compact query variants. `bench/composable-state/prepare-fixtures.py`
re-authors and checks their requests and migrations. The numerical action fixture
also has a current control-flow version and rejects stale bytes. Historical fixtures retain
their original source pin rather than being silently rebound.

## Evidence and reproduction

`tests/composable_state.rs` exercises concrete interpretations, conditional
constructor cases, missing assumptions, false mappings and source group deltas.
`tests/journal_compaction.rs` measures retained before-images in generated support.
`representation_parity`, `action_transitions` and `generic_libraries` compare full
observations, portable bytes, restore/migration and aborts with the reference across
C, Rust, JavaScript and both Wasm paths. The contract runner also requires actual
eligible GPU dispatch and browser GPU execution. Tests do not prove backend code.

Run the complete contract gate with `INK_TEST_ZIG`, `INK_TEST_CHROME` and `INK_TEST_LEAN` configured:

```
python3 tools/check_feature_parity.py --scope contract --run --receipt build/composable-conformance.json
cargo test --test composable_state --test journal_compaction
cargo test --manifest-path core/Cargo.toml --lib
PYTHONPATH=planner:knowledge python3 -m unittest discover -s planner/tests -p test_semantic_search.py
PYTHONPATH=knowledge python3 -m unittest discover -s knowledge/tests -p test_store.py
PYTHONPATH=knowledge python3 -m unittest discover -s knowledge/tests -p test_state_calculus.py
PYTHONPATH=knowledge python3 -m unittest discover -s knowledge/tests -p test_admit_publication.py
```

`knowledge/research/composable-state` contains mathematical and source admission
receipts, portable frozen keep requests and immutable offline observations.
Independent Rust lowering and runtime package tests also build using the published
Git revisions, without the distribution path overrides. Broad archived Python test
discovery additionally needs historical `research/toolchain` executables and report
fixtures which are absent from this checkout; those unavailable checks are recorded
in the validation receipt, separately from the required contract gate.

`state_calculus.py --publish` and `admit_representations.py` stage and check exact
bytes before publishing; the old immutable pins remain available.
`bench/composable-state/replay-admissions.py` rechecks the same canonical objects
and source pins with a rebuilt compiler, retaining earlier artifact receipts.

The local contract receipt aggregates 23 required suites across resumed runs,
including corrected fixture and timeout checks. Package updates after the main run
contain fixture annotations and dependency pins; their implementation source trees
are byte-identical. The packed C oracle explicitly types its unused count as `u64`,
keeping arbitrary-size `Int` outside that ABI. See
[`validation.json`](evidence/composable-state/validation.json) for compiler hashes,
package revisions, commands and retained original logs.

`bench/composable-state/libraries.mjs` compares construction-inclusive join costs,
shared folds and top-k. `state.mjs` separately records portable restore and complete
query-heavy/write-heavy invocation traces, checking replies and snapshot bytes.
Checking and compilation are outside steady-state timings. Artifact/compiler/runner
hashes and workload shapes accompany observations. Allocation bytes are not measured.

On this Apple M2/Node run under concurrent workspace activity, the 512-row
cached aggregate trace (100 queries, one write, one aborted write) had a median
of 1.23 ms versus 24.57 ms for ordinary source JavaScript.
The write-heavy trace had medians of 46.83 ms versus 0.48 ms. These are
noisy local observations; the raw alternating samples are retained. Indexed join
construction and shared folds also have workload-dependent costs. The observations
support workload-sensitive choice, not unconditional substitutions. They do not
install runtime probes or bypass existing eligibility/comparable-evidence gates.
