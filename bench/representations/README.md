# Source-bound representation performance

Run from the assembled distribution:

```sh
CARGO_INCREMENTAL=0 cargo test --release --test representations \
  benchmark_representation_execution -- --ignored --nocapture
```

The test generates and checks two immutable database candidates for the same
source: cached `zero` with ordinary queries rebuilding the cache, and cached
`zero` with ordinary queries retaining physical state. It emits both native
implementations and builds a driver using `rustc -O` and release dependencies.
The driver compares the three-call executor with native fused execution and
checks results and exact snapshots outside timed regions.

Measurements cover complete `Session::invoke_json` calls with acknowledgement,
not just the pure database lookup. Restore, admission, compilation, durable I/O
and checkpoints are outside the timed loop; call-time snapshot validation remains
inside it. Each case has 32 warmup calls and nine samples of 128 calls. Rows are
8, 24 and 48, all with nonzero keys; cached lookup key 0 is absent. `get` reads
the last key, `put` replaces that key, and `erase` aborts after attempting deletion.
Acknowledgement clears emitted events to keep retained outbox size stable.

The native dynamic input limit currently prevents treating these small recursive
fixtures as a large-table scalability benchmark. There is no timing assertion
in the test, baseline-language speed claim or measured peak-memory claim. Raw
results are written to `build/representation-benchmark/result.json`; preserve
them with hardware/toolchain/profile provenance before reporting comparisons.

## Cache maintenance follow-up

```sh
CARGO_INCREMENTAL=0 cargo test --release --test representations \
  benchmark_cache_maintenance -- --ignored --nocapture
```

`cache-maintenance.rs.txt` compares two candidates for
`examples/representation-cache-maintenance.ink`: refresh after changes versus
`--preserve-cache`. Both use the same native backend, runtime and retained-query
candidate. `erase` aborts after staged deletion, `flag` commits a write to the
unrelated Boolean table, `put` changes the cached table, and `zero` is an unchanged
query control. The main table has 8/24/48 nonzero keys, and the Boolean table one
key. Cached key 0 is absent. Both fused and three-call executors are measured.

The timing scope matches the earlier driver. This driver uses nine samples of
512 calls and alternates candidate order in every round. Additional
correctness histories exercise cache presence/absence, unrelated writes, events,
rollback, exhausted commits, restore and migration, against the source runtime.
Generated requests, native source/executable and raw JSON are written separately
to `build/cache-maintenance-benchmark`. Archive multiple standalone runs only
after compilation and other tests finish; reports must state their limits.

`benchmark_composed_cache_maintenance` uses the same driver, source and timing
scope, but composes the preserved cache with the canonical complete-action
removal-idempotence proof. The source still removes twice; the database-selected
implementation removes once. Outputs go to
`build/composed-cache-maintenance-benchmark`. This measures the combined candidate
against the same refresh baseline; it does not attribute removal savings to cache
retention. Both manual benchmarks have no timing assertion.
