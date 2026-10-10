# Direct typed action execution and backend integration

Reference actions and keeps execute the sealed, source-bound ordered `Body`
trees directly. Resolved node/slot/module indices replace source reconstruction
and transient AST-address lookup during reference execution. Numeric types come
from checked nodes. A slot frame retains captures and restores callback bindings
on all exits. General arithmetic, constructor, table, journal, commit and snapshot
primitives remain shared with the transitional aggregate projection path.

The public checked source adapter remains available to independently versioned
lowerers. Supported source/action/snapshot identities, primitive semantics and proof-kernel
acceptance rules are unchanged. No optimisation law or representation recogniser
was added. Legacy specialised aggregate, bounded-cache and layout authority is
still migration debt.

## Admission defect found

A query could pass source checking while returning a table root, then fail at
execution because table handles were never implemented as values. The checker
now admits `Table` only as the outer type of a declared state root; root receivers
are resolved and capability-checked separately. Ordinary parameters, returns,
record/event/keep payloads, local aliases and nested table values reject. Nine
negative source forms and a legal callback-local root-name shadow are covered.
Literal root operations retain their exact typed artifact and source identities.
This strengthens source admission; mathematical proof acceptance is unchanged.

## Validation

- The pre-integration distribution suite passed all 207 tests, including the
  expensive native row/column continued-history migration case. Final core tests and a
  fresh byte-identical isolated core copy passed 25 tests offline without the
  knowledge, planner, runtime or lowerings. The new isolated test checks captures,
  callback shadowing, branch-local scopes, wrapping u32 and unchanged snapshots.
- Three focused direct-execution tests check table-resource admission, nested captures and callbacks,
  query-local errors, abort after mutation/events, restoration and every archived
  action-control/query-error result and exact snapshot. All 42 old observations
  and snapshots remain byte-identical. Untrusted action artifacts are still
  re-elaborated and checked; existing negative cases continue to pass.
- A new native frame fixture compares 11 outcomes with an exact portable
  snapshot after each call. The frame program includes empty collections,
  branch scopes, nested lists, captured query errors, ordered events and rollback.
- Four compiled Wasm modules compare 53 outcomes/exact snapshots in Node/V8.
  Three prior modules are reused unchanged; the 11-call frame module was newly
  compiled using the pre-integration Rust lowerer 23edd15. This is not timing or
  browser evidence.
- Reviewed parallel main af3c6c4 was merged, preserving all six published backend/
  runtime pins. Against the new direct reference, 68 mixed-module requests and
  10 query/keep requests match native C, native Rust, JavaScript, C/Wasm and
  Rust/Wasm, including exact snapshots. Native wgpu matches all 68 mixed-module
  results and executes 21 GPU calls. Resident filter/scan/sort feedback checks
  ordinary, shrinking and empty arrays. Five runtime selection Node tests pass.

The combined pre-resource-fix broad suite passed all 207 tests. Final-tree
validation passes 207 broad tests and three separately enabled conformance tests
(210 passes). The unchanged migration case passed earlier; 211 distinct
integration tests are covered across these runs. After the
resource admission fix, a final broad run and conformance replay are recorded
separately in metadata and their logs. The unchanged expensive row/column
continued-history migration case was already passed in both prior broad runs
and is excluded from the final repeated run. The three parity tests run with actual Zig/Wasm and wgpu enabled
in `backend-conformance.log`; the broad run skips those same tests to avoid
concurrent writes to their shared generated fixtures.

## Reproduction

```sh
python3 dev.py test --locked --offline --manifest-path core/Cargo.toml
python3 dev.py test --locked --offline --test typed_execution
INK_TEST_WGPU=1 INK_TEST_ZIG=/path/to/zig \
  python3 dev.py test --locked --offline --test lowering_parity -- --nocapture
python3 dev.py test --locked --offline --no-fail-fast -- \
  --skip all_cpu_lowerings_preserve_values_transactions_and_portable_snapshots \
  --skip query_and_result_keep_boundaries_agree_across_lowerings \
  --skip resident_collection_lengths_survive_feedback \
  --skip emitted_row_column_operations_preserve_native_continued_histories_and_migration
node --test runtime/tests/backend-selection.mjs
node reports/typed-execution-phase1/wasm-replay.mjs
```

## Trust and remaining work

The elaborator, direct interpreter, pure-function evaluator, legacy contribution
interpreter, table/journal/storage primitives, codecs, source adapters, lowerers,
LLVM, native toolchains and GPU drivers remain trusted. Differential checks do
not prove universal native or physical-state refinement. Actual ordered actions
still need a logical interpreter and primitive correspondence before generic
machine proofs can authorise an application replacement. Physical rollback,
all-future representation safety and profitability are separate obligations.

No full stateful replacement, kernel soundness, fastest-language, runtime
speedup, browser revalidation, durability or concurrent-execution claim follows.
Editor support and schema evolution are explicitly excluded from production scope.
