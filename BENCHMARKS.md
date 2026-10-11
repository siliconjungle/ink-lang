# Benchmark evidence

Ink's performance ambition is competitive complete execution on specified
workloads and hardware. Current evidence shows reusable improvements over earlier
Ink, sometimes approaching strong handwritten controls. It does not establish
broad superiority over Rust, C/C++ or JavaScript.

Every report belongs to its recorded compiler, knowledge snapshot, target,
machine and workload. Archived inputs/results remain immutable. A ratio from one
call boundary cannot rank another. Read [the methodology](docs/benchmark-methodology.md)
and each report's limits before interpreting a headline.

## What the recent work demonstrates

Database-only laws can remove entire traversals and intermediate results with the
production compiler unchanged. Composed maps, indexed maps, zips, folds and unused
scan/projection work provide more reach than isolated arithmetic identities.
Matched fused controls show whether that recovers an expert implementation or
improves upon it.

Correctness and profitability remain separate. Batch38 records gains and twenty
classified CPU regressions, all in composed-helper contexts. Its GPU dispatches
drop from four to one, but complete GPU requests still lose to both CPU controls
in every measured cell. Resident Wasm/native boundaries can perform very
differently from calls that also pack/copy inputs and return owned outputs.

## Recent checked web/native proof batches

The ratios below compare prior Ink time with checked Ink time within each
report's own cohort; above one favours checked Ink. They are descriptive
geometric means, not universal speedup predictions. Full matrices, controls,
uncertainty and adverse cells remain in the linked reports.

| Report | Checked change | Evidence and limits |
| --- | --- | --- |
| [Batch38](reports/web-stack-proofs-38-2026-10-11/REPORT.md) | Same-origin padded indexed-map/zip fusion; both mapped values remain observed | 1.19× Node JS, 1.26× browser JS, 1.05× browser resident Wasm, 1.67× resident native C, 3.35× complete WebGPU requests versus prior Ink. Four contexts, 7,560 samples; 20 prior regressions. Native/browser controls generally remain faster |
| [Batch37](reports/web-stack-proofs-37-2026-10-11/REPORT.md) | Remove an unobserved independent indexed traversal while preserving zip order/extent | 1.45× Node JS, 1.39× browser JS, 1.19× resident Wasm, 3.32× resident native C; five prior cells regress. Full Wasm/GPU calls are near unchanged |
| [Batch36](reports/web-stack-proofs-36-2026-10-11/REPORT.md) | Ordered-fold source certificates using existing general laws | 1.18× Node JS, 1.30× browser JS, 1.26× resident Wasm, 1.62× resident native; GPU gains are small and mixed. Rust controls remain faster overall |
| [Batch35](reports/web-stack-proofs-35-2026-10-11/REPORT.md) | Observed map/zip fusion | 1.19× Node JS, 1.08× browser JS, 1.37× resident Wasm, 1.74× resident native; 25 prior comparisons regress |
| [Batch34](reports/web-stack-proofs-34-2026-10-11/REPORT.md) | Remove unused mapped projections | 4.15× Node JS, 1.73× browser JS, 2.60× resident Wasm, 3.86× resident native; complete WebGPU near unchanged. One projection family, not general language superiority |
| [Batch33](reports/web-stack-proofs-33-2026-10-11/REPORT.md) | Unused independent scan projection | Selected workloads improve over prior Ink; handwritten controls usually remain faster |
| [Batch32 and integration](reports/web-stack-proofs-32-2026-10-11/main-integration/REPORT.md) | Earlier checked web laws and direct-main publication | Preserved revision pins, correctness replay and publication evidence |

## Stateful execution and knowledge discovery

| Report | What is timed | Interpretation |
| --- | --- | --- |
| [Representations](reports/representation-performance/README.md) | Source-bound physical-definition execution and lifecycle phases | Establishes costs for explicit checked candidates; not all-source/backend competitiveness |
| [Cache maintenance](reports/cache-maintenance-performance/README.md) | Complete small-fixture calls with retained caches | Retention alone gives no consistent complete-call gain; surrounding work matters |
| [Compact queries](reports/compact-query-performance/README.md) | Matched cached-query candidates on different executors | Three-call execution improves roughly 22–24%; fused execution is roughly 2–6% slower |
| [Knowledge lookup](reports/knowledge-lookup-performance/README.md) | Comparable cost-evidence discovery in synthetic catalogues | 50–57× faster selective lookup at 512–1,024 observations; this is optimiser discovery, not Ink action latency |
| [Knowledge export](reports/knowledge-export-performance/README.md) | Complete proof-bundle assembly | Real 85-entry bundle: 97.8 → 45.0 ms, about 2.17×; excludes mathematical admission and source action execution |
| [Incremental maintenance and lifecycle selection](reports/incremental-maintenance-selection/README.md) | Check/setup/call/migration/teardown phases for direct, refresh and delta candidates, with separately measured compilation | Prebuilt lifecycle profile selects direct; the delta candidate loses on the small fixture. A build-inclusive profile changes selection using noisy compilation medians, which do not establish a reliable compilation advantage |

Point-delta maintenance and explicit lifecycle-based selection are integrated;
further mixed-workload and overhead attribution work is described in [status](STATUS.md).
A proved cache can lose when setup and full-state transport outweigh reads saved.
Separate compilation, admission, session setup, calls, migration and teardown
before extrapolating.

## Earlier evidence and historical paths

| Report | Scope |
| --- | --- |
| [Collection proofs](reports/collection-proof-phase1/REPORT.md), [filtered pipelines](reports/filter-proof-phase1/REPORT.md) | Induction-checked collection fusion against matched native controls |
| [Native state ABI](reports/native-state-phase3-native-abi/REPORT.md), [Linux method](reports/bench-method-linux/REPORT.md) | Stateful comparisons and benchmark-method validation; baseline and toolchain differences are disclosed |
| [Lifecycle](reports/lifecycle-phase1/REPORT.md) | Construction, growth, operations, clearing, teardown and retained allocations |
| [Source routing](reports/source-routing-phase1/REPORT.md), [resident GPU](reports/gpu-phase2/REPORT.md) | Checked pure routing and resident pipelines; measured choice can retain CPU |
| [Wasm literal](reports/wasm-phase3-literal/metadata.json), [compact state Wasm](reports/compact-state-wasm-phase1/REPORT.md) | Explicit WebAssembly experiments |
| [Previous benchmark index](docs/history/benchmark-index-through-2026-10-11.md) | Full older index, early tables, reproduction details and the retired modular-polynomial path |

Historical aggregate/cache/storage-policy experiments do not establish default
production admission. They require the disclosed historical path, where relevant.

## What remains to establish

Diagnose regressions before changing profitability policy. Carry useful shape,
purity, ownership and capacity facts into lowering. Evaluate general families
with independently varied size, shape and distribution; separate statistical
holdouts from helper-composition probes. Compare full-result computation against
strong JS, Rust-Wasm and native Rust controls. Resident GPU pipelines and full GPU
requests need separate results, with actual transfer/dispatch counters.

Include selection overhead, proof/check/search costs, construction, allocation,
copying, retained memory, migration and teardown at the boundary being claimed.
Unknown memory is not zero. Few-percent differences on a shared desktop can be
noise. A low structural cost, a correct proof or a larger catalogue is not a
performance result.
