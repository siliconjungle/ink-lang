# General40 Node comparison — provisional

All results below remain provisional: an external build and benchmark began near the timing end. The raw process snapshots and whole run are retained. No retuning or rerun is used to remove losses. These are five within-process paired rounds with nominal bootstrap intervals, not independent process replication. Ratios are reference/current; values above1 favor the candidate. Counts are faster/slower/inconclusive cells. Ownership, scalar/vector and transport cohorts stay separate.

Both compilers applied zero database rewrites. Eleven of twelve JS modules and eleven of twelve emitted C sources are byte-identical; compaction_chain is the changed case. All twelve exact Rust primary methods change through the generic borrow/reuse emitter, removing explicit Vec clones and reusing eligible intermediates. Static source differences do not prove dynamic cost. Broad full-C-Wasm gains cannot be attributed to rewritten kernels when11/12C sources are unchanged.

| Boundary | Reference → candidate | Cells | Ratio | F/S/U |
|---|---|---:|---:|---|
| captured-js-owned | baseline_js_owned → candidate_js_owned | 252 | 1.007 | 20/14/218 |
| captured-js-owned | expert_js_owned → candidate_js_owned | 252 | 0.878 | 61/61/130 |
| captured-js-value | baseline_js_owned → candidate_js_owned | 36 | 0.984 | 2/2/32 |
| captured-js-value | expert_js_owned → candidate_js_owned | 36 | 1.059 | 17/12/7 |
| captured-rust-wasm-owned | baseline_rust_wasm_owned → candidate_rust_wasm_owned | 252 | 0.988 | 22/34/196 |
| captured-rust-wasm-owned | expert_rust_wasm_owned → candidate_rust_wasm_owned | 252 | 0.944 | 8/83/161 |
| captured-rust-wasm-value | baseline_rust_wasm_owned → candidate_rust_wasm_owned | 36 | 1.142 | 6/0/30 |
| captured-rust-wasm-value | expert_rust_wasm_owned → candidate_rust_wasm_owned | 36 | 0.949 | 2/17/17 |
| captured-wasm-owned | baseline_wasm_full → candidate_wasm_full | 252 | 1.602 | 214/0/38 |
| captured-wasm-owned | rust_wasm_full → candidate_wasm_full | 252 | 0.701 | 2/169/81 |
| captured-wasm-value | baseline_wasm_full → candidate_wasm_full | 36 | 0.981 | 3/2/31 |
| captured-wasm-value | rust_wasm_full → candidate_wasm_full | 36 | 0.425 | 1/29/6 |
| resident-rust-wasm-owned-readback | baseline_rust_wasm_resident_owned → candidate_rust_wasm_resident_owned | 252 | 1.000 | 20/22/210 |
| resident-rust-wasm-owned-readback | expert_rust_wasm_resident_owned → candidate_rust_wasm_resident_owned | 252 | 0.961 | 11/68/173 |
| resident-rust-wasm-scalar | baseline_rust_wasm_resident_owned → candidate_rust_wasm_resident_owned | 36 | 1.214 | 27/0/9 |
| resident-rust-wasm-scalar | expert_rust_wasm_resident_owned → candidate_rust_wasm_resident_owned | 36 | 1.001 | 8/18/10 |
| resident-wasm-destination | baseline_wasm_prepared → candidate_wasm_prepared | 252 | 1.014 | 29/25/198 |
| resident-wasm-destination | rust_wasm_prepared → candidate_wasm_prepared | 252 | 0.925 | 11/101/140 |
| resident-wasm-scalar | baseline_wasm_prepared → candidate_wasm_prepared | 36 | 1.019 | 3/3/30 |
| resident-wasm-scalar | rust_wasm_prepared → candidate_wasm_prepared | 36 | 1.006 | 6/12/18 |

The four added families expose remaining limits. Against strong JS, compaction_chain is0.388x with0/31/5cells, scan_chain0.947x with1/1/16, gather_reverse1.074x with4/1/13, and scalar dot_ordered0.702x with0/12/6. Against strong full Rust-Wasm destination controls, the same families are0.644x,0.745x,0.700x and0.390x. Against resident Rust-Wasm destination controls, they are0.949x,1.030x,0.920x and1.131x; many cells remain inconclusive. The separate emitted Rust owned cohorts also retain losses and cannot be pooled with destinations.

Relative to the old compiler, vector full-C-Wasm improves in many cells, while direct JS and resident C/Rust vectors are mostly inconclusive. Rust scalar reduction cohorts show larger old→new ratios, consistent with changed source machinery but still subject to noise/contended-host limits. The native Rust/C and actual GPU timed cohorts are not yet part of this Node-only summary.

Every family and loss is preserved in node-overview-provisional.json and all2880paired comparisons in node-summary.json. Eight reused Engine39 families remain exploratory. The fitted model/predictions froze before this heldout comparison (freeze SHAce384e59…); no model is fed back into this fixed-model compiler comparison. No universal language ranking, broad defeat of hand-fused controls or new proof-law speed claim is supported.
