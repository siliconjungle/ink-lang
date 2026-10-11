# Ink web proof batch 6 — 10 October 2026

Two proof authors and an independent reviewer contributed **20 fresh checked laws**, growing the catalogue from **834 to 854 entries**. All **67 knowledge tests pass**. Removing conditional-blend recurrence work improves the large browser representative across JavaScript, Wasm and actual WebGPU: **26.80×**, **3.12×**, and **1.8%** respectively in the main run. An unchanged-artifact focused repeat corroborates its small GPU benefit at **4.8%** and Wasm near **3.1×**. These are explicitly synthetic 64-step workloads, not general application or language rankings. Calibrated-square fusion provides a separate collection JavaScript gain.

The main matrix also retains **21 supported regressions**. Simple square fusion is slower on JavaScript; zero-distance results are mixed; one small compensating-patch Wasm cell regresses. Correct proofs do not guarantee profitability. No compiler/core/runtime/planner/backend source changed: all **102 guarded source hashes** remain identical. Generated functions continue to trust callers; no validators, optional checker wrappers, trusted optimization rules or automatic routing policy were added. All work remains local.

## Mathematical objects and executable evidence

| Family | Instances | Checked transformation |
|---|---:|---|
| Complementary contribution repeat | 3 | Captured complementary branches sum to a constant increment, yielding `x+n*d*k` |
| Conditional weight blend repeat | 3 | Captured weight selection becomes `x+n*offset*choose(c,1-k,1-d)` |
| Compensating patch repeat | 3 | Ordered add/subtract compensation returns its initial word |
| Self-zip square | 4 | Replace same-list product zip with one square map |
| Self-zip square with unary postmap | 4 | Fuse product zip and pure postmap into a single map |
| Self squared distance | 3 | Replace same-list squared distance with a zero-valued map |

Three-instance families cover U32/I32/U64 wrapping words; four-instance families also cover F32. No F32 cancellation or reassociation is asserted: F32 square/postmap expression order is preserved, while zero-distance excludes F32 because exceptional values invalidate zero cancellation. All outputs still require traversal, allocation and writes, even zero maps.

Numeric proofs split the captured Bool condition, then use Nat induction. At zero iterations the endpoint is the initial word; each successor update adds the same wrapping increment, or leaves the accumulator unchanged. The source condition is `x<seed`, captured from the original element rather than the changing accumulator. Collection proofs use list induction: Nil gives equal empty lists; Cons applies the exact same per-element expression and the induction hypothesis to the tail. These are ordinary locally checked proof terms under the existing kernel.

All 20 instances admit, default-select, replay and reify. Old834 applies no laws to the representative sources and preserves their bodies. Compute tests include counts 0/1/64 across all three word types, 27 original/selected interpreter frames, and 1,170 independent literal-versus-closed oracle cases. Collection tests include 33 typed complete-array interpreter frames with wrapping/signed extrema and F32 negative zero. **Five hash-valid false controls** reject semantically. [Compute notes and terms](../../knowledge/research/web-stack-proofs-6/compute/notes.md), [compute receipt](../../knowledge/research/web-stack-proofs-6/compute/evidence.json), [collection notes](../../knowledge/research/web-stack-proofs-6/collection/NOTES.md), [independent review](../../knowledge/research/web-stack-proofs-6/review.md), [publication](publication.json) and [full test log](knowledge-tests.log) preserve evidence. Mathematical typed coverage is broader than the six U32 performance representatives.

## Frozen full web comparison

Prior snapshot: `2e4106786af6f3cd41dbad39438c52dd9d518397b7a69b2841a525959c994f34`. New854 snapshot: `97f7f5263af8e184c1b68559220e0182f3beda7802fe0b4ea372faac5d898044`. Same frozen compiler SHA256: `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`. [Metadata](metadata.json) pins 86 artifacts; the locally checked default selection applies exactly six fresh laws, one per measured function.

The protocol uses Apple M2, Node 26.1.0 and headed Chrome 154/Apple Metal-3. Thirteen correctness inputs include empty/singleton, wrapping boundaries, zero/unit factors and odd random lengths. Six timed shapes combine small/full-width words and lengths 32/4096/65536. Seven shuffled paired rounds follow calibration and discarded warmup. Each complete call pays one entire typed-input snapshot, applicable Wasm copying and public output conversion, await and checksum consumption. GPU calls include upload, dispatch and readback. Startup and first calls are separate. No compiler/tests ran during timing.

Original handwritten JS/Rust follow original 64 update steps and original zip/map stages, permitting normal JIT/release optimization. Synthetic count 64 is a model setting, not an application iteration count. Python arbitrary-integer modular closed forms are independent of literal wrapped stage evaluators. Preflight validates 78 original-JS outputs and 276 Python source-stage values. Compiled CPU prevalidation passes 858 comparisons. Main Node saves 2,772 timed samples and 1,254 comparisons; browser saves 3,444 samples and 1,362 comparisons. [Node report](node-REPORT.md) and [browser report](browser-REPORT.md) retain every shape, raw trial, warmup and calibration.

Full-width 65536 browser prior/new ratios, with exploratory paired 95% intervals:

| Workload | Runtime JS | Wasm | Actual GPU |
|---|---:|---:|---:|
| Contribution repeat (synthetic) | 70.775× [70.000,72.643] | 1.013× [1.000,1.020] | 1.061× [1.000,1.074] |
| Conditional blend (synthetic) | 26.801× [26.451,26.927] | 3.119× [3.078,3.240] | 1.0183× [1.0121,1.0364] |
| Compensated patch (synthetic) | 220.208× [210.922,222.592] | 0.983× [0.977,1.002] | 0.970× [0.941,1.145] |
| Squared values | 0.950× [0.931,0.990] | 1.007× [0.987,1.027] | 0.994× [0.878,1.012] |
| Calibrated squares | 1.232× [1.209,1.264] | 1.000× [0.987,1.020] | Prior fallback; new eligible |
| Self squared distance | 0.963× [0.932,1.001] | 0.988× [0.970,1.031] | 0.981× [0.974,1.007] |

Ratios above 1 mean faster new output; intervals including 1 remain unresolved. Large Node conditional blend improves JS 18.14× and Wasm 3.089×; calibrated squares improves JS 1.670×. Contribution and patch Wasm generally show little benefit because downstream optimization and full-call costs matter. Large JS loop gains remove explicit 64-step model work and must not be generalized to already-optimized algorithms.

Main same-backend comparisons contain **115 supported gains, 110 inconclusive and 21 regressions**. Node's nine regressions are squared-values runtime/direct JS. Browser has seven squared-values JS regressions, four zero-distance JS regressions and one compensating-patch small 32 Wasm regression. [Profitability decisions](profitability.json) retain prior candidates wherever benefit is adverse or unresolved. Fewer operations, smaller source or shader eligibility alone do not prove speed.

## GPU execution and focused confirmation

The main browser records **96 actual GPU variant/cells and 672 timed GPU samples**, corroborated by one dispatch, `4*N+24` upload bytes and `4*N` readback bytes per vector call, including aggregate warmup/calibration counters. Five source functions have comparable prior/new shaders. Calibrated-square fusion enables a previously unsupported pipeline; its **12 original/prior fallback records** are retained and excluded from GPU samples. That eligibility transition supplies no prior/new GPU ratio.

Because the effects were small, a separate [focused repeat](gpu-confirmation/browser-REPORT.md) times contribution/blend at small/full-width 65536, preserving all fixture inputs/oracles and **84 of 86 frozen artifacts byte-for-byte**, including every compiled output, runtime, control and shader. Only the timed cell list and explanatory page label differ. The repeat saves 392 samples, 914 exact comparisons and 84 actual GPU samples across 12 GPU variant/cells; it has no fallback. [Preparation](gpu-confirmation/preparation.json), [raw results](gpu-confirmation/browser-results.json) and [independent analysis](gpu-confirmation/root-analysis.json) preserve the distinct run.

Full-width conditional-blend GPU improves **1.0482× [1.01205,1.07975]**, corroborating the main 1.0183× interval; Wasm is **3.078× [2.963,3.099]**. Contribution repeat is **1.0373× [1.0186,1.0629]** on GPU here, while its original prior/new interval includes 1. Repeat classifications are 14 nominal gains and 2 inconclusive. One small-input blend GPU lower bound is 1.0000000001186 and is borderline; it is not a robust broad gain. Different runs are not pooled, and JS effect sizes change between runs. Individual 95% intervals are exploratory and unadjusted for multiplicity.

All 36 current main-browser lowest medians are runtime JavaScript. All 72 paired current CPU/GPU intervals favor CPU, with maximum upper bound about 0.793. Thus a modest GPU improvement does not make GPU the preferred route for these complete calls. [Routing evidence](backend-routing.json) retains real upload/readback costs; GPU-resident pipelines and automatic adaptive selection remain unmeasured/unimplemented.

## Size, controls and database

[Emitted sizes](artifact-sizes.json) show generated JS **3,937→3,023 bytes** (23.2% smaller), C 10,441→8,768 and Wasm 19,623→19,249 against prior. These are uncompressed emitted files, excluding proof plans/runtime/network compression. Shader count differs 5→6, so aggregate shader bytes are not a like-for-like size claim.

Against original-algorithm JS controls, checked direct JS has 32 supported wins/1 loss/3 inconclusive in Node and 31 wins/1 loss/4 inconclusive in browser. Checked Wasm versus original Rust-Wasm has 6 supported wins and 30 losses on each host. Rust may optimize source loops naturally and reuse final output storage; expert directly written closed-form/fused controls are unmeasured, and boundary wrappers differ. These measurements establish no general language ranking.

Importing **304 authenticated measured Wasm observations** (288 main, 16 repeat) increases the canonical store **3,566→3,870**, preserving its 854-entry proof snapshot and all older archives. Wasm memory is exported linear-memory highwater only; host/GPU/JS memory is unmeasured, so no fabricated memory observations are added. [Import receipt](observation-import.json) records every identity and source hash.

Combined evidence totals **6,608 timing samples**, **3,530 exact backend comparisons**, **756 actual GPU samples**, and **912 independently recomputed paired intervals**. All 172 frozen artifact hashes and 102 guarded source hashes pass. [Final verification](verification.json), [main interval audit](root-interval-verification.json), [source harness](../../bench/web-stack-proofs-6.py), [confirmation auditor](../../bench/web-stack-proofs-6/confirmation-analyse.py) and [independent review](../../knowledge/research/web-stack-proofs-6/review.md) record the evidence and limits. No commit, push or PR was created.
