# Batch38: padded observed indexed-zip fusion

Six general integer endpoints fuse two observed indexed maps and a zip when both maps read exactly the same original list and an arbitrary suffix is appended to one side. Six Nat-beta supports establish the endpoints; four source certificates deploy them through plain or composed helpers:

```ink
xs.map_indexed(f).zip(xs.map_indexed(g).concat(ys), h)
// checked equivalent:
xs.map_indexed(fn(i)=>fn(x)=>h(f(i,x),g(i,x)))
```

The symmetric law puts the suffix on the left. Both mapper values remain observed, and h receives f's result on the left and g's result on the right. The result always has length(xs), preserving its order. The suffix's elements and length cannot affect that prefix. The law requires the exact same original xs, synchronized indices and appended padding; a different origin or a prepended suffix would be wrong. These are compile-time structural application conditions, with no caller validation machinery.

Arbitrary pure total f/g/h preserve their exact scalar grouping. This does not reassociate arithmetic or authorize effectful callback interleaving. Generic endpoints cover U32/I32/U64. Their induction generalizes over arbitrary Nat starting indices; callbacks receive wrapping U32 indices, including crossings of 2^32. No F32 or Bool endpoint is published. The existing induction/normalization/congruence/Use kernel checks the closure. Compiler, runtime, lowering and cost-policy sources remain unchanged: all 122 production hashes match the baseline and the same frozen compiler checks both catalogues.

## Proof and application evidence

The pinned prior has 2,534 entries and 1,728 semantic endpoint pairs. A full forward/reverse consistent-alpha comparison finds no duplicate for the twelve new generic objects. This establishes endpoint novelty, not nonderivability from older laws. Earlier padded laws have specific paired arithmetic/postmap shapes; earlier indexed-zip laws have no arbitrary appended suffix. Scout plain-map alternatives are outside the published scope.

The dependency-closed extension has sixteen fresh objects: six public endpoints, six Nat-beta supports and four exact-helper-bound U32 certificates. There are no shared-old objects or dependencies on older mathematical laws. The [independent proof/staging audit](review/proof-staging-review.json) verifies identities, dependency closure, endpoints and exact reachable direct/transitive helper definitions.

Six focused tests pass: 60 complete source/interpreter frames, 42 typed arbitrary-offset checks, four same-origin/appended-suffix non-specializations, three correctly rehashed false extent/offset/operand-order theorem rejections and eighteen helper mutation rejections. The existing Store/publisher suite adds nineteen passes, for **25 unique focused tests**. Finite backend checks complement admitted proofs; machine-code/runtime correspondence remains a trusted implementation boundary.

Four U32 source contexts cover left/right padding and plain/composed scalar helpers. Both mapped results and their combining helper are retained. Names containing `heldout` denote composition probes, not independent statistical holdouts. Exact helper definitions are bound by content hash; these certificates deploy four contexts rather than solving every generic helper substitution.

Ordinary search over the full prior leaves all four source bodies unchanged. The checked full union selects fresh certificates under the same automatic structural search, cost model and kernel admission. No isolated candidate catalogue, source whitelist, forced rewrite or modified profitability policy is used. The [preparation evidence](benchmark-preparation) preserves commands and target bindings.

## Benchmark boundaries and actual GPU work

Four recipes, three sizes (32/4,096/65,536) and two joint word/shape regimes give 24 timed cells. Small-word inputs use ys=nx+7; full-width inputs use ys=floor(nx/3)+1. Shape/value factors are not independently crossed. All 96 correctness frames retain full vectors, nonmutation and ownership checks, including empty/one-empty lists, arbitrary suffix values, zero divisors and word boundaries.

Strong handwritten JS/Rust controls compute f(i,x), g(i,x) and h(f,g) once per xs element in one loop. They do not construct the unused suffix. Every variant retains the declared public inputs, including ys ingress in captured-input boundaries. Captured owned JS/full Wasm outputs, resident borrowed Wasm destinations and native resident/copied-input destinations are distinct cohorts with matching ownership within each cohort. Native Ink is generated C built with clang -O3 against handwritten Rust -O3, not an Ink Rust-lowering benchmark.

Every web timed call reads every returned word using length plus a weighted U32 checksum; this common consumption cost is included equally. Independent audits reconstruct checksums times iterations modulo 2^32 and consumed element counts in calibration and samples. Native retains its separate complete-vector U64 checksum protocol. Host/ownership boundaries and checksum protocols are not pooled into a language ranking.

All eight literal/prior named primary GPU routes execute four-stage graphs: two indexed maps, concat and zip. All four checked primaries execute a single legacy indexed-map shader. In nonempty timed cells, physical dispatches drop **4→1**. Upload changes from 4*(nx+ny+4) to 4*(nx+ny+9), an increase of twenty bytes; readback stays 4*(nx+1). Logical node counts are not substituted for physical counters. Empty and one-empty contracts are checked separately. Device live-buffer bytes are separate from unmeasured CPU/GPU-driver heap peaks; observation peak_bytes is null.

The timed cohort contains 648 GPU rows, 6,228 actual device calls and zero fallback calls. [Independent target preflight](review/target-preflight-review.json) and [performance replay](review/final-performance-review.json) authenticate active named routes, capacities, dispatch/upload/readback and live-buffer contracts.

## Results against prior Ink

After the [pre-timing freeze](timing-freeze.json), workers remain idle during serial native, Node and browser runs. **7,560 samples** cover 840 groups: 1,728 native, 2,592 Node and 3,240 browser. [Analysis](analysis.json) retains all 672 paired comparisons, 28 aggregates and 112 recipe strata. Nine paired log ratios per cell feed 4,000 seeded bootstrap draws. Nominal per-cell 95% percentile intervals classify faster/slower/uncertain results; geometric means are descriptive, without multiplicity correction or universal profitability guarantees.

Ratios are reference time / checked time; above one favors checked Ink.

| Host | Boundary | Prior reference | Prior / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
| browser | captured-js-owned | prior_js_owned | 1.262× | 20 / 2 / 2 |
| browser | captured-wasm-owned | prior_wasm_full | 1.001× | 4 / 3 / 17 |
| browser | instrumented-full-gpu-request | prior_gpu_requested | 3.346× | 24 / 0 / 0 |
| browser | resident-wasm-destination | prior_wasm_prepared | 1.046× | 20 / 4 / 0 |
| native | captured-native-destination | prior | 1.400× | 22 / 0 / 2 |
| native | resident-native-destination | prior | 1.670× | 22 / 0 / 2 |
| node | captured-js-owned | prior_js_owned | 1.189× | 17 / 4 / 3 |
| node | captured-wasm-owned | prior_wasm_full | 1.007× | 5 / 2 / 17 |
| node | resident-wasm-destination | prior_wasm_prepared | 1.037× | 17 / 5 / 2 |

Across 216 prior/current cells, 151 favor checked, 20 favor prior and 45 are uncertain. All 20 classified [regressions](regressions.json) and 35 [point losses](point-losses.json), including uncertain losses, remain archived. The complete matrix is retained.

All twenty classified prior losses occur in composed-helper CPU cases. Composed resident-Wasm subgroups have descriptive geometric means below one on both hosts, while plain resident-Wasm subgroups improve. Full Wasm call gains are essentially unchanged overall. These observations do not identify a compiler or allocation cause through profiling; a smaller structural expression is not a universal speed guarantee.

| Host | Boundary | Recipe | Prior / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
| browser | captured-js-owned | left_composed | 1.102× | 4 / 1 / 1 |
| browser | captured-js-owned | left_plain | 1.481× | 6 / 0 / 0 |
| browser | captured-js-owned | right_composed | 1.104× | 4 / 1 / 1 |
| browser | captured-js-owned | right_plain | 1.409× | 6 / 0 / 0 |
| browser | instrumented-full-gpu-request | left_composed | 3.424× | 6 / 0 / 0 |
| browser | instrumented-full-gpu-request | left_plain | 3.336× | 6 / 0 / 0 |
| browser | instrumented-full-gpu-request | right_composed | 3.365× | 6 / 0 / 0 |
| browser | instrumented-full-gpu-request | right_plain | 3.261× | 6 / 0 / 0 |
| browser | resident-wasm-destination | left_composed | 0.980× | 4 / 2 / 0 |
| browser | resident-wasm-destination | left_plain | 1.119× | 6 / 0 / 0 |
| browser | resident-wasm-destination | right_composed | 0.977× | 4 / 2 / 0 |
| browser | resident-wasm-destination | right_plain | 1.118× | 6 / 0 / 0 |
| native | resident-native-destination | left_composed | 1.426× | 5 / 0 / 1 |
| native | resident-native-destination | left_plain | 1.949× | 6 / 0 / 0 |
| native | resident-native-destination | right_composed | 1.432× | 5 / 0 / 1 |
| native | resident-native-destination | right_plain | 1.957× | 6 / 0 / 0 |
| node | captured-js-owned | left_composed | 1.029× | 3 / 2 / 1 |
| node | captured-js-owned | left_plain | 1.379× | 5 / 0 / 1 |
| node | captured-js-owned | right_composed | 1.029× | 3 / 2 / 1 |
| node | captured-js-owned | right_plain | 1.370× | 6 / 0 / 0 |
| node | resident-wasm-destination | left_composed | 0.926× | 3 / 3 / 0 |
| node | resident-wasm-destination | left_plain | 1.129× | 6 / 0 / 0 |
| node | resident-wasm-destination | right_composed | 0.981× | 3 / 2 / 1 |
| node | resident-wasm-destination | right_plain | 1.126× | 5 / 0 / 1 |

## Strong controls and scope

| Host | Boundary | Strong reference | Reference / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
| browser | captured-js-owned | expert_js_owned | 0.908× | 4 / 18 / 2 |
| browser | captured-wasm-owned | rust_wasm_full | 0.485× | 0 / 24 / 0 |
| browser | instrumented-full-gpu-request | expert_js_owned | 0.022× | 0 / 24 / 0 |
| browser | instrumented-full-gpu-request | rust_wasm_full | 0.046× | 0 / 24 / 0 |
| browser | resident-wasm-destination | rust_wasm_prepared | 0.963× | 2 / 14 / 8 |
| native | captured-native-destination | expert | 0.808× | 1 / 18 / 5 |
| native | resident-native-destination | expert | 0.752× | 2 / 16 / 6 |
| node | captured-js-owned | expert_js_owned | 1.069× | 15 / 1 / 8 |
| node | captured-wasm-owned | rust_wasm_full | 0.459× | 0 / 24 / 0 |
| node | resident-wasm-destination | rust_wasm_prepared | 0.979× | 0 / 10 / 14 |

GPU-versus-CPU rows compare complete captured-input vector requests with the same public inputs/results and include backend-specific ingress/output acquisition. They do not compare isolated GPU arithmetic against a resident CPU kernel. All strong-control losses and uncertainty remain recorded.

In this matrix, checked Node JS beats its handwritten JS control in fifteen cells, loses one and is uncertain in eight (descriptive geometric mean about 1.07). Browser JS and native Rust controls generally remain faster; captured Rust-Wasm wins every cell. Despite the 4→1 dispatch saving, complete GPU requests lose to both captured CPU controls in every cell. These results establish improvements over prior Ink for this pattern, rather than broad superiority over native implementations.

This is one reusable same-origin padded indexed-zip family with six typed/oriented endpoints, measured on four U32 helper contexts on one Apple M2. It does not establish broad native superiority or arbitrary pipeline fusion. Correctness, structural application conditions and measured profitability remain distinct. The compiler selects DB proofs at compile time; no load/state-based optimizer or new target routing policy is installed.

## Reproduction and publication

Frozen compiler SHA256: `04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536`. Replay to fresh evidence with `PYTHONPATH=knowledge:planner INK_PIPELINE38_PROOFS_DIR=/tmp/ink38-proofs python3 -m unittest knowledge.tests.test_web_pipeline38_laws -v`. Original catalogue pins permit replay after publication. [Benchmark instructions](../../bench/web-stack-proofs-38/README.md) distinguish preparation, untimed validation and serial measurement; old evidence is preserved.

The unchanged general publisher admits and publishes staged bytes. [Negative controls](publication-negative-controls.json) reject removal of old names or modified admission evidence before pointer mutation. [Publication](publication.json) records snapshot `8d1f3460cc2aa16bfd176081e2b7fab552e9ec8ea858755c566b3708107c80ef` with 2,550 entries and 4,297 discovery names. All previous 2,534 entries and 4,281 names survive. [Observations](observations.json) adds 840 groups for 26,780 files; all previous 25,940 files retain their exact bytes. Observations install no runtime or cost-model policy.

[Verification](verification.json) confirms preservation and unchanged production/compiler bindings. Six [post-publication tests](post-publication-tests.log) pass in fresh evidence, without overwriting the first run. Knowledge is committed directly to main at `811cdf1e2c218341bfa8054444e8ba9593460088`; distribution integrates that exact pin. [Final delivery review](review/final-delivery-review.json) checks the report and canonical state.
