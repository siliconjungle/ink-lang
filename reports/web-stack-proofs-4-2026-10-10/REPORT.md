# Web stack proof batch 4

Added **23 fresh checked laws**, growing the canonical catalogue **786 → 809**. Two proof authors and an independent reviewer contributed. All **49 database tests** pass. The existing default planner selects one fresh law on each of six new U32 benchmark functions; local selection replay and executable source reification pass. Old786 applies no laws and leaves every original body unchanged. The same frozen compiler is used throughout, with no core, runtime, backend or caller-validator changes in this batch.

The clear practical gain is JavaScript: full-width 65,536-word browser calls improve **1.20–1.90×**, with supported intervals on all six representatives. First-run Node gains are **1.16–2.78×**. Wasm and WebGPU large-input differences are mostly inconclusive, and current runtime JavaScript beats both alternatives for this complete-call contract. These new mathematical laws are useful candidates, not universal performance guarantees.

## Proof content

| Family | Typed instances | Checked replacement |
|---|---:|---|
| Arbitrary unary map on left/right/both same-source zip inputs | 12: U32/I32/U64/F32 | Replace materialised map/zip stages with a single map retaining `f(x)-x*k`, `x-f(x)*k`, or `f(x)-h(x)*k` |
| Weighted difference self-zip | 4: U32/I32/U64/F32 | `xs.zip(xs, a-b*k)` → `xs.map(x-x*k)` |
| Weighted self-zip followed by arbitrary unary map | 4: U32/I32/U64/F32 | Fuse both stages into one map applying `f` to `x-x*k` |
| Conserved weighted total | 3: U32/I32/U64 | `x*k+(d-x)*k` → `d*k` under wrapping word semantics |

Generic list induction establishes same-source length, order and element expressions, including empty lists. Scalar normalization establishes integer conservation without range assumptions. F32 conservation is excluded; the applicable F32 fusions retain exact expression grouping and operand order. Pure callbacks can be interleaved after fusion rather than run in global stages; these are value semantics, not allocation/failure/resource equivalence. No caller checks or checker wrappers were added.

[Collection producer](../../knowledge/producers/web_collection4_laws.py), [notes and receipts](../../knowledge/research/web-stack-proofs-4/collection/NOTES.md), [compute producer](../../knowledge/producers/web_compute4_laws.py) and [compute evidence](../../knowledge/research/web-stack-proofs-4/compute/evidence.json) cover all typed admission/default-selection/replay/reification tests. Compute interpreter comparisons include overflow, empty/singleton lists and exact F32 negative-zero, rounding, infinities and NaN payloads. Five correctly hashed false laws reject semantically. Failed fully generic curried-combiner experiments are archived and excluded because the existing source reifier cannot execute them; the trusted checker was not extended.

[Publication receipt](publication.json) authenticates all 23, checks mathematical admission before pointer publication, and preserves the immutable old786 catalogue. The complete [test log](knowledge-tests.log) records 49 passing tests. [Independent review](../../knowledge/research/web-stack-proofs-4/review.md) covers sources, controls, frozen artifacts, raw trials and the confirmation run.

## Browser complete-call results

Prior/new ratios above 1 mean a gain from the new proofs with the same compiler. These full-width U32 inputs have 65,536 words, on Apple M2 / Apple metal-3 in headed Chrome 154. Intervals are paired bootstrap 95%, exploratory and individually unadjusted for multiple comparisons.

| Workload | Runtime JS prior/new | Wasm prior/new | Actual GPU prior/new |
|---|---:|---:|---:|
| generic_left_zip | 1.56× [1.46, 1.58] | 1.01× [0.981, 1.03] | Unavailable: prior fallback |
| generic_right_zip | 1.58× [1.51, 1.63] | 0.991× [0.985, 1.03] | Unavailable: prior fallback |
| generic_both_zip | 1.9× [1.85, 1.94] | 0.987× [0.987, 1.02] | Unavailable: prior fallback |
| generic_self_zip | 1.2× [1.15, 1.26] | 1.01× [0.98, 1.05] | 0.97× [0.936, 1.06] |
| zip_then_map | 1.48× [1.43, 1.5] | 1× [0.967, 1.08] | Unavailable: prior fallback |
| conserved_total | 1.3× [1.27, 1.33] | 1× [0.964, 1.01] | 0.977× [0.95, 1] |

Four rewritten functions become GPU shader-eligible, but prior CPU fallback is not a prior GPU measurement. The two comparable large-input GPU cases have intervals crossing1. The sole supported same-backend GPU gain in this original run is `conserved_total` on small-valued length 32 input: **1.091× [1.052,1.182]**. That route still loses to current CPU alternatives. The original and selected self-zip shaders are byte-identical, showing that this backend already emits the equivalent operation.

[Current backend comparisons](backend-routing.json) record runtime JavaScript as the lowest median in all 36 browser cells. Both current CPU routes beat current GPU with supported intervals in all 72 CPU/GPU comparisons. The costs include fresh upload and readback, so this conclusion applies to host-resident complete calls; resident GPU pipelines were not measured. No adaptive routing policy was implemented.

## Profitability and adverse evidence

[Original profitability decisions](profitability.json) preserve **147 supported gains, 80 inconclusive comparisons and 1 supported slowdown** among 228 same-backend host/fixture comparisons. Breakdown: runtime JS 70 gains/2 inconclusive; direct JS 70/2; Wasm 6 gains/65 inconclusive/1 slowdown; GPU 1 gain/11 inconclusive. The measured recommendation retains the prior candidate when benefit is unsupported or adverse. Those recommendations are evidence records, not an automatic planner policy.

The adverse original result is Node `generic_both_zip`, full-width65,536-word Wasm: **0.99254× [0.97247,0.99937]**, a borderline slowdown. A separate unchanged full Node protocol repeat preserves all79 frozen artifact hashes and records **1.03241× [0.98388,1.04655]** for that case, which is inconclusive. The original adverse run remains archived. The repeat also has a different borderline Wasm slowdown, `generic_right_zip` on small-valued65,536-word input: **0.997837× [0.990104,0.999990]**. Its overall counts are 74 gains/33 inconclusive/1 slowdown. Neither run establishes zero regressions. No additional repeats were chosen to chase significance; runs are not pooled or substituted. [Confirmation reason](node-confirmation/confirmation-reason.json), [raw repeat](node-confirmation/node-results.json) and [independent confirmation verification](node-confirmation/confirmation-verification.json) retain this evidence.

Checked direct Ink-JS beats the literal original JS control in all 36 cells on each original host run. Node runtimeJS loses on two small self-zip controls because its runtime boundary costs matter. Checked Ink/Wasm loses to original Rust/Wasm in all 36 cells on each original host run; large browser ratios are about1.65–1.69× slower. Rust output allocation is reused and intermediate source stages receive normal release optimization. An expert already-fused handwritten implementation was not measured. These controls establish no general language ranking.

## Complete-call scope and retained artifacts

Original Node records 2,772 samples/1,254 exact oracle comparisons; browser 3,192/1,362; the confirmation adds 2,772/1,254. Total **8,736 timed samples** and 3,870 exact backend comparisons. Six U32 representatives × two distributions × sizes 32/4,096/65,536 give 36 cells per host run. Thirteen CPU validation fixtures include empty/singleton, odd lengths, boundary words, zero/unit factors and overflow inputs. Arbitrary-integer Python closed forms check every output; independently wrapped literal stages corroborate 276 elements and a separate [JS control preflight](control-preflight.json) checks all 78 complete case/fixture outputs. Input nonmutation is verified.

Every timed implementation captures input once and includes applicable Wasm copy, result conversion, awaited boundary and checksum consumption. GPU calls additionally include upload, dispatch and readback. All 60 actual browser GPU variant/cells execute shaders, producing 420 timed GPU samples. Every actual call uploads `4*N+24` bytes and reads back `4*N` bytes; counters match for trials, calibration and warmup. Forty-eight GPU-request CPU fallbacks are retained but never timed as GPU. CPU fixtures cover boundaries; GPU validation covers the six nonempty measured vector fixtures per eligible workload. Startup and first calls are recorded separately.

[Frozen metadata](metadata.json) hashes 79 artifacts. Root independently recomputed **1,140 archived paired intervals**: 816 original and 324 confirmation, with exact equality to saved results ([original verification](root-interval-verification.json), [confirmation verification](node-confirmation/confirmation-verification.json)). [Browser screenshot](browser-evidence.jpg) shows descriptive medians; interval judgments above take precedence.

[Output sizes](output-sizes.json) show generated JavaScript 3459→3210 bytes (7.2% smaller), C 9954→8897 (10.6%), and Wasm 21349→21014 (1.6%). The conserved-total shader shrinks 598→498 bytes. Offline proof/selection `plan.json` grows from 715 to 1,355,606 bytes; executable reductions therefore do not imply a smaller whole audit bundle. Code size and measured runtime cost are separate.

## Database and reproduction

Imported **432 authenticated Wasm performance observations**: 288 original and 144 confirmation, growing canonical observations **2,798 → 3,230** while preserving the 809-entry proof snapshot ([import receipt](canonical-observation-import.json)). Memory evidence uses exported Wasm linear-memory highwater including retained growth after validation; host/GPU peak memory is unmeasured. JS/GPU latencies remain in raw archives without fabricated canonical memory metrics.

Current 809 snapshot: `388e3ebd2714c88bc66ae9219102284162f4f65cbed359283f54896b3cfac87c`.

Preserved 786 snapshot: `f5ef7bfd79adee16ef47984bd149811cc66dfe7b936820fbd2b68eb0e4170ab9`.

Unchanged compiler SHA256: `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`.

[Browser intervals](browser-REPORT.md), [Node intervals](node-REPORT.md), [raw browser trials](browser-results.json), [raw Node trials](node-results.json), [verification](verification.json) and [archived protocol](README.md) are retained. Preparation, validation and measurements run separately; no compiler or test jobs ran during timing. [Active harness](../../bench/web-stack-proofs-4.py) and [source](kernels.ink) make reproduction reviewable. Use fresh report directories and preserve previous runs. All changes remain local; no commits, pushes or pull requests were created.

