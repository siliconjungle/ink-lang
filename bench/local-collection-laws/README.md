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

## Recorded native Rust run

Apple M2, 65,536 u32 elements; full typed call median and paired 95%
bootstrap ratio interval. This is one machine/run, not a universal backend claim.

| Case | Baseline | Selected | Baseline / selected |
| --- | ---: | ---: | ---: |
| freeze_roundtrip | 9.08 µs | 9.54 µs | 0.95× [0.91, 1.01] |
| length | 8.61 µs | 4.12 µs | 2.09× [1.91, 2.16] |
| indexed_read | 9.20 µs | 4.57 µs | 2.02× [1.95, 2.15] |
| filter_fusion | 80.50 µs | 55.09 µs | 1.46× [1.44, 1.48] |

The round-trip interval includes 1×, so no speedup is claimed for it. Search and
local checks took 1.86 s once; source emission plus selection replay took 69.8 ms
(9.6 ms for baseline emission). These phase times are individual observations.
The checkout was dirty only because the generated result file was untracked;
compiler/source and all dependency commits are captured in that file.
