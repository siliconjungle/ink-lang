# Shared change-boundary validation

Reference and generated stateful Rust use the same fixed core primitives for
commit decisions, immediate propagation of nested-change errors and ordered
publication coordinates. Stateful Wasm embeds the same bytes. This consolidates
existing semantics and introduces no optimisation recogniser, journal shortcut
or proof rule.

The canonical knowledge store adds six entries: a decision datatype, its total
function and four theorems. `BoundChange` authenticates and checks the selected
first-order closure, matches the exact primitive definition and identifies an
actual checked source change. It is not replacement authority.

## Evidence

- The full distribution suite passes **189 tests**. The independent core passes
  **20 tests**; a fresh copy builds/tests offline without database, planner,
  runtime or lowerings. The Rust backend builds independently against the
  published core revision and then checks offline with its lock.
- The final focused transaction fixture compares **48 native outcomes and 48
  exact portable snapshots** against reference execution. Scanning and maintained
  implementations each run 24 calls after restoring ordinary, last-valid-commit
  and exhausted seeds. It checks tentative totals, interleaved event channels,
  suffix coordinates, short-circuit calls, ignored/captured nested-change errors,
  ordinary query errors, `?`, preexisting outboxes and rollback after exhaustion.
- The same fixtures compare **48 compiled Wasm outcomes and 48 exact snapshots**
  in Node/V8. This is actual compiled-module execution, not a browser observation.
- Two focused binding tests check all six canonical entries, 522 concrete
  decision evaluations, six well-typed wrong protocols and a fresh authenticated
  false theorem. Wrong protocols pass mathematical admission before failing
  definition binding. Unknown/query actions, wrong roles and incompatible schema
  or semantics fail binding.
- Six Store tests pass. Authoring reproduces byte for byte; a clean import
  reproduces the **601-entry** snapshot and the rewrite transport exactly.
  All **42 executable rewrite entries remain unchanged**. The research catalogue
  has 36 valid views.
- All **601 canonical entries** replay through the preserved `f688079` checker
  across **37 selected dependency closures**. Its copied sources were compared
  byte for byte with that Git revision. Active-context caps remain unchanged.

The full suite used the two-seed version of the newly added native test. After
it completed, the focused test was rerun with the third (last-commit) seed and
fixture export; the final native/Wasm evidence above comes from that extension.
No execution implementation changed after full-suite validation.

## Reproduction

```sh
python3 dev.py test --locked --offline --no-fail-fast
python3 dev.py test --locked --offline --manifest-path core/Cargo.toml
python3 dev.py test --locked --offline --test transaction_boundary
python3 dev.py test --locked --offline --test state_native \
  shared_boundary_preserves_nested_control_event_order_and_exhausted_rollback
node reports/change-boundary-phase1/wasm-replay.mjs
```

The archived `scan/` and `maintained/` directories contain the reference expected
results, request/restore fixtures, source program, native generated bodies and
runner, Wasm generated body, Cargo manifest/lock and compiled Wasm. To rebuild a
Wasm body, put `generated.rs` at `src/lib.rs` in a fresh project with the archived
manifest/lock and build its library offline for `wasm32-unknown-unknown` in release
mode. The adapter comes from the pinned runtime repository. Metadata records
source/evidence hashes and exact repository/toolchain identities.

## Limits

The primitive implementation and definition-correspondence checker remain
trusted. Database theorems certify the logical decision definition; they do not
verify Rust or its compiler. The binding covers neither the action body nor
physical map/cache rollback, event payloads/outbox append, codecs, host failures,
concurrency or durability. A syntactically identical AST cannot establish the
meaning of an arbitrary database interpreter. No replacement can be installed
using this witness alone. No timing, speedup or general-fastest-language claim
follows from this phase. All remaining production gates stay open.
