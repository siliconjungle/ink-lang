# State lifecycle comparison

Eleven implementations of the same inventory source maintain exact totals, versions and ordered events. Fresh builds use the pinned sources from the preceding borrowed-outcome report. Ink uses generated undo/staged-event execution; handwritten baselines validate before writes. C is flat, C++ is a tree, Rust includes trees and matching contiguous primitives. Compiler/proof-core behavior is unchanged.

Each lifecycle builds state, grows to the target, performs 10,000 steady and 10,000 mixed operations, clears every candidate key, observes the final state/event log, and destroys State. Mixed operations include insertion, removal, missing/exists errors, overflow and speculative abort. Bulk mode calls each implementation's existing constructor at the full target: handwritten constructors directly construct rows, whereas Ink executes source create transactions. Incremental mode starts from empty, creates 64 rows, then grows through ordinary source operations; the 256-row policy promotion happens inside the measured growth phase. Ascending creation favors flat buffers; ascending clearing shifts them repeatedly.

The same separately compiled C driver records seven phase times. Their sum includes initialization, growth, execution, clear, final observable hashing/queries, and destruction. Additional intermediate correctness observations are outside this sum. It is not uninterrupted process wall time. Small/medium cells batch 16/4 fresh lifecycles, large cells use one; seven repeats, randomized variant order, Apple M4 Pro interactive host, no CPU pinning or cross-ABI LTO. Every phase observation agrees with an independent integer/state model. Separate existing native/reference validation anchors that model against the actual language source.

## Whole measured lifecycle

Median microseconds per lifecycle. Ratios describe these workloads and implementations, not surface languages.

| Rows | Construction | tree | rows_small | columns_small | rows_flat | columns_flat | c_flat | cpp_tree | rust_tree | rust_rows_flat | rust_columns_flat | rust_columns_small |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | bulk | 670.1 | 411.4 | 355.4 | 405.3 | 376.3 | 286.7 | 499.7 | 479.2 | 259.8 | 232.8 | 245.1 |
| 64 | incremental | 684.9 | 434.1 | 383.4 | 415.9 | 383.9 | 299.3 | 543.1 | 485.0 | 259.3 | 259.9 | 236.3 |
| 4096 | bulk | 2069.5 | 2084.0 | 2005.3 | 2471.3 | 2077.8 | 2348.5 | 1470.7 | 1238.2 | 2336.5 | 1956.0 | 1250.5 |
| 4096 | incremental | 2041.0 | 1965.5 | 1992.5 | 2446.5 | 2077.5 | 2336.5 | 1506.8 | 1202.0 | 2339.0 | 1897.8 | 1369.5 |
| 65536 | bulk | 9190.0 | 9414.0 | 9436.0 | 495839.0 | 402246.0 | 499219.0 | 9161.0 | 6144.0 | 492177.0 | 403415.0 | 6361.0 |
| 65536 | incremental | 9258.0 | 9762.0 | 9588.0 | 495509.0 | 401957.0 | 492921.0 | 12468.0 | 6103.0 | 493122.0 | 401250.0 | 8556.0 |

Across these six fixture cells, the small-column policy takes 1.25× Rust tree time and 1.45× matching-layout Rust time. Permanent columns take 4.45× Rust tree time overall because large clearing dominates their wins elsewhere. These geometric means give equal weight to fixture cells with different operation counts; they are not a population-wide software estimate.

In the 65,536-row incremental fixture, Ink's permanent columns spend about 396 ms clearing versus 2.04 ms for its promotion policy. Matching-layout Rust columns spend the same 396 ms, and C flat rows about 487 ms. This identifies repeated contiguous shifting, rather than surface syntax, as the limiting algorithm. Full median lifecycle times are recorded above.

Phase medians do not generally add to the median total. Very short phases can read zero at the host clock's resolution; that does not prove zero-cost initialization or destruction. Additional intermediate observations perturb cache state and are explicitly excluded from the recorded segment sum.

## Separately measured allocations

Instrumented binaries have their own build directory and hashes. Their timing fields are discarded. Counts cover implementation-owned requested heap bytes and successful allocation/reallocation calls, excluding allocator metadata, probe headers, host-driver memory and temporary physical realloc overlap. Rust wraps GlobalAlloc/System; C wraps this implementation's malloc/calloc/realloc/free; C++ intercepts ordinary new/delete. No over-aligned objects occur in these fixtures. Known-size allocation sequences independently check the C, C++ and Rust probes, including resize accounting, overlapping replacement buffers, zero initialization, ordinary alignment and reset; see [probe-validation.json](probe-validation.json). All instrumented states return live requested bytes to zero after destruction. Bytes still allocated after clear include retained event logs, vector capacities and journal buffers; they are not just live rows and are not RSS. In the 65,536-row incremental fixture, Ink columns retain 2,097,520 requested bytes after clear, versus 524,800 under the promotion policy. Both retain the required event log; both drop to zero after destruction. An empty logical table does not imply released capacity.

| Rows | Construction | Variant | After growth bytes | After mixed bytes | After clear bytes | Peak requested live bytes | Allocation/reallocation calls |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 64 | bulk | tree | 1792 | 526432 | 524752 | 526576 | 68 |
| 64 | bulk | rows_small | 1328 | 526704 | 526704 | 526704 | 22 |
| 64 | bulk | columns_small | 1072 | 526192 | 526192 | 526192 | 28 |
| 64 | bulk | rows_flat | 1328 | 526704 | 526704 | 526704 | 22 |
| 64 | bulk | columns_flat | 1072 | 526192 | 526192 | 526192 | 28 |
| 64 | bulk | c_flat | 1104 | 526416 | 526416 | 526416 | 14 |
| 64 | bulk | cpp_tree | 3152 | 528832 | 524368 | 789584 | 736 |
| 64 | bulk | rust_tree | 1616 | 526192 | 524512 | 526336 | 66 |
| 64 | bulk | rust_rows_flat | 1152 | 526464 | 526464 | 526464 | 20 |
| 64 | bulk | rust_columns_flat | 896 | 525952 | 525952 | 525952 | 26 |
| 64 | bulk | rust_columns_small | 896 | 525952 | 525952 | 525952 | 26 |
| 64 | incremental | tree | 1792 | 526432 | 524752 | 526576 | 68 |
| 64 | incremental | rows_small | 1328 | 526704 | 526704 | 526704 | 22 |
| 64 | incremental | columns_small | 1072 | 526192 | 526192 | 526192 | 28 |
| 64 | incremental | rows_flat | 1328 | 526704 | 526704 | 526704 | 22 |
| 64 | incremental | columns_flat | 1072 | 526192 | 526192 | 526192 | 28 |
| 64 | incremental | c_flat | 1104 | 526416 | 526416 | 526416 | 20 |
| 64 | incremental | cpp_tree | 3152 | 528832 | 524368 | 789584 | 736 |
| 64 | incremental | rust_tree | 1616 | 526192 | 524512 | 526336 | 66 |
| 64 | incremental | rust_rows_flat | 1152 | 526464 | 526464 | 526464 | 20 |
| 64 | incremental | rust_columns_flat | 896 | 525952 | 525952 | 525952 | 26 |
| 64 | incremental | rust_columns_small | 896 | 525952 | 525952 | 525952 | 26 |
| 4096 | bulk | tree | 107536 | 633520 | 524752 | 639760 | 819 |
| 4096 | bulk | rows_small | 104464 | 632800 | 524800 | 635824 | 809 |
| 4096 | bulk | columns_small | 104464 | 632800 | 524800 | 635824 | 817 |
| 4096 | bulk | rows_flat | 65840 | 655728 | 655728 | 655728 | 28 |
| 4096 | bulk | columns_flat | 49456 | 622960 | 622960 | 622960 | 40 |
| 4096 | bulk | c_flat | 65616 | 655440 | 655440 | 655440 | 14 |
| 4096 | bulk | cpp_tree | 196688 | 742000 | 524368 | 983120 | 5041 |
| 4096 | bulk | rust_tree | 107360 | 633280 | 524512 | 639520 | 817 |
| 4096 | bulk | rust_rows_flat | 65664 | 655488 | 655488 | 655488 | 26 |
| 4096 | bulk | rust_columns_flat | 49280 | 622720 | 622720 | 622720 | 38 |
| 4096 | bulk | rust_columns_small | 104288 | 632560 | 524560 | 635584 | 815 |
| 4096 | incremental | tree | 107536 | 633520 | 524752 | 639760 | 819 |
| 4096 | incremental | rows_small | 104464 | 632800 | 524800 | 635824 | 809 |
| 4096 | incremental | columns_small | 104464 | 632800 | 524800 | 635824 | 817 |
| 4096 | incremental | rows_flat | 65840 | 655728 | 655728 | 655728 | 28 |
| 4096 | incremental | columns_flat | 49456 | 622960 | 622960 | 622960 | 40 |
| 4096 | incremental | c_flat | 65616 | 655440 | 655440 | 655440 | 26 |
| 4096 | incremental | cpp_tree | 196688 | 742000 | 524368 | 983120 | 5041 |
| 4096 | incremental | rust_tree | 107360 | 633280 | 524512 | 639520 | 817 |
| 4096 | incremental | rust_rows_flat | 65664 | 655488 | 655488 | 655488 | 26 |
| 4096 | incremental | rust_columns_flat | 49280 | 622720 | 622720 | 622720 | 38 |
| 4096 | incremental | rust_columns_small | 104288 | 632560 | 524560 | 635584 | 815 |
| 65536 | bulk | tree | 1722784 | 2263936 | 524752 | 2263936 | 11061 |
| 65536 | bulk | rows_small | 1719712 | 2260864 | 524800 | 2260864 | 11045 |
| 65536 | bulk | columns_small | 1719712 | 2260864 | 524800 | 2260864 | 11053 |
| 65536 | bulk | rows_flat | 1048880 | 2621808 | 2621808 | 2621808 | 32 |
| 65536 | bulk | columns_flat | 786736 | 2097520 | 2097520 | 2097520 | 48 |
| 65536 | bulk | c_flat | 1048656 | 2621520 | 2621520 | 2621520 | 14 |
| 65536 | bulk | cpp_tree | 3145808 | 3691264 | 524368 | 3932240 | 66481 |
| 65536 | bulk | rust_tree | 1722608 | 2263696 | 524512 | 2263696 | 11059 |
| 65536 | bulk | rust_rows_flat | 1048704 | 2621568 | 2621568 | 2621568 | 30 |
| 65536 | bulk | rust_columns_flat | 786560 | 2097280 | 2097280 | 2097280 | 46 |
| 65536 | bulk | rust_columns_small | 1719536 | 2260624 | 524560 | 2260624 | 11051 |
| 65536 | incremental | tree | 1722784 | 2263936 | 524752 | 2263936 | 11061 |
| 65536 | incremental | rows_small | 1719712 | 2260864 | 524800 | 2260864 | 11045 |
| 65536 | incremental | columns_small | 1719712 | 2260864 | 524800 | 2260864 | 11053 |
| 65536 | incremental | rows_flat | 1048880 | 2621808 | 2621808 | 2621808 | 32 |
| 65536 | incremental | columns_flat | 786736 | 2097520 | 2097520 | 2097520 | 48 |
| 65536 | incremental | c_flat | 1048656 | 2621520 | 2621520 | 2621520 | 30 |
| 65536 | incremental | cpp_tree | 3145808 | 3691264 | 524368 | 3932240 | 66481 |
| 65536 | incremental | rust_tree | 1722608 | 2263696 | 524512 | 2263696 | 11059 |
| 65536 | incremental | rust_rows_flat | 1048704 | 2621568 | 2621568 | 2621568 | 30 |
| 65536 | incremental | rust_columns_flat | 786560 | 2097280 | 2097280 | 2097280 | 46 |
| 65536 | incremental | rust_columns_small | 1719536 | 2260624 | 524560 | 2260624 | 11051 |

[Raw timings](samples.json), [phase medians and ratios](summary.json), [allocation profiles](allocation-profiles.json), [independent phase oracle](oracle.json), and [pinned sources/binaries/toolchains](metadata.json) are archived. Instrumentation is functional evidence, not formal storage refinement.

Rebuild into a fresh output directory with `python3 bench/state/lifecycle.py --output reports/NEW`. The preceding timed binaries are untouched. General lifetime arenas, compact graph links, inline variable-size values, checked physical admission/adaptation, memory limits and durability remain unfinished.

The current harness can check a freshly built compiler with `python3 bench/state/lifecycle.py --validate-inputs-only`. It checks the source/certificate and exact generated bodies/plans before accepting a different compiler binary identity. Reproduction captures actual target CPUs on the new host. [Input-validation tests](input-validation-tests.json) reject wrong source, code and plan. The measured script itself remains archived unchanged; the later harness refinement is separately pinned in validation-sources.
