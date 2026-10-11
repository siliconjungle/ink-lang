# Final published producer validation

These samples were acquired again after the authoring hygiene fixes, using the
compiler and emitted artifacts identified in `provenance.json`. Earlier samples
remain unchanged in the parent directory. They are separate acquisitions.

The fresh grouped package passes complete 410-request histories across Rust, C,
JavaScript, both Wasm lowerings and both GPU host paths. Three freshly rehashed
corruptions of its second key, emitted events and cached summaries are rejected
by mathematical checking. The final published database passes its committed
active-closure audit, 19 store tests and 62 planner tests. All ten Frontier
fixture families are regenerated from current source models; every representation
and both migration directions are checked while historical hashes remain intact.

The repeated JavaScript benchmark uses 1024 rows, 96 calls, five alternating
rounds and independent warm-up states. All replies and portable snapshots agree.
Median nanoseconds per complete call on the shared Apple M2 host:

| Action | Ordinary | Indexed | Grouped |
| --- | ---: | ---: | ---: |
| Two replacements across both roots | 3,971 | 86,988 | 93,487 |
| Replace then remove | 2,583 | 32,812 | 26,911 |
| Remove then replace | 2,936 | 43,612 | 44,632 |
| Two removals | 3,897 | 47,848 | 40,681 |
| Cached weighted sum | 82,611 | 545 | 564 |
| Cached label predicate | 93,901 | 783 | 553 |
| Parameterized predicate | 84,447 | 1,508,785 | 1,578,969 |

Grouping improves two write patterns and slows two relative to the ungrouped
index. Both indexes lose to ordinary writes and parameterized fallback queries.
The cached reads are much faster. These samples justify selecting per workload;
they do not establish universal batching speed or native/device performance.
Peak memory, offline proof/search/compiler cost and dirty teardown are unmeasured.

`select-benchmark.py` imports this acquisition through the existing selector,
with exact compiler, target, workload, candidate and lifecycle bindings. Its
receipts and observation records are retained alongside the samples. The cold
automatic planner integration separately verifies proposal generation, proof
admission, missing-evidence fallback, measured policy choices, actual JavaScript
replay and stale-target rejection.
