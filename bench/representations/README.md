# Representation benchmark history

The old proof-aware runtime drivers have been removed with their executor.
Archived results and their exact reproduction commits remain in `reports/`.
They describe the historical harness, not ordinary compiled execution.

Use the current standalone aggregate benchmark:

```sh
cargo test --release --test point_delta benchmark_standalone_aggregate_scaling -- --ignored --nocapture
python3 bench/point-delta/run_scaling.py --binary build/standalone-aggregate-benchmark/target/release/ink-standalone-aggregate-benchmark --output /tmp/ink-standalone-scaling
python3 bench/point-delta/summarise_scaling.py /tmp/ink-standalone-scaling
```

The generated production variants have no Ink dependency or runtime checker calls.
The benchmark harness links the source baseline for comparisons and outside-loop
setup. All paths produce complete replies/events. Checkpoint comparison,
initialization and portable migration are outside steady state; dependency/build
costs are separate. Keep losing candidates and source/graph/binary provenance.

Completed measurements and validation: [ordinary compiled main](../../reports/representation-scaling/standalone-main-2026-10-11/README.md).
