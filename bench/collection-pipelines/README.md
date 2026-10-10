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
