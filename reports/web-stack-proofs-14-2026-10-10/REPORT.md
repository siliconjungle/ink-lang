# Reusable web proof recipes: stronger controls and native kernels

33 new checked laws expand the catalogue from 998 to 1031. Twelve scalar recipes consume fresh laws; two vector anchors exercise existing laws and GPU execution. The suite includes six discovery recipes and six held-out callback instantiations, not an independent external corpus. Performance remains workload and backend dependent.

The stronger controls prevent a general superiority claim. Among fresh browser recipes, prior/current runtimeJS has 70 supported improvements and 8 inconclusive cells; Wasm has 37 improvements, 20 regressions and 21 inconclusive cells. Native resident kernels improve over the prior catalogue in 71 fresh cells, regress in 6 and remain inconclusive in 1; against already-fused expert Rust they win 12, lose 56 and are inconclusive in 10. The compiler can exploit reusable checked work elimination, while a strong handwritten implementation often remains faster.

Frozen compiler `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`; prior `30e427bcb8524fe3760881a3a5722c7445f9fdab3d2818a707b8d8508e80c110`; current `0510381225f45dc33922b2ead3794abd79c190bc3b3cbc34ce41d50e959ed8b1`. Each recipe has a separate compiled bundle. All twelve fresh-law recipes had zero prior applications and unchanged prior bodies, then independently replayed fresh default selections. Anchors are exempt from that novelty claim.

The only production policy change is general constant primitive cost for direct list indexing and stored length, with receiver computation still charged. Both catalogues use that same planner. Cost guidance is untrusted and every chosen rewrite is checked. The experimental callback matcher was removed; compiler, semantics, checker and backends stay frozen. The mapped-head law instead requires the compile-time equation f(z)=z, proved for the two clamp callbacks, without a runtime guard.

Collection laws cover arbitrary pure total mapper/predicate callbacks: map, filter and mapped-filter pipelines become one ordered affine right fold x+acc*k, across four numeric types, or a wrapping sum across three word types. Float sum reassociation is excluded. The other families skip mapped-head work under the fixed-point premise, concatenate-head work over two independent lists, and arbitrary pure self-zip callbacks when only cardinality is requested. Performance recipes are U32; count results are U64.

Primary calibration uses x*3+k with a separate acceptance cutoff. Held-out recipes use absolute distance, an opposite predicate and a piecewise offset, plus a different clamp, fallback and discarded callback. Three sizes and small/full distributions are frozen; concat also has six timed empty-prefix/nonempty-tail cells. Min-clamp uses preset384/0x60000001 cutoffs rather than a nearly constant gate. Count/head outputs can intentionally be constant at a fixed shape: the optimization skips unused collection work, while transport and output consumption still occur.

The eager JavaScript and Rust controls retain original collection stages. Strong expert controls already perform one pass for totals/right folds and only a first-element or length query for head/count. Rust uses normal release optimization; intermediate Vec stages may optimize naturally. Expert vector controls reuse output scratch. Native Rust and Wasm use identical recipe source, with native ABI glue separately archived. No expert tuning followed measurements.

Captured web calls include one snapshot per used list, Wasm copies, output conversion, the async boundary and checksum consumption. Direct borrowed JavaScript kernels omit input snapshots for both Ink and expert, retaining the same async/checksum driver, and are reported separately. Native resident and snapshot modes use the common separately compiled C driver, shared-library calls, result consumption and active generated-C arena reset. Native timings do not represent browser latency; compiler/toolchain differences remain. Native peak memory was not measured.

The first native preparation encountered a zero-duration ten-call calibration on the fastest kernels. Its prepared directory and failure log are preserved separately as native-initial-clock; no timings from that attempt are accepted or pooled. The fresh native run uses an integer mach_absolute_time tick difference/timebase and 1000-call calibration identically for every variant, with fresh [native validation](native/validation.json) and metadata. This timer repair changes neither recipe nor expert algorithm.

Independent expectations use ordinary mathematical mapper recipes, sums and a forward positional polynomial for the ordered fold. Python eager collection stages corroborate those reductions; Python head expectation directly evaluates the pure first-result semantics, rather than materializing every unused mapped element. Actual original JavaScript/Rust head controls do retain the eager whole-list map. U64 counts preserve low/high output lanes. Boundary fixtures, complete outputs and both input lists are checked for mutation.

Current validation includes 25 scoped tests: five reduction-family tests, three collection-family tests, five planner tests and twelve storage/publication/performance-store regressions. Historical full-suite evidence is preserved separately; it is not presented as a fresh complete-suite rerun. Author evidence covers admitted type instances, including exact F32 exceptions and pure callback scheduling; the three reduction held-out interpreter examples cover U32 only. Timed implementations use U32 data.

Web timings retain 28,242 samples and 9,722 exact backend comparisons across 90 cells per host. Native retains 8,100 samples across 180 resident/snapshot cells. Calibration, warmups, shuffled paired rounds, first calls and startup are separate archived evidence. [Frozen metadata](metadata.json), [Node raw](node-results.json), [browser raw](browser-results.json), [native raw](native/results.json).

Prior/current ratios above 1 favor the new catalogue. Ink/control ratios below 1 favor Ink. Intervals are paired bootstrap 95%, with individual unadjusted exploratory comparisons; overlapping captured/borrowed views are correlated and are not independent experiments.

Fresh-recipe web views: 497 faster, 70 inconclusive, 57 slower. Existing-law anchor views separately: 1 faster, 103 inconclusive, 4 slower. Native fresh-recipe resident views: 71 faster, 1 inconclusive, 6 slower; native snapshot views: 71 faster, 1 inconclusive, 6 slower. These counts preserve inconclusive and adverse cells rather than asserting a universal gain.

| Strong or original control comparison | Host/mode | Cohort | Supported outcomes |
|---|---|---|---|
| `ink_checked_borrowed_js_over_js_expert_borrowed` | browser | fresh recipes | 10 Ink faster, 60 control faster, 8 inconclusive |
| `ink_checked_borrowed_js_over_js_expert_borrowed` | browser | anchors | 5 Ink faster, 1 control faster, 6 inconclusive |
| `ink_checked_direct_js_over_js_expert` | browser | fresh recipes | 7 Ink faster, 14 control faster, 57 inconclusive |
| `ink_checked_direct_js_over_js_expert` | browser | anchors | 3 Ink faster, 2 control faster, 7 inconclusive |
| `ink_checked_direct_js_over_js_literal` | browser | fresh recipes | 77 Ink faster, 1 inconclusive |
| `ink_checked_direct_js_over_js_literal` | browser | anchors | 12 Ink faster |
| `ink_checked_js_over_js_expert` | browser | fresh recipes | 7 Ink faster, 35 control faster, 36 inconclusive |
| `ink_checked_js_over_js_expert` | browser | anchors | 2 Ink faster, 5 control faster, 5 inconclusive |
| `ink_checked_js_over_js_literal` | browser | fresh recipes | 71 Ink faster, 2 control faster, 5 inconclusive |
| `ink_checked_js_over_js_literal` | browser | anchors | 12 Ink faster |
| `ink_checked_wasm_over_rust_expert_wasm` | browser | fresh recipes | 4 Ink faster, 58 control faster, 16 inconclusive |
| `ink_checked_wasm_over_rust_expert_wasm` | browser | anchors | 12 control faster |
| `ink_checked_wasm_over_rust_literal_wasm` | browser | fresh recipes | 20 Ink faster, 51 control faster, 7 inconclusive |
| `ink_checked_wasm_over_rust_literal_wasm` | browser | anchors | 12 control faster |
| `ink_checked_borrowed_js_over_js_expert_borrowed` | node | fresh recipes | 5 Ink faster, 64 control faster, 9 inconclusive |
| `ink_checked_borrowed_js_over_js_expert_borrowed` | node | anchors | 5 Ink faster, 7 inconclusive |
| `ink_checked_direct_js_over_js_expert` | node | fresh recipes | 5 Ink faster, 38 control faster, 35 inconclusive |
| `ink_checked_direct_js_over_js_expert` | node | anchors | 3 Ink faster, 9 inconclusive |
| `ink_checked_direct_js_over_js_literal` | node | fresh recipes | 78 Ink faster |
| `ink_checked_direct_js_over_js_literal` | node | anchors | 12 Ink faster |
| `ink_checked_js_over_js_expert` | node | fresh recipes | 4 Ink faster, 47 control faster, 27 inconclusive |
| `ink_checked_js_over_js_expert` | node | anchors | 2 Ink faster, 4 control faster, 6 inconclusive |
| `ink_checked_js_over_js_literal` | node | fresh recipes | 71 Ink faster, 5 control faster, 2 inconclusive |
| `ink_checked_js_over_js_literal` | node | anchors | 12 Ink faster |
| `ink_checked_wasm_over_rust_expert_wasm` | node | fresh recipes | 4 Ink faster, 72 control faster, 2 inconclusive |
| `ink_checked_wasm_over_rust_expert_wasm` | node | anchors | 12 control faster |
| `ink_checked_wasm_over_rust_literal_wasm` | node | fresh recipes | 12 Ink faster, 58 control faster, 8 inconclusive |
| `ink_checked_wasm_over_rust_literal_wasm` | node | anchors | 12 control faster |
| `checked_over_rust_expert` | native resident | fresh recipes | 12 Ink faster, 56 control faster, 10 inconclusive |
| `checked_over_rust_expert` | native resident | anchors | 11 control faster, 1 inconclusive |
| `checked_over_rust_literal` | native resident | fresh recipes | 68 Ink faster, 10 control faster |
| `checked_over_rust_literal` | native resident | anchors | 4 Ink faster, 7 control faster, 1 inconclusive |
| `checked_over_rust_expert` | native snapshot | fresh recipes | 14 Ink faster, 20 control faster, 44 inconclusive |
| `checked_over_rust_expert` | native snapshot | anchors | 12 control faster |
| `checked_over_rust_literal` | native snapshot | fresh recipes | 60 Ink faster, 10 control faster, 8 inconclusive |
| `checked_over_rust_literal` | native snapshot | anchors | 4 Ink faster, 6 control faster, 2 inconclusive |

Largest full-width browser inputs (65536 words); medians with paired95% intervals:

| Recipe | Cohort | Prior/new runtimeJS | Ink capturedJS/expertJS | Ink borrowedJS/expertJS | InkWasm/expertRustWasm |
|---|---|---|---|---|---|
| calibrated_checksum | discovery | 5.93 [5.8, 6.08] | 1.02 [0.99, 1.05] | 0.99749 [0.984365, 1.01092] | 1.00662 [0.960874, 1.09684] |
| accepted_total | discovery | 2.31 [2.1, 2.64] | 1.05 [0.921, 1.2] | 0.943 [0.867, 1.18] | 1.03 [0.868, 1.16] |
| calibrated_accepted_total | discovery | 1.46 [1.42, 1.49] | 0.819 [0.802, 0.856] | 0.855 [0.808, 0.893] | 1.05 [0.953, 1.13] |
| distance_total | heldout | 2.55 [2.46, 2.63] | 0.823 [0.801, 0.857] | 0.802 [0.785, 0.834] | 1.06 [1.02, 1.16] |
| accepted_checksum | heldout | 1.38 [1.34, 1.44] | 1.00662 [0.974359, 1.03243] | 0.989 [0.964, 1.03] | 0.654 [0.65, 0.702] |
| calibrated_accepted_checksum | heldout | 1.85 [1.79, 2] | 1.03306 [1.00057, 1.05376] | 1.02 [1.02, 1.04] | 0.577 [0.554, 0.592] |
| callback_mapped_head | discovery | 20.9 [19.8, 21.8] | 1.02 [0.985, 1.07] | 1.43 [1.4, 1.45] | 1.06597 [0.991003, 1.16019] |
| concat_first_result | discovery | 3.23 [2.91, 3.43] | 0.997752 [0.899955, 1.1072] | 1.41 [1.39, 1.41] | 1.1 [1.02, 1.18] |
| self_zip_cardinality | discovery | 20.8 [15.3, 25.8] | 0.705 [0.573, 1.06] | 1.31 [1.27, 1.37] | 1.05 [0.787, 1.16] |
| clamped_first | heldout | 20 [19.2, 28.2] | 1.02 [0.73, 1.07] | 1.42 [1.41, 1.44] | 1.02 [0.964, 1.38] |
| concat_signed_offset | heldout | 3.11 [2.88, 3.31] | 1.04 [0.964, 1.14] | 1.4 [1.38, 1.42] | 1.04 [0.955, 1.09] |
| paired_score_count | heldout | 9.22 [8.49, 9.63] | 1.09 [0.958, 1.14] | 1.32 [1.31, 1.34] | 1.07 [0.987, 1.34] |
| threshold_remap | anchor | 1.05 [1.01, 1.05] | 1.00258 [0.995806, 1.01569] | 1.00633 [0.981132, 1.05096] | 1.72 [1.64, 1.76] |
| calibration_pipeline | anchor | 1.00658 [0.961783, 1.04667] | 0.987 [0.963, 1.03] | 0.99359 [0.987261, 1.03226] | 1.73 [1.68, 1.79] |

Native comparisons are separate resident-input and equal-snapshot kernel profiles:

| Recipe | Mode | Prior/new | Ink/expertRust |
|---|---|---|---|
| calibrated_checksum | resident | 0.857 [0.851, 0.862] | 1.01004 [1.00404, 1.01339] |
| calibrated_checksum | snapshot | 0.874 [0.865, 0.88] | 0.995474 [0.992957, 1.00997] |
| accepted_total | resident | 26.5 [25.4, 27.1] | 1.67 [1.66, 1.74] |
| accepted_total | snapshot | 16.2 [15.7, 16.5] | 1.27 [1.24, 1.28] |
| calibrated_accepted_total | resident | 18.8 [18.3, 19.6] | 1.8 [1.66, 1.83] |
| calibrated_accepted_total | snapshot | 13.3 [13.2, 13.4] | 1.36 [1.35, 1.37] |
| distance_total | resident | 1.2 [1.19, 1.21] | 2.34 [2.32, 2.35] |
| distance_total | snapshot | 1.15 [1.14, 1.16] | 1.58 [1.58, 1.6] |
| accepted_checksum | resident | 2.4 [2.34, 2.44] | 1.01001 [0.998034, 1.03351] |
| accepted_checksum | snapshot | 2.33 [2.28, 2.35] | 0.990301 [0.976671, 0.999086] |
| calibrated_accepted_checksum | resident | 2.49 [2.45, 2.51] | 0.411 [0.407, 0.416] |
| calibrated_accepted_checksum | snapshot | 2.4 [2.35, 2.45] | 0.424 [0.418, 0.428] |
| callback_mapped_head | resident | 1.54e+03 [1.53e+03, 1.55e+03] | 1.17 [1.17, 1.18] |
| callback_mapped_head | snapshot | 2.13 [1.89, 2.32] | 0.988 [0.913, 1.14] |
| concat_first_result | resident | 2.27e+03 [2.25e+03, 2.34e+03] | 1.2 [1.17, 1.21] |
| concat_first_result | snapshot | 2 [1.95, 2.17] | 1.02 [0.945, 1.07] |
| self_zip_cardinality | resident | 2.01e+03 [2e+03, 2.03e+03] | 0.915 [0.908, 0.922] |
| self_zip_cardinality | snapshot | 2.25 [2.17, 2.29] | 0.996499 [0.967762, 1.03169] |
| clamped_first | resident | 1.54e+03 [1.52e+03, 1.56e+03] | 1.18 [1.17, 1.18] |
| clamped_first | snapshot | 1.96 [1.91, 2.03] | 1.04898 [0.993246, 1.09774] |
| concat_signed_offset | resident | 2.26e+03 [2.25e+03, 2.27e+03] | 1.2 [1.19, 1.21] |
| concat_signed_offset | snapshot | 2.01 [1.94, 2.04] | 0.989 [0.967, 1.03] |
| paired_score_count | resident | 1.98e+03 [1.96e+03, 2.01e+03] | 1.01378 [1.00631, 1.03125] |
| paired_score_count | snapshot | 2.04 [1.98, 2.21] | 1.03 [0.943, 1.1] |
| threshold_remap | resident | 0.997233 [0.994898, 1.00325] | 1.02 [1.01, 1.02] |
| threshold_remap | snapshot | 1.00524 [1.00148, 1.01108] | 1.01058 [1.00678, 1.0147] |
| calibration_pipeline | resident | 1.00081 [0.989979, 1.00704] | 1.02 [1.01, 1.02] |
| calibration_pipeline | snapshot | 0.999218 [0.990928, 1.00248] | 1.03 [1.02, 1.03] |

GPU evidence includes 78 actual variant/cells and 702 actual samples; 192 requested-GPU variant/cells returned CPU fallback and are excluded from GPU timing. Saved scalar bundles have benchmark-only instrumentation for actual upload writes, dispatches and scalar readback, identically applied across variants with original device/host hashes retained. Vector anchors use existing device counters. Production device/shader code was not changed.

Scalar sums lose GPU eligibility when an ordered fold replaces their pipeline; self-zip cardinality gains eligibility when only count remains. No fresh recipe has a prior/current pair that both execute on GPU. Such topology changes cannot establish a same-GPU speedup. Full transfers/readback are included. The lone nominal same-GPU improvement belongs to an existing-law anchor and remains unconfirmed; it is not a new-law GPU gain. Fallback speed is not GPU acceleration.

| Task | Prior actualGPU cells | Current actualGPU cells | Prior/current sameGPU classifications |
|---|---:|---:|---|
| calibrated_checksum | 0 | 0 | no matched actualGPU pair |
| accepted_total | 6 | 0 | no matched actualGPU pair |
| calibrated_accepted_total | 6 | 0 | no matched actualGPU pair |
| distance_total | 6 | 0 | no matched actualGPU pair |
| accepted_checksum | 0 | 0 | no matched actualGPU pair |
| calibrated_accepted_checksum | 0 | 0 | no matched actualGPU pair |
| callback_mapped_head | 0 | 0 | no matched actualGPU pair |
| concat_first_result | 0 | 0 | no matched actualGPU pair |
| self_zip_cardinality | 0 | 6 | no matched actualGPU pair |
| clamped_first | 0 | 0 | no matched actualGPU pair |
| concat_signed_offset | 0 | 0 | no matched actualGPU pair |
| paired_score_count | 0 | 6 | no matched actualGPU pair |
| threshold_remap | 6 | 6 | 6 inconclusive |
| calibration_pipeline | 6 | 6 | 6 inconclusive |

All supported prior/current regressions, including native modes, remain visible:

| Host/mode | Recipe | Input | Backend | Prior/current95% |
|---|---|---|---|---|
| node | calibrated_checksum | calibrated_checksum/small-32 | wasm | 0.547 [0.527, 0.58] |
| node | calibrated_checksum | calibrated_checksum/small-4096 | wasm | 0.764 [0.749, 0.874] |
| node | calibrated_checksum | calibrated_checksum/small-65536 | wasm | 0.855 [0.761, 0.904] |
| node | calibrated_checksum | calibrated_checksum/full-32 | wasm | 0.507 [0.483, 0.513] |
| node | calibrated_checksum | calibrated_checksum/full-4096 | wasm | 0.82 [0.721, 0.861] |
| node | calibrated_checksum | calibrated_checksum/full-65536 | wasm | 0.904 [0.823, 0.926] |
| node | accepted_total | accepted_total/small-32 | wasm | 0.866 [0.796, 0.899] |
| node | accepted_total | accepted_total/full-32 | wasm | 0.844 [0.838, 0.86] |
| node | calibrated_accepted_total | calibrated_accepted_total/small-32 | wasm | 0.829 [0.634, 0.95] |
| node | calibrated_accepted_total | calibrated_accepted_total/full-32 | wasm | 0.847 [0.841, 0.858] |
| node | calibrated_accepted_total | calibrated_accepted_total/full-4096 | js | 0.722 [0.687, 0.737] |
| node | calibrated_accepted_total | calibrated_accepted_total/full-4096 | direct_js | 0.726 [0.717, 0.836] |
| node | calibrated_accepted_total | calibrated_accepted_total/full-4096 | borrowed_js | 0.705 [0.695, 0.707] |
| node | distance_total | distance_total/small-32 | wasm | 0.842 [0.83, 0.867] |
| node | distance_total | distance_total/full-32 | wasm | 0.848 [0.83, 0.866] |
| node | accepted_checksum | accepted_checksum/small-32 | wasm | 0.509 [0.489, 0.523] |
| node | accepted_checksum | accepted_checksum/small-32 | direct_js | 0.957 [0.934, 0.975] |
| node | accepted_checksum | accepted_checksum/small-32 | borrowed_js | 0.901 [0.889, 0.907] |
| node | accepted_checksum | accepted_checksum/small-4096 | js | 0.831 [0.692, 0.881] |
| node | accepted_checksum | accepted_checksum/small-4096 | wasm | 0.722 [0.659, 0.73] |
| node | accepted_checksum | accepted_checksum/small-4096 | direct_js | 0.877 [0.782, 0.986] |
| node | accepted_checksum | accepted_checksum/small-4096 | borrowed_js | 0.805 [0.727, 0.82] |
| node | accepted_checksum | accepted_checksum/small-65536 | js | 0.829 [0.772, 0.852] |
| node | accepted_checksum | accepted_checksum/small-65536 | direct_js | 0.854 [0.796, 0.877] |
| node | accepted_checksum | accepted_checksum/small-65536 | borrowed_js | 0.859 [0.78, 0.874] |
| node | accepted_checksum | accepted_checksum/full-32 | wasm | 0.498 [0.482, 0.503] |
| node | accepted_checksum | accepted_checksum/full-4096 | js | 0.848 [0.805, 0.913] |
| node | accepted_checksum | accepted_checksum/full-4096 | wasm | 0.666 [0.652, 0.676] |
| node | accepted_checksum | accepted_checksum/full-4096 | direct_js | 0.762 [0.683, 0.977] |
| node | accepted_checksum | accepted_checksum/full-65536 | direct_js | 0.948 [0.879, 0.984] |
| node | accepted_checksum | accepted_checksum/full-65536 | borrowed_js | 0.914 [0.873, 0.971] |
| node | calibrated_accepted_checksum | calibrated_accepted_checksum/small-32 | wasm | 0.517 [0.501, 0.534] |
| node | calibrated_accepted_checksum | calibrated_accepted_checksum/small-32 | direct_js | 0.945 [0.926, 0.986] |
| node | calibrated_accepted_checksum | calibrated_accepted_checksum/small-32 | borrowed_js | 0.9 [0.885, 0.908] |
| node | calibrated_accepted_checksum | calibrated_accepted_checksum/small-4096 | wasm | 0.789 [0.717, 0.805] |
| node | calibrated_accepted_checksum | calibrated_accepted_checksum/full-32 | wasm | 0.492 [0.487, 0.502] |
| node | calibrated_accepted_checksum | calibrated_accepted_checksum/full-4096 | wasm | 0.728 [0.667, 0.804] |
| node | calibration_pipeline | calibration_pipeline/full-4096 | borrowed_js | 0.964 [0.915, 0.982] |
| node | calibration_pipeline | calibration_pipeline/full-65536 | wasm | 0.987847 [0.962741, 0.999705] |
| node | calibration_pipeline | calibration_pipeline/full-65536 | direct_js | 0.959551 [0.909671, 0.997345] |
| browser | calibrated_checksum | calibrated_checksum/small-32 | wasm | 0.469 [0.437, 0.509] |
| browser | calibrated_checksum | calibrated_checksum/small-4096 | wasm | 0.826 [0.795, 0.89] |
| browser | calibrated_checksum | calibrated_checksum/small-65536 | wasm | 0.892 [0.863, 0.921] |
| browser | calibrated_checksum | calibrated_checksum/full-32 | wasm | 0.487 [0.473, 0.507] |
| browser | calibrated_checksum | calibrated_checksum/full-4096 | wasm | 0.783 [0.746, 0.877] |
| browser | calibrated_checksum | calibrated_checksum/full-65536 | wasm | 0.913 [0.849, 0.925] |
| browser | accepted_total | accepted_total/small-32 | wasm | 0.765 [0.717, 0.806] |
| browser | accepted_total | accepted_total/full-32 | wasm | 0.766 [0.747, 0.807] |
| browser | calibrated_accepted_total | calibrated_accepted_total/small-32 | wasm | 0.797 [0.766, 0.821] |
| browser | calibrated_accepted_total | calibrated_accepted_total/full-32 | wasm | 0.772 [0.756, 0.834] |
| browser | distance_total | distance_total/small-32 | wasm | 0.8 [0.765, 0.852] |
| browser | distance_total | distance_total/full-32 | wasm | 0.802 [0.753, 0.86] |
| browser | accepted_checksum | accepted_checksum/small-32 | wasm | 0.489 [0.446, 0.554] |
| browser | accepted_checksum | accepted_checksum/small-4096 | wasm | 0.774 [0.696, 0.799] |
| browser | accepted_checksum | accepted_checksum/full-32 | wasm | 0.513 [0.469, 0.554] |
| browser | accepted_checksum | accepted_checksum/full-4096 | wasm | 0.728 [0.685, 0.756] |
| browser | calibrated_accepted_checksum | calibrated_accepted_checksum/small-32 | wasm | 0.501 [0.474, 0.518] |
| browser | calibrated_accepted_checksum | calibrated_accepted_checksum/small-4096 | wasm | 0.866 [0.831, 0.958] |
| browser | calibrated_accepted_checksum | calibrated_accepted_checksum/full-32 | wasm | 0.472 [0.432, 0.526] |
| browser | calibrated_accepted_checksum | calibrated_accepted_checksum/full-4096 | wasm | 0.781 [0.737, 0.799] |
| browser | calibration_pipeline | calibration_pipeline/full-32 | js | 0.979891 [0.941211, 0.999631] |
| native-resident | calibrated_checksum | calibrated_checksum/small-4096 | native | 0.852 [0.848, 0.855] |
| native-snapshot | calibrated_checksum | calibrated_checksum/small-4096 | native | 0.851 [0.843, 0.857] |
| native-resident | calibrated_checksum | calibrated_checksum/small-65536 | native | 0.862 [0.855, 0.864] |
| native-snapshot | calibrated_checksum | calibrated_checksum/small-65536 | native | 0.839 [0.815, 0.881] |
| native-resident | calibrated_checksum | calibrated_checksum/full-4096 | native | 0.847 [0.84, 0.853] |
| native-snapshot | calibrated_checksum | calibrated_checksum/full-4096 | native | 0.83 [0.779, 0.867] |
| native-resident | calibrated_checksum | calibrated_checksum/full-65536 | native | 0.857 [0.851, 0.862] |
| native-snapshot | calibrated_checksum | calibrated_checksum/full-65536 | native | 0.874 [0.865, 0.88] |
| native-resident | accepted_checksum | accepted_checksum/small-4096 | native | 0.943 [0.938, 0.948] |
| native-snapshot | accepted_checksum | accepted_checksum/small-4096 | native | 0.945 [0.933, 0.952] |
| native-resident | accepted_checksum | accepted_checksum/full-4096 | native | 0.817 [0.78, 0.958] |
| native-snapshot | accepted_checksum | accepted_checksum/full-4096 | native | 0.811 [0.774, 0.919] |

| Emitted file totals over 14 task bundles | Baseline | Prior | Current |
|---|---:|---:|---:|
| JavaScript bytes | 17634 | 17668 | 15221 |
| C bytes | 70551 | 70473 | 72282 |
| Wasm bytes | 96636 | 96632 | 81284 |

These are totals of separate bundles, not an aggregate application-size measurement; individual outputs can grow. Canonical web observations record exported Wasm linear-memory highwater only. JavaScript, GPU and native memory are unmeasured, so native samples receive no fabricated peak-byte records.

[Canonical observation import](canonical-observation-import.json) authenticates 900 new web Wasm records, 5886→6786 total, without changing the proof snapshot. Native timings remain linked report evidence because no native peak-memory measurement is available.

The result supports reusable verified work elimination in these recipe families and preserves the performance tradeoffs against strong implementations. It does not establish that Ink generally beats JavaScript, Rust, WebAssembly or WebGPU. Algorithm choice, target lowering, transport and compiler optimization remain separate contributors. Forced-backend comparisons bypass the existing bounded runtime auto selector.

[Web interval verification](root-interval-verification.json), [native independent verification](native-verification.json), [all profitability decisions](profitability.json), [strong controls](strong-controls.json), [current routing](backend-routing.json), [native summary](native/summary.json), [planner change](planner-change.json), [publication](publication.json), [final integrity check](verification.json).

[Independent collection/control source review](independent-source-review.md), [independent reduction review](independent-reduction-review.md), [native timer review](native-clock-review.md), [native timer repair](native-clock-repair.json).
