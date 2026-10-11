# General39 scoped comparison review

Measured binary is dc9e252370443c7f535a9ecb7c8bb7e4905115824a26dbd4fd2e6d7d9f66e3cd before final remote integration; measured files remain frozen. Integration parity/untimed correctness is separate evidence.
Every source/task/version has zero DB applications; this evaluates core lowering/runtime changes under unchanged selected semantics and schema1cost policy, not performance attributable to new DB laws.
Ratios reference/current; above1 favors candidate. Equal-cell geometric means describe these cells only. No pooling across hosts, ownership/capture boundaries or reference languages.
Five within-process paired rounds, nominal percentile intervals and many uncorrected cell comparisons are exploratory; classification counts do not establish general superiority or independent-process confidence.
Native Ink results are generated C versus handwritten native Rust. Full-call Rust-Wasm adapter and resident Rust-Wasm are separate measured boundaries.
Resident GPU input is supported only by candidate; its338 complete validation frames and198 timed cells are audited, but no baseline resident speed ratio exists. Full GPU requests do have baseline comparisons.
Candidate and baseline full GPU routes were actual GPU on all recorded availability frames; unsupported/fallback routes are not represented as GPU performance.
GPU arbitrary ordered fold remains serial within its shader; actual GPU execution does not imply parallel reduction.
Overwrite tasks are fixed snapshot calls with unique cadence updates and dense input ABI, not maintained-state or incremental proof authority.
Original JS expert aggregate includes Array.from-based sparse overwrite. Stronger predeclared one-loop same-operation control challenge is separately retained: Node1.650/browser0.968 reference-over-current descriptive ratios, versus original3.376/3.121. Cross-task phases limit causal inference; no3x optimized-JS headline is warranted.
Absolute host/device numbers, startup/setup and common full-output consumer overhead remain in raw results; no cold-start, universal language ranking or end-to-end application improvement claim.

Ratios and classification counts are descriptive, with the direction above. Faster / slower / inconclusive are the per-cell nominal classifications.

| Host | Boundary | Reference | Cells | Faster / slower / inconclusive | Cell geomean | Point-ratio range |
|---|---|---|---:|---:|---:|---:|
|node|captured-js-owned|baseline_js_owned|180|20 / 17 / 143|1.001|0.121–1.761|
|node|captured-js-owned|expert_js_owned|180|65 / 21 / 94|1.273|0.105–5.191|
|node|captured-js-value|baseline_js_owned|18|4 / 1 / 13|1.041|0.844–1.271|
|node|captured-js-value|expert_js_owned|18|15 / 0 / 3|1.587|1.037–2.236|
|node|captured-wasm-owned|baseline_wasm_full|180|19 / 10 / 151|1.024|0.334–5.344|
|node|captured-wasm-owned|rust_wasm_full|180|0 / 169 / 11|0.435|0.158–1.296|
|node|captured-wasm-value|baseline_wasm_full|18|2 / 0 / 16|0.988|0.766–1.160|
|node|captured-wasm-value|rust_wasm_full|18|0 / 18 / 0|0.471|0.165–0.941|
|node|resident-wasm-destination|baseline_wasm_prepared|180|24 / 15 / 141|1.008|0.537–3.996|
|node|resident-wasm-destination|rust_wasm_prepared|180|7 / 70 / 103|0.915|0.493–2.655|
|node|resident-wasm-scalar|baseline_wasm_prepared|18|0 / 1 / 17|0.990|0.836–1.151|
|node|resident-wasm-scalar|rust_wasm_prepared|18|1 / 6 / 11|0.878|0.578–1.181|
|browser|captured-js-owned|baseline_js_owned|180|28 / 10 / 142|1.012|0.754–1.314|
|browser|captured-js-owned|expert_js_owned|180|69 / 26 / 85|1.253|0.694–4.747|
|browser|captured-js-value|baseline_js_owned|18|1 / 0 / 17|0.996|0.889–1.085|
|browser|captured-js-value|expert_js_owned|18|17 / 0 / 1|1.564|1.030–2.385|
|browser|captured-wasm-owned|baseline_wasm_full|180|17 / 17 / 146|1.001|0.695–1.430|
|browser|captured-wasm-owned|rust_wasm_full|180|0 / 180 / 0|0.464|0.243–0.645|
|browser|captured-wasm-value|baseline_wasm_full|18|0 / 2 / 16|0.987|0.879–1.074|
|browser|captured-wasm-value|rust_wasm_full|18|0 / 16 / 2|0.545|0.178–0.979|
|browser|instrumented-full-gpu-request|baseline_gpu_requested|198|31 / 12 / 155|1.028|0.403–1.587|
|browser|resident-wasm-destination|baseline_wasm_prepared|180|17 / 21 / 142|0.999|0.754–1.303|
|browser|resident-wasm-destination|rust_wasm_prepared|180|3 / 105 / 72|0.904|0.619–1.126|
|browser|resident-wasm-scalar|baseline_wasm_prepared|18|2 / 4 / 12|0.992|0.870–1.070|
|browser|resident-wasm-scalar|rust_wasm_prepared|18|0 / 6 / 12|0.931|0.775–1.044|
|native|captured-native-destination|baseline|180|39 / 16 / 125|1.034|0.770–1.684|
|native|captured-native-destination|expert|180|28 / 99 / 53|0.756|0.207–2.129|
|native|captured-native-scalar|baseline|18|2 / 2 / 14|1.004|0.921–1.154|
|native|captured-native-scalar|expert|18|3 / 2 / 13|1.001|0.908–1.303|
|native|resident-native-destination|baseline|180|50 / 10 / 120|1.079|0.697–2.487|
|native|resident-native-destination|expert|180|24 / 114 / 42|0.626|0.117–2.501|
|native|resident-native-scalar|baseline|18|2 / 1 / 15|1.006|0.862–1.252|
|native|resident-native-scalar|expert|18|1 / 8 / 9|0.957|0.770–1.034|

Family rows retain the same host/boundary/reference separation.

| Host | Boundary | Family | Reference | Cells | Faster / slower / inconclusive | Cell geomean |
|---|---|---|---|---:|---:|---:|
|node|captured-js-owned|filter-compaction|baseline_js_owned|36|9 / 1 / 26|1.052|
|node|captured-js-owned|map|baseline_js_owned|18|1 / 3 / 14|1.005|
|node|captured-js-owned|neighbor-stencil|baseline_js_owned|18|1 / 3 / 14|0.898|
|node|captured-js-owned|overwrite-recompute|baseline_js_owned|36|0 / 4 / 32|0.975|
|node|captured-js-owned|piecewise-map|baseline_js_owned|18|0 / 2 / 16|0.964|
|node|captured-js-owned|prefix-scan|baseline_js_owned|18|7 / 1 / 10|1.084|
|node|captured-js-owned|sparse-overwrite|baseline_js_owned|36|2 / 3 / 31|1.009|
|node|captured-js-owned|filter-compaction|expert_js_owned|36|13 / 6 / 17|1.028|
|node|captured-js-owned|map|expert_js_owned|18|5 / 4 / 9|1.054|
|node|captured-js-owned|neighbor-stencil|expert_js_owned|18|1 / 3 / 14|0.881|
|node|captured-js-owned|overwrite-recompute|expert_js_owned|36|1 / 5 / 30|0.967|
|node|captured-js-owned|piecewise-map|expert_js_owned|18|0 / 3 / 15|0.989|
|node|captured-js-owned|prefix-scan|expert_js_owned|18|9 / 0 / 9|1.082|
|node|captured-js-owned|sparse-overwrite|expert_js_owned|36|36 / 0 / 0|3.376|
|node|captured-js-value|ordered-reduction|baseline_js_owned|18|4 / 1 / 13|1.041|
|node|captured-js-value|ordered-reduction|expert_js_owned|18|15 / 0 / 3|1.587|
|node|captured-wasm-owned|filter-compaction|baseline_wasm_full|36|5 / 3 / 28|0.995|
|node|captured-wasm-owned|map|baseline_wasm_full|18|2 / 2 / 14|1.043|
|node|captured-wasm-owned|neighbor-stencil|baseline_wasm_full|18|0 / 0 / 18|0.992|
|node|captured-wasm-owned|overwrite-recompute|baseline_wasm_full|36|5 / 2 / 29|1.095|
|node|captured-wasm-owned|piecewise-map|baseline_wasm_full|18|2 / 0 / 16|1.005|
|node|captured-wasm-owned|prefix-scan|baseline_wasm_full|18|1 / 0 / 17|1.020|
|node|captured-wasm-owned|sparse-overwrite|baseline_wasm_full|36|4 / 3 / 29|1.001|
|node|captured-wasm-owned|filter-compaction|rust_wasm_full|36|0 / 36 / 0|0.424|
|node|captured-wasm-owned|map|rust_wasm_full|18|0 / 18 / 0|0.445|
|node|captured-wasm-owned|neighbor-stencil|rust_wasm_full|18|0 / 18 / 0|0.434|
|node|captured-wasm-owned|overwrite-recompute|rust_wasm_full|36|0 / 28 / 8|0.440|
|node|captured-wasm-owned|piecewise-map|rust_wasm_full|18|0 / 18 / 0|0.419|
|node|captured-wasm-owned|prefix-scan|rust_wasm_full|18|0 / 16 / 2|0.447|
|node|captured-wasm-owned|sparse-overwrite|rust_wasm_full|36|0 / 35 / 1|0.436|
|node|captured-wasm-value|ordered-reduction|baseline_wasm_full|18|2 / 0 / 16|0.988|
|node|captured-wasm-value|ordered-reduction|rust_wasm_full|18|0 / 18 / 0|0.471|
|node|resident-wasm-destination|filter-compaction|baseline_wasm_prepared|36|8 / 2 / 26|1.020|
|node|resident-wasm-destination|map|baseline_wasm_prepared|18|3 / 1 / 14|0.958|
|node|resident-wasm-destination|neighbor-stencil|baseline_wasm_prepared|18|1 / 0 / 17|1.029|
|node|resident-wasm-destination|overwrite-recompute|baseline_wasm_prepared|36|1 / 7 / 28|1.027|
|node|resident-wasm-destination|piecewise-map|baseline_wasm_prepared|18|2 / 3 / 13|0.990|
|node|resident-wasm-destination|prefix-scan|baseline_wasm_prepared|18|3 / 2 / 13|0.982|
|node|resident-wasm-destination|sparse-overwrite|baseline_wasm_prepared|36|6 / 0 / 30|1.013|
|node|resident-wasm-destination|filter-compaction|rust_wasm_prepared|36|2 / 14 / 20|0.962|
|node|resident-wasm-destination|map|rust_wasm_prepared|18|0 / 8 / 10|0.954|
|node|resident-wasm-destination|neighbor-stencil|rust_wasm_prepared|18|0 / 6 / 12|0.933|
|node|resident-wasm-destination|overwrite-recompute|rust_wasm_prepared|36|2 / 5 / 29|0.964|
|node|resident-wasm-destination|piecewise-map|rust_wasm_prepared|18|3 / 5 / 10|1.005|
|node|resident-wasm-destination|prefix-scan|rust_wasm_prepared|18|0 / 2 / 16|0.926|
|node|resident-wasm-destination|sparse-overwrite|rust_wasm_prepared|36|0 / 30 / 6|0.760|
|node|resident-wasm-scalar|ordered-reduction|baseline_wasm_prepared|18|0 / 1 / 17|0.990|
|node|resident-wasm-scalar|ordered-reduction|rust_wasm_prepared|18|1 / 6 / 11|0.878|
|browser|captured-js-owned|filter-compaction|baseline_js_owned|36|11 / 0 / 25|1.033|
|browser|captured-js-owned|map|baseline_js_owned|18|0 / 4 / 14|0.967|
|browser|captured-js-owned|neighbor-stencil|baseline_js_owned|18|3 / 2 / 13|1.006|
|browser|captured-js-owned|overwrite-recompute|baseline_js_owned|36|1 / 2 / 33|0.998|
|browser|captured-js-owned|piecewise-map|baseline_js_owned|18|1 / 1 / 16|1.000|
|browser|captured-js-owned|prefix-scan|baseline_js_owned|18|6 / 0 / 12|1.030|
|browser|captured-js-owned|sparse-overwrite|baseline_js_owned|36|6 / 1 / 29|1.030|
|browser|captured-js-owned|filter-compaction|expert_js_owned|36|6 / 7 / 23|1.006|
|browser|captured-js-owned|map|expert_js_owned|18|6 / 4 / 8|0.998|
|browser|captured-js-owned|neighbor-stencil|expert_js_owned|18|1 / 6 / 11|0.939|
|browser|captured-js-owned|overwrite-recompute|expert_js_owned|36|12 / 0 / 24|1.038|
|browser|captured-js-owned|piecewise-map|expert_js_owned|18|3 / 6 / 9|0.952|
|browser|captured-js-owned|prefix-scan|expert_js_owned|18|5 / 3 / 10|1.007|
|browser|captured-js-owned|sparse-overwrite|expert_js_owned|36|36 / 0 / 0|3.121|
|browser|captured-js-value|ordered-reduction|baseline_js_owned|18|1 / 0 / 17|0.996|
|browser|captured-js-value|ordered-reduction|expert_js_owned|18|17 / 0 / 1|1.564|
|browser|captured-wasm-owned|filter-compaction|baseline_wasm_full|36|3 / 5 / 28|1.000|
|browser|captured-wasm-owned|map|baseline_wasm_full|18|3 / 1 / 14|1.005|
|browser|captured-wasm-owned|neighbor-stencil|baseline_wasm_full|18|0 / 5 / 13|0.962|
|browser|captured-wasm-owned|overwrite-recompute|baseline_wasm_full|36|6 / 1 / 29|1.009|
|browser|captured-wasm-owned|piecewise-map|baseline_wasm_full|18|2 / 0 / 16|0.998|
|browser|captured-wasm-owned|prefix-scan|baseline_wasm_full|18|1 / 1 / 16|1.000|
|browser|captured-wasm-owned|sparse-overwrite|baseline_wasm_full|36|2 / 4 / 30|1.014|
|browser|captured-wasm-owned|filter-compaction|rust_wasm_full|36|0 / 36 / 0|0.464|
|browser|captured-wasm-owned|map|rust_wasm_full|18|0 / 18 / 0|0.471|
|browser|captured-wasm-owned|neighbor-stencil|rust_wasm_full|18|0 / 18 / 0|0.456|
|browser|captured-wasm-owned|overwrite-recompute|rust_wasm_full|36|0 / 36 / 0|0.474|
|browser|captured-wasm-owned|piecewise-map|rust_wasm_full|18|0 / 18 / 0|0.468|
|browser|captured-wasm-owned|prefix-scan|rust_wasm_full|18|0 / 18 / 0|0.463|
|browser|captured-wasm-owned|sparse-overwrite|rust_wasm_full|36|0 / 36 / 0|0.453|
|browser|captured-wasm-value|ordered-reduction|baseline_wasm_full|18|0 / 2 / 16|0.987|
|browser|captured-wasm-value|ordered-reduction|rust_wasm_full|18|0 / 16 / 2|0.545|
|browser|instrumented-full-gpu-request|filter-compaction|baseline_gpu_requested|36|4 / 5 / 27|1.033|
|browser|instrumented-full-gpu-request|map|baseline_gpu_requested|18|2 / 0 / 16|1.034|
|browser|instrumented-full-gpu-request|neighbor-stencil|baseline_gpu_requested|18|3 / 0 / 15|1.005|
|browser|instrumented-full-gpu-request|ordered-reduction|baseline_gpu_requested|18|4 / 1 / 13|1.024|
|browser|instrumented-full-gpu-request|overwrite-recompute|baseline_gpu_requested|36|5 / 1 / 30|1.037|
|browser|instrumented-full-gpu-request|piecewise-map|baseline_gpu_requested|18|4 / 1 / 13|1.016|
|browser|instrumented-full-gpu-request|prefix-scan|baseline_gpu_requested|18|2 / 1 / 15|1.022|
|browser|instrumented-full-gpu-request|sparse-overwrite|baseline_gpu_requested|36|7 / 3 / 26|1.036|
|browser|resident-wasm-destination|filter-compaction|baseline_wasm_prepared|36|3 / 4 / 29|0.992|
|browser|resident-wasm-destination|map|baseline_wasm_prepared|18|3 / 2 / 13|1.017|
|browser|resident-wasm-destination|neighbor-stencil|baseline_wasm_prepared|18|3 / 2 / 13|0.988|
|browser|resident-wasm-destination|overwrite-recompute|baseline_wasm_prepared|36|2 / 5 / 29|0.997|
|browser|resident-wasm-destination|piecewise-map|baseline_wasm_prepared|18|1 / 1 / 16|0.989|
|browser|resident-wasm-destination|prefix-scan|baseline_wasm_prepared|18|1 / 1 / 16|1.004|
|browser|resident-wasm-destination|sparse-overwrite|baseline_wasm_prepared|36|4 / 6 / 26|1.005|
|browser|resident-wasm-destination|filter-compaction|rust_wasm_prepared|36|3 / 13 / 20|0.947|
|browser|resident-wasm-destination|map|rust_wasm_prepared|18|0 / 8 / 10|0.957|
|browser|resident-wasm-destination|neighbor-stencil|rust_wasm_prepared|18|0 / 7 / 11|0.920|
|browser|resident-wasm-destination|overwrite-recompute|rust_wasm_prepared|36|0 / 31 / 5|0.919|
|browser|resident-wasm-destination|piecewise-map|rust_wasm_prepared|18|0 / 10 / 8|0.939|
|browser|resident-wasm-destination|prefix-scan|rust_wasm_prepared|18|0 / 5 / 13|0.985|
|browser|resident-wasm-destination|sparse-overwrite|rust_wasm_prepared|36|0 / 31 / 5|0.770|
|browser|resident-wasm-scalar|ordered-reduction|baseline_wasm_prepared|18|2 / 4 / 12|0.992|
|browser|resident-wasm-scalar|ordered-reduction|rust_wasm_prepared|18|0 / 6 / 12|0.931|
|native|captured-native-destination|filter-compaction|baseline|36|20 / 1 / 15|1.124|
|native|captured-native-destination|map|baseline|18|6 / 2 / 10|1.024|
|native|captured-native-destination|neighbor-stencil|baseline|18|2 / 4 / 12|0.990|
|native|captured-native-destination|overwrite-recompute|baseline|36|5 / 2 / 29|1.012|
|native|captured-native-destination|piecewise-map|baseline|18|1 / 1 / 16|1.031|
|native|captured-native-destination|prefix-scan|baseline|18|1 / 2 / 15|0.998|
|native|captured-native-destination|sparse-overwrite|baseline|36|4 / 4 / 28|1.018|
|native|captured-native-destination|filter-compaction|expert|36|0 / 34 / 2|0.606|
|native|captured-native-destination|map|expert|18|0 / 4 / 14|0.968|
|native|captured-native-destination|neighbor-stencil|expert|18|4 / 12 / 2|0.920|
|native|captured-native-destination|overwrite-recompute|expert|36|18 / 0 / 18|1.056|
|native|captured-native-destination|piecewise-map|expert|18|4 / 4 / 10|0.999|
|native|captured-native-destination|prefix-scan|expert|18|0 / 13 / 5|0.881|
|native|captured-native-destination|sparse-overwrite|expert|36|2 / 32 / 2|0.435|
|native|captured-native-scalar|ordered-reduction|baseline|18|2 / 2 / 14|1.004|
|native|captured-native-scalar|ordered-reduction|expert|18|3 / 2 / 13|1.001|
|native|resident-native-destination|filter-compaction|baseline|36|19 / 0 / 17|1.315|
|native|resident-native-destination|map|baseline|18|3 / 2 / 13|1.034|
|native|resident-native-destination|neighbor-stencil|baseline|18|5 / 2 / 11|1.008|
|native|resident-native-destination|overwrite-recompute|baseline|36|4 / 3 / 29|1.004|
|native|resident-native-destination|piecewise-map|baseline|18|2 / 2 / 14|1.027|
|native|resident-native-destination|prefix-scan|baseline|18|2 / 1 / 15|1.027|
|native|resident-native-destination|sparse-overwrite|baseline|36|15 / 0 / 21|1.058|
|native|resident-native-destination|filter-compaction|expert|36|0 / 33 / 3|0.522|
|native|resident-native-destination|map|expert|18|0 / 5 / 13|0.940|
|native|resident-native-destination|neighbor-stencil|expert|18|0 / 18 / 0|0.838|
|native|resident-native-destination|overwrite-recompute|expert|36|21 / 1 / 14|1.026|
|native|resident-native-destination|piecewise-map|expert|18|3 / 5 / 10|0.960|
|native|resident-native-destination|prefix-scan|expert|18|0 / 16 / 2|0.771|
|native|resident-native-destination|sparse-overwrite|expert|36|0 / 36 / 0|0.234|
|native|resident-native-scalar|ordered-reduction|baseline|18|2 / 1 / 15|1.006|
|native|resident-native-scalar|ordered-reduction|expert|18|1 / 8 / 9|0.957|
