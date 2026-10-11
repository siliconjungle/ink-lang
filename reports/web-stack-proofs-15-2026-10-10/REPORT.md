# Checked web-stack proofs, batch 15

58 checked database entries expand the local catalogue from 1,031 to **1,089**: **18 general laws and 40 static callback certificates**. Of the certificates, 26 support only existing laws and are supplied symmetrically to prior/current searches; 14 compose this batch's laws with checked callback normalization. These are compile-time transformations. No caller checks, checker wrappers, trusted optimization rules or new runtime optimizer were introduced.

The batch establishes reusable improvements for integer filtered totals and combined reductions, with actual JavaScript, Wasm, WebGPU and native measurements. **It does not establish broad superiority over expert JavaScript or native Rust.** Every fresh native resident/snapshot comparison improves on prior Ink, but expert native Rust wins 60/72 resident comparisons; expert JavaScript wins all 72 fresh comparisons on both hosts. All regressions and inconclusive results remain recorded.

## Proofs and what they eliminate

For arbitrary pure, total callbacks `f`, `g`, predicate `p`, list `xs` and scalar weights `k`, `d`, each of these six laws is checked separately for wrapping **U32, I32 and U64**:

| Family | Equal expression selected for optimization | Intended reusable effect |
|---|---|---|
| Filtered sum | `sum(xs.filter(p)) = sum(xs.map(x => choose(p(x), x, 0)))` | Remove filtered-list compaction |
| Mapped then filtered sum | `sum(xs.map(f).filter(p)) = sum(xs.map(x => let y=f(x); choose(p(y), y, 0)))` | Combine mapping and acceptance contribution |
| Filtered then mapped sum | `sum(xs.filter(p).map(f)) = sum(xs.map(x => choose(p(x), f(x), 0)))` | Remove a compacted intermediate |
| Two sums added | `sum(xs.map(f)) + sum(xs.map(g)) = sum(xs.map(x => f(x)+g(x)))` | Combine mapped reduction pipelines |
| Two sums subtracted | `sum(xs.map(f)) - sum(xs.map(g)) = sum(xs.map(x => f(x)-g(x)))` | Combine mapped reduction pipelines |
| Weighted two sums | `k*sum(xs.map(f)) + d*sum(xs.map(g)) = sum(xs.map(x => k*f(x)+d*g(x)))` | Combine pipelines where reducing stages outweighs extra arithmetic |

The notation above explains the equalities; the actual objects contain typed semantic terms and machine-checked proofs. Predicated proofs use structural list induction and cases on the head predicate: the empty list contributes zero; a rejected head contributes zero and an accepted head contributes its value, then the inductive tail equality applies. Combined reductions use list induction, symmetric induction-hypothesis rewrites and the existing wrapping ring normalizer. Associativity/distributivity here concern fixed-width modular arithmetic. **F32 reassociation and effectful/partial callbacks are excluded.**

General proof files: [predicated producer](../../knowledge/producers/web_predicated15_laws.py), [combined-reduction producer](../../knowledge/producers/web_reduction15_laws.py). [Checked publication](publication.json) authenticates all 58 roots plus their **61-entry dependency closure** with the frozen compiler. [General proof content addresses](#general-law-content-addresses) are listed below; [static witness data](../../knowledge/research/web-stack-proofs-15/specialization/witnesses.json) contains all 40 certificate bodies, scopes and dependencies.

The [untrusted beta certificate producer](../../knowledge/producers/beta_specialization15.py) handles capture-safe de Bruijn substitution and composes `Normalize`/`Use`/congruence/transitivity witnesses. It leaves unknown callbacks as applications, does not match generic laws inside lambda bodies, and bounds output size. Free runtime list/scalar parameters remain universally quantified. The 40 certificates specialize known callback syntax; **this is an offline certificate generator, not an automatic compiler pass for arbitrary future programs**. Generic laws remain applicable to arbitrary callbacks, while these lean static outputs depend on generated certificates.

The mapped-predicate expression can be duplicated by beta inlining. Value equivalence under purity does not guarantee one physical evaluation; wording such as “shared once” in the archived precursor manifest describes its semantic lambda, not emitted execution. Weighted fusion introduces `2N−2` extra multiplies relative to an expert two-accumulator loop with two scalar weights at the end. Neither law promises profitability for every workload.

## Fair prior/current preparation

Historical catalogue: `0510381225f45dc33922b2ead3794abd79c190bc3b3cbc34ce41d50e959ed8b1` (1,031 entries).

Effective prior catalogue, including the 26 shared old-only normalization certificates: `5310dfced5ad91e93eaabba81e6807b7f12ae45bfced0e063b801c76c1cae183` (1,057 entries).

Current catalogue: `57bbee1835725fd3af939cf11e3dda25ac51e12001fde0f006aeb64bb9ab2378` (1,089 entries).

The same derivation procedure was applied to all old semantic laws and original subjects, and available old normalization certificates were offered to both searches. The current search adds the 18 new generic laws and 14 new compositions. All 12 fresh recipes naturally select new checked witnesses and change their prior body. No forced choice or task-name whitelist is used. [Input preparation](input-preparation/preparation.json), [metadata](metadata.json) and per-task selection/replay receipts bind this provenance.

The external planner now accepts optional general operation prices, with a hashed cost-model receipt; its default policy is unchanged. The **same frozen untrusted model** is used for prior/current on all targets: map12, filter60, sum10, foldr80, apply20. These are search estimates, not measured costs. No post-timing tuning occurred. One common shape is consequently retained across targets even when a CPU-specific single-loop representation might be preferable. [Planner diff](planner-change.diff), [cost model](aggregate-cost-model.json).

The source guard covers 102 existing compiler/backend/runtime/planner files: 101 are unchanged and the external planner is the sole changed guarded file. The separate knowledge publisher was repaired to check the exact dependency closure rather than incorrectly equating closure size with new-root count; its initial rejection occurred before canonical mutation and is preserved. New proof producers, tests and harnesses are outside that guard. This batch makes no core, checker, backend or runtime edits.

## Workloads and measurements

Six families have one discovery and one preset alternate callback instantiation: **12 fresh recipes**. Six `abi_*` anchors preserve exact round14 checked bodies, arrays, scalars and expected results. Each recipe has small/full-word distributions at32,4,096 and65,536 elements: 108 main input cells, 72 fresh and36 anchors. The callbacks labelled held-out test a second fixed syntax; they are not an external application corpus. Performance is measured for U32 only; typed correctness covers all three word types.

A separate Python aggregate oracle matches the literal algorithm across **234 complete fixtures** and2,508,234 input values, including empty/singleton, overflow, word-boundary and predicate/weight edge cases. That value count is not a count of independent assertions. Literal and expert control outputs are checked before timings.

Node records11,664 trials and4,104 complete comparisons; browser records12,960 trials and4,428 complete comparisons. Native records9,720 trials and1,170 complete comparisons. **34,344 main timing samples and9,702 complete comparisons** pass. Main browser GPU accounting is1,296 actual samples,144 actual variant cells and180 CPU fallback variant cells; fallbacks are excluded from GPU timing. The main full-fixture prevalidation loop covers CPU variants; the separate702-call GPU edge run below closes that coverage gap.

Runs use9 shuffled paired rounds, one warmup and calibrated iterations targeting15ms. Node/browser/native and the later confirmation run are sequential after all compiler/proof/test jobs stop. The frozen environment is Apple M2, macOS26.5.2, Node26.1.0, browser Chrome154, Zig0.15.2 and Rust1.96.0. Native C uses Apple Clang14 while Rust uses LLVM22: matched compiler versions are not established. The checkouts are dirty; frozen executable, source and artifact hashes identify what was measured.

Web timings cover complete awaited scalar calls: one input snapshot, Wasm copy/result conversion, output consumption and existing host overhead. The separate borrowed-JS pair excludes snapshots equally. Native emitted C and handwritten Rust use a common separately compiled C timing driver with a shared-library boundary and no cross-library LTO. Rust's wrapper/kernel are compiled together. Resident input and input-snapshot modes remain separate; Ink arena cleanup is timed. Integer-difference Mach clock ticks and1,000-call native calibration are audited. GPU timings include upload, dispatch, result readback and host synchronization with pipelines already initialized; startup/first-call observations are separate, and this is not a GPU-resident-only comparison.

Every saved interval is independently recomputed from raw paired rounds using4,000 bootstrap draws, seed0, median ratios and percentile positions100/3,899. Intervals are individual exploratory95% estimates without multiplicity adjustment. Correlated cases/host views do not constitute hundreds of independent algorithms.

## Fresh gains against prior Ink

A gain requires the full prior/current interval above1; a regression requires it below1. Counts below exclude unchanged-law anchors.

| Host / target | Faster | Slower | Inconclusive |
|---|---:|---:|---:|
| node / js | 62 | 2 | 8 |
| node / wasm | 39 | 12 | 21 |
| browser / js | 48 | 16 | 8 |
| browser / wasm | 38 | 12 | 22 |
| browser / gpu | 33 | 0 | 3 |
| native / resident | 72 | 0 | 0 |
| native / snapshot | 72 | 0 | 0 |

[All profitability rows](profitability.json) retain the220 gains,42 regressions and62 inconclusive **main web** views. Native resident/snapshot counts are separate correlated views. Anchors show6 gains,6 regressions and132 inconclusive outcomes even though prior/current selected bodies and generated JS are identical; these are instance/runtime noise and support no new-law claim. [All42 fresh web regressions](fresh-regressions.json) remain explicit. A shared cost model cannot guarantee that a checked rewrite wins on each backend or input size.

Representative complete browser calls, `small-65536` (lower is faster):

| Recipe | Prior/current JS | Prior/current Wasm | Prior/current GPU |
|---|---|---|---|
| accepted_total | 950/740µs | 209.4/41.0µs | 941/733µs |
| calibrated_accepted_total | 659/1,047µs | 187.7/41.0µs | 993/743µs |
| dual_sum_add | 1,238/795µs | 52.6/39.1µs | prior unavailable /755µs |

The mapped accepted-total JS regression is substantial and retained. Small dual reductions also regress in Wasm despite large-input benefits. Medians are descriptive; [raw trials](browser-results.json) and interval tables govern supported claims.

## Strong language controls

Expert controls fuse traversals and use independent accumulators where appropriate; literal controls preserve original eager stages. They share source algorithms, exact word semantics and equivalent input/result boundaries. No manufactured weaker Rust/JS control is presented as native performance.

| Target versus expert | Ink faster | Expert faster | Inconclusive |
|---|---:|---:|---:|
| node / ink_checked_js_over_js_expert | 0 | 72 | 0 |
| node / ink_checked_wasm_over_rust_expert_wasm | 9 | 58 | 5 |
| node / ink_checked_borrowed_js_over_js_expert_borrowed | 0 | 72 | 0 |
| browser / ink_checked_js_over_js_expert | 0 | 72 | 0 |
| browser / ink_checked_wasm_over_rust_expert_wasm | 10 | 59 | 3 |
| browser / ink_checked_borrowed_js_over_js_expert_borrowed | 0 | 72 | 0 |
| native resident / expert Rust | 12 | 60 | 0 |
| native snapshot / expert Rust | 10 | 61 | 1 |

Against literal JavaScript, current Ink wins69/72 Node and68/72 browser fresh cases, with2/3 losses respectively. Against literal Rust/Wasm it wins33/72 Node and34/72 browser; native versus literal Rust wins60/72 in each mode and loses12. These eager-source gains differ from the expert results above.

The generated fresh C kernels still materialize a mapped array and then traverse it again for the sum. Callback normalization removes typed-Let/schema2 constraints but does not finish CPU loop fusion. Expert JavaScript/Rust avoid this work, and weighted expert loops also keep weights outside the loop. This is a concrete remaining lowering/search target; broad expert superiority is **not achieved** by the current batch.

## Actual WebGPU confirmation and routing

A separate immutable repeat copies1,237 parent artifacts byte-for-byte and freezes1,244 artifacts. It retains all234 fixtures, original arrays/scalars/oracles, parameters and CPU prevalidation. Only the timed cell subset and one eligibility line change: six predicated recipes ×two65,536-element distributions, three actual GPU variants. No recompilation, pooling or canonical imports occur.

The independent repeat passes **324 actual GPU trials,2,988 complete comparisons,36 calibration and36 warmup cells**. All phase upload/dispatch/readback counters and24 intervals are audited twice. The prior/current repeat supports **10 gains and2 inconclusive outcomes**; no regressions. Eight mapped-predicated cells all retain supported gains. Supported median ratios range1.10–1.42×, while both inconclusive results remain visible:

| Repeat input | Prior / current median | 95% interval | Outcome |
|---|---:|---|---|
| accepted_calibrated_total/full-65536 | 1.294× | [1.269, 1.373] | faster |
| accepted_calibrated_total/small-65536 | 1.321× | [1.154, 1.382] | faster |
| accepted_calibrated_total_heldout/full-65536 | 1.354× | [1.291, 1.404] | faster |
| accepted_calibrated_total_heldout/small-65536 | 1.293× | [1.258, 1.813] | faster |
| accepted_total/full-65536 | 1.096× | [1.071, 1.239] | faster |
| accepted_total/small-65536 | 1.150× | [0.865, 1.248] | inconclusive |
| accepted_total_heldout/full-65536 | 1.138× | [0.846, 1.164] | inconclusive |
| accepted_total_heldout/small-65536 | 1.235× | [1.156, 1.312] | faster |
| calibrated_accepted_total/full-65536 | 1.331× | [1.235, 1.379] | faster |
| calibrated_accepted_total/small-65536 | 1.336× | [1.227, 1.413] | faster |
| calibrated_accepted_total_heldout/full-65536 | 1.418× | [1.322, 1.766] | faster |
| calibrated_accepted_total_heldout/small-65536 | 1.408× | [1.276, 1.529] | faster |

[Separate raw repeat](../web-stack-proofs-15-gpu-confirmation-2026-10-10/browser-results.json), [agent audit](../web-stack-proofs-15-gpu-confirmation-2026-10-10/confirmation-verification.json), [root audit](root-confirmation-verification.json).

The untimed edge validator checks **702 complete calls** across every fixture and baseline/prior/current, including input nonmutation. All312 manifest-eligible calls execute on GPU (288 positive and24 empty);390 unsupported calls use recorded CPU fallback. Positive inputs precede empty ones and engines close afterward. [GPU edge results](../web-stack-proofs-15-gpu-confirmation-2026-10-10/GPU-edge-validation.json), [edge audit](../web-stack-proofs-15-gpu-confirmation-2026-10-10/GPU-edge-verification.json).

At65,536 words, filtered totals reduce dispatches5→3, and mapped/filter totals6→3, with identical upload/readback bytes per call. New dual-reduction GPU eligibility is not a prior-GPU speedup because that prior form has no GPU implementation.

Even with these GPU improvements, the main descriptive fastest current backend is **Wasm in68 cells and JS in40**; GPU wins none of the108 full-transfer cells. [Routing table](backend-routing.json) preserves all CPU/GPU comparisons. These benchmarks force backends. Existing host selection is separate JavaScript code; this batch does not add load-aware optimization, state migration, an Ink-written selector or a new universal routing policy.

## Output size, memory and verification

| File across 12 fresh modules | Prior bytes | Current bytes |
|---|---:|---:|
| program.mjs | 16730 | 15605 |
| cpu.c | 56343 | 53622 |
| cpu.wasm | 85407 | 66915 |

[Footprint scope](output-footprint.json): raw emitted files summed over12 fresh per-function modules, excluding shared runtime, shaders, compression and compile-time proof/plan traces. The output is not uniformly smaller. CPU single-loop lowering remains incomplete. Do not treat large compile-time plan JSON as executed code or these file totals as a whole-app download.

1,080 authenticated complete-call Wasm observations (five exported linear-memory views per main cell/host) increase the canonical observation count **6,786→7,866**, while the proof snapshot stays fixed. Exported linear-memory byte length is neither live allocation nor total process/GPU memory. JS, GPU and native peak memory is unmeasured; their evidence remains linked report records instead of fabricated zero-byte observations. [Canonical import receipt](canonical-observation-import.json).

**31 current scoped tests pass**: planner5, beta generator3, store7, publisher3, performance-store3, predicated4, independent beta3 and combined reductions3. The author/helper suites exercise144+126+144 typed frames and288+252+288 original/selected interpreter executions, with hash-valid false-proof rejection controls. These correctness tests are distinct from timing and do not replace machine-checked universal proofs. The historical full suite was not rerun. [Predicated evidence](../../knowledge/research/web-stack-proofs-15/predicated/evidence.json), [reduction evidence](../../knowledge/research/web-stack-proofs-15/reduction/evidence.json), [independent helper evidence](../../knowledge/research/web-stack-proofs-15/predicated/beta-helper-review-evidence.json), [source review](independent-source-review.md), [reduction/native review](independent-reduction-review.md), [performance review](performance-review.md).

The initial invalid admission CLI, typed-Let GPU fallback, unfavorable default-policy candidates, failed forward reduction proof and publication closure-count rejection remain archived. Preparation then exhausted disk **before timing**. The partial preparation is preserved; exact-byte-verified hardlinks consolidate131,923 duplicate immutable object paths (1,089,154,195 logical duplicate bytes), preserving paths and contents. Fresh preparation succeeded afterward. [Disk recovery receipt](disk-recovery.json), [initial failed preparation](initial-disk-preparation/status.json), [publication repair](publication-closure-repair.json).

The first final-audit invocation used the repository root for the reduction author’s lane-relative paths and stopped with a missing-file error. The immutable verifier and failed log remain preserved; [corrected path-aware verifier](verify-final-v2.py) authenticates reduction artifacts against their declared lane and external hashes against the repository root. No evidence hashes were changed.

Main audits authenticate2,511 frozen web artifacts,248 native artifacts and all author maps (639 predicated,4,658 reduction,363 helper), recomputing2,376 web and864 native intervals. Confirmation adds24 separately recomputed intervals and the edge audit. **34,668 total timing samples and13,392 complete comparisons** are retained across main/native/repeat/edge stages without pooling estimates. Only1,620 of the trials are actual GPU timing samples;312 edge GPU calls are untimed correctness checks.

[Final main integrity receipt](verification.json), [final supplementary binding](final-binding.json), [browser proof of work](browser-completed.png), [confirmation screenshot](../web-stack-proofs-15-gpu-confirmation-2026-10-10/browser-completed.png). Everything is local in the shared research checkout; no commit, push or PR was made. Earlier batches remain preserved.

## General-law content addresses

| Checked general law | Content address |
|---|---|
| filtered_predicated_sum_u32 | `7ea664aea2ba445654b6a6a5020155f8a04f672c97c265ccd100be6e08cb5d87` |
| mapped_filtered_predicated_sum_u32 | `31277d3d5398d43d7b7413657eefa44e80fb79763e3bd780f295d60c5872483c` |
| filtered_mapped_predicated_sum_u32 | `cf82fb1776e105408af81b8e63036eb8815362a498af995df8e2d8031b6c3f0b` |
| filtered_predicated_sum_i32 | `9583064eb65885a26dcdfb2ae595d7f897393c32dc0f144558a528607d3adb1f` |
| mapped_filtered_predicated_sum_i32 | `39662238f0aef1cfa3234fc558562db455294518825ae16fb7ad1f7f61df7a3b` |
| filtered_mapped_predicated_sum_i32 | `324427ce31777316a099732ee30328368d40e680641b0aea824c9d76e2c8b925` |
| filtered_predicated_sum_u64 | `cdfd0d616a8320be941b798baa08bee8ed29ff6b8483bd5c76974e51dd961c1f` |
| mapped_filtered_predicated_sum_u64 | `53d391fe53c8e9557b4cd030dbd32def303b2eb6aaa71547ac8da80c2295fa54` |
| filtered_mapped_predicated_sum_u64 | `290c56a1ef5d15fa76d5a5adfc1586677bd824fddf240829feb286188c0a661e` |
| dual_sum_add_u32 | `3b079d55d3717e5ef8af192b334933bd153f7da7832f54bc29f9364bceb2e7fa` |
| dual_sum_subtract_u32 | `dfcdb87286764676cbd799c767f58514bfacff05da8024607c39eed45a4066d3` |
| dual_sum_weighted_u32 | `98ef90c82b53b628cc7330d35835fe8bfbb368d1b26bf2ebcdd8f3f23ded8271` |
| dual_sum_add_i32 | `24eb6d9248a840277f284048c394c7d38d889dc39da2c9fe752655d98f936715` |
| dual_sum_subtract_i32 | `f3f07312723477f6644908636b7983cddbfd8ba2f426ee04d6c0441037f64f36` |
| dual_sum_weighted_i32 | `d55730d2d6070caaeb0b957d7c4e4fc4b9427625b3d053b09fb17ee1bc1b7d93` |
| dual_sum_add_u64 | `5072abb7dcb639538754a0e393db8ecf2c0e6687289ff1423a6b6a628fbed40a` |
| dual_sum_subtract_u64 | `189f2d9801e1145dc32aa27b9992fa634a8c4057fb99ad4ce814d6e386ea9b80` |
| dual_sum_weighted_u64 | `fbc35ebd17cbcb59e2d0ac79f99e84eddf237596ef5c5fe8088ee7a89be56490` |
