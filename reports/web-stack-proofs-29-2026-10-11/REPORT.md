# Checked DB proof batch 29

Implemented two general cardinality identities and published 36 checked DB objects. The unchanged compiler now removes a scan or an indexed map when only its output count is observed. These count pipelines improve across JavaScript, Wasm, native and this WebGPU run. Efficient handwritten controls still lead; broad native superiority has not been achieved.

```ink
count(xs.scan())          == count(xs)
count(xs.map_indexed(f))  == count(xs)
```

These equations describe the proved transformations, not new Ink syntax. Scan support covers wrapping U32/I32/U64; indexed-map support covers pure total same-type numeric callbacks over U32/I32/U64/F32. No F32 scan/reassociation law was added. Initial-state and arbitrary Nat-offset induction supports handle indexed wraparound and composition.

## Published objects and implementation

The 36 new objects comprise seven typed optimization endpoints, seven generalized induction supports, and 22 source certificates binding helper declarations and transitive callees by content hash. Four old concat-map dependencies are reused. Eight of the 22 certificates deploy existing concat-map mathematics, and are included in the fair prior benchmark DB; they are not counted as fresh performance gains. The fair prior has 1,839 objects; the new DB has 1,867. Canonical baseline objects and names remain preserved.

Production changes are confined to the new [DB producer](../../knowledge/producers/web_pipeline29_laws.py) and its [tests](../../knowledge/tests/test_web_pipeline29_laws.py), plus checked objects and observations. A separate [benchmark harness](../../bench/web-stack-proofs-29.py) supplies reproducible evidence. All 343 previously pinned source files and the engine28 compiler are byte-identical. Existing proof constructors, planner selection, CPU destination lowering and GPU graph lowering are reused. No new axioms, compiler syntax, runtime proof optimizer or caller-check wrappers were introduced.

CPU code drops from two materializing loops/allocations to one; the filter output is still allocated. GPU code drops from filter→scan/indexed-map→count to filter→count: three dispatches become two, and one capacity buffer of `4*(N+1)` bytes disappears (262,148 bytes at N=65,536). Upload and final eight-byte count readback remain. GPU filtering remains serial.

## Measured changes versus prior Ink

Each row summarizes the same 12 fresh count cells: two recipes, input sizes 32/4,096/65,536, and two independent input distributions. Ratios are equal-cell geometric means of paired prior/checked timings, so a value above 1 means faster checked output. Classification is per-cell nominal 95% paired bootstrap interval: win / loss / uncertain. Aggregate means are descriptive and have no aggregate confidence interval.

| Boundary | Prior / checked | Win / loss / uncertain |
|---|---:|---:|
| Node JavaScript, owned full call | 1.224× | 12 / 0 / 0 |
| Browser JavaScript, owned full call | 1.396× | 11 / 0 / 1 |
| Node Wasm, full call | 1.124× | 9 / 0 / 3 |
| Browser Wasm, full call | 1.110× | 9 / 0 / 3 |
| Node Wasm, resident inputs | 1.254× | 11 / 0 / 1 |
| Browser Wasm, resident inputs | 1.281× | 12 / 0 / 0 |
| Browser WebGPU, instrumented full call | 1.186× | 7 / 0 / 5 |
| Native, resident destination | 1.555× | 12 / 0 / 0 |
| Native, captured/snapshot destination | 1.373× | 12 / 0 / 0 |

The six concat-map reference cells use the same selected prior/current program and have no fresh proof effect. Their timing fluctuations are retained separately. Wasm executable sections agree for that reference; debug custom sections differ.

## Efficient handwritten controls

On the fresh count cells, handwritten JavaScript remains approximately 1.35× faster in Node and 1.33× faster in the browser. Rust compiled to Wasm remains approximately 3.94× faster for full Node calls and 3.17× faster for full browser calls. Native Rust remains approximately 4.20× faster with resident destinations and 3.31× faster with captured/snapshot destinations. Each of these controls wins all 12 fresh cells under the saved per-cell intervals.

Resident Rust-Wasm comparisons have mixed tiny-input results: Ink returns a direct i64 while the Rust control returns two memory lanes. Those ABI differences prevent a pure-kernel language inference. WebGPU is slower than all 72 saved comparisons with current or expert captured CPU variants. Its seven nominal prior→checked wins are a single instrumented run and need independent repetition before calling them durable GPU gains.

The laws are general over lists and callbacks and work through unrelated composed helpers. The measured suite remains a count/cardinality workload family. It does not establish improvements for arbitrary programs, changing runtime load, or all hardware.

## Correctness, protocol and independent review

Ordinary frozen-kernel admission and automatic selection replay pass. Typed primary/heldout evidence covers 114 frames and 228 interpreter executions. Four producer tests pass. Initial-state probes cover nonzero state, indexed wraparound and large Nat offsets. Rehashed false equalities and a helper body changed to `false` are rejected. A separate source with unrelated helper names selects nine generic rewrites using only the 14 generic objects; 18 interpreter and nine emitted-JS checks pass. Actual filtering remains in all timed count fixtures.

There are 5,670 accepted timing samples: 1,296 native, 1,944 Node and 2,430 browser. All use nine matched randomized rounds and calibrated iteration counts. Web runs use two journal warmups; each native calibration/sample subprocess performs three driver prewarm calls. Native whole-vector consumption and scratch reset occur inside timing. Web endpoint consumption occurs inside timing, with complete outputs and input nonmutation checked outside. Full Wasm includes packing, capture and unpack; resident setup is excluded. GPU upload, dispatch, readback and per-call counter instrumentation are included. CPU/JS heap peak is unmeasured and explicitly marked unknown; actual GPU live-buffer bytes are recorded.

All 189 GPU golden validations execute on the GPU with zero fallback; 486 GPU timing rows verify actual device counters. Independent reviews verify all 4,676 frozen bindings, all sample groups/checksums/shuffles, native trial journals and the 342 root-analysis interval calculations. Per-cell intervals use 4,000 paired bootstrap draws; there is no multiplicity correction. Hosts and boundaries are never pooled as an absolute language ranking.

The first browser tab disappeared before saving timings; zero timings from that attempt are accepted. Its completed validation and interruption record are preserved. The unchanged frozen retry supplies the accepted browser results. Preparation failures and a corrected debug-section equality assumption are retained alongside successful receipts.

## Evidence

- [Publication](publication.json), [admission checks](publication-checks.json), [proof evidence](pipeline/evidence.json), [novelty](pipeline/novelty.json), [portability](portability/evidence.json).
- [Native raw](native/results.json), [Node raw](node-results.json), [browser raw](browser-results.json), [paired analysis](analysis.json), [separate cohort summary](cohort-summary.json).
- [Saved-data independent audit](review/saved-data-review.json), [independent performance review](review/final-performance-review.json), [author analysis](benchmark-preparation/performance-author-review.json).
- [Measurement plans](measurement-plans.json), [observations](observations.json), [initial pins](initial-pins.json), [timing freeze](timing-freeze.json).

Final canonical snapshot: `8d2785e3f27ee945810ffc2c3801dc81f72436829f173cb9d18ea6b017edd65f` (1,867 objects; 19,160 observations). The 630 new observations contain all 5,670 measured samples and carry actual selection/proof identities. Timings guide profitability, never proof validity. Frozen compiler SHA256: `c0f3651f11c04b2a4f30740a1239f3192af52c3cdff4523076456624cc557bbc`.

All publication is local. No commit, push or pull request was created.
