# Checked DB proof batch 31

Implemented two reusable transformations and published **61 checked DB objects**: nine typed optimization endpoints, eighteen necessary proof supports, eighteen new definition-bound deployments and sixteen explicitly classified deployments of older proofs. The constant-U32-prefix transformation gives substantial gains across JS, resident Wasm, native code and WebGPU versus prior Ink. The filtered-projection cleanup is mostly near parity. **Efficient Rust controls still lead; broad superiority over native algorithms has not been achieved.**

```ink
xs.map(f).zip(xs.filter(p), fn(unused) => fn(y) => g(y))
    == xs.filter(p).map(g)

xs.filter(p).zip(xs.map(f), fn(y) => fn(unused) => g(y))
    == xs.filter(p).map(g)

xs.map(fn(unused) => c).scan()
    == xs.map_indexed(fn(i) => fn(unused) => (i + 1) * c)
```

These equations illustrate existing syntax. Projection covers arbitrary pure total same-type callbacks over U32/I32/U64/F32, preserving observed expression grouping, bits and order. Filtered positions need not align with their original positions. Constant-prefix generation covers an arbitrary capture-only **U32** constant; its wrapping multiplication matches U32 scan and index wrapping. No U64 or floating-point scan extension is claimed.

## Proofs, conventions and fair prior

The [producer](../../knowledge/producers/web_pipeline31_laws.py) and [tests](../../knowledge/tests/test_web_pipeline31_laws.py) live in the knowledge layer. Projection uses a function-valued list induction with arbitrary padding before the discarded mapped receiver, predicate cases, existing concat associativity and beta transports. Uniform prefix uses list induction generalized to an arbitrary Nat start, existing wrapping-word normalization and two beta/Nat supports. Existing checker rules establish every certificate; no axioms, theorem flags or optimization-specific core rules were added.

Global deployments bind helper bodies, signatures and transitive declarations by content hash; the ordinary checker also checks those definitions and proof bytes. Hashes alone never establish correctness. All 367 previously pinned source files and frozen engine28 remain byte-identical. Core, backend packages, planner and runtime were not edited. No caller validation or optional runtime checker wrapper was added.

The original catalogue has 1,891 objects and 1,332 semantic pairs. No forward/reverse alpha-equivalent optimization endpoint was found. A bounded old-only callback frontier (four applications / 128 bodies) found no proposals, but explicit old-law composition **already removes the discarded mapper**: identity postmap plus old independent mapped-zip fusion leaves a filtered projection zip. Sixteen old-only source certificates were therefore admitted and offered to both sides. The measured fair prior has **1,907 objects**; the current catalogue has **1,952**, a difference of 45 fresh generic/support/new-deployment objects. The 61-object publication includes those sixteen old-law deployments and must not be described as 61 new mathematical identities.

Thus fresh projection credit is only `filter + zip → filter + map`. Source/literal-to-checked removal of the mapper is partly an old-law deployment gain. Canonical original 1,891 and fair-prior 1,907 stores are preserved separately. Historical assembly paths pointing to canonical knowledge must be read using their recorded snapshot.

## Selection policy and physical output

The previous batch27 operation-cost model declines fresh effects for all four timed recipes: both sides choose the same old projection result or unchanged prefix result. Those receipts are preserved. This batch declares a separate **pre-timing generic cost hypothesis**: retain every old price and add `method:zip=80`, `method:map_indexed=60`, `method:scan=100`. Previously unspecified stages defaulted to unit cost and were undervalued relative to map. Both databases receive the identical new model, with no function/law whitelist, forced applications or fitting to measured timings. This is external compile-time profitability data, not a correctness rule or universal recommendation. See [cost hypothesis](cost-hypothesis.json).

The ordinary planner selects one fresh checked application for each current recipe. Fair prior selects one old application for each projection and zero for prefix. Every final choice replays in the ordinary frozen checker. All four current cores differ from fair prior. There is no new runtime adaptation or changing-load optimization.

Projection literal has three loops/allocation sites; fair prior and checked both have two. New projection removes the unused zip receiver load and minimum-length bound; GPU stages and actual memory capacity remain equal. No incremental full-buffer or mapper saving is attributed to the fresh law.

Uniform prefix changes two CPU loops/allocation sites to one and replaces GPU parallel-map plus serial-scan with a parallel indexed shader. It removes the CPU intermediate array and serial dependency. Generated JS/C still syntactically evaluates the captured scalar inside the indexed body, including the secondary quotient recipe; release/JIT compilers may hoist invariants. Efficient handwritten controls explicitly hoist the scalar once and use one wrapping accumulator.

GPU memory depends on its emitted route. The checked single shader uses **two output banks**, whereas the prior uses a two-stage graph. For positive N, actual device live-buffer bytes are `16*N+24` checked versus `16*N+20` prior: **4 bytes higher**, not a memory saving. At N=65,536 that is 1,048,600 versus 1,048,596 bytes. Checked upload is `4*N+24` versus `4*N+12`; readback is `4*N` versus `4*N+4`. Empty checked output has zero dispatches and 40 live bytes versus two graph dispatches and 24 live bytes. Input snapshots still copy all words even though prefix ignores their values. CPU heap peak remains unmeasured and uses an explicit unknown sentinel.

## Measured changes versus fair prior Ink

Four correlated U32 recipes × three sizes (32/4,096/65,536) × two regimes give 24 timed cells. The two projection orientations and two prefix recipes are **two mechanisms**, not four independent algorithm discoveries. Each ratio below is an equal-cell geometric mean of nine paired prior/checked round ratios; **above 1 means faster checked output**. Per-cell win/loss/uncertain uses nominal 95% paired bootstrap intervals. Aggregate means are descriptive, without aggregate intervals or multiplicity correction.

| Boundary | Prior / checked | Win / loss / uncertain |
|---|---:|---:|
| Node JS, owned full call | 1.263× | 16 / 0 / 8 |
| Browser JS, owned full call | 1.758× | 17 / 1 / 6 |
| Node Wasm, full call | 1.001× | 6 / 1 / 17 |
| Browser Wasm, full call | 1.007× | 3 / 1 / 20 |
| Node Wasm, resident destination | 1.310× | 12 / 2 / 10 |
| Browser Wasm, resident destination | 1.318× | 14 / 3 / 7 |
| Browser WebGPU, instrumented full call | 1.833× | 12 / 0 / 12 |
| Native generated C, resident destination | 1.867× | 15 / 4 / 5 |
| Native generated C, captured destination | 1.500× | 13 / 2 / 9 |

The constant-prefix family has twelve cells. Its separate results show where the gains arise:

| Boundary | Prior / checked | Win / loss / uncertain |
|---|---:|---:|
| Node JS, owned full call | 1.555× | 11 / 0 / 1 |
| Browser JS, owned full call | 3.055× | 12 / 0 / 0 |
| Node Wasm, full call | 1.017× | 5 / 1 / 6 |
| Browser Wasm, full call | 1.011× | 3 / 1 / 8 |
| Node Wasm, resident destination | 1.753× | 11 / 0 / 1 |
| Browser Wasm, resident destination | 1.732× | 12 / 0 / 0 |
| Browser WebGPU, instrumented full call | 3.330× | 12 / 0 / 0 |
| Native generated C, resident destination | 3.511× | 12 / 0 / 0 |
| Native generated C, captured destination | 2.259× | 12 / 0 / 0 |

All twelve prefix GPU cells and both native cohorts win; all twelve browser JS and resident-Wasm cells win. Node JS and resident Wasm each have eleven wins/one uncertain. Full-call Wasm remains dominated by capture, packing, scheduling and unpack: prefix Node has five wins/one loss/six uncertain; browser has three wins/one loss/eight uncertain. Faster computation does not imply faster transport-heavy calls.

Projection is mostly parity: family means are 1.025× Node JS, 1.012× browser JS, 1.009× GPU, 0.993× native resident and 0.996× native captured. All twelve projection GPU intervals are uncertain. Browser JS has one loss; native resident has four losses, native captured two; Node resident Wasm has two losses and browser resident Wasm three. Every adverse cell remains in [paired analysis](analysis.json) and [cohorts](cohorts.json). This weaker physical effect should not be presented as a broad performance advance.

Projection low/high means filter acceptance (approximately 6–13% / 84–88%). Prefix low/high means small versus large wrapping captured constants, with full-length outputs, **not acceptance density**. Secondary recipe names containing `heldout` are measured here; this is not an unseen performance-generalization claim. Other numeric types have correctness evidence only.

## Efficient handwritten controls

The table uses expert/checked ratios, again above 1 meaning Ink is faster. Controls implement the already-reduced algorithm: one append pass for projection and a hoisted wrapping recurrence for prefix. JS produces ordinary owned arrays. Rust uses reusable caller destinations for native/resident cohorts and copied owned results for full Wasm. Native Ink here is emitted C compiled with Clang, compared with Rust compiled using rustc; it is not a claim about a newly changed Ink Rust backend. Natural interfaces and equivalent capture/output lifetimes are exercised separately.

| Control comparison | Expert / checked | Ink win / loss / uncertain |
|---|---:|---:|
| Node handwritten JS | 0.979× | 8 / 10 / 6 |
| Browser handwritten JS | 0.914× | 8 / 14 / 2 |
| Node Rust-Wasm, full call | 0.408× | 0 / 24 / 0 |
| Browser Rust-Wasm, full call | 0.429× | 0 / 24 / 0 |
| Node Rust-Wasm, resident destination | 0.889× | 5 / 13 / 6 |
| Browser Rust-Wasm, resident destination | 0.856× | 5 / 16 / 3 |
| Native Rust, resident destination | 0.741× | 4 / 16 / 4 |
| Native Rust, captured destination | 0.825× | 5 / 16 / 3 |

Rust-Wasm full-call controls win all 24 cells in both hosts. Within prefix, native Rust and browser resident Rust-Wasm win all twelve cells; Node resident Rust-Wasm wins ten with two uncertain. Some JS/other cells beat controls, but these results do not establish general expert parity. Instrumented checked WebGPU loses all 24 comparisons against expert browser JS and all 24 against full-call Rust-Wasm; accelerator savings versus a serial GPU graph do not make GPU appropriate for these small/light workloads. Host/boundary averages are never pooled into an absolute language ranking.

## Correctness and measurement evidence

Four producer tests pass. Eighteen typed sources have 126 complete-array frames / 252 original-selected interpreter calls (476 observed elements), with an additional independent eager-U32 oracle for 42 frames. F32 exceptional values, signed zero and NaN captures preserve original-selected behavior; independent NaN payload propagation is not claimed. Fifteen three-element semantic cases check arbitrary starts including 2^32−1, 2^32 and 2^32+7 and constants 0/7/U32::MAX. These corroborate wrapping without allocating a 2^32-element array. Three correctly hashed false conclusions, a rehashed changed transitive context and use of the allegedly unused callback binder are rejected.

An independent padding oracle checks 163,808 complete arrays across short subset/padding/callback cases and both orientations. Finite tests corroborate the kernel proof; they are not universal proof admission. Six unseen projection helper/type sources and one unseen transitive uniform helper use seven private content-bound deployments, adding zero canonical objects. Automatic selections, 42 interpreter executions and 21 emitted-JS full-output checks pass across those private probes. This demonstrates reusable certificate production through composed functions, not generic-only matching of normalized helper bodies. The original cost decline for the complex uniform helper remains archived.

The benchmark has 96 full-output fixtures checked against an independent oracle. Final untimed Node validation has 1,152 variant/fixture rows and 3,072 full checks; browser has 1,440 rows and 3,936 checks; native has 384 full-array validations. Nonmutation and later changed-input output-lifetime checks pass. Timing runs contain 14,560 Node and 17,780 browser complete checks, plus journaled native full-vector checksum/consumption checks.

There are **7,560 accepted samples**: 1,728 native, 2,592 Node and 3,240 browser, across 840 nine-sample groups. Native, Node and browser ran sequentially after every source/build/test/review worker stopped. All 7,713 timing-freeze bindings and 367 prior source files remain pinned. Web uses two warmups, doubling calibration to eight milliseconds or 65,536 iterations and nine seeded shuffled rounds. Native uses three driver prewarm calls per calibration/sample subprocess. Native scratch reset and complete-vector consumption occur inside timing; web consumes endpoints inside and validates full outputs outside.

Full Wasm includes capture/packing/scheduling/unpack; resident setup is excluded and result spans are borrowed. GPU includes upload, dispatch, readback and per-call counter instrumentation. All 288 requested GPU availability validations execute on actual GPU with zero fallback; 648 GPU timing rows check backend totals and route-specific counters. Node is v26.1.0; browser identifies Chrome 154. This is one local machine and fixed workload, not a changing-load or all-hardware result.

Native resident/captured rows are split into authenticated views of the unchanged raw file before paired analysis, avoiding duplicate same-round keys. Intervals use 4,000 paired-round bootstrap draws and fixed seeds. Correctness, conditions and profitability remain separate; timings never enter a proof premise.

Preparation/authoring/review failures are preserved: proof hypothesis/congruence attempts, a finite-offset test tuple unpack, evidence-writer accounting, a root store-path typo and cached-selection model-hash rejection. Untimed browser validation correctly rejected overlapping report-writer/readiness changes. Original metadata/validations and both recovery steps remain archived; the final metadata changes only README, the proof-report writer and readiness receipt, with all 298 compiled/input/control bindings unchanged. Full web validations were repeated before timing. Independent review also corrected its inherited graph-only assumption and discovered the direct-shader double-bank memory accounting above. No measured inputs, outputs or raw timings were replaced to repair these issues.

## Final catalogue and evidence

Canonical snapshot `2611e6bf33c70f66929b27cd8250f4a8e9ccc28ffada49bbb0b3597c1ffce988` contains **1,952 objects / 20,840 observations**. The 840 new observations bind all 7,560 samples, actual selected proofs, boundaries, compiler, plans and raw artifact hashes. The original 1,891 object bytes/names and 20,000 observation bytes are preserved. SQLite remains a disposable index.

- [Publication](publication.json), [admission](publication-checks.json), [proof evidence](proofs/evidence.json), [default declines](proofs/automatic-selection.json), [new-model selections](proofs/new-model-selection.json).
- [Native raw](native/results.json), [Node raw](node-results.json), [browser raw](browser-results.json), [analysis](analysis.json), [cohorts](cohorts.json).
- [Native audit](native/audit.json), [Node audit](node-audit.json), [browser audit](browser-audit.json), [prepared review](review/prepared-source-review.json), [recovery](preparation-recovery.json).
- [Initial pins](initial-pins.json), [timing freeze](timing-freeze.json), [plans](measurement-plans.json), [observations](observations.json), [final audit](final-audit.json).
- [Independent saved-data review](review/saved-data-review.json), [independent performance review](review/final-performance-review.json), [author performance review](benchmark-preparation/performance-author-review.json).

Compiler SHA256: `c0f3651f11c04b2a4f30740a1239f3192af52c3cdff4523076456624cc557bbc`. Publication is local; no commit, push or pull request was created.
