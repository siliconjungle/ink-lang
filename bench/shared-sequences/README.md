# Shared sequence database-selection benchmark

Run `python3 bench/shared-sequences/run.py`. Compare identical Ink source,
compiler and native Rust backend with no selection and a locally checked
database selection. The compiler hash is checked before and after.

Each full typed call includes input copying, execution, result construction and
destruction. JSON, emission, compilation, search and checking are outside execution
timings. One-time search/check and emission/replay times are separately recorded.
Independent output oracles run before timing; nine alternating rounds follow two
calibration warmups per case/method/size (100 ms target, 2,000-call cap).

`results.json` records raw samples, paired 95% bootstrap ratio intervals
(4,000 resamples), exact source and proof package, compiler hash, dependency
commits and environment. This is a u32 workload on native Rust, not a universal
speedup or GPU claim. Earlier benchmark sources and results remain unchanged.

Count erasure skips building an unused map. Zip projections remove duplicate
input traversals. Shared mapped-zip fusion replaces two maps plus zip with one
map. Combining that law with the preceding integer sum law selects a fold
without any mapped/paired list. Proof validity and measured benefit are separate.

## Recorded native Rust run

Apple M2, 65,536 u32 elements, full typed call median and paired
95% bootstrap ratio interval.

| Case | Baseline | Selected | Baseline / selected |
| --- | ---: | ---: | ---: |
| count_after_map | 20.32 µs | 14.82 µs | 1.37× [1.22, 1.57] |
| zip_projection | 38.55 µs | 22.75 µs | 1.69× [1.25, 2.47] |
| mapped_zip | 70.97 µs | 38.83 µs | 1.83× [1.50, 2.16] |
| mapped_zip_sum | 80.90 µs | 46.52 µs | 1.74× [1.54, 1.96] |

Count-after-map is about 0.94× at 256 elements (slower), and 1.18× at 4,096.
The other three cases are faster at each recorded size; raw intervals and samples
remain available. These are one-machine observations, not universal profitability.

For the complete fifteen-function example, search/check took
33.48 s once; emission plus selection
replay took 1301.7 ms
(baseline emission 14.1 ms).
These phase times are single observations and are excluded from execution timings.
The checked package can be saved and replayed for later builds.

The compiler hash is identical to prior passes. Dependency checkouts were clean;
the root was marked dirty solely by untracked validation reports generated
during the run, with no compiler/source changes. Exact source and proof bytes
are included in the recorded result.
