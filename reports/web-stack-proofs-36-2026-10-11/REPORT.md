# Batch36: helper-bound ordered-fold deployments

Four source certificates make existing general ordered-fold laws usable through named helpers. The full prior catalogue already contains arbitrary map/fold fusion; it must not be republished under another name. In the initial plain helper probe, ordinary search proposes that old law but rejects it with `unresolved function hole cannot execute`. The new certificates bind the exact direct/transitive helper definitions while preserving helper calls:

```ink
foldr(xs.map(fn(x) => mapped_word(x, seed, k)), z,
      fn(v) => fn(acc) => reduce_word(v, acc, seed, k))
// checked equivalent:
foldr(xs, z, fn(x) => fn(acc) =>
      reduce_word(mapped_word(x, seed, k), acc, seed, k))
```

The four U32 deployments cover plain mapped fold, nested maps then fold, filtering original values then mapped fold, and differently mapped xs/ys concatenated then folded. All selected bodies remove materialized maps/filter/concat. Nested mapper order is preserved. Concatenation folds ys last-to-first first, using that result as xs's initial accumulator; no associative regrouping or forward accumulation is permitted. Pure mapper invocation scheduling changes from forward materialization to reverse consumption. Callbacks are total and pure.

There are **zero new generic mathematical laws**. The producer reuses existing old17 arbitrary map/fold, old16 filtered-map/fold and ordered concatenation/fold proofs. Its specialization procedure is reusable, but published entries bind these four concrete helper contexts; this does not fix generic helper resolution for every possible program. Their claims cover all inputs to those source contexts, not just benchmark fixtures. No syntax, core, planner, runtime, cost-model, backend or caller-validation changes were made. All 122 production source hashes and the exact frozen compiler remain unchanged.

## Checking and ordinary selection

The full producer validation view has 13 objects: four new certificates and nine unchanged U32/I32/U64 generic roots. Canonical staged admission uses four new roots and the three relevant old U32 dependencies, a seven-object closure. I32/U64 checks exercise old laws; no new I32/U64 source certificate or F32 result is claimed. The fair prior is exactly the existing 2,508-entry snapshot, without extra shared objects; current has 2,512 entries.

Five focused tests pass: 60 complete scalar U32 source/interpreter replays, 63 typed old-law closed checks, three correctly rehashed false order/default/result endpoints rejected and 22 captured direct/transitive helper mutations rejected. Source deployment endpoint/context novelty is checked against the full pinned prior. Existing Store/WebPublisher checks add 19 passes, for **24 focused tests**. The original snapshot is explicit so tests replay after publication. Finite checks supplement proof admission; source correspondence, machine code, runtime and toolchains remain trusted implementations.

[Prior evidence](benchmark-preparation) and [independent proof review](review/proof-staging-review.json) retain the generic-duplicate scout and the actual unresolved-helper deployment gap. [Preparation](benchmark-preparation/measured-completion-receipt.json) records automatic source-certificate selection using the same structural/cost policy and ordinary kernel checker on both catalogues. No per-recipe whitelist, exact candidate isolation, caller guard or forced acceptance is introduced. The prior already applies the old ordered concat-fold law in the concat recipe, leaving two mapped producers; it does not complete map fusion. Plain/nested/filtered prior bodies have no selected applications.

Initial untimed validation caught a harness ABI error: U32 resident results used scalar64 instead of scalar32. The original targets and failed validation log remain archived; the corrected Ink harness uses scalar32 with unsigned conversion. Review then caught avoidable BigInt/result-buffer overhead in the handwritten Rust-Wasm control. The final control exports its unchanged algorithm directly as U32, returning an unsigned Number without result allocation/readback. Both intermediate attempts remain archived; `targets-measured` binds the final harness and strong controls before any timing.

Node/native/browser complete scalar output checks and independent strong-control checks run before timing. Empty/one-empty/unequal inputs, full-width values, zero divisors, rejected filter values, nonmutation and right-fold order are covered. Controls reject forward-order accumulation in explicit negative examples. All exact counts and validation bindings are in [target preflight](review/target-preflight-review.json). Source names containing `heldout` denote composition probes, not statistical holdouts.

## Scalar boundaries and GPU execution

Every result is a U32 scalar. Cohorts distinguish captured JS/Wasm scalar calls, resident-input Wasm/native scalar calls and copied-input native scalar calls. There is no owned output array or caller-owned destination in these scalar comparisons. All variants retain the same public input ABI, including unused ys where applicable, and equivalent input capture/residency within each cohort. The handwritten JS/Rust controls already fuse mapping and filtering into reverse loops; concat controls process ys backward then xs backward. They preserve every arithmetic operation and accumulator dependency.

Untimed [preflight](review/target-preflight-review.json) checks actual named primary GPU functions and graph execution. All named primary routes use graph execution. Actual prior-to-checked stage counts are plain 2→1, nested 3→1, filtered 3→1, concat 4→2. Literal concat also has four stages (two maps, concat, fold), while prior has two maps and two folds; their stage counts match but intermediate capacities differ. Ordered GPU reduction remains serial, executed by one invocation in descending input order, not a parallel tree reduction. Moving mapping into that serial loop can trade parallel mapper work for fewer stages. Exact stage dispatch, upload, readback and live-buffer contracts are measured and independently verified, including empty inputs and scalar four-byte output without a list length header. No array-only legacy formula is applied to scalar graphs.

The timed GPU cohort contains 648 rows / 5,472 actual device calls and zero fallback calls. Actual emitted route/counter results, rather than logical node counts alone, determine physical-work claims. Device live-buffer bytes do not measure CPU heap or GPU-driver heap peaks; observation `peak_bytes` remains null. Hosts and scalar-call boundaries are not pooled.

## Measurements

Workers are idle during serial native, Node and browser timing after a [freeze](timing-freeze.json). The run contains **7,560 samples**: 1,728 native, 2,592 Node and 3,240 browser, across 840 empirical groups. All target audits pass. [Analysis](analysis.json) retains all 672 paired comparisons and 112 four-family strata. Each cell uses nine matched log ratios and 4,000 deterministically seeded bootstrap draws. Nominal per-cell 95% percentile intervals classify results; geometric means are descriptive, with no multiplicity correction or universal profitability guarantee.

| Host | Scalar boundary | Prior time / checked time | Faster / slower / uncertain |
|---|---|---:|---:|
| browser | captured-js-value | 1.297× | 23 / 0 / 1 |
| browser | captured-wasm-value | 1.118× | 17 / 0 / 7 |
| browser | instrumented-full-gpu-value | 1.034× | 12 / 6 / 6 |
| browser | resident-wasm-value | 1.257× | 24 / 0 / 0 |
| native | captured-native-value | 1.340× | 24 / 0 / 0 |
| native | resident-native-value | 1.623× | 23 / 0 / 1 |
| node | captured-js-value | 1.179× | 24 / 0 / 0 |
| node | captured-wasm-value | 1.140× | 19 / 0 / 5 |
| node | resident-wasm-value | 1.252× | 24 / 0 / 0 |

Across 216 prior/current comparisons, 190 favor checked, 6 favor prior and 20 remain uncertain. All 6 classified [regressions](regressions.json) and 19 [point losses](point-losses.json), including uncertain losses, are retained. No favorable subset replaces the full matrix.

| Host | Boundary | Recipe family | Prior / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
| browser | captured-js-value | concat | 1.317× | 6 / 0 / 0 |
| browser | captured-js-value | filtered | 1.364× | 5 / 0 / 1 |
| browser | captured-js-value | nested | 1.303× | 6 / 0 / 0 |
| browser | captured-js-value | plain | 1.209× | 6 / 0 / 0 |
| browser | instrumented-full-gpu-value | concat | 0.986× | 2 / 1 / 3 |
| browser | instrumented-full-gpu-value | filtered | 1.358× | 6 / 0 / 0 |
| browser | instrumented-full-gpu-value | nested | 0.920× | 2 / 3 / 1 |
| browser | instrumented-full-gpu-value | plain | 0.928× | 2 / 2 / 2 |
| node | captured-js-value | concat | 1.181× | 6 / 0 / 0 |
| node | captured-js-value | filtered | 1.081× | 6 / 0 / 0 |
| node | captured-js-value | nested | 1.284× | 6 / 0 / 0 |
| node | captured-js-value | plain | 1.178× | 6 / 0 / 0 |

## Strong controls and scope

Reference time / checked time above one favors Ink. All controls already use fused reverse reductions, not eager mapped-array baselines.

| Host | Scalar boundary | Strong reference | Reference / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
| browser | captured-js-value | expert_js_value | 0.987× | 4 / 9 / 11 |
| browser | captured-wasm-value | rust_wasm_value | 0.580× | 0 / 20 / 4 |
| browser | instrumented-full-gpu-value | expert_js_value | 0.009× | 0 / 24 / 0 |
| browser | instrumented-full-gpu-value | rust_wasm_value | 0.004× | 0 / 24 / 0 |
| browser | resident-wasm-value | rust_wasm_resident_value | 0.883× | 0 / 16 / 8 |
| native | captured-native-value | expert | 0.934× | 2 / 13 / 9 |
| native | resident-native-value | expert | 0.914× | 2 / 11 / 11 |
| node | captured-js-value | expert_js_value | 0.974× | 5 / 13 / 6 |
| node | captured-wasm-value | rust_wasm_value | 0.545× | 0 / 24 / 0 |
| node | resident-wasm-value | rust_wasm_resident_value | 0.855× | 0 / 15 / 9 |

GPU-versus-CPU rows compare complete captured-input scalar requests with the same public inputs/results; they include each backend's ingress and execution costs. They do not compare raw GPU arithmetic with a resident CPU kernel. JS ratios are near parity, while strong Rust controls remain faster overall. All 48 GPU-versus-CPU cells favor CPU in this matrix.

These are four concrete U32 helper-bound deployments of existing general ordered-fold mathematics on one Apple M2 host. They do not establish broad native Rust/JS superiority, universal speedups or resolution of all generic callback deployment failures. The [independent performance review](review/final-performance-review.json) reports favorable, unfavorable and uncertain strata with every strong-control comparison.

The matrix has four recipes, three sizes (32/4,096/65,536) and two joint word/shape/predicate regimes. Small words use ys=xs+7; full-width words use ys=floor(xs/3)+1. Plain/nested/concat seeds are 512 and 0x9e3779b9; filtered seeds are 2 and 6, set before any timing so rem_or(x,k,0)<seed exercises rejection in both regimes. Default k=7; correctness frames include k=0. Word, shape and filter factors are joint regimes, not independently crossed factors. Exact accepted fractions are archived per frame. All gains are compile-time checked DB selections; no runtime load/state optimization or new target-routing policy is installed.

## Reproduction and canonical publication

Use the frozen compiler SHA256 `04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536`. In a fresh evidence directory, run `PYTHONPATH=knowledge:planner INK_PIPELINE36_PROOFS_DIR=/tmp/ink36-proofs python3 -m unittest knowledge.tests.test_web_pipeline36_laws -v`. Tests and producer pin the original catalogue, including all old dependencies. Exact proof views and commands are archived.

The unchanged general `knowledge/producers/publish_web_pipeline33.py` stages `candidate-rows.json` from the original pinned prior, checks ordinary admission and publishes only staged bytes. [Negative publication controls](publication-negative-controls.json) reject removed old names or modified admission logs before pointer mutation. [Benchmark instructions](../../bench/web-stack-proofs-36/README.md) separate preparation, full validation and serial timing. Reproduce into fresh directories to preserve archived evidence.

[Publication](publication.json) records snapshot `7f5e7a94b49db567af55f5d1129dd07c5e2b469ebd45cb6e5cbc53595782b2be`: 2,512 entries and 4,259 discovery names, adding four source certificates with no new shared or generic objects. All 2,508 previous entries and 4,255 discovery names survive. [Observations](observations.json) add 840 empirical groups, totaling 25,100 separate observation files; all 24,260 prior files retain their exact bytes. These measurements do not install runtime or cost-model policy.

[Verification](verification.json) confirms preservation and unchanged production/compiler bindings. Knowledge is committed directly to `main` at `03fe0b9bc13fe7e5997157fa1b8c239071f245c0`, and the distribution integrates that exact pin. Five post-publication tests pass without overwriting the original evidence: [log](post-publication-tests.log). Correctness admission, applicability and empirical profitability remain separate.
