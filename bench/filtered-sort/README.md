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

Measured full native Rust calls at 65,536 values, versus the preceding DB:

| Observation | Previous DB | New DB | Speedup (95% interval) |
| --- | ---: | ---: | ---: |
| filtered_count_after_sort | 663.1 µs | 57.14 µs | 11.60× (11.46–11.85) |
| filtered_length_after_sort | 690.1 µs | 59.97 µs | 11.51× (11.07–11.64) |
| filtered_integer_sum_after_sort | 685.0 µs | 17.39 µs | 39.38× (36.86–41.26) |

All three observations improved at all measured sizes. The selected integer
sum uses the earlier filter/fold fusion too; the previous DB baseline already
uses that fusion and retains sorting. Count and length still materialise the
filtered list in this measured code; their predicate/traversal/allocation and
input copying remain included. The sum avoids the filtered-list intermediate.

Single phase observations: previous DB search/check 2.15 s versus new DB
6.79 s; baseline emission/replay 549.3 ms versus selected 666.8 ms. These are
excluded from runtime speedup and lack repeated samples. One-shot execution
would not amortise them. All package checkouts were clean at measurement;
the later documentation/evidence commit changes none of the measured source,
compiler, proof entries, planner or backend code. Both selections and their
exact authenticated DB views are archived in `results.json`.
