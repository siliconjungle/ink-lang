# Ink web proof batch 5 — 10 October 2026

Two proof authors and an independent review agent contributed **25 fresh checked laws**, taking the canonical catalogue from **809 to 834**. All **58 knowledge tests pass**. Six traversal-removal representatives improve complete JavaScript calls on every measured fixture in both hosts; several Wasm cases also improve. The seventh, a vector arithmetic factorization, regresses on JavaScript. A separate compile-time selection restores its original expression but still regresses in the rebuilt bundle. Both results are retained; this selection is not a proven fix. Actual WebGPU execution was measured, without a robust GPU speedup established in this batch.

No compiler, core, runtime or backend implementation changed in this batch. Generated functions trust callers; no caller validators, checking wrappers or runtime profitability selector were added. The source-specific selection below is a locally checked compilation artifact, not a general automatic policy. Everything remains local.

## Checked mathematical contribution

| Family | Instances | Proven change |
|---|---:|---|
| Scaled mapped head | 4 | Evaluate scaling only on the first element or exact transformed empty fallback |
| Affine mapped head | 4 | Evaluate the original affine expression only on the selected element |
| Threshold mapped head | 4 | Produce Bool from the selected comparison, retaining mapped empty fallback |
| Ignored-element right fold | 4 | Return the exact initial seed |
| Discount total | 3 | Replace sum of `x-x*k` with `sum(xs)*(1-k)` |
| Spread total | 3 | Replace sum of `x*k-x*d` with `sum(xs)*(k-d)` |
| Scalar spread factor | 3 | Replace `x*k-x*d` with `x*(k-d)` |

The four-type families cover U32/I32/U64/F32; the three-type families cover wrapping word types only. F32 head arithmetic keeps expression order; ignored folds preserve exact seed bits, including exceptional values. No F32 sum reassociation is asserted. Empty input, transformed fallback, signed extrema, wrapping arithmetic and unused exceptional tails are checked. Six hash-valid false controls fail semantic admission. Every final law passes admission, default selection, local replay and executable reification. Generic callback experiments that admitted but could not match ordinary executable source remain archived and excluded.

The [lookup author evidence](../../knowledge/research/web-stack-proofs-5/lookup/NOTES.md), [reduction evidence](../../knowledge/research/web-stack-proofs-5/reduction/notes.md), [independent review](../../knowledge/research/web-stack-proofs-5/review.md), [publication receipt](publication.json) and [full test log](knowledge-tests.log) retain the actual proof terms, commands and controls. Proof correctness, usable selection and latency benefit are separate claims. All 25 mathematical instances are checked; performance covers seven U32 representatives, not every typed instance.

## Full web measurements

The frozen compiler SHA256 is `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`. Old809 snapshot is `388e3ebd2714c88bc66ae9219102284162f4f65cbed359283f54896b3cfac87c`; new834 snapshot is `2e4106786af6f3cd41dbad39438c52dd9d518397b7a69b2841a525959c994f34`. The old selection applies zero laws and preserves every original body. The new selection applies seven fresh laws, one per function, checked and reified with the same compiler. [Frozen metadata](metadata.json) pins 72 artifacts, compiler, methodology, source and commands.

Measurements use Apple M2, Node26.1.0 and headed Chrome154/Apple Metal-3. Seven shuffled paired rounds follow warmup and calibration. Thirteen correctness fixtures include empty, singleton, wrapping boundaries, zero/unit factors and odd random lengths; six timed shapes combine small/full-width distributions with 32/4096/65536 words. Every timed call includes one full typed-input snapshot, applicable Wasm copying/output conversion, awaited completion and checksum consumption. GPU calls include upload, dispatch and readback. Startup and first calls are archived separately. Head/fold computation becomes constant work, but full-call input transport remains O(N).

The main matrix saves **6,594 samples** and **3,052 exact backend comparisons**. Handwritten original JavaScript preflight adds 91 comparisons and independent literal Python checking adds 124. [Node results](node-REPORT.md), [browser results](browser-REPORT.md) and their raw JSON retain all shapes, variants, calibration, warmups and intervals.

For full-width 65,536-word browser input, prior/new ratios above one mean faster new output:

| Workload | Runtime JS speedup | Wasm speedup |
|---|---:|---:|
| Scaled first | 21.535× [20.813,21.963] | 1.134× [1.104,1.174] |
| Calibrated first | 29.403× [28.075,29.805] | 1.112× [1.061,1.176] |
| First below threshold | 30.680× [29.919,31.823] | 1.126× [1.102,1.157] |
| Discount total | 12.297× [12.059,12.856] | 1.178× [1.139,1.260] |
| Spread total | 12.286× [11.756,13.219] | 1.161× [1.096,1.216] |
| Dead map/fold | 29.937× [29.369,31.766] | 1.109× [1.087,1.198] |
| Vector spread | 0.783× [0.761,0.850] | 1.032× [0.952,1.090] |

All six scalar JavaScript rewrites improve throughout both-host matrices. Large Node scalar JS ratios are roughly 13.82–46.12×; three large Node head Wasm intervals cross one. Main same-backend comparisons total **181 supported gains, 53 inconclusive and 24 supported regressions**. All 24 regressions are vector spread in runtime/direct JS across six fixtures and both hosts. These are exploratory individual 95% paired bootstrap intervals, unadjusted for multiple comparisons. [Profitability decisions](profitability.json) retain adverse and unresolved cases rather than asserting universal wins.

## Compile-time selection follow-up

A [separately checked selection](javascript-selection/gated-selection.json) keeps six scalar applications and removes the vector factor application. Reification verifies that six bodies match unrestricted checked output and vector spread matches the original core. Generated JS restores its two-multiply/subtract expression. No runtime selector is used. [Frozen supplemental metadata](javascript-selection/metadata.json) pins 59 artifacts.

This JS-only follow-up saves **4,116 samples** and **1,862 exact comparisons**, bringing measured totals to **10,710 samples** and **4,914 comparisons**. Both hosts have 72 supported prior/selected gains and 12 regressions across runtime/direct JS. Large browser scalar gains remain **11.60–27.26×**. However vector spread still slows: browser runtime prior/selected **0.757× [0.707,0.801]**, Node **0.600× [0.528,0.773]**. Restoring an expression alone therefore does not establish restored performance. The surrounding module and shared helper callsites differ; JIT context is a plausible confound, not a measured cause. Direct JS also regresses, so runtime wrappers cannot fully explain it. Keep the previously measured prior vector artifact for these profiles; the rebuilt six-law bundle is not a no-regression substitute.

[Supplemental Node summary](javascript-selection/node-summary.json), [browser summary](javascript-selection/browser-summary.json), raw results and saved browser evidence preserve this unsuccessful candidate. The root independently audits every trial/warmup/calibration checksum and normalization, and recomputes **792 main plus 504 supplemental paired intervals**. All **131 frozen artifact hashes** pass. Valid factor laws remain mathematical catalogue entries; this evidence does not make them profitable on JavaScript generally.

## GPU eligibility, routes and comparison limits

The main browser executes **18 actual GPU variant/cells and 126 timed GPU samples**. Counters corroborate one dispatch, `4*N+24` upload bytes and `4*N` readback bytes per vector call, including archived calibration/warmup aggregates. All **108 scalar GPU fallback records** remain excluded from GPU timing. Only vector spread supplies comparable shaders in this mixed schema-v2 bundle. A standalone legacy-v1 scalar sum route exists but is unmeasured here; these records do not establish universal scalar GPU exclusion.

The vector full65536 GPU ratio is nominally **1.016×**, with lower 95% bound **1.0000000000735**; the original-source/new interval crosses one. Its strict classifier counts one nominal win, but this is borderline evidence rather than a robust GPU benefit. Five other GPU intervals cross one. All twelve measured current CPU/GPU intervals favor CPU for these complete calls. Descriptive lowest current browser medians are JS in 34 cells and Wasm in 8; paired JS/Wasm route intervals are not supplied. No automatic routing policy is implemented. [Routing evidence](backend-routing.json) retains full costs and GPU fallback scope.

Checked runtime/direct JS beat original-algorithm JS controls in all 42 cells per host, despite vector spread losing to prior generated JS. Wasm/Rust-Wasm comparison is mixed: Node 1 supported win/35 losses/6 inconclusive; browser 7 wins/32 losses/3 inconclusive. Rust controls retain original source operations but normal release optimization and reused final output storage are allowed. Expert directly written head-only or already-factored controls are unmeasured, and boundary contracts differ. These workloads do not rank languages generally.

## Database and reproducibility

Imported **336 authenticated measured Wasm observations** increase the canonical store from **3,230 to 3,566 observations**, without changing its 834-entry proof snapshot. JS-only supplemental results remain raw evidence because memory was not measured; no canonical memory values are fabricated. Wasm memory is exported linear-memory highwater only, not whole-process or GPU memory. [Import receipt](observation-import.json) records every identity and source hash.

[Final verification](verification.json), [main interval audit](root-interval-verification.json), [independent review](../../knowledge/research/web-stack-proofs-5/review.md), [source harness](../../bench/web-stack-proofs-5.py) and [supplemental auditor](../../bench/web-stack-proofs-5/javascript-selection.py) provide reproducible commands and boundaries. The archived main analysis scope contained an inherited old786 label; the derived profitability scope and active analysis script correct it to old809 without modifying frozen bytes. Previous snapshots, dirty work and all earlier adverse measurements are preserved. No commit, push or PR was created.
