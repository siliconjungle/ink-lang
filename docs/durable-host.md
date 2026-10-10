# Durable compiled state

`ink-runtime/hosts/durable-state.mjs` wraps a compiled JavaScript state instance
or the complete C/Rust Wasm ABI. It serializes calls, restores a private candidate
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
boundaries. Native executable embedding of this durable protocol is a separate
integration; this Node adapter executes JavaScript or compiled Wasm.

For Wasm, the factory is `{create: () => module.create(), restore: bytes =>
module.restore(bytes)}`, where `module` is a `StatefulModule`. A fresh state
handle is allocated for each candidate and the previous one is disposed after
publication. If the Wasm module traps, reopen with a fresh module instance.

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
`cargo test --test durability` executes generated JavaScript. Set
`INK_TEST_ZIG=/path/to/zig` to include complete C and Rust Wasm. Each backend's
child process exits after persistence and before returning its reply; recovery
and retry apply the action once, retain the outbox and preserve rollback.

After that test, copy `tests/durable-browser.html` to
`build/durable-state/index.html` and serve `build/` on localhost. The fixture
reloads the page, restores IndexedDB state, continues through JavaScript and both
Wasm paths, rejects stale writers and checks durable acknowledgements.
Differential/crash tests are evidence, not formal storage or machine-code proofs.
