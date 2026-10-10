# Native compiled durability

Generated complete C/Rust projects now embed the generic Rust durable host and
synced-file adapter from ink-runtime. Native executables accept
`SCRIPT.json --durable FILE`; library embeddings use `Host<CompiledState,Store>`
and a provided `FileStore`. This adds orchestration, not language types,
source/proof admission or an AST interpreter. Runtime publication is `a4e14c001571e4751e0f1f65b7441cd4a28ead9a`. The upstream core/knowledge
integration is 8b7f131 with knowledge 27f29df; historical receipts remain unchanged.

## Evidence

`cargo test --test durability` passes five tests: three generic host tests,
generated JavaScript/Wasm recovery, and generated native C/Rust recovery.
With INK_TEST_ZIG enabled, all three JavaScript/Wasm paths run. Native generated
processes exit with code 73 immediately after the complete durable file has been
published and synced, before the reply is returned. Reopening and retrying applies
the action once. Events survive, acknowledgement survives reopen, failed changes
preserve state/version, the Rust host reopens the C durable record with its original receipts, and
C/Rust final portable checkpoints are identical.
Corrupt records fail checksum validation. This tests process death, not an actual
machine power cut or filesystem controller behavior.

Generic tests independently inject failed writes before and after publication;
the host refuses further access until reopened. They exercise stale writers,
mutating action failure rollback, bounded receipt eviction/retention across reopen,
receiver failure, duplicate delivery after failed acknowledgement, exact signed
zero and i64/u64 receipts, and rejection of overly nested captured inputs.
Standalone runtime tests use its own pinned core; integrated tests use the current
root core. The twelve Node durability/policy tests continue to pass.

The fixed/generated/module conformance suite continues to exercise all five CPU
paths, exact portable snapshots and eligible actual wgpu dispatch. Raw acceptance
logs are adjacent to this report. The GitHub conformance workflow includes the
native recovery tests through its existing durability target.

## Contract and open work

The complete record uses the same INKD envelope as JavaScript, with a snapshot,
bounded retry receipts and SHA-256 checksum. Captured native JSON integers and
JavaScript Number/BigInt values can have different request encodings; cross-host
checkpoint portability is not a promise of identical retry encodings. Native
receipt structure is bounded to 48 levels and 100,000 cells.

Local files require one writer process per path and atomic rename plus file and
directory sync. Duplicate in-process owners are rejected; interprocess locking
is not provided. A store commit error is ambiguous and poisons the host. Delivery
is at least once; external receivers deduplicate application/commit/position.
Receipts expire under a stored retention bound. The complete snapshot is copied,
restored and replaced per action/query. Incremental logs, batching, recovery I/O
benchmarks and native mixed-wgpu runner integration remain open. No stateful
replacement proof, machine-code proof or new speed claim is made.
