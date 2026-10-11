# Web-stack DB proofs, batch 32

Status: checked, published and measured on the frozen engine28. Direct-main integration is a subsequent phase, recorded separately; these measurements do not establish performance of a different merged compiler.

## Change

One reusable wrapping-integer scan-linearity mechanism, with addition and subtraction orientations:

```ink
xs.scan().zip(ys.scan(), fn(a) => fn(b) => a + b)
// proved equal to:
xs.zip(ys, fn(a) => fn(b) => a + b).scan()
```

The analogous subtraction equality also holds. Generalized supporting equalities bind both nonzero initial accumulators; the proof uses independent list induction and modular ring normalization. Empty and unequal lists retain the exact shorter-list extent. U32, I32 and U64 are checked; F32 is excluded because rounding breaks the equalities. No extra core rule, theorem whitelist, runtime validation or checker wrapper was introduced.

The database publication adds **42 objects**: six typed optimization endpoints, twelve state/beta support proofs, twelve content-bound source-context deployments, and twelve consequences already derivable from old laws. The twelve old consequences are available to both catalogues. Effective fair prior: **1,964** objects; current: **1,994**. The ordinary planner selects one fresh generic law in each of four recipes under the byte-identical batch31 generic cost model. It does not force names or specialize using timed inputs. Primary raw recipes and quotient/remainder mapped heldouts share the same mechanism; four recipes are not four independent algorithm discoveries.

The first prefix/difference telescope proposal admitted mathematically but could not be spelled in the current source language: singleton list syntax is unsupported. Those eighteen semantic prototype objects and failed source attempts are retained as unsupported research and excluded from publication and performance claims.

## Verification

Focused producer tests pass. Complete-array interpreter/replay/reification checks cover 132 typed source frames, 42 nonzero-state cases, 88 actual automatically selected-core comparisons and 33 unseen transitive-helper frames. Rehashed false endpoints and changed helper definitions reject. An independent finite oracle covers 584,256 cases across wrapping word types, empty/unequal lists, extrema and accumulator starts; these finite checks corroborate the kernel proofs rather than replace them. F32 counterexamples are retained.

The prior frontier offers all 1,393 old semantic roots, 1,312 applicable per source. Its bounded 4-expansion/128-body exploration admits three old source opportunities per recipe, including zip/postmap fusion. It does not reach the new target within that budget; no global nonderivability claim is made. Source-context hashes bind declarations, while ordinary equality rules establish correctness.

Before timing, full-output and input-nonmutation/lifetime checks pass: Node 1,152 validation rows and 3,072 complete-output checks; browser 1,440 rows and 3,936 checks; native 384 checks. All 288 browser GPU validation executions use actual WebGPU with zero CPU fallbacks. Every GPU frame's transfer bytes, stage capacities and live buffers match independent formulas.

## Performance against the fair prior

The exact same compiler, targets and generic model are used on both sides. Nine matched rounds per cell, 4,000 paired-round bootstrap resamples, nominal per-cell 95% intervals. Ratios are prior time / checked time, so above one means faster. Aggregate geometric means are descriptive, without aggregate confidence intervals or multiple-comparison guarantees.

| Host | Boundary | Geometric mean | Wins / losses / uncertain (24 cells) |
|---|---|---:|---:|
| Node | proof_js | 1.092× | 17 / 0 / 7 |
| Node | proof_wasm_full | 1.010× | 13 / 1 / 10 |
| Node | proof_wasm_prepared | 1.337× | 22 / 0 / 2 |
| Browser | proof_js | 1.067× | 13 / 8 / 3 |
| Browser | proof_wasm_full | 1.014× | 10 / 2 / 12 |
| Browser | proof_wasm_prepared | 1.338× | 23 / 0 / 1 |
| Browser | proof_gpu_full | 1.436× | 16 / 1 / 7 |
| Native resident | proof_native | 1.413× | 24 / 0 / 0 |
| Native copied-input | proof_native | 1.300× | 24 / 0 / 0 |

The main gains are native resident/copy-input execution, resident Wasm and complete GPU requests. Full-call Wasm changes are about one percent and often uncertain. Browser JS raw recipes regress to **0.774×** (eight losses, three uncertain, one win); mapped recipes improve to **1.472×** (twelve wins). Node raw/mapped averages are **1.157× / 1.030×**. The target-agnostic structural model therefore does not guarantee profitability across JS engines. All adverse cells remain in the saved analysis and observations.

Low/high jointly vary word values and second-list extent: low uses small words with ys = N+7; high uses full-width words with ys = floor(N/3)+1. They are not a one-factor size or selectivity experiment. Sizes are 32, 4,096 and 65,536. Parameters stay fixed within each regime; this is compile-time proof selection, not runtime load/state adaptation.

## Strong handwritten controls and memory

The expert JS and Rust implementations make one shorter-prefix pass, compute mapped contributions once, accumulate the wrapping prefix and retain the same output mapper. They avoid intermediate lists and unmatched suffix work. Generated Ink remains slower overall: expert/Ink JS ratios **0.711× Node / 0.498× browser**, full Rust-Wasm ratios **0.412× / 0.439×**, and resident native **0.515×**. Eight of 24 native cells favor Ink (raw recipes at 4,096/65,536), while sixteen favor Rust. Resident Rust-Wasm similarly has eight Ink wins and sixteen losses. This is useful evidence for specific pipelines, not broad superiority over native Rust, Wasm or JS. GPU full requests remain far slower than CPU expert controls at these sizes.

Fair-prior zip/postmap fusion means raw prior/current have **3/3** stages and mapped recipes **5/5**, with equal default JS/C loop and allocation-site counts. Two full-input ordered scans become one shorter-prefix ordered scan, and arithmetic/postmap ordering changes. Dispatches, upload and readback bytes are equal prior/current. Actual GPU live-buffer savings are exactly **4 × abs(nx−ny) bytes** in this harness; equal-length inputs save zero. For raw high N=65,536, prior/current use **873,852 / 699,092 bytes**. Mapped input arrays are still materialized over full input extents. CPU heap peak was not measured; stored peak_bytes=0 is explicitly marked unknown, not zero allocation. Resident native/Wasm reuse destinations under their declared borrowed-output/scratch-reset contracts, measured separately from full capture.

## Evidence and scope

Sequential native → Node → browser timing with all agent jobs stopped produced **7,560 samples**: 1,728 native, 2,592 Node and 3,240 browser; **840** comparable groups become immutable observations. Requested GPU executions record actual backend counts inside the timed full-call boundary. Setup/compilation are excluded, warmups and calibration are retained. This is one machine and fixed recipes, with honest boundaries; no all-hardware speedup claim.

The frozen compiler SHA256 is `c0f3651f11c04b2a4f30740a1239f3192af52c3cdff4523076456624cc557bbc`. Current snapshot is `4d8fcf59b0e8dc2590397ccc4afb359de4544a4fe8f8a63f427f16a354dde217`. The canonical total after this batch is **21680 observations**. All 1,952 preceding objects, 20,840 preceding observations and discovery names remain unchanged during the frozen batch. The earlier source inventory has 379 unchanged files; newly added source files are audited separately.

Key artifacts: [proof evidence](proofs/evidence.json), [prepared independent review](review/prepared-review.json), [publication](publication.json), [metadata](metadata.json), [timing freeze](timing-freeze.json), [paired analysis](analysis.json), [all strata](cohort-summary.json), [GPU counters](gpu-prevalidation-counters.json), [observations](observations.json), [final audit](final-audit.json). The generated JS/native/Wasm/GPU empirical checks do not constitute machine-code proofs.
