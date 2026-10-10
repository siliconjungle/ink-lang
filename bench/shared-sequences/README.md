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
