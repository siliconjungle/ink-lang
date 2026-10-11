# Durable operations and retained transaction boundaries

The host records one compiled deterministic operation and its retry receipt in a
checksummed append frame. State changes, reply receipts and emitted events become
recoverable together. An acknowledgement is its own operation. Queries and
unsuccessful domain actions retain their state version and append only a receipt.
They are not re-executed during recovery.

A complete checkpoint is published every 32 operations by default; the caller can
choose an interval from 1 to 4096. Compaction still exports the logical portable
checkpoint, including outstanding events and retained receipts. Legacy INKD files
remain readable and are upgraded on the next checkpoint. INKL wraps an INKD base
plus length-delimited frames whose SHA-256 includes the preceding publication
token. Recovery drops a truncated final frame, rejects complete corrupt frames,
and verifies replayed replies and versions. Numeric comparisons preserve exact
integer values and signed zero across the backends' Number/BigInt conventions.
Stored receipt values retain their original transport representation.

Native FileStore and Node FileStore append and sync an operation without reading
or replacing the entire file. IndexedDB writes the frame and its publication token
in one strict readwrite transaction, separate from the base checkpoint. Storage
failures remain ambiguous: the in-memory candidate is rolled back and the host
requires reopening before another call. FileStore retains its documented
single-writer-process contract; this change adds no interprocess locking.

Generated Rust and C states retain their existing table undo journal until durable
publication completes. JavaScript uses per-write undo entries and retains a version
and outbox boundary. Acknowledged events are retained until durable publication;
rollback restores them. Compiled representations retain an immutable physical
root, and the optional ABI-v1 Wasm transaction exports expose the same boundary. This host boundary contains one invocation or one
acknowledgement. Compatibility CompiledState adapters without a retained boundary
continue using checkpoint/restore; stores without append continue publishing full
records. No proof checker, AST interpreter or runtime candidate selector is emitted.

Validation: runtime failure injection, exact receipts, receipt eviction, concurrent
JavaScript calls, torn final tails, complete corruption, periodic compaction, real
native/JavaScript process death before reply, and state/event/retry recovery. CPU
compiled checks cover native Rust/C, JavaScript, and Rust/C Wasm. The browser
acceptance page passed IndexedDB reload, JavaScript ↔ C/Rust Wasm continuation,
stale-writer rejection and durable outbox acknowledgements.

The isolated host benchmark uses the same generated 4,000-row JavaScript state for
both hosts, actual file sync, 96 calls, and five alternating rounds. Queries changed
from 2199.99 ms to 320.04 ms median; writes from 2228.14 ms to 341.01 ms. Checkpoint
exports fell from 192 to 3 and restore calls from 96 to 0 during the timed interval.
Exact final snapshots and reopened recovery were asserted. See the raw samples,
summary, frozen generated sources and provenance alongside this document. These
figures do not establish native or browser timing or peak-memory use.
