# Immutable function graph adjacency

The SCC traversal previously cloned each node's adjacency vector before descending.
The graph is immutable; only the traversal state changes. Copying its shared slice
reference avoids those clones and keeps edge order, group order and all budgets.
This is general analysis machinery, not an optimisation law or rewrite authority.

The baseline distribution is 8fabcf90692e93ec2732877851fbc2b26fffe2a1.
The candidate changes only the adjacency borrow in core/src/analysis.rs.
`measurement.json` binds both actual compiled clients and source hashes.
`probe.rs` links the distribution's real `verified_language` library; it does not
reimplement graph analysis. Compile it identically against each revision's debug
library with `rustc --edition=2021 -C opt-level=1 --extern
verified_language=PATH_TO_RLIB -L dependency=PATH_TO_DEPS probe.rs -o probe`.
Use separate Cargo targets for the two revisions. Run both clients in alternating
fresh-process order with arguments MODE COUNT DEGREE RUNS RESULT_PATH:

| Case | Mode | Count | Degree | Process pairs | Runs per process |
| --- | --- | ---: | ---: | ---: | ---: |
| Empty adjacency | fanout | 512 | 0 | 9 | 3 |
| Small fanout | fanout | 128 | 8 | 9 | 3 |
| Large fanout | fanout | 512 | 8 | 9 | 3 |
| Recursive tree folds | cycles | 64 | 0 | 9 | 3 |
| Depth guard | depth_guard | 130 | 0 | 3 | 3 |
| Function count guard | size_guard | 4097 | 0 | 3 | 3 |

Performance cases pass CheckedModule admission before timing. Guard cases use
syntactic Program inputs only. The probe warms once, counts allocations and full
requested realloc sizes during the actual graph call, and checks results afterward.
These are cumulative allocation requests, not peak memory or RSS. Compare exact
sorted groups as well as the independent oracle: DAGs have no recursive groups;
64 admitted pairs of recursive tree folds produce exactly [[0,1],...,[126,127]].

`work-guard.rs` separately constructs the dense Program AST needed to exercise the
100,000-work cap. Compile it against each actual core with `--extern ink_core=...`
and the corresponding dependency directory. The candidate may alias the distribution
library as ink_core because it reexports core. The isolated standalone baseline
contained all 189 tracked core files byte-identical to the baseline root.
Three calls each returned exactly `Err("function graph edge limit")`.
This checks the structural API, not source admission. Earlier source constructions
hit the parser's 1 MB and surface-node limits before graph analysis and are excluded.
An initial standalone client link lacked the dependency directory and was repaired;
no result from that failed link is counted.

Under shared-machine contention, large fanout requested 323,780 -> 291,300 bytes
and made 6,667 -> 6,156 allocation/reallocation calls. Recursive pairs made
599 -> 471 calls and requested 59,948 -> 58,924 bytes. Performance-case median
ratios were 0.953, 0.991, 0.992 and 0.963. Empty adjacency saves no allocation,
though removing empty Vec::clone still changes work. Tiny size-guard timings are
below useful timing resolution. These debug-core measurements do not establish
release compiler, planner, browser or application speedups.

All 370 independent core tests and 42 mandatory hardening tests passed locally.
`validation.json` records exact log hashes and limitations. Remote CI status belongs
to the publication receipt and is not implied by these local results.
