# Web proof batch 3 — 21 fresh laws and full web calls

Added **21 fresh checked laws**, growing the canonical catalogue **765 → 786**. Two proof authors contributed numeric and collection families; an independent reviewer checked sources, proof receipts, frozen artifacts and actual GPU evidence. The existing default planner selects six new laws on six U32 benchmark functions, and the local checker replays each selection before emission. The compiler, trusted core, runtime and backends are unchanged for this batch. Generated functions continue to trust callers.

The strongest cross-stack result is complementary affine update elimination: on full-width 65,536-word browser input, **12.04× Wasm** [11.81, 12.43] and **1.077× complete WebGPU calls** [1.064, 1.142]. Its JavaScript ratio is 360× because the original performs 256 updates per word and the proof removes that iteration. This is controlled work elimination, not a universal language speedup. The three mapped-zip fusion workloads improve browser JavaScript **1.30–1.40×** and Node JavaScript **1.64–2.02×** on the same large fixture.

## Checked content

[Numeric producer](../../knowledge/producers/web_compute3_laws.py): nine laws across U32, I32 and U64. All arithmetic uses wrapping word semantics, with no value-range hypothesis:

| Family | Source operation | Replacement |
|---|---|---|
| Captured branch | Repeat `choose(c,a+k,a-d)` from `x` | `choose(c,x+word(n)*k,x-word(n)*d)` |
| Complementary affine blend | Repeat `a*k+(a+d)*(1-k)` from `x` | `x+word(n)*(d*(1-k))` |
| Initialised captured mask | Repeat `choose(c,k,a)` from `choose(c,k,x)` | The initial `choose(c,k,x)` |

The captured decision is independent of the changing accumulator and loop index. Mask preservation includes zero iterations because the initial value is already projected; it is not a theorem about repeatedly comparing the current accumulator. Generic Nat induction proves the blend; Boolean cases and ordinary proof composition reduce the branch families to plain recurrences. The unchanged checker needed no new trusted rule. [Numeric notes](../../knowledge/research/web-stack-proofs-3/compute/notes.md), [receipts](../../knowledge/research/web-stack-proofs-3/compute/evidence.json) and [tests](../../knowledge/research/web-stack-proofs-3/compute/tests.log) cover admission, default selection/replay/reification and original/selected interpreter outputs for all three types at counts 0, 1 and 256, both branches and overflow boundaries.

[Collection producer](../../knowledge/producers/web_collection3_laws.py): twelve laws, three families across U32, I32, U64 and F32. A mapped left self-zip, mapped right self-zip, or both mapped sides become one direct map over the same original list. Exact element count, order and multiplication/addition/subtraction grouping are preserved, including F32. Generic list induction checks them. [Collection notes](../../knowledge/research/web-stack-proofs-3/collection/NOTES.md) and [tests](../../knowledge/research/web-stack-proofs-3/collection/tests.log) preserve all type-instance applications and locally checked reification.

All 21 objects are fresh relative to the immutable 765 snapshot. Old-catalogue selection applies zero laws and produces identical original/prior function bodies. New selection applies exactly one fresh law per benchmark function and changes all six bodies. Five freshly hashed false statements are rejected semantically. The complete knowledge suite passes **40 tests** ([log](knowledge-tests.log)). [Publication](publication.json) stages and checks the objects, preserves the old snapshot, and only then updates the canonical pointer.

## Browser full-call results

Prior/new ratios above one mean a speedup from the new catalogue using the same compiler. These are full-width U32 inputs of length 65,536 on Apple M2 / Apple metal-3 in headed Chrome 154. Intervals are paired bootstrap 95%, individually exploratory without family-wise multiple-comparison adjustment.

| Workload | Runtime JavaScript | Wasm | Actual WebGPU |
|---|---:|---:|---:|
| mapped_left_zip | 1.3× [1.26, 1.35] | 1.02× [0.968, 1.03] | Unavailable: prior CPU fallback |
| mapped_right_zip | 1.3× [1.29, 1.34] | 1.01× [0.977, 1.02] | Unavailable: prior CPU fallback |
| mapped_both_zip | 1.4× [1.39, 1.45] | 1.01× [1, 1.03] | Unavailable: prior CPU fallback |
| captured_branch_repeat | 178× [172, 185] | 0.994× [0.962, 1.01] | 1.03× [0.979, 1.05] |
| affine_blend_repeat | 360× [353, 384] | 12× [11.8, 12.4] | 1.08× [1.06, 1.14] |
| captured_mask_repeat | 85.7× [84.6, 91.7] | 1.01× [0.988, 1.05] | 1.09× [0.938, 1.15] |

The three original mapped-zip shapes are GPU-ineligible. Their rewrites enable actual shaders, but there is no prior/new two-shader ratio. All new collection GPU routes are slower than the prior CPU routes on every measured fixture. In addition, [current-backend comparisons](backend-routing.json) compare checked JS/Wasm/GPU fairly: checked runtime JavaScript has the lowest median in all 36 browser cells, and both checked CPU paths beat checked GPU with supported intervals in all 72 CPU/GPU comparisons. These results favour CPU execution for these measured complete-call contracts even where GPU emission is newly possible.

The large captured-branch and mask GPU intervals cross one: their displayed median gains are not supported improvements. Several Wasm collection intervals also cross one. Node's large affine blend improves Wasm **11.77×** [11.20, 11.96]. Hardware/compiler optimisation already makes several other original loops competitive in Wasm, while the proof removes their much larger JavaScript work.

[Profitability evidence](profitability.json) records **167 supported same-backend improvements, 67 inconclusive cells and zero supported regressions**, out of 234 host/backend/fixture comparisons. It recommends retaining the prior candidate when latency evidence is inconclusive. The GPU route comparisons preserve the cost of switching backends separately. These are scoped measured recommendations; a general automatic routing or target-specific proof-selection policy is not implemented. Mathematical validity does not guarantee faster output for every type, shape or future machine.

## Measurement and comparison limits

Six U32 representatives, two distributions and sizes 32/4096/65,536 give 36 cells per host. Node records **2,772 samples / 1,254 exact comparisons**; the browser records **3,276 / 1,362**, for **6,048 timed samples** total. Thirteen CPU validation fixtures cover empty/singleton, word boundaries, odd lengths, both branches, all/no selected mask values and zero factors. Arbitrary-integer Python closed forms validate every output. Literal source stages independently corroborate all boundary vector elements and the first four elements of each other fixture, yielding **276 checks**; a separate [control preflight](control-preflight.json) compares complete handwritten JS outputs on all 78 case/fixture pairs. Validation also checks source input nonmutation.

Each complete call captures the source input once, pays applicable Wasm transfer and public result conversion, awaits the call boundary and consumes output inside the timer. GPU calls pay fresh upload, dispatch and readback as well. All **72 actual GPU variant/cells** execute shaders and yield **504 GPU timed samples**. Every call's dispatch and transfer counters match, including aggregates for trials, calibration and warmup. Each nonempty vector GPU call uploads `4*N+24` bytes and reads back `4*N` bytes; the extra upload covers two scalars and length metadata. The 36 GPU-request CPU fallbacks are retained but never enter GPU samples. GPU exact validation covers the six nonempty measured fixtures per shader workload; the thirteen boundary fixtures are validated through CPU/control paths.

Seven shuffled paired rounds follow calibrated batches and discarded warmup. Module startup and first calls are recorded separately. [Frozen metadata](metadata.json) hashes 78 artifacts; compiler, methodology and source identities remain unchanged. Root independently recomputed **756 archived intervals** from raw paired trials ([receipt](root-interval-verification.json)). [Independent review](../../knowledge/research/web-stack-proofs-3/review.md) separately checks hashes, raw checksums, normalization, GPU aggregates and limits. [Verification](verification.json) records the final receipt.

Handwritten original JS and Rust/Wasm retain the source's materialised collection stages and 256 numeric iterations, with ordinary JIT/release/library optimisation allowed. Rust output storage is preallocated/reused; intermediate Vec operations remain normal source stages. Checked Ink/Wasm still loses to original Rust/Wasm on five large browser controls and wins on the affine case where source work is removed. An expert handwritten already-fused/closed-form Rust control was not measured. Cross-language comparisons include different wrappers and transport and establish no universal ranking. All 21 type instances check; performance claims cover only these six U32 representatives on this machine. Pure value proofs do not verify the target lowerings or hardware themselves.

## Database and reproduction

Imported **288 authenticated measured Wasm observations**, growing the canonical observation database **2,510 → 2,798**, while preserving the 786-entry proof snapshot ([import receipt](canonical-observation-import.json)). Memory observations use exported Wasm linear-memory highwater, including retained growth after validation; host/GPU memory is unmeasured. Raw JS/GPU latency evidence stays archived without invented canonical memory observations.

Current 786 snapshot: `f5ef7bfd79adee16ef47984bd149811cc66dfe7b936820fbd2b68eb0e4170ab9`.

Preserved 765 snapshot: `7ecbce6e14b1273e771e4634b61e92d0f85929934c0d4e165b1f14c7c8660c6c`.

Unchanged compiler SHA256: `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`.

[Browser intervals](browser-REPORT.md), [Node intervals](node-REPORT.md), [raw browser trials](browser-results.json), [raw Node trials](node-results.json), [browser screenshot](browser-evidence.jpg) and [reproduction instructions](../../bench/web-stack-proofs-3/README.md) are retained. Use fresh report directories and stop all compilation/testing before timing. All contributions and publication remain local; no commits, pushes or pull requests were created.
