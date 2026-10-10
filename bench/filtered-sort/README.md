# Native Rust filtered-sort experiment

Run `python3 bench/filtered-sort/run.py` from the distribution root. Baseline
selection uses the preceding pinned snapshot
`229e3d87fa2ca12d83f0f297b5f04a431c25730c47b248a0e600910b38f6f6a0`;
the selected version uses the new DB. Source, compiler SHA and native Rust
backend are identical. The baseline already has all earlier collection laws,
including filter/sum fusion. Its aggregate still needs sorting; the new version
can skip that sort. Both exact proof packages are archived in `results.json`.

The driver checks independently calculated cardinalities and wrapping sums
before measurement. Inputs contain 256, 4096 or 65536 deterministic mixed u32
values. A pure less-than predicate retains approximately half the values. Full
typed calls include input copying, execution, allocation and destruction;
JSON, compilation, proof and planning costs are excluded. Each method/size gets
two calibration warmups and nine alternating rounds. Repetitions target 100 ms
and are capped at 2000. Paired bootstrap 95% intervals use 4000 resamples.

The baseline uses the backend's native sort, not the proof vocabulary's logical
insertion sort. Equality proofs retain the existing primitive correspondence,
checker and backend trust boundaries. Results describe these workloads on this
machine; one-time search/check/emission observations are recorded separately.
