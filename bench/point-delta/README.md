# Physical point-query lifecycle benchmark

From the recursive Ink distribution checkout:

```sh
CARGO_PROFILE_RELEASE_DEBUG=0 CARGO_INCREMENTAL=0 cargo test --release --locked \
  --test point_delta benchmark_point_delta_lifecycle -- --ignored --nocapture
# Repeat the generated executable in independent processes:
build/point-delta-benchmark/native > build/trial-2.json
build/point-delta-benchmark/native > build/trial-3.json
python3 bench/point-delta/compile.py --compiler target/debug/ink --output build/compile.json
```

`compile.py` measures
one complete candidate build, including checking/emission and rustc, using
prebuilt release dependencies. Each resulting executable is run outside timing.
Compiler peak memory is unmeasured. Runtime phases measure a complete operation;
restore is outside action regions, but separately measured as initialise. Check
includes reading/admitting the exact request. Migration uses the exact checked
forward/reverse bridge, including logical validation. Teardown drops a session.
The sample sizes are 0/24/48 rows because native dispatch retains its depth-64
value limit; no transport bound is raised for this experiment.

The allocator counts maximum live requested Rust heap bytes, including resident
module, proofs and all candidates. It excludes stack, allocator headers and RSS
and adds measurement overhead. Timings are instrumented and process-local.
Tests exercise native/reference parity, rollback, events, snapshots, restore,
migration and exhaustion before timing. Reports preserve raw samples and
provenance. Run on an otherwise idle machine for stronger cost estimates.
