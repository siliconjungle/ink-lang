# Proved collection-law benchmark

Run `python3 bench/local-collection-laws/run.py` from the distribution. The same
source/compiler/native Rust backend is built twice: once unchanged and once
with a locally checked database selection. The recorded package identifies every
law, binding and condition proof; the compiler hash stays unchanged.

Each full typed call copies its input, executes, constructs its output and drops
that output. JSON, compilation and proof/search work are excluded from execution
timings. The driver checks independent outputs before measuring, warms/calibrates
each method and alternates methods across nine rounds. Raw samples and source,
selection and environment are in `results.json`. Paired bootstrap 95% ratio
intervals use 4,000 resamples. One-time search/check and emission/replay phase
times are recorded separately as single observations, not repeated benchmarks.

The buffer length and indexed-read laws remove an unnecessary collection copy.
Filter fusion removes an intermediate filtered list and traversal. The round-trip
law has little native benefit here: both generated implementations still copy the
ordinary list result. A valid equality is not a universal profitability claim.
No GPU, A* or persistent-table performance claim follows from this measurement.
