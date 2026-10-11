# Batch35 independent performance review

Independent replay passed: all 7,560 raw samples in 840 nine-round groups, all 672 seeded paired comparisons with 4,000 bootstrap draws each, all 28 aggregates and all 112 left/right/both/nested strata reproduce the recorded statistics. The 396 target, 107 native and 122 production bindings, timing freeze, raw/audit bindings and all 23,420 prior observation files are unchanged.

Against the exact canonical prior, 216 cells contain 140 confirmed wins, 25 confirmed losses and 51 uncertain comparisons. Forty-four point estimates are below parity, comprising the 25 confirmed losses and 19 uncertain cells. Full adverse and uncertain rows are retained in final-performance-review.json; no measurements, controls or selection policy were changed.

Losses occur in all four families: both 13, right 6, left 3 and nested 3. Twenty are in the joint low-word/ys=nx+7 cohort and five in the full-width/ys=floor(nx/3)+1 cohort. Twelve are at size 4,096, eleven at 65,536 and two at 32. These are counts of correlated host/boundary cells, not independent repetitions or one-factor causal experiments.

The largest losses are browser right-map JS at 4,096 and 65,536 in both joint cohorts: prior/checked ratios 0.571–0.649, approximately 1.54–1.75 times slower after fusion. Both-map low-cohort resident Wasm and native large-size losses recur around 3–4%. This evidence establishes target/workload sensitivity; it does not establish a JIT, vectorization or allocation cause without profiling.

Prior-relative descriptive geometric means: Node JS 1.187, browser JS 1.080; resident Wasm 1.372/1.374; native resident 1.742, copied-input 1.379; full Wasm 1.014/1.010; GPU 1.020. A positive aggregate does not hide per-cell regressions or confer a guaranteed profitable rewrite.

All 648 timed GPU rows were actual device executions: 10,575 calls, zero fallback. Every selected primary function was resolved by name and has graph_required=false. Independently recomputed dispatch, upload, readback and live-buffer contracts match all raw counters. Prior and checked physical work is unchanged; declared graph stages 2/2/3/4 to 1/1/1/1 are not physical dispatch savings. GPU prior comparisons contain 2 wins, 2 losses and 20 uncertain cells, providing no general GPU gain.

Already-fused controls remain essential. Checked/expert-relative performance uses reference/current ratios: native expert/Ink 0.887 resident and 0.927 copied, browser JS expert/Ink 0.887, Node JS 1.021; strong Rust full Wasm/Ink 0.452 browser and 0.428 Node. Node JS has 14 confirmed wins, 7 losses and 3 uncertain expert comparisons; this is a narrow mixed result, not broad native-language superiority. All strong-control losses and uncertain cells are retained.

These proofs are semantically sound DB search shortcuts; the unchanged structural cost model still chooses all four source replacements despite observed regressions. Publication of correctness evidence must preserve these performance limits and adverse observations. There is no runtime load/state adaptation and no guaranteed cross-target win.

Limits: four U32 composition probes, one machine, paired nine rounds, nominal per-cell 95% intervals without multiplicity correction. Family labels in names containing heldout do not establish a statistically independent holdout set. Web timing consumes length/first/last, native timing consumes complete vectors; hosts and ownership/transport boundaries are kept separate. CPU and GPU-driver peak heaps were not measured. Finite tests and target validation do not establish universal backend correspondence.
