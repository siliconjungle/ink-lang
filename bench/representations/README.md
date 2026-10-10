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
