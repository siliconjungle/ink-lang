# Complete C scalar value runtime comparison

This harness compares the same literal C program and JSON driver with the old
arena runtime (`ink-runtime` 56ea95b) and the current runtime. It is a before/after
measurement of fixed primitive representation and scratch allocation, not a
comparison with handwritten C/C++/Rust or evidence for a database transformation.

```sh
cargo build --bin ink
python3 bench/complete-values/run.py --repeats 7 --calls 10
```

`--cargo` and `--rustc` select explicit tools. Generated projects and binaries
stay under `build/complete-values`. Each call validates its result. The harness
uses two warmup rounds, seeded shuffled paired timing rounds, medians and paired
95% bootstrap intervals. `execution` reuses the state; `lifecycle` constructs,
invokes and destroys one instance per call. The fixed 100/10,000/60,000 iteration
loops remain literal and cannot be skipped: input and returned JSON values cross
opaque host/C calls with black-box inputs.

Separate instrumented builds count allocations/reallocations, requested bytes,
peak requested live bytes and retained live bytes. These are Rust allocator
requests, not allocator metadata, RSS or host-process overhead. Instrumentation
is excluded from timing. Input JSON and one warm state are prepared before the
measurement; the reported retained memory includes that warm state's arena.
The C emission bytes must be identical across variants. Reports record source,
driver, C/runtime hashes, commits, toolchains and dirty-state warnings. Shared
machine results are scoped measurements; they are not broad performance claims.
