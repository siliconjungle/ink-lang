# Checked web-stack proof batch 23

Three agents and integration add **40 checked proof objects**, reaching **1688 entries** and **14,946 canonical observations**. Generic roles are `{"deployment_composition": 4, "optimization_endpoint": 17, "proof_support": 6}`; old-only consequences and exact source bridges are separate. These laws remove irrelevant work and collection stages for arbitrary finite lists under stated semantics. Endpoint hash novelty does not establish new mathematics.

Against fair prior Ink, 120 fresh cells per CPU row are measured below. **Broad superiority over optimized handwritten JS, Rust or Wasm remains unproven.** All 51 fresh adverse comparisons are retained; profitability is measured separately from correctness.

## General equalities and proof sketches

| Family | Equality | Conditions |
|---|---|---|
| Complementary cardinality | `count(filter(xs,p)) + count(filter(xs,not p)) = count(xs)` | U64 wrapping count; pure total predicate; U32/I32/F32/Bool elements; U64-element endpoint shared old consequence |
| First accepted value | `filter(xs,p).at_or(0,z) = foldr(xs,z,x=>a=>choose(p(x),x,a))` | U32/I32/U64/F32; pure total predicate |
| Mapped first accepted value | `filter(xs,p).map(f).at_or(0,z) = foldr(xs,z,x=>a=>choose(p(x),f(x),a))` | Same numeric types; pure total mapper; deployment composition |
| Unused aligned prefix state | `scan(xs).zip(xs,(_,x)=>g(x)) = map(xs,g)` and symmetric zip | U32/I32/U64 scan; pure total mapper |
| First prefix value | `scan(xs).at_or(0,z) = xs.at_or(0,z)` | Wrapping U32/I32/U64 scan |

Complementary cardinality uses list induction and a case split on each predicate value. Exactly one partition gains a member; their U64 counts add to the original length modulo 2^64. The U64-element endpoint also has a checked old-only route through prior constant-sum, partition and mapped-sum laws; that route is offered symmetrically. Its old proof does not instantiate a U64 list variable with another list element type.

First-match induction keeps the head when it satisfies the predicate, otherwise the tail answer. The mapped deployment composes the first-match equality with a checked map/fold transport. Frozen selected right-fold bodies visit every input word and evaluate the mapper on every accepted word, including values that are later replaced. Expert controls stop at the first accepted element and map only that element. These laws remove arrays; they do not prove early-exit performance. Pure total callbacks permit removal/interleaving of unobserved calls. Primitive grouping and the selected F32 value remain exact.

Scan projection induction generalizes the scan accumulator to arbitrary initial state. A callback ignores that state and returns a function of the aligned original element, so one direct map replaces scan and zip. Six initial-state supports are counted separately. First-prefix lookup follows from the scan head at zero initial accumulator and preserves the empty default. The existing typed checker rejects F32.scan and Boolean numeric fold; these failed probes are preserved and no unsupported deployment is claimed.

Sources: [skip proofs](../../knowledge/producers/web_skip23_laws.py), [pipeline proofs](../../knowledge/producers/web_pipeline23_laws.py), [source certificates](../../knowledge/producers/web_static23_laws.py). All objects are admitted using ordinary small-kernel proof rules, without trusted theorem flags, export-name whitelists or new optimization-specific kernel rules. Author evidence includes hash-valid false laws, actual interpreter values and typed source reification; complete target outputs are independently checked before timing.

Historical snapshot `95c096ab4a28114fb70c334b662057bd8abfffe135a3198032f4ea38a679bd57` retains 1,648 entries. Fair prior `e61a236a2dba2ecbd4f1142b9e564a0123064aa911e3bbf2b982e950f4e6cc4a` has 1649 entries; current `dfb31ef951db9bb8a7737208dec2514e8488ce35093342e37bad70dce80e007f` has 1688. Both stores receive identical bounded old-only source-certificate opportunities, up to four source applications and 128 expanded bodies per task. Every type-indexed discovery root is checked in deterministic dependency-closed batches, and every proposed/final selection is replayed against its authenticated minimal closure. No root is silently omitted; the checker, planner search, costs and limits remain unchanged.

All proof discovery/checking/application occurs at compile time. No caller validation or runtime proof optimizer is added. Existing host backend selection is separate. All 102 guarded production compiler/backend/runtime/planner files remain unchanged. CPU/GPU cost policy bytes equal batch22.

## Matched protocol and boundaries

Twelve recipes use natural `(xs,seed,k)` signatures: six skip scalars, four scan projection vectors and two first-prefix scalars. Timed elements are U32; cardinality returns U64 through two Wasm word lanes and a direct native scalar. 228 complete frames cover edges and 120 timed cells at lengths 32, 4096, 65536 under small/full distributions. Every first-match and mapped-first recipe has first/interior/absent match positions at every size and distribution. Callback instantiations are presets, not an external application corpus. Exact location/input/parameter profiles are archived.

Literal JS/Rust controls retain eager source stages. Strong controls erase complementary predicate and unused prefix work, perform forward early-exit lookups, evaluate only the returned mapper, and may reuse vector destination scratch. Captured and borrowed JS, Wasm complete calls, native resident and input-snapshot calls have separate boundaries. Required input copies, output allocations, complete result consumption and cleanup are timed. GPU calls include upload, dispatch, readback and consumption. Fallback requests are not actual GPU samples. No handwritten WGSL expert is measured.

Nine shuffled measured rounds use seed 20261101, two warmups and a 15 ms target. Native calibration starts at one call, records zero timer trials, grows by at most 16 and retains every trial. Each native driver invocation performs a common result check and three untimed prewarm calls, distinct from the two journaled warmups. Generated C and Rust use optimized/native flags with different LLVM versions and one common shared-library driver; this is not an Ink-to-Rust emitter or equal-LLVM comparison.

All author/build/test jobs stop before sequential native, Node and bounded browser measurements. Individual paired median-bootstrap 95% intervals use 4,000 Random(0) draws. They are exploratory, correlated and unadjusted for multiple comparisons. All browser groups and raw frames are retained; startup sums contexts, while the merged cold-call map describes only the first context. No source, fixture, control or policy is tuned from timings.

Totals: **37,044 samples, 10,536 complete benchmark comparisons, 3,300 independently recomputed intervals**. Compiler SHA `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`.

## Fresh recipes versus fair prior

| Target / boundary | Faster | Slower | Inconclusive |
|---|---:|---:|---:|
| Node JS | 104 | 9 | 7 |
| Browser JS | 104 | 4 | 12 |
| Node Wasm | 88 | 8 | 24 |
| Browser Wasm | 85 | 8 | 27 |
| Native C resident | 108 | 11 | 1 |
| Native C input snapshot | 108 | 11 | 1 |

All 51 adverse fresh rows remain in [fresh-regressions.json](fresh-regressions.json). Per-family and callback-cohort counts are retained in [outcomes](outcome-tables.json); every match location and exact ratio interval is retained in the raw summaries. Supported median ranges are descriptive; no pooled suite speedup is claimed.

## Optimized handwritten comparisons

These tables include fresh cells only; all old-only references remain in the outcome files. Faster means Ink beats the named expert at the stated call boundary.

| Target / boundary | Faster | Slower | Inconclusive |
|---|---:|---:|---:|
| Node captured JS / expert JS | 7 | 98 | 15 |
| Browser captured JS / expert JS | 13 | 86 | 21 |
| Node Wasm / expert Rust Wasm | 0 | 116 | 4 |
| Browser Wasm / expert Rust Wasm | 1 | 109 | 10 |
| Native C resident / expert Rust | 0 | 118 | 2 |
| Native C input snapshot / expert Rust | 0 | 96 | 24 |
| Actual GPU / expert JS | 0 | 36 | 0 |

Actual GPU variant/cells: **36**. Exact eligibility for baseline/prior/current, transfers and fallback counters are preserved in [metadata](metadata.json) and [backend routing](backend-routing.json). Eligibility is not a prior/current GPU speedup. Matched GPU ratios exist only when both implementations actually run on GPU; missing records are fallback, not slower observations.

## Evidence and limits

[Catalogue review](catalogue-review.json), [native review](native-final-review.json), [protocol review](protocol-final-review.json), [code shapes](code-shape-review.json), [verification](verification.json) and [final binding](final-binding.json) authenticate exact proof, source and result bytes. Fewer arrays/loops do not guarantee a faster complete call. General semantic equalities apply beyond these fixtures, while profitability is established only for these presets on this machine. A production corpus and more machines are needed for broad claims.

The DB adds 1200 exact Wasm observations (program, plan, proof roots, workload, host, samples and exported memory). JS/GPU measurements remain in raw reports. SQLite is a disposable rebuilt index. No commit, push or PR was made.

## Review corrections and next performance targets

Before the first measurement, a reporting-only inventory correction marked `count.wgsl` active and `sum.wgsl` inactive for the complementary-count GPU descriptors, matching the existing frozen scalar dispatch. The original helper and receipt remain preserved. The recovered inventory and its distinct helper are authenticated by [pretime bindings](pretime-review-bindings.json); no compiled target, source fixture, control or cost policy changed.

After measurement, the frozen report/dashboard generators looked up an absent GPU ratio label. This display correction reads the actual `js_expert_over_ink_checked_gpu` verdicts: **0 Ink wins, 36 expert-JS wins**. The generators and their original outputs remain preserved. No sample, interval or verdict changed. [Display receipt](display-review.json) binds the corrected outputs.

The strongest next general opportunities are a proved forward early-exit lowering for first-match consumers and lower output/call-boundary overhead. This batch does not implement either. Expert controls already erase the same useless work; gains over prior Ink alone cannot establish a lead over those controls.
