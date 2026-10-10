# Web proof batch 2 — checked laws and full-call performance

This contribution publishes **33 fresh checked laws**, growing the canonical catalogue from **732 to 765 entries**, and records **5,922 paired timing samples** across JavaScript, Wasm and real browser WebGPU. The default external planner selects and the local checker replays the new laws on all six benchmark functions; no forced selection or new trusted rule is required.

The collection cases have useful incremental gains. On browser full-width 4096 inputs, weighted zip/sum improves **6.84× in runtime JavaScript and 1.10× in Wasm**, while map/filter/right-fold improves **1.64× and 1.06×**. The two synthetic recurrence kernels improve **1.54× and 1.76× in complete WebGPU calls**, with exact dispatch/transfer evidence. Their much larger JS/Wasm gains come from removing 1024 polynomial updates per element and must not be presented as universal language speedups. Some Wasm fixtures regress; the evidence retains them explicitly.

## Proofs and application

The [compute producer](../../knowledge/producers/web_compute2_laws.py) contributes 18 U32/I32/U64 quartic/quintic finite-difference recurrence increment/invariant and constant-map laws. The [fusion producer](../../knowledge/producers/web_fusion2_laws.py) contributes 15 filter/right-fold, map/filter/right-fold, weighted self-zip/right-fold and integer weighted self-zip/sum laws. F32 fusion instances preserve exact multiplication/addition/subtraction and right-fold order; no floating arithmetic reassociation is added. Sum factoring is restricted to wrapping integers.

All 33 laws are fresh authenticated objects relative to the immutable 732 catalogue. Existing generic ring normalization, induction and Boolean cases check them. All 33 type instances have actual source application, default planner selection, checker replay and reification evidence in [compute tests](../../knowledge/research/web-stack-proofs-2/compute/tests.log) and [fusion tests](../../knowledge/research/web-stack-proofs-2/fusion/tests.log). Four fully rehashed false laws are rejected for mathematical reasons. The complete knowledge suite passes 31 tests ([log](knowledge-tests.log)). The compiler, runtime and lowering implementations are unchanged for this batch; generated code continues to trust callers.

[Publication](publication.json) stages and checks the objects before canonical publication and preserves the old snapshot. The full benchmark's old 732 selection applies zero laws and retains the original core. Its new 765 selection applies seven steps: six new laws and an existing integer factoring law enabled after the weighted-fold fusion. Each function applies its own new law and has a changed core body. The authenticated selections, replay receipts and emitted modules are archived under this report.

General filtered-concat/count candidates were checked during exploration but excluded from the published batch because current structural search does not select their larger replacements. The batch keeps those exploratory receipts separate from the final 15 fusion objects. New mathematical names and admission alone were not used as evidence of optimisation.

## Browser results

Prior/new ratios above one mean the new catalogue is faster. These are warmed complete calls on Apple M2 / Apple metal-3 WebGPU in headed Chrome 154. The table uses full-width random U32 input of length 4096. Intervals are paired bootstrap 95%; they are individual exploratory intervals, without a family-wise multiple-comparison adjustment.

| Workload | Runtime JavaScript | Wasm | WebGPU |
|---|---:|---:|---:|
| quartic_repeat | 2.51e+03× [2.45e+03, 2.56e+03] | 134× [132, 135] | 1.54× [1.45, 1.57] |
| quintic_repeat | 2.69e+03× [2.66e+03, 2.72e+03] | 131× [130, 133] | 1.76× [1.73, 1.85] |
| quartic_map | 1.3× [1.27, 1.33] | 0.994× [0.987, 1.01] | 1× [0.987, 1.03] |
| weighted_zip_fold | 1.19× [1.07, 1.26] | 1.07× [1.01, 1.1] | CPU fallback |
| mapped_filter_fold | 1.64× [1.54, 1.75] | 1.06× [1.02, 1.13] | CPU fallback |
| weighted_zip_sum | 6.84× [6.49, 7.02] | 1.1× [1.05, 1.21] | CPU fallback |

The quartic/quintic tasks are controlled compute microbenchmarks. Each original source performs 1024 wrapping updates per element; the new proof gives one closed-form update. The quartic-map task removes arithmetic without removing a loop: its GPU and Wasm full 4096 intervals cross one, so there is no supported gain for those cells.

Node full 4096 gains also depend on the engine: weighted zip/sum improves 2.47× JS and 1.18× Wasm; mapped filter/fold improves 1.83× and 1.12×. The Node recurrence gains are approximately 3538/4003× JS and 126× Wasm. Those ratios isolate work elimination using the same compiler and boundary protocol, rather than broad claims about Ink or source-language speed.

## Regret and target selection

Four measured host/shape/backend cells have intervals entirely below one:

| Host | Workload | Fixture | Backend | Prior/new ratio 95% |
|---|---|---|---|---:|
| node | mapped_filter_fold | small-1024 | wasm | 0.942× [0.927, 0.964] |
| browser | quartic_map | small-4096 | wasm | 0.984× [0.971, 0.997] |
| browser | mapped_filter_fold | small-4096 | wasm | 0.967× [0.935, 0.994] |
| browser | weighted_zip_fold | full-32 | wasm | 0.939× [0.869, 0.981] |

[profitability.json](profitability.json) classifies every measured prior/new backend cell independently of proof correctness. Of 234 profiled cells, 192 have supported improvements, 38 are inconclusive and four regress. The conservative latency-only recommendation keeps the prior candidate for regressions and inconclusive cells. These are scoped evidence/recommendations for the measured host and fixture, not an implemented general runtime routing policy. The current structural planner can still select a mathematically valid rewrite that is slower on a particular target/shape. Unmeasured types and machines have no profitability recommendation.

## Method and comparison limits

Six U32 workloads, two value distributions and three sizes 32/1024/4096 give 36 cells per host. Node has 2772 samples and 1254 exact oracle comparisons; the browser has 3150 samples and 1362 comparisons. Thirteen validation fixtures cover empty, singleton, overflow boundaries, all/no filtered elements, zero factor and odd lengths. Python arbitrary-integer closed forms validate all outputs, with 177 literal source-stage corroborations; complete scalar fixtures are corroborated, while nonboundary vector fixtures corroborate their first four elements.

Every full call captures input once, pays applicable Wasm transfer and public result copying/conversion, awaits the same outer call boundary and consumes output inside the timer. WebGPU additionally pays fresh upload, dispatch and readback. All 54 vector variant/cells actually execute GPU paths, yielding 378 GPU timed samples. Every GPU call reports one dispatch, input/scalar/metadata upload and output-length readback; aggregate counters also match for all raw trials, warmups and calibration. At 4096 words these are 16408 uploaded bytes and 16384 readback bytes per call. All 54 scalar GPU requests use explicit CPU fallback and never enter GPU timing samples.

Seven randomized paired rounds follow calibrated batches and discarded warmup. Module startup and first calls are separately recorded. Frozen [metadata](metadata.json), [harness](harness.py), original/prior/checked bundles, literal controls, exact fixtures, warmup/calibration and raw trials preserve identities. Root independently recomputed 684 paired intervals and checked artifact/compiler hashes; [independent review](../../knowledge/research/web-stack-proofs-2/review.md) separately inspected proof/source controls, all GPU aggregates, regressions and scope. [Verification](verification.json) records the final receipt.

The handwritten original JS and Rust/Wasm controls retain source loops and collection stages with ordinary JIT/release/library optimizations. Their polynomial helpers reuse the shifted operand; Rust output storage is preallocated/reused while intermediate Vec stages remain normal source operations. Native output and runtime wrappers differ and are paid in the comparison. Checked Ink JS wins against the original JS control in these large fixtures; checked Ink Wasm still loses to original Rust/Wasm on map/fusion/sum controls, and wins where recurrence work is eliminated. An expert handwritten closed-form Rust implementation was not measured in this batch. These results establish neither universal language superiority nor parity with all handwritten optimised outputs.

## Database and reproduction

Imported **288 authenticated measured Wasm observations**, taking the canonical database to **2510 observations**, without changing the 765 proof snapshot ([import receipt](canonical-observation-import.json)). They include the measured Ink and Rust/Wasm variants and only use exported linear-memory highwater for `peak_bytes`. Host/GPU memory is unmeasured. JS and GPU latency/counter evidence stays in the archive without invented canonical memory observations.

Current proof snapshot: `7ecbce6e14b1273e771e4634b61e92d0f85929934c0d4e165b1f14c7c8660c6c`.

Preserved 732 snapshot: `52f1b3564ceb41b36a12ae6fca2d067e1bd2a11ec64ab3556d31ef6cdd37e12b`.

Unchanged frozen compiler SHA256: `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`.

Every interval is in [the browser report](browser-REPORT.md) and [Node report](node-REPORT.md); [browser screenshot](browser-evidence.jpg), [raw browser trials](browser-results.json), [raw Node trials](node-results.json) and [reproduction instructions](../../bench/web-stack-proofs-2/README.md) are linked. Use fresh report directories and stop compilation/testing before timing. All changes and publication are local in this research checkout; no commits, pushes or pull requests were created.
