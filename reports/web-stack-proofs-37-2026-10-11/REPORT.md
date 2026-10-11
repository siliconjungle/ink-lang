# Batch37: independent indexed-map demand erasure

Six general integer endpoints remove an indexed map when a later zip callback never observes its values. Twelve checked Nat-offset/beta supports establish the endpoints, and four source certificates deploy them through plain or composed helpers. The original discarded list remains an input to zip, preserving the shorter-list result extent:

```ink
xs.map_indexed(fn(i)=>fn(x)=>discarded(i,x)).zip(ys,
    fn(unused)=>fn(y)=>keep(y))
// checked equivalent:
xs.zip(ys, fn(unused)=>fn(y)=>keep(y))
```

The symmetric law retains xs values when the indexed map is on ys. It preserves input order, every retained callback result, and min(length(xs),length(ys)); deleting the discarded receiver entirely would be wrong. Arbitrary pure total indexed callbacks can be removed. An observed discarded value, including a capture through a nested closure, prevents this specialization. The laws are total pure equalities, not effectful callback transformations.

The two orientations cover U32/I32/U64 element domains. General proof supports quantify arbitrary Nat starting indices; the index callback receives wrapping U32 indices, including crossing 2^32. No F32 endpoint or performance claim is included. Nested independent-list induction, normalization, congruence and checked dependency Use establish the laws with the existing kernel. No new rule, primitive semantics, syntax, compiler/runtime/backend source, cost-model policy or caller checks are introduced. All 122 production source hashes and the frozen compiler remain unchanged.

## Proof and application evidence

The pinned prior has 2,512 entries. Its 1,706 semantic endpoint pairs were compared with the new endpoints in both directions using consistent alpha-renaming. No duplicates were found; this is endpoint novelty, not a claim that no combination of older laws could derive these equalities. The new closed extension contains 22 fresh objects: six public endpoints, twelve proof supports and four content-bound U32 source certificates. It adds no shared old object or mathematical dependency.

Six focused tests pass: 60 complete source/interpreter output frames, 42 typed arbitrary-offset instances, four observed-callback non-specializations, two correctly rehashed false extent/order theorem rejections and twelve direct/transitive helper mutation rejections. Original catalogue pins permit replay after publication. Existing Store/publisher checks add 19 passes, for **25 focused tests**. The [independent proof/staging audit](review/proof-staging-review.json) verifies exact object identities, dependency closure, source endpoints and helper hashes. Finite backend checks supplement admitted proofs; runtime/machine-code correspondence remains a trusted implementation boundary.

Four U32 source cases cover left/right discarded indexed maps with either plain or composed scalar helpers. The source certificates bind all exact reachable direct/transitive definitions while preserving the selected helper calls. Names containing `heldout` denote composition probes, not statistical holdouts. These source certificates bind four contexts; they do not resolve every possible generic helper substitution.

Ordinary full-prior search leaves all four source cases unchanged, with no selected roots. The checked union makes the indexed erasure available using the same structural search, cost model, compiler and ordinary kernel admission. No isolated candidate catalogue, per-recipe whitelist or forced selection is used. [Preparation](benchmark-preparation) preserves the exact prior probe, strong controls, commands and target bindings.

## Benchmark boundaries and physical GPU work

There are four recipes, three sizes (32/4,096/65,536) and two joint word/shape regimes: small values with ys=nx+7 and full-width values with ys=floor(nx/3)+1. This exercises both shorter and longer discarded streams across the two orientations. Shape and value are joint factors, not independently crossed factors. Fixtures include empty/one-empty/unequal lists, zero divisors, word boundaries and branch outcomes.

The strong handwritten JS/Rust controls directly compute the selected min-prefix projection in one loop. They never run the discarded indexed callback. Captured owned JS/full Wasm outputs, resident borrowed Wasm destinations, native resident/copied-input destinations, and complete GPU requests remain separate cohorts with matching input/output ownership within each cohort. Native Ink variants compile generated C with clang -O3; the handwritten native control uses Rust -O3. This is not an Ink Rust-lowering benchmark. All variants retain the same public inputs, including the discarded list's length and the declared capture/ingress boundary.

Web timing now consumes **every output word** using length plus a weighted U32 checksum inside the timer, identically across variants. Journals record consumed element counts per call and batch; independent audits reconstruct the expected checksum times iterations modulo 2^32. Separate complete-vector checks verify correctness, nonmutation and owned/borrowed lifetimes outside timing. Native uses its archived complete-vector U64 consumption protocol; native/web checksums and host boundaries are not pooled. The common consumption work is included in reported call costs.

All twelve named primary GPU routes use legacy flat shaders (`graph_required=false`). Inactive graph descriptors lose a map_indexed node, but those descriptors do not execute in these calls. Actual dispatches, max-input extent, upload and readback contracts remain unchanged. A GPU compiler may remove unused arithmetic from prior shaders; that is a possible explanation, not a measured profiling result. GPU speed claims therefore rely on complete requests and actual counters, not logical node counts. Device live-buffer accounting does not measure CPU or GPU-driver heap peaks; observation peak_bytes is null.

The timed cohort has 648 GPU rows, 10,377 actual device calls and zero fallback calls. [Independent target preflight](review/target-preflight-review.json) and [performance replay](review/final-performance-review.json) verify named routes, capacities, dispatches, upload/readback and live-buffer contracts.

## Results against prior Ink

After a [pre-timing freeze](timing-freeze.json), workers remain idle during serial native, Node and browser runs. **7,560 samples** cover 840 groups: 1,728 native, 2,592 Node and 3,240 browser. [Analysis](analysis.json) retains all 672 paired comparisons, 28 aggregates and 112 recipe strata. Nine paired log ratios per cell feed 4,000 deterministically seeded bootstrap draws. Per-cell nominal 95% percentile intervals classify faster/slower/uncertain results; geometric means are descriptive. There is no multiplicity correction or universal profitability guarantee.

Ratios are reference time / checked time; above one favors checked Ink.

| Host | Boundary | Prior reference | Prior / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
| browser | captured-js-owned | prior_js_owned | 1.387× | 23 / 0 / 1 |
| browser | captured-wasm-owned | prior_wasm_full | 1.018× | 9 / 0 / 15 |
| browser | instrumented-full-gpu-request | prior_gpu_requested | 1.002× | 2 / 3 / 19 |
| browser | resident-wasm-destination | prior_wasm_prepared | 1.194× | 24 / 0 / 0 |
| native | captured-native-destination | prior | 2.031× | 24 / 0 / 0 |
| native | resident-native-destination | prior | 3.317× | 24 / 0 / 0 |
| node | captured-js-owned | prior_js_owned | 1.450× | 24 / 0 / 0 |
| node | captured-wasm-owned | prior_wasm_full | 1.012× | 10 / 2 / 12 |
| node | resident-wasm-destination | prior_wasm_prepared | 1.092× | 24 / 0 / 0 |

Across 216 prior/current cells, 164 favor checked, 5 favor prior and 47 are uncertain. All 5 classified [regressions](regressions.json) and 28 [point losses](point-losses.json), including uncertain losses, remain archived. No favorable subset replaces the full matrix.

| Host | Boundary | Recipe | Prior / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
| browser | captured-js-owned | left_composed | 1.689× | 6 / 0 / 0 |
| browser | captured-js-owned | left_plain | 1.332× | 6 / 0 / 0 |
| browser | captured-js-owned | right_composed | 1.394× | 6 / 0 / 0 |
| browser | captured-js-owned | right_plain | 1.180× | 5 / 0 / 1 |
| browser | instrumented-full-gpu-request | left_composed | 0.988× | 0 / 1 / 5 |
| browser | instrumented-full-gpu-request | left_plain | 1.032× | 1 / 0 / 5 |
| browser | instrumented-full-gpu-request | right_composed | 1.000× | 1 / 1 / 4 |
| browser | instrumented-full-gpu-request | right_plain | 0.990× | 0 / 1 / 5 |
| node | captured-js-owned | left_composed | 1.754× | 6 / 0 / 0 |
| node | captured-js-owned | left_plain | 1.437× | 6 / 0 / 0 |
| node | captured-js-owned | right_composed | 1.443× | 6 / 0 / 0 |
| node | captured-js-owned | right_plain | 1.216× | 6 / 0 / 0 |

## Strong controls and scope

| Host | Boundary | Strong reference | Reference / checked | Faster / slower / uncertain |
|---|---|---|---:|---:|
| browser | captured-js-owned | expert_js_owned | 0.956× | 0 / 10 / 14 |
| browser | captured-wasm-owned | rust_wasm_full | 0.464× | 0 / 24 / 0 |
| browser | instrumented-full-gpu-request | expert_js_owned | 0.013× | 0 / 24 / 0 |
| browser | instrumented-full-gpu-request | rust_wasm_full | 0.032× | 0 / 24 / 0 |
| browser | resident-wasm-destination | rust_wasm_prepared | 0.936× | 2 / 15 / 7 |
| native | captured-native-destination | expert | 0.995× | 2 / 13 / 9 |
| native | resident-native-destination | expert | 0.967× | 0 / 14 / 10 |
| node | captured-js-owned | expert_js_owned | 0.927× | 0 / 18 / 6 |
| node | captured-wasm-owned | rust_wasm_full | 0.450× | 0 / 24 / 0 |
| node | resident-wasm-destination | rust_wasm_prepared | 0.972× | 2 / 14 / 8 |

GPU-versus-CPU rows compare complete captured-input vector requests sharing public inputs/results and include backend-specific ingress and output acquisition. They do not compare GPU arithmetic alone with a resident CPU kernel. All strong-control losses and uncertainty are retained in the independent review.

Native C is close to the native Rust control in these cases (reference/checked geometric means about 0.97 resident and 1.00 copied-input), while captured Rust-Wasm remains substantially faster. Full Wasm call gains are small; GPU is essentially unchanged. These observations include common ingress/consumption costs and do not identify a cause through profiling.

This is one general demand-erasure family with six typed/oriented endpoints, measured on four concrete U32 helper contexts on one Apple M2. It is not broad native superiority, arbitrary pipeline fusion, runtime adaptation or unconditional GPU improvement. Correctness, application conditions and empirical profitability remain separate. These are compile-time DB selections; no load/state-based optimizer or target-routing policy was installed.

## Reproduction and publication

The frozen compiler SHA256 is `04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536`. Replay proofs into a fresh directory with `PYTHONPATH=knowledge:planner INK_PIPELINE37_PROOFS_DIR=/tmp/ink37-proofs python3 -m unittest knowledge.tests.test_web_pipeline37_laws -v`. Exact views and commands are archived. [Benchmark instructions](../../bench/web-stack-proofs-37/README.md) separate preparation, untimed validation and serial measurement. Use fresh directories to preserve old evidence.

The unchanged general publisher `knowledge/producers/publish_web_pipeline33.py` admits and publishes only staged bytes. [Negative publication controls](publication-negative-controls.json) reject old-name removal or modified admission evidence before pointer mutation. [Publication](publication.json) records snapshot `6df4df9aae82d58eba9eac5e8d36b41ce37147ed5d661285903745f4c136d9e3` with 2,534 entries and 4,281 discovery names. All 2,512 previous entries and 4,259 names survive. [Observations](observations.json) adds 840 empirical groups, totaling 25,940 files; all 25,100 prior files retain their exact bytes. Observations do not change runtime or cost-model policy.

[Verification](verification.json) confirms preservation and unchanged compiler/production bindings. Six [post-publication tests](post-publication-tests.log) pass without overwriting initial evidence. Knowledge is committed directly to main at `2189e04427038a4df9e64e387ccb0293c7a20f78`; distribution integrates that exact pin. [Final delivery review](review/final-delivery-review.json) audits the report and canonical state.
