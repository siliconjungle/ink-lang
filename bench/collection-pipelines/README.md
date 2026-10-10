# Database-selected collection pipelines

Run `python3 bench/collection-pipelines/run.py`. Compare identical Ink source,
compiler and native Rust backend with no selection and a locally checked
database selection. The compiler hash is checked before and after.

Full typed calls include input copies, execution and output destruction.
JSON, emission, compilation, search and proof checking are outside execution
timings. Search/check and emission/replay phases are recorded separately as
single observations. Outputs are independently checked before timing; nine
alternating rounds follow two calibration warmups per case/method/size.

Raw samples, paired bootstrap 95% ratio intervals (4,000 resamples), exact source,
proof package, compiler hash, dependency commits and environment are recorded in
`results.json`. The 100 ms calibration target has a 2,000-call cap.

Length-after-map avoids constructing and visiting an unused mapped list.
Reduction fusion removes intermediate mapped/filtered lists while retaining
right-fold arithmetic order. Floats are covered by ordered fold laws, but this
benchmark measures u32 only. No GPU or universal speedup claim follows.
The earlier local-collection-law benchmark and its recorded results are retained.

## Recorded native Rust run

Apple M2, 65,536 u32 elements, full typed call median and paired
95% bootstrap ratio interval. All measured checkouts were clean; the compiler
hash is identical to the previous collection-law run.

| Case | Baseline | Selected | Baseline / selected |
| --- | ---: | ---: | ---: |
| mapped_length | 15.49 µs | 4.52 µs | 3.43× [3.14, 3.80] |
| mapped_sum | 17.88 µs | 16.06 µs | 1.11× [1.06, 1.21] |
| filtered_sum | 52.32 µs | 16.43 µs | 3.18× [3.17, 3.23] |
| filter_map_sum | 55.11 µs | 18.71 µs | 2.95× [2.94, 3.00] |

At 256 and 4,096 elements, plain map/sum is about 0.93× (slower). Its large-input
benefit is modest. Law validity alone does not establish profitability; the other
three large-input cases show larger measured gains.

For this fifteen-function module, search/check took
10.15 s once and source emission plus
selection replay 419.9 ms
(baseline emission 11.8 ms).
These one-time observations are excluded from execution timings.
