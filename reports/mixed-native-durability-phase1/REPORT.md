# Mixed native wgpu durable CLI

Functional distribution: `8493cc34178fd8c69930ec904d6982b56b59040e`.
Runtime: `9af59d46db1a87a8e91c6f1e7e431ab7c37959f1`.

Complete CPU and mixed native GPU runners now share the existing native CLI
protocol. The mixed runner accepts `--durable`, `--snapshot-out`, memory-only
`--restore`, stable action IDs and durable acknowledgements. Pure dispatch
checks host liveness, uses eligible GPU execution or compiled CPU fallback, and
publishes neither state nor retry receipts. Actions execute once on the durable
CPU host; no profiling/replay was introduced for transactions. Snapshot/receipt
formats and core/proof interfaces are unchanged.

Validation: an enabled 12-test pack passes durability, mixed durability,
numerical conformance and selected checkpoints. It includes C/Rust/JavaScript,
both Wasm adapters and actual wgpu calls. Numerical 101-request and selected
seven-request fixtures retain exact replies/checkpoints. The new mixed fixture
runs two actual GPU calls around a process that exits after synced publication
but before reply. Recovery deduplicates the lost reply, returns exact reference
checkpoints, retains abort behavior and the outbox, rejects changed arguments
for a reused ID, persists acknowledgements, rejects missing IDs/attempted durable
restore without changing the record, and rejects corruption. Pure GPU work leaves
the durable record byte-for-byte unchanged. The final focused rerun passes.

The standalone runtime's four execution/durability tests and all-target build
pass; final locked distribution all-target checking is warning-free. CI includes
this mixed fixture in its wgpu job and retains reproduction inputs. Source,
initial/recovery requests, expected replies and final portable snapshot are
retained here with hashes in receipt.json.

```sh
INK_TEST_WGPU=1 cargo test --test mixed_durability --offline -- --nocapture
INK_TEST_ZIG=/path/to/zig INK_TEST_WGPU=1 cargo test \
 --test durability --test mixed_durability --test numerical_state \
 --test selected_checkpoint --offline -- --nocapture
```

Toolchains/device-runtime dependencies must be installed/fetched first. The
runtime remains a single-writer complete-snapshot/file-replacement baseline.
Incremental logging, batching and performance evaluation are open. Delivery is
at least once; receivers deduplicate, and bounded retry receipts do not promise
permanent exactly-once execution. File sync, toolchains, native emission, drivers
and codecs remain trusted. Actual GPU calls are conformance evidence, not speed
measurements or native correctness proofs.
