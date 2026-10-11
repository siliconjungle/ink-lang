# Batch38 regression diagnosis before planner changes

Eight of eleven Node loss cells retain a point-estimate loss in all three fresh processes. The low32 resident case and both full-call cases cross direction; original archived results remain preserved.
At large extents the paired module-wide no-vectorizer intervention often reverses the resident-Wasm fusion loss. Both original versions contain vectorized loops. This demonstrates compilation-transformation sensitivity, not a universal SIMD failure or a recommendation to disable vectorization globally.
Archived fused JS loses at high4096/high65536 in both orientations despite fewer arrays/traversals. Staged no-padding controls stay closer to prior. Their Function/sloppy compilation context and renamed function differ from archived strict ESM, so a matched unchanged-clone baseline is needed before single-factor causal attribution.
Removing four neutral +0 additions does not consistently resolve JS losses. Existing helper bodies are already inlined in generated source.
Checked JS has fewer observed primary deoptimization events (1 versus 11) in the instrumented representative profiles. More checked deoptimizations is not supported. Exact JIT mechanism remains unresolved.
Static LLVM and printed V8 Wasm code expose integer division/remainder and mixed scalar/vector code. Instruction sites are not dynamic operation counts or cycle measurements.
Nine browser cells remain pending actual-browser reproduction. Node profiles do not establish browser-engine causality; no classified native loss was present in the archived batch.

## Fresh Node cases

Ratios are prior/checked; values below 1 favor prior. Intervals and all controls are retained in the JSON. Browser cases remain pending.

| Frame | Boundary | Three fresh process ratios | Reproduction |
|---|---|---|---|
| left_padded_zip_heldout_u32-high-4096 | captured-js-owned | 0.9135, 0.8922, 0.8643 | loss_point_direction_all_three_processes |
| left_padded_zip_heldout_u32-high-65536 | captured-js-owned | 0.8844, 0.9039, 0.9022 | loss_point_direction_all_three_processes |
| left_padded_zip_heldout_u32-high-65536 | resident-wasm-destination | 0.9073, 0.9290, 0.9168 | loss_point_direction_all_three_processes |
| left_padded_zip_heldout_u32-low-32 | resident-wasm-destination | 1.1363, 0.9945, 1.0273 | not_consistent_across_three_processes |
| left_padded_zip_heldout_u32-low-65536 | resident-wasm-destination | 0.9307, 0.9186, 0.8622 | loss_point_direction_all_three_processes |
| right_padded_zip_heldout_u32-high-4096 | captured-js-owned | 0.9116, 0.8864, 0.8965 | loss_point_direction_all_three_processes |
| right_padded_zip_heldout_u32-high-65536 | captured-js-owned | 0.9020, 0.8844, 0.8332 | loss_point_direction_all_three_processes |
| right_padded_zip_heldout_u32-high-65536 | captured-wasm-owned | 0.9690, 0.9850, 1.0095 | not_consistent_across_three_processes |
| right_padded_zip_heldout_u32-high-65536 | resident-wasm-destination | 0.9577, 0.9530, 0.9422 | loss_point_direction_all_three_processes |
| right_padded_zip_heldout_u32-low-65536 | captured-wasm-owned | 0.9633, 0.9890, 1.0081 | not_consistent_across_three_processes |
| right_padded_zip_heldout_u32-low-65536 | resident-wasm-destination | 0.9527, 0.9520, 0.9452 | loss_point_direction_all_three_processes |

## Limits

Fresh bootstrap intervals are conditional on nine within-process paired rounds, without multiplicity correction. Three process point estimates are separately retained; 27 rounds are not treated as 27 independent processes.
Only archived loss frames were diagnosed; results are not general speed claims.
No additional diagnostic timing beyond frozen plan; instrumented timings excluded.
Source-control compilation-context confound unresolved; no exact single-instruction cause or general planner cost model justified.
No native profiling/reproduction was performed; native static compiler remarks are not timing evidence.
