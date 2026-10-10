# Runtime, modules and complete-code integration

Parallel main 5a43118 and runtime a7ee91b were reviewed and merged after the
code-data/view-proof milestone. The concise production gates and complete
historical plan are preserved. The only incoming core change is the bounded
constructor-name parsing hook; linked programs still pass normal type/effect
admission. Proof kernel, library, registry and bit-checker code remain unchanged.

The source binding now passes through the ordinary module frontend. A new test
binds the imported stock example and embedded standard helpers, then changes an
imported pure helper body; the old proof-data view is rejected. Imported code is
part of the checked program, not an unbound external dependency.

Final validation on the integrated implementation:

- 216 broad distribution tests pass, including source/effect/proof admission,
  negative controls, native actions, snapshots and view proof/fallback. Shared
  conformance fixtures and the expensive unchanged migration case are excluded
  from this repeated run. That migration case passed in the preceding 218-test
  broad run. Initial broad invocations with incorrect skip names were cancelled
  before the authoritative run to avoid concurrent fixture writes.
- Eight explicitly enabled integration tests pass: fixed parity, generated
  parity, modules and generated durable recovery. They compare 516 requests and
  exact snapshots across native C/Rust, JavaScript, C-Wasm and Rust-Wasm. Native
  wgpu executes 102 GPU calls, with resident empty/shrinking feedback covered
  separately. Four deterministic generated seeds supply 432 of these requests.
- All three complete-code binding tests pass after the imported-helper addition.
- A byte-identical isolated core passes 28 tests offline without any database,
  planner, backend or runtime checkout. Twelve independent Node runtime tests
  pass for durability/storage and backend selection.

These counts overlap. Logs and hashes are in `integrated-metadata.json`; its
implementation commit pins the exact source including the imported-helper test.
The metadata from the earlier milestone retains its earlier commit and scope.
No fresh browser or speed measurement was made here. The reviewed parallel report
contains its separately scoped IndexedDB fixture and matched scalar-runtime
measurements; those do not imply Ink beats handwritten Rust or C generally.

The merged durable host publishes complete state/outbox/retry receipts before
replying, rejects uncertain-write continuation until reopening, and persists
acknowledgements. Delivery is at least once, retry history is bounded, and the
file store is single-writer. Native executable embedding and incremental logging
remain separate work. Modules, embedded word/list helpers and source diagnostics
are implemented; broader library and debugging coverage remain production gates.

Complete code-data authentication and checked view decomposition do not prove
whole-action execution or physical candidate refinement. Keep generic stateful
admission, specialised-authority migration, fair broad benchmarks and the full
production acceptance scope active. Editor support and schema evolution remain
excluded.
