# Native Rust sort aggregation experiment

Run `python3 bench/sort-cardinality/run.py` from the distribution root. It uses
the same source, compiler binary and pinned native Rust backend for the baseline
and checked DB selection. No compiler rebuild changes are involved.

The driver checks independently calculated cardinality and wrapping sums before
measurement. It measures full typed calls: input copying, execution, allocation
and destruction are included. JSON, compilation and proof/search costs are
excluded. Inputs contain 256, 4096 or 65536 deterministic mixed u32 values.
Each method/size gets two calibration warmups, then nine alternating rounds.
Repetition counts target 100 ms and are capped at 2000. Paired bootstrap 95%
intervals use 4000 resamples. Archived `results.json` records samples, exact
source, selected proof package, compiler SHA and package/toolchain revisions.

The selected native cardinality call still pays the input copy/ownership cost;
this is not an allocation-free host ABI claim. Sum retains a traversal. The
baseline uses the backend's native sort rather than the logical insertion-sort
proof definition. Proof equality does not prove the emitter or its sort correct.
The results apply to these workloads and this machine, not arbitrary Ink code.
Search/check/emission timings are separately recorded single observations.

Measured native Rust calls at 65,536 elements:

| Observation | Baseline | Selected | Speedup (95% interval) |
| --- | ---: | ---: | ---: |
| count_after_sort | 673.8 µs | 8.77 µs | 76.85× (72.54–82.28) |
| length_after_sort | 668.1 µs | 4.51 µs | 148.20× (137.83–151.08) |
| integer_sum_after_sort | 675.9 µs | 13.74 µs | 49.18× (48.17–51.25) |

All three observations improved at every measured size; raw samples are in
`results.json`. One-time search plus local checks took 4.09 s; emission with
selection replay took 627.8 ms versus 8.3 ms baseline. These are single
observations, excluded from the runtime speedup. At 65,536 values the eliminated
sort dominates; a one-shot call would not amortise planning and compilation.
All package checkouts were clean at measurement. The later evidence/doc commit
changes no compiler, source workload, proof objects, planner or backend.
