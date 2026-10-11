# Provisional complete web-stack comparison

All predeclared cells retained. Separate hosts, ownership boundaries and scalar/vector results. Ratio >1 favors candidate/current. Geometric means are descriptive; cell classifications use nominal five-round intervals without multiplicity correction. External concurrent work was observed; no isolated-host or universal superiority inference. No model fitted here.

| Host | Result | Boundary | Reference | Current | Ratio | Faster / slower / uncertain |
|---|---|---|---|---|---:|---:|
| node | scalar_u32 | captured-js-value | baseline_js_owned | candidate_js_owned | 0.984× | 2 / 2 / 32 |
| node | scalar_u32 | captured-js-value | expert_js_owned | candidate_js_owned | 1.059× | 17 / 12 / 7 |
| node | scalar_u32 | captured-rust-wasm-value | baseline_rust_wasm_owned | candidate_rust_wasm_owned | 1.142× | 6 / 0 / 30 |
| node | scalar_u32 | captured-rust-wasm-value | expert_rust_wasm_owned | candidate_rust_wasm_owned | 0.949× | 2 / 17 / 17 |
| node | scalar_u32 | captured-wasm-value | baseline_wasm_full | candidate_wasm_full | 0.981× | 3 / 2 / 31 |
| node | scalar_u32 | captured-wasm-value | rust_wasm_full | candidate_wasm_full | 0.425× | 1 / 29 / 6 |
| node | scalar_u32 | resident-rust-wasm-scalar | baseline_rust_wasm_resident_owned | candidate_rust_wasm_resident_owned | 1.214× | 27 / 0 / 9 |
| node | scalar_u32 | resident-rust-wasm-scalar | expert_rust_wasm_resident_owned | candidate_rust_wasm_resident_owned | 1.001× | 8 / 18 / 10 |
| node | scalar_u32 | resident-wasm-scalar | baseline_wasm_prepared | candidate_wasm_prepared | 1.019× | 3 / 3 / 30 |
| node | scalar_u32 | resident-wasm-scalar | rust_wasm_prepared | candidate_wasm_prepared | 1.006× | 6 / 12 / 18 |
| node | vector | captured-js-owned | baseline_js_owned | candidate_js_owned | 1.007× | 20 / 14 / 218 |
| node | vector | captured-js-owned | expert_js_owned | candidate_js_owned | 0.878× | 61 / 61 / 130 |
| node | vector | captured-rust-wasm-owned | baseline_rust_wasm_owned | candidate_rust_wasm_owned | 0.988× | 22 / 34 / 196 |
| node | vector | captured-rust-wasm-owned | expert_rust_wasm_owned | candidate_rust_wasm_owned | 0.944× | 8 / 83 / 161 |
| node | vector | captured-wasm-owned | baseline_wasm_full | candidate_wasm_full | 1.602× | 214 / 0 / 38 |
| node | vector | captured-wasm-owned | rust_wasm_full | candidate_wasm_full | 0.701× | 2 / 169 / 81 |
| node | vector | resident-rust-wasm-owned-readback | baseline_rust_wasm_resident_owned | candidate_rust_wasm_resident_owned | 1.000× | 20 / 22 / 210 |
| node | vector | resident-rust-wasm-owned-readback | expert_rust_wasm_resident_owned | candidate_rust_wasm_resident_owned | 0.961× | 11 / 68 / 173 |
| node | vector | resident-wasm-destination | baseline_wasm_prepared | candidate_wasm_prepared | 1.014× | 29 / 25 / 198 |
| node | vector | resident-wasm-destination | rust_wasm_prepared | candidate_wasm_prepared | 0.925× | 11 / 101 / 140 |
| browser | scalar_u32 | captured-js-value | baseline_js_owned | candidate_js_owned | 1.005× | 4 / 0 / 32 |
| browser | scalar_u32 | captured-js-value | expert_js_owned | candidate_js_owned | 0.769× | 9 / 19 / 8 |
| browser | scalar_u32 | captured-rust-wasm-value | baseline_rust_wasm_owned | candidate_rust_wasm_owned | 1.025× | 5 / 2 / 29 |
| browser | scalar_u32 | captured-rust-wasm-value | expert_rust_wasm_owned | candidate_rust_wasm_owned | 0.977× | 8 / 15 / 13 |
| browser | scalar_u32 | captured-wasm-value | baseline_wasm_full | candidate_wasm_full | 1.017× | 7 / 3 / 26 |
| browser | scalar_u32 | captured-wasm-value | rust_wasm_full | candidate_wasm_full | 0.546× | 4 / 29 / 3 |
| browser | scalar_u32 | instrumented-full-gpu-request | baseline_gpu_requested | candidate_gpu_requested | 1.007× | 5 / 3 / 28 |
| browser | scalar_u32 | resident-gpu-input-owned-readback | baseline_gpu_resident | candidate_gpu_resident | 1.020× | 6 / 1 / 29 |
| browser | scalar_u32 | resident-rust-wasm-scalar | baseline_rust_wasm_resident_owned | candidate_rust_wasm_resident_owned | 1.140× | 33 / 0 / 3 |
| browser | scalar_u32 | resident-rust-wasm-scalar | expert_rust_wasm_resident_owned | candidate_rust_wasm_resident_owned | 1.068× | 16 / 18 / 2 |
| browser | scalar_u32 | resident-wasm-scalar | baseline_wasm_prepared | candidate_wasm_prepared | 0.996× | 2 / 4 / 30 |
| browser | scalar_u32 | resident-wasm-scalar | rust_wasm_prepared | candidate_wasm_prepared | 1.239× | 19 / 3 / 14 |
| browser | vector | captured-js-owned | baseline_js_owned | candidate_js_owned | 1.010× | 40 / 20 / 192 |
| browser | vector | captured-js-owned | expert_js_owned | candidate_js_owned | 1.137× | 202 / 17 / 33 |
| browser | vector | captured-rust-wasm-owned | baseline_rust_wasm_owned | candidate_rust_wasm_owned | 0.998× | 22 / 24 / 206 |
| browser | vector | captured-rust-wasm-owned | expert_rust_wasm_owned | candidate_rust_wasm_owned | 0.969× | 7 / 88 / 157 |
| browser | vector | captured-wasm-owned | baseline_wasm_full | candidate_wasm_full | 1.495× | 249 / 0 / 3 |
| browser | vector | captured-wasm-owned | rust_wasm_full | candidate_wasm_full | 0.762× | 2 / 191 / 59 |
| browser | vector | instrumented-full-gpu-request | baseline_gpu_requested | candidate_gpu_requested | 1.037× | 68 / 16 / 168 |
| browser | vector | resident-gpu-input-owned-readback | baseline_gpu_resident | candidate_gpu_resident | 1.065× | 77 / 6 / 169 |
| browser | vector | resident-rust-wasm-owned-readback | baseline_rust_wasm_resident_owned | candidate_rust_wasm_resident_owned | 0.997× | 18 / 28 / 206 |
| browser | vector | resident-rust-wasm-owned-readback | expert_rust_wasm_resident_owned | candidate_rust_wasm_resident_owned | 0.971× | 8 / 85 / 159 |
| browser | vector | resident-wasm-destination | baseline_wasm_prepared | candidate_wasm_prepared | 1.000× | 20 / 28 / 204 |
| browser | vector | resident-wasm-destination | rust_wasm_prepared | candidate_wasm_prepared | 0.980× | 11 / 84 / 157 |
| native | scalar_u32 | captured-native-scalar | baseline | candidate | 0.998× | 3 / 3 / 30 |
| native | scalar_u32 | captured-native-scalar | baseline_rust | candidate_rust | 1.137× | 26 / 1 / 9 |
| native | scalar_u32 | captured-native-scalar | expert | candidate | 1.096× | 11 / 2 / 23 |
| native | scalar_u32 | captured-native-scalar | expert_rust_owned | candidate_rust | 0.875× | 7 / 19 / 10 |
| native | scalar_u32 | resident-native-scalar | baseline | candidate | 0.974× | 1 / 4 / 31 |
| native | scalar_u32 | resident-native-scalar | baseline_rust | candidate_rust | 1.194× | 29 / 0 / 7 |
| native | scalar_u32 | resident-native-scalar | expert | candidate | 1.044× | 11 / 5 / 20 |
| native | scalar_u32 | resident-native-scalar | expert_rust_owned | candidate_rust | 0.757× | 8 / 19 / 9 |
| native | vector | captured-native-destination | baseline | candidate | 0.984× | 14 / 25 / 213 |
| native | vector | captured-native-destination | expert | candidate | 0.732× | 17 / 152 / 83 |
| native | vector | captured-native-owned | baseline_rust | candidate_rust | 1.020× | 80 / 32 / 140 |
| native | vector | captured-native-owned | expert_rust_owned | candidate_rust | 0.560× | 3 / 221 / 28 |
| native | vector | resident-native-destination | baseline | candidate | 1.005× | 22 / 22 / 208 |
| native | vector | resident-native-destination | expert | candidate | 0.617× | 9 / 167 / 76 |
| native | vector | resident-native-owned | baseline_rust | candidate_rust | 1.026× | 77 / 35 / 140 |
| native | vector | resident-native-owned | expert_rust_owned | candidate_rust | 0.477× | 5 / 222 / 25 |

All 12 benchmark families selected zero DB applications. Old/new differences measure compiler/host capabilities. JS and C kernels are byte-identical in 11/12 families; all 12 emitted Rust methods change, but their public adapter still copies both inputs into owned Vec values. GPU rows include declared host counters; complete and resident requests remain separate.

Original per-cell ratios, raw observations, correctness verdicts, artifact hashes, process snapshots and frozen heldout evaluation are retained. These diagnostic measurements do not confer mathematical proof authority.
