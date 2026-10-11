# Batch35: observed mapped-zip fusion

Nine direct DB endpoints fuse mapping into an independent-list zip while preserving both observed input values:

```ink
xs.map(f).zip(ys, h)
// checked equivalent:
xs.zip(ys, fn(x) => fn(y) => h(f(x), y))
```

The symmetric right-mapped and both-mapped forms also apply. Each orientation is proved for U32, I32 and U64, for arbitrary total pure mapping and pair functions. Result order and the minimum input length are unchanged. Mapping beyond the paired prefix becomes unnecessary. These are checked derived search shortcuts from existing map identity and batch17 mapped-zip/postmap fusion, using identity as the output map; no mathematical nonderivability, new proof rule or float endpoint is claimed.

Four source-bound U32 certificates preserve helper calls and the exact direct/transitive declarations by content hash. The nested recipe preserves mapper order and wrapping arithmetic. Source names containing `heldout` identify composition probes, not a statistically independent holdout sample. Syntax, core, planner, runtime, emitters, cost model and caller validation are unchanged. The frozen batch32 production compiler and all 122 production source hashes remain identical.

## Proofs and automatic application

The generic checked closure has 30 objects: nine new endpoints and 21 prior dependencies. Full producer validation and staged admission use 34 objects: the 13 new entries and those 21 dependencies. The fair prior is exactly the original 2,495-entry snapshot, without extra shared objects. Current adds nine endpoints and four source certificates, for 2,508 entries.

Six focused proof tests pass: 60 full U32 source/interpreter replays, 63 typed closed checks across the three integer domains, complete forward/reverse alpha-endpoint novelty against the pinned catalogue, three correctly rehashed false endpoints and eight direct/transitive helper mutations rejected. Old unused-input projection laws refuse all four observed-input sources. Existing Store/WebPublisher checks add 19 passes, for 25 focused tests. The original catalogue pin is explicit so these tests remain reproducible after publication. Finite checks supplement the kernel proofs; machine-code/runtime correspondence remains trusted.

The [ordinary prior probe](benchmark-preparation/prior-residual-audit.json) leaves left/right/both/nested recipes unchanged at costs 377/377/515/669, with 1/1/2/3 maps and one zip each. All four [current selections](benchmark-preparation/completion-receipt.json) automatically choose a fresh proof under the same planner and cost model, yielding zero maps and one zip. No per-recipe whitelist or forced acceptance is used. The [independent preflight](review/target-preflight-review.json) verifies 396 target bindings, 107 native bindings and single-loop checked JS: each observed mapper is computed once per paired element, and one output array is allocated.

Node untimed validation passes 1,152 rows / 3,072 complete checks; browser passes 1,440 rows / 3,936 complete checks, including 288 actual GPU validations and zero fallback; native passes 384 complete output/nonmutation checks. Strong fused JS/Rust controls pass 192 complete oracle comparisons. Empty/one-empty/unequal inputs, word boundaries, zero divisors, input nonmutation and owned-output lifetime are covered. Both input values and their order independently affect tested outputs.

## Timing boundaries and GPU execution

Preparation, full-output validation and independent review precede a [timing freeze](timing-freeze.json). Workers are idle during serial native, Node and browser runs. Full captured JS, full captured Wasm, resident borrowed Wasm destinations, complete instrumented GPU calls, and native resident/copied-input destinations are separate cohorts. Web consumes length/first/last; native consumes the complete vector. Controls use the same words, wrapping operations and corresponding ownership/residency boundaries. Hosts and transport boundaries are not pooled.

Every literal/prior/checked primary GPU function has `graph_required=false`. Logical stage counts 2/2/3/4 become one, but both catalogue versions already execute a flat single shader. For nonempty maximum input extent they issue one dispatch; two empty inputs issue zero. Both retain maximum-input output capacity, list/scalar/metadata upload headers and a returned length header. Physical upload, readback and live-buffer counters have identical contracts. Device-buffer counters do not measure CPU heap or GPU-driver heap peaks; observation `peak_bytes` is null.

The timed GPU cohort has 648 rows / 10,575 actual GPU calls and zero fallback calls. No dispatch, traffic or memory reduction is established. GPU timing is mixed and mostly uncertain; existing CPU controls are much faster for this tested request-size range.

## Performance evidence

The frozen run has **7,560 samples**, split 1,728 native / 2,592 Node / 3,240 browser, across 840 empirical groups. All audits pass. [Analysis](analysis.json) records 672 paired comparisons and 112 strata by the four recipe families. Each cell uses nine matched log ratios and 4,000 deterministically seeded bootstrap draws; nominal per-cell 95% percentile intervals classify results. Aggregate geometric means are descriptive, with no multiplicity correction or universal profitability guarantee.

| Host | Boundary | Prior time / checked time | Faster / slower / uncertain |
|---|---|---:|---:|
| browser | captured-js-owned | 1.080× | 14 / 6 / 4 |
| browser | captured-wasm-owned | 1.010× | 8 / 1 / 15 |
| browser | instrumented-full-gpu-request | 1.020× | 2 / 2 / 20 |
| browser | resident-wasm-destination | 1.374× | 21 / 3 / 0 |
| native | captured-native-destination | 1.379× | 18 / 5 / 1 |
| native | resident-native-destination | 1.742× | 18 / 4 / 2 |
| node | captured-js-owned | 1.187× | 23 / 1 / 0 |
| node | captured-wasm-owned | 1.014× | 14 / 1 / 9 |
| node | resident-wasm-destination | 1.372× | 22 / 2 / 0 |

Across 216 prior/current comparisons, 140 favor checked, 25 favor prior and 51 remain uncertain. All 25 classified [regressions](regressions.json) and 44 [point losses](point-losses.json), including uncertain losses, are retained. This batch improves the matrix overall but does not improve every workload. Browser right-mapped JS is an adverse family: 0.725× geometric mean, zero favorable cells, four slower and two uncertain. The measurements do not identify a JIT-level causal explanation.

| Host | JS boundary | Recipe family | Prior / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
| browser | captured-js-owned | both | 1.114× | 4 / 1 / 1 |
| browser | captured-js-owned | left | 1.159× | 4 / 1 / 1 |
| browser | captured-js-owned | nested | 1.456× | 6 / 0 / 0 |
| browser | captured-js-owned | right | 0.725× | 0 / 4 / 2 |
| node | captured-js-owned | both | 1.079× | 5 / 1 / 0 |
| node | captured-js-owned | left | 1.446× | 6 / 0 / 0 |
| node | captured-js-owned | nested | 1.206× | 6 / 0 / 0 |
| node | captured-js-owned | right | 1.056× | 6 / 0 / 0 |

## Strong controls and scope

Reference-time / checked-time above one favors Ink. The controls already fuse all mappings into a single pass over the paired prefix; they are not an eager multi-array baseline.

| Host | Boundary | Strong reference | Reference / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
| browser | captured-js-owned | expert_js_owned | 0.887× | 2 / 21 / 1 |
| browser | captured-wasm-owned | rust_wasm_full | 0.452× | 0 / 24 / 0 |
| browser | instrumented-full-gpu-request | expert_js_owned | 0.014× | 0 / 24 / 0 |
| browser | instrumented-full-gpu-request | rust_wasm_full | 0.030× | 0 / 24 / 0 |
| browser | resident-wasm-destination | rust_wasm_prepared | 0.917× | 2 / 17 / 5 |
| native | captured-native-destination | expert | 0.927× | 3 / 13 / 8 |
| native | resident-native-destination | expert | 0.887× | 1 / 16 / 7 |
| node | captured-js-owned | expert_js_owned | 1.021× | 14 / 7 / 3 |
| node | captured-wasm-owned | rust_wasm_full | 0.428× | 0 / 24 / 0 |
| node | resident-wasm-destination | rust_wasm_prepared | 0.920× | 2 / 18 / 4 |

Node JS has a descriptive 1.021× ratio against the handwritten fused control, with 14 favorable cells, seven slower and three uncertain. Browser JS and resident native remain about 12.7% and 12.8% slower descriptively than their strong controls. Resident Rust-Wasm remains faster overall and full-call Rust-Wasm substantially faster. These results do not establish broad native superiority. GPU requests remain much slower than CPU controls here.

This is one general observed-map fusion family in three orientations and four source contexts. Its mathematical statement covers arbitrary total pure helpers in three integer domains; timings cover four U32 recipes, sizes 32/4,096/65,536 and two joint shape/value regimes on one Apple M2. Small words use ys=xs+7; full-width words use ys=floor(xs/3)+1. Shape and word distributions are joint regimes, not independently crossed factors. Gains are compile-time selections; no runtime load/state optimizer or target-routing policy is added. Correctness, application conditions and measured profitability remain separate.

## Reproduction and publication

Compiler SHA256: `04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536`. Run `PYTHONPATH=knowledge:planner INK_PIPELINE35_PROOFS_DIR=/tmp/ink35-proofs python3 -m unittest knowledge.tests.test_web_pipeline35_laws -v` in a fresh evidence directory. The tests bind the recorded original catalogue. Exact proof views, commands and checked closures are archived.

The existing general `knowledge/producers/publish_web_pipeline33.py` stages `candidate-rows.json`, validates ordinary admission and publishes only those staged bytes. [Publication negative controls](publication-negative-controls.json) reject changed admission logs or missing previous discovery names before pointer mutation. Benchmark preparation, validation and separate timing commands are in [the benchmark README](../../bench/web-stack-proofs-35/README.md). Use fresh report paths to preserve original evidence.

[Publication](publication.json) records canonical snapshot `b7d979fd4861a1b82897f142737e9b8161f8c2946e9f7fa6514b50aefd45240b`: 2,508 entries, 4,255 discovery names, 13 new objects and no newly shared prior objects. All 2,495 previous entries and 4,242 previous discovery names survive. [Observation import](observations.json) adds 840 separate empirical groups, totaling 24,260 files; all 23,420 old observation files retain their exact bytes. No runtime or cost-model policy is installed from these observations.

[Final verification](verification.json) confirms immutable preservation and unchanged compiler/production sources. [Independent performance review](review/final-performance-review.json) replays all samples, seeds, confidence intervals, four-family strata and physical GPU counter formulas. Knowledge is committed directly on `main` at `2d1a640423aaab6301a398eff61c0e1b1d60d98f`; the distribution integrates that exact pin. Six post-publication proof tests also pass with the original snapshot, without overwriting the original evidence: [log](post-publication-tests.log).
