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
