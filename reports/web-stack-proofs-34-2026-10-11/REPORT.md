# Batch34: direct unused-map projection proofs

The DB gains a direct route to remove a mapped stream whose values are ignored by an independent-list zip callback. It preserves the shorter-list result extent:

```ink
xs.map(f).zip(ys, fn(unused) => fn(y) => g(y))
// checked equivalent:
xs.zip(ys, fn(unused) => fn(y) => g(y))
```

The symmetric right-stream law also applies. These six U32/I32/U64 endpoints are checked consequences of existing map identity and independent mapped-zip/postmap fusion laws. They materialize a useful search shortcut; no mathematical nonderivability or new core mechanism is claimed. No float endpoint was added. Mapping functions are ordinary total pure functions.

Four content-bound U32 source certificates preserve composed helpers while removing unused maps. Their exact full helper contexts are retained, including discarded helpers and transitive callees. The two composed recipes reuse batch33 function/helper bodies; their module header changes. They are composition probes, not a statistically independent holdout set. No syntax, core, emitter, runtime policy or caller-validation change was made. All 122 production source hashes and the exact batch32 main compiler are unchanged.

## Checked proof and selection evidence

The generic closure contains 21 objects: six new endpoints and 15 prior dependencies. The complete producer validation view contains 33 objects: ten new objects and 23 prior objects, including two already-canonical prior-only scan certificates. Canonical staged admission checks the ten new roots and a 31-object closure (21 prior dependencies). The fair prior is exactly the existing 2,485-entry snapshot, with no extra old-only objects. Current has 2,495 entries.

Six focused proof tests pass (also rerun with the original catalogue explicitly pinned; [test update](pinned-test-update.json)): 60 full U32 source/interpreter replays, 42 typed closed map checks, exact endpoint novelty across all 2,485 catalogue entries, observed callback/nested-capture rejection and five correctly rehashed false/helper mutations. Direct and transitive discarded/retained helper changes reject. Existing Store/WebPublisher checks add 19 passes. Finite replays supplement the kernel proofs; machine-code/host correspondence remains a trusted boundary.

[Prior planner probe](benchmark-preparation/prior-probe-exact/summary.json) records raw maps left unchanged and existing scan proofs selected in composed contexts. [Final preparation](benchmark-preparation/completion-receipt.json) records all four new maps erased through ordinary automatic selection with the same cost model. Prior ASTs have one map, zero scans and one zip; checked ASTs have zero maps, zero scans and one zip. No per-recipe whitelist or forced cost acceptance is used.

Node untimed validation passes 1,152 rows / 3,072 complete checks; native passes 384 complete checks with nonmutation; browser passes 1,440 rows / 3,936 complete checks, including 288 actual GPU validations and zero fallbacks. Strong handwritten JS/Rust controls pass 192 oracle comparisons. Empty/one-empty/unequal lengths, zero divisors, wrapping values and output ownership/lifetime are covered.

## GPU and boundary scope

Prior and checked primary GPU functions both have `graph_required=false`: their two-versus-one declared graph nodes do not imply two-versus-one physical dispatches. Both routes issue one shader dispatch for positive maximum input extent and zero for two empty inputs. Both use maximum-input output capacity, legacy list/scalar/metadata upload headers and a returned length header. Measured upload/readback/live-buffer counters are separate from unmeasured CPU or GPU-driver heap peaks. No GPU dispatch, traffic or memory saving is assumed from the DB expression change.

Batch33's composed checked route was also single-shader. Its report wording is corrected, with the original report and manifest preserved in [corrections](corrections/correction.json). All old inputs, emitted targets, raw timings, counters and numerical analysis retain their exact bytes. This correction does not change the previously reported speedup ratios.

Full captured JS, full captured Wasm, resident borrowed Wasm destinations, complete instrumented GPU calls and native resident/copied-input destinations are measured separately. Native measurements consume complete output vectors; web measurements consume length/first/last. All variants use the same input words and equivalent owned/borrowed lifetimes within each cohort. Hosts and transport boundaries are not pooled.

## Measurements

The frozen run contains **7,560 samples**: 1,728 native, 2,592 Node and 3,240 browser, across 840 empirical groups. All three target audits pass. [Analysis](analysis.json) retains 672 comparisons, including all strong controls. Each comparison uses nine paired log ratios and 4,000 deterministically seeded bootstrap draws; nominal per-cell 95% percentile intervals classify cells. Aggregate geometric means are descriptive; no multiplicity correction or universal profitability guarantee is claimed.

| Host | Boundary | Prior / checked geometric mean | Faster / slower / uncertain |
|---|---|---:|---:|
| browser | captured-js-owned | 1.732× | 24 / 0 / 0 |
| browser | captured-wasm-owned | 1.025× | 17 / 0 / 7 |
| browser | instrumented-full-gpu-request | 1.002× | 1 / 0 / 23 |
| browser | resident-wasm-destination | 2.597× | 24 / 0 / 0 |
| native | captured-native-destination | 2.234× | 24 / 0 / 0 |
| native | resident-native-destination | 3.863× | 24 / 0 / 0 |
| node | captured-js-owned | 4.145× | 24 / 0 / 0 |
| node | captured-wasm-owned | 1.018× | 16 / 0 / 8 |
| node | resident-wasm-destination | 2.582× | 24 / 0 / 0 |

Across 216 prior/current cells, 178 favor checked, 38 are uncertain, and zero favor prior. [Regressions](regressions.json) remains recorded. There are 16 point estimates below one; these remain in [point-losses](point-losses.json), with their confidence intervals. No unfavorable or uncertain cell is discarded.

## Strong controls and limits

Expert-time / checked-time geometric means are 0.958× browser JS, 0.939× Node JS, 0.963× resident native and 0.988× copied-input native. Thus checked code is descriptively about 4.3%, 6.6%, 3.8% and 1.2% slower respectively in this matrix. These are ratios of geometric means, not aggregate confidence intervals or a claim of general native parity. Ink has three browser-JS wins, two Node-JS wins, zero resident-native wins and two copied-input native wins; controls still have more classified wins on each of these boundaries.

Resident Rust-Wasm expert / checked ratios are 0.901× browser and 0.927× Node, with seven and five Ink wins respectively. Full-call Rust-Wasm remains substantially faster: ratios 0.441× browser and 0.421× Node, all 24 cells favoring Rust-Wasm on each host. The modest 1.8–2.5% full-call improvements over prior Ink expose marshaling/bridge cost that the DB expression rewrite does not remove.

Complete GPU requests are essentially unchanged against prior: 1.002× descriptive geometric mean, one favorable cell and 23 uncertain cells. All prior/checked physical dispatch, upload and readback contracts are identical. Handwritten CPU controls remain much faster for this tested size range: expert JS / checked GPU 0.0105×, full Rust-Wasm / checked GPU 0.0293×, all 24 cells favoring each CPU control. No GPU speedup, traffic reduction or memory benefit is established by this batch.

This is one general projection-demand family in two orientations and four source contexts. It covers arbitrary total pure helpers in three integer domains mathematically; timing covers the disclosed U32 recipes on one host. It does not establish broad superiority across unrelated algorithms, platforms or compiler configurations. Compile-time DB selection remains unchanged; no runtime load/state optimizer or new target-routing policy is installed.

The matrix has four U32 recipes, three sizes (32, 4,096, 65,536), and two joint shape/value regimes: smaller words with ys=xs+7, and full-width words with ys=floor(xs/3)+1. Shape and word regimes are joint strata, not independently crossed factors. Nine calibrated, interleaved matched rounds are used on one Apple M2 host. Broad superiority over native Rust or handwritten JavaScript is not assumed.

## Reproduction

Use the frozen compiler SHA256 `04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536`. Run proof checks with `PYTHONPATH=knowledge:planner INK_PIPELINE34_PROOFS_DIR=/tmp/ink34-proofs python3 -m unittest knowledge.tests.test_web_pipeline34_laws -v`; the tests explicitly use the recorded original catalogue pin and remain reproducible after publication. The evidence preserves exact commands and proof views.

Stage `candidate-rows.json` using the general `knowledge/producers/publish_web_pipeline33.py` utility; private prior/current stores are generated from the pinned old snapshot and candidates, then ordinary checked. Benchmark commands and separate preparation/validation/timing phases are in [bench README](../../bench/web-stack-proofs-34/README.md). Use fresh output directories to preserve archived evidence. Correctness admission, application conditions and empirical profitability remain separate.

## Canonical publication

[Publication](publication.json) records canonical snapshot `7cf9b7ec48a8edd25b05951b8e424ea26444467fc176257aa34ac5a8e40aa644`: 2,495 entries, 4,242 names, ten new objects and no newly shared prior objects. All 2,485 previous entries and names are preserved. [Observation import](observations.json) adds 840 empirical groups, bringing the total to 23,420; all 22,580 previous files retain their exact bytes. Profitability observations remain distinct from checked mathematical entries.

[Final verification](verification.json) confirms canonical preservation and all unchanged production hashes. [Independent performance review](review/final-performance-review.json) replays every sample/seed/interval and physical GPU counter formula. The timed GPU cohort includes 648 rows / 9,576 actual device calls and zero fallback calls. No runtime or cost-model policy is installed.

Knowledge is committed directly on `main` at `2f3a9bc2bacd162eb4b1262ef92add11f3cc3be1`. The distribution integrates that exact committed pin. Six post-publication proof tests pass with the recorded original catalogue: [log](post-publication-tests.log).
