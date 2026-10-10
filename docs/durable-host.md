# Durable compiled state

`ink-runtime` supplies durable hosts for generated native C/Rust executables,
JavaScript modules and the complete C/Rust Wasm ABI. The JavaScript host lives
in `hosts/durable-state.mjs`; the native host in `src/durable.rs`. Each host serializes calls, restores a private candidate
from the published checkpoint, executes once, and persists one record containing
the new checkpoint and retry receipt before returning the reply. Failed actions
leave the published state intact. An uncertain storage write poisons the host:
close and reopen it to recover the actual stored record before retrying.

State, commit sequence and pending outbox are already part of Ink's portable
snapshot. The host adds persistence and delivery; it does not change language
semantics, admit proofs or run the AST interpreter. Snapshots remain portable
across compatible compiled backends for the same checked program.

## Node file host

Complete C/Rust projects and mixed web bundles include `durable-state.mjs`,
`durable-file.mjs` and `state-wasm.mjs`. A JavaScript module can use these hosts
from the runtime checkout too:

```js
import {createState} from './program.mjs';
import {DurableState} from './durable-state.mjs';
import {openFileStore} from './durable-file.mjs';

const factory = {
  create: createState,
  async restore(bytes) {
    const state = createState();
    await state.restore(bytes);
    return state;
  },
};
const host = await DurableState.open({
  factory,
  store: await openFileStore('./data/inventory.inkstate'),
});
const result = await host.invoke('order-123', 'restock', [itemId, 5]);
await host.close();
```

Create the storage directory first. The file store writes an exclusive temporary
file, syncs it, atomically renames it over the previous record, and syncs the
parent directory. It requires local filesystem support for these operations and
one writer process per path; it rejects duplicate owners inside one process.
It does **not** lock across processes or claim distributed/multiwriter safety.
A crashed temporary file is ignored; old orphan temporary files can be cleaned
up when the writer is stopped. File and directory sync are OS/filesystem trust
boundaries. This Node adapter executes JavaScript or compiled Wasm. Native
executables use the Rust file adapter described below.

For Wasm, the factory is `{create: () => module.create(), restore: bytes =>
module.restore(bytes)}`, where `module` is a `StatefulModule`. A fresh state
handle is allocated for each candidate and the previous one is disposed after
publication. If the Wasm module traps, reopen with a fresh module instance.

## Native executable and embedding

Complete C/Rust projects include the same durable protocol and a native runner:

```sh
ink build examples/inventory.lang -o build/inventory
build/inventory history.json --durable data/inventory.inkstate
```

Create `data/` first. Every action/query in the JSON history needs a stable `id`:

```json
[
  {"id":"create-123", "call":"create", "args":["00000000000000000000000000000001", "bolts", 10]},
  {"id":"restock-123", "call":"restock", "args":["00000000000000000000000000000001", 5]},
  {"acknowledge":[2, 0]}
]
```

Reopening the executable loads the stored state and receipts. Retrying an ID
returns its saved reply. `--snapshot-out FILE` exports the raw portable state
checkpoint; it excludes retry receipts. `--restore` and restore steps are for
in-memory execution and cannot replace a durable history. Pure function calls
use the existing `pure` JSON field and need no ID. Host errors are explicit
`host_error` replies; a poisoned host rejects subsequent calls until reopened.

A generated Rust library also exports `DurableState` and
`durable::{CompiledState, FileStore, Host, Store}` for embedding:

```rust
let mut host = compiled_state::DurableState::open(
    compiled_state::durable::FileStore::open("data/inventory.inkstate")?, 256,
)?;
let reply = host.invoke("restock-123", "restock", &serde_json::json!([item_id, 5]))?;
host.deliver(|event, (commit, position)| receiver.apply_once(commit, position, event))?;
```

`Store` is an explicit trusted persistence adapter. Its commit operation compares
the previous token and atomically publishes the complete record; any commit
error requires recovery. The provided native file adapter has the same local
filesystem and single-writer requirements as Node, rejects a second owner in
one process, and skips orphaned temporary names left by a crashed process.
Native tests run on macOS locally and Linux in CI; other filesystem/platform
support requires the documented rename and file/directory sync operations.
The generated native wgpu mixed-bundle runner uses the same CLI protocol:
`--durable`, `--snapshot-out`, stable action IDs and durable acknowledgements.
Eligible `pure` requests can use GPU dispatch without publishing state or retry
receipts; transactions execute once on the durable CPU host. Memory execution
also supports `--restore`. A poisoned host rejects pure dispatch until reopened.

Native receipts preserve signed-zero floats and full JSON i64/u64 integers.
Native captured values are bounded to 48 levels and 100,000 cells. JavaScript
Number/BigInt capture and native JSON number capture are different host input
representations, so an identical retry ID can reject cross-host arguments;
portability of the logical checkpoint does not promise identical request
encodings. Use the same input codec for retries and preserve the complete durable
record when restoring retry history.

## Browser storage and delivery

Use `await openIndexedDBStore('my-ink-application')` as the store. IndexedDB
publishes the whole record in one transaction with requested strict durability
and compare-and-replace conflict detection. A stale writer fails rather than
overwrites a newer commit. Each host reads its own published snapshot; reopen to
refresh from another host. Browser storage remains subject to quota, eviction
and browser/device durability guarantees; the application can request persistent
storage. This is not a hosted database or a cross-device replication protocol.

`events()` lists pending events. `acknowledge(commit, position)` durably removes
events through that coordinate. `deliver(receiver)` sends in order and persists
an acknowledgement only after the receiver resolves:

```js
await host.deliver(async (event, key) => {
  await receiver.applyOnce(key, event); // receiver owns idempotent application
});
```

Delivery is **at least once**. A crash after receiver success but before the
acknowledgement can deliver the same event again. The receiver must deduplicate
`key` (`commit:position`) within an application instance; include a stable
application identifier if several instances share a receiver. Exceptions leave
unacknowledged events available after recovery. Do not perform external side
effects from the action reply's event array and then assume durable delivery.

Every `invoke` requires a request ID. Retrying a retained ID with identical
captured arguments returns its original reply without executing the action.
Reusing it with different arguments fails. The host captures arguments before
queueing and preserves Number/BigInt and signed-zero values in receipts. Receipt
retention is bounded (default 256, configurable 1..4096 on initial creation),
persisted with the record. An evicted ID is a new request: this is not permanent
exactly-once execution. Applications must bound their retry window accordingly.

Records allow at most 64 MiB of snapshot data and 4 MiB of receipt metadata,
with SHA-256 corruption detection and the underlying snapshot's schema/checksum
validation. The initial implementation copies/restores a complete snapshot and
replaces a complete file per call, including queries with new retry IDs. This is
a correctness baseline; append logs, batching, incremental checkpoints and
performance evaluation remain separate work.

## Acceptance

`node --test runtime/tests/durable-state.mjs` covers capture, concurrent call
serialization, writes failing before/after publication, stale writers, receiver
failures, duplicate delivery, bounded receipts, file recovery and corruption.
`cargo test --test durability` also exercises native failure injection and
generated C/Rust executable recovery. Both native processes exit after synced
publication but before replying, then reopen to check retries, aborts, outbox
acknowledgements, exact cross-backend snapshots and corruption rejection. It
executes generated JavaScript too. Set
`INK_TEST_ZIG=/path/to/zig` to include complete C and Rust Wasm. Each backend's
child process exits after persistence and before returning its reply; recovery
and retry apply the action once, retain the outbox and preserve rollback.

`INK_TEST_WGPU=1 cargo test --test mixed_durability -- --nocapture` also checks
actual GPU dispatch before/after a lost reply, unchanged durable bytes for pure
work, exact reference checkpoints, aborted writes, conflicting retry IDs,
acknowledgements, forbidden durable restore and corruption rejection.

After that test, copy `tests/durable-browser.html` to
`build/durable-state/index.html` and serve `build/` on localhost. The fixture
reloads the page, restores IndexedDB state, continues through JavaScript and both
Wasm paths, rejects stale writers and checks durable acknowledgements.
Differential/crash tests are evidence, not formal storage or machine-code proofs.
