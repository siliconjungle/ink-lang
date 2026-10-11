# Web engine and portable proof contexts — batch 28

All four requested mechanisms are implemented. Ink source syntax is unchanged.
The checking core supplies definition binding and proof applicability; lowering
and runtime packages supply evaluation, storage lifetimes and device execution.
Equality laws, concrete contextual certificates, search policy and measured
profitability stay in the external knowledge/planner packages. No runtime proof
optimizer, helper-name whitelist or caller-validation wrapper was introduced.

| Request | Implemented behavior | Boundary |
| --- | --- | --- |
| Proofs through helper calls | Certificates carry typed transitive definitions and callee content hashes. Admission reconstructs/checks them; application independently matches the original module. | Existing equality proof rules; bounded nonrecursive contexts. Changed definitions require fresh evidence. |
| Preserve shared list work | C lowering materializes collection operands before length/data access, including bounded-inline fallback, zip, indexing and lazy branches. | Evaluation order and lazy branches retained. No unproved fusion. |
| Reuse output storage | C/JS list functions expose destination entrypoints; packed native/Wasm hosts expose destination execution. Prepared Wasm captures once, reuses storage and rewinds scratch allocations after each call. | Terminal allocation can disappear. Source intermediates remain until a DB rewrite removes them. Ordinary results keep their previous lifetime. |
| Broader GPU pipelines | Literal graphs compose map/indexed map/filter/zip/scan/concat/count/sum/foldr and bounded pure helpers. Dynamic lengths feed following stages; buffers are reused across requested iterations. | Ordered reductions initially use serial stages. Wide arithmetic, lazy collection control flow and graph feedback can still fall back to CPU. |

The trusted destination contract leaves capacity, declared types and nonaliasing
to callers. JS returns a logical element count; packed C/Wasm returns a 32-bit
word count. Prepared results are borrowed. Full CPU `callInto` still pays input
capture, packing, decode and destination-copy costs; it is distinct from direct
destination kernels and resident prepared calls.

## Evidence and measured gains

There are **10,656 accepted timing samples** and **1,184
new immutable DB observations**. The DB grew from 1,822 to **1,831 entries** with
nine definition-bound certificates; prior objects, names and observations were
preserved. Observation total is **18,530**. These measurements
provide cost evidence; they do not prove equations.

Ratios below are reference time / Ink time, so greater than 1 means Ink is
faster. Aggregates are equal-cell geometric means, with all losses retained.
Per-cell classifications use 95% paired-round bootstrap intervals with 4,000
resamples. Repeated trials on this one machine are not independent hardware
replication. The fixed eight-task corpus uses 32 and 65,536 elements, small/full
distributions, identical batch27 selected cores and frozen goldens. Context proofs
also exercise 4,096 elements. Boundaries are compared within each host.

| Comparison | Cells | Ratio | Supported wins / losses / uncertain |
| --- | ---: | ---: | --- |
| Native destination vs current owned, resident list calls | 28 | 1.612× | 19 / 0 / 9 |
| Native destination vs owned, 32 elements | 14 | 2.577× | 14 / 0 / 0 |
| Native destination vs owned, 65,536 elements | 14 | 1.008× | 5 / 0 / 9 |
| New helper-bound checked replay vs literal JS | 12 | 1.440× | 12 / 0 / 0 |
| Native Ink destination vs Rust expert, resident | 32 | 0.914× | 4 / 14 / 14 |
| Matched owned Array Ink vs fused JS, Node | 32 | 0.956× | 9 / 8 / 15 |
| Matched owned Array Ink vs fused JS, browser | 32 | 0.937× | 13 / 9 / 10 |

The portable helper proof cases improve captured JS by approximately
**1.04–2.03×** across all 12 cells. Wasm gains are predominantly indistinguishable
from noise in this experiment. This is **explicit checked replay**: the saved
frozen CPU-cost probe selects zero steps. No automatic-selection gain is claimed.
The underlying map-fusion mathematics is reused from the existing DB; the nine
new objects supply portable contextual derivations rather than nine new axioms.
U32/I32/U64/F32 primary/held-out contexts are checked; performance here measures
the two U32 cases only.

JS destination reuse is mixed: the small-call geometric ratios are approximately
0.751× in Node and 0.727× in browser; large-call ratios are 1.062× and 1.016×.
Avoiding an output allocation does not guarantee a faster JS call. The follow-up
owned-Array expert writes fresh Arrays directly, removing the extra conversion
in the initial reused-typed-buffer expert wrapper. The follow-up comparison is
the stronger owned-result JS control; the initial wrapper results remain saved
and are not evidence of broad superiority over optimal hand-written JavaScript.

GPU coverage passes **all 148 fixed-corpus frames on the actual device**, plus
75 composed/ordered graph oracle cases and a three-iteration native/browser
pipeline. Two exceptional F32 graph cases correctly use CPU fallback. There are
1,728 GPU-suite timing samples and 3,258 measured GPU invocations with checked
transfer/dispatch counters. **GPU loses all 32 cells to optimized JS and Rust
Wasm controls** at this instrumented full-call boundary. It beats original staged
JS only on two large modular-mix cells; those are exploratory algorithmic
comparisons. Better coverage is not a general GPU speedup claim.

Broad superiority over native Rust/Wasm/JS has not been demonstrated. The native
reuse gains are largest for allocation-dominated small calls. Large native calls
are near parity with the previous owned path, and optimized Rust remains ahead
in the aggregate. Prepared resident Wasm closes much of the transport gap but
still trails its Rust Wasm control overall. Peak host memory was not measured;
DB `peak_bytes=0` for those observations is explicitly labeled an unknown
sentinel in workload provenance. GPU observations record device-buffer peaks.

## Validation and preserved failures

New context checking, planner filtering, C/JS destination tests, arena lifetime
sanitizer checks and runtime tests pass. New C/JS target comparisons total 1,716
and 1,300; existing C/JS suites retain 1,941 and 2,290 logged comparisons. Node
and browser each validate 1,298 fixed-suite outputs; native validates 592.
Additional helper proof preparation checks 48 interpreter outputs and 128
complete JS/Wasm outputs. Native GPU validates 78 complete results. Standalone
fold and arithmetic-aggregate modules verify the packed Wasm ABI, and the syntax
example is accepted by the old compiler and executes through the new JS API.

Three older regression limits remain disclosed: bounded semantic search does not
produce the historically asserted expression under the accumulated catalogue;
the optimized CLI fixture exceeds its existing input-size limit; the planner
research test has an archive-count cap. The first two reproduce under the pinned
previous compiler. No budget/policy/size limit was silently raised. The historical
compact-selection22 utility remains unchanged; the new compact-selection28 tool
prefilters contextual applicability, which the checker still enforces.

Operational failures and repaired preparations are retained. Canonical publication
recovered idempotently after a scripting-method error and disk exhaustion during
disposable-index rebuilding. GPU timing first stopped on a zero-duration
calibration trial, then failed closed on its stale runner binding. The final
protocol permits zero only in calibration and requires positive accepted samples.
Freeze chains bind these two measurement-only repairs. Existing sources, metrics,
losses and prior reports were preserved; only reproducible build caches were
removed to recover disk space.

## Source syntax and APIs

```ink
module Example;
fn bump(xs: List<u32>, k: u32) -> List<u32> {
    return xs.map(fn(x) => x + k);
}
pub fn process(xs: List<u32>, k: u32) -> List<u32> {
    return bump(xs, k).filter(fn(x) => x > k).map(fn(x) => x * 3);
}
```

Generated JavaScript adds an output API without changing the Ink function:

```javascript
const output = new Uint32Array(xs.length);
const count = program.functionsInto.process(xs, k, output);
```

With `xs=[0,1,2]` and `k=2`, this writes `[9,12]`, returns 2 and leaves the
remaining destination element untouched. The normal `functions.process` remains
available. No proof or ownership annotation was added to source syntax.

## Bindings and review artifacts

- Compiler: `c0f3651f11c04b2a4f30740a1239f3192af52c3cdff4523076456624cc557bbc`.
- DB snapshot: `39d4be8c0283389cc8b1092ad8075ff36080885abad6d1d56bb74455e105b63e`.
- [Contracts and trust boundaries](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/docs/web-engine-storage-and-contexts.md).
- [Final source inventory](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-engine-28-2026-10-11/source-final.json).
- [Publication and final admissions](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-engine-28-2026-10-11/publication.json).
- [All performance comparisons and intervals](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-engine-28-2026-10-11/analysis.json).
- [DB observations and measurement plans](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-engine-28-2026-10-11/observations.json).
- [Independent context audit](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-engine-28-2026-10-11/context-performance/independent-audit.json).
- [Independent GPU audit](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-engine-28-2026-10-11/gpu-performance/independent-review.json).
- [Independent destination/lifetime review](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-engine-28-2026-10-11/independent-destination-review.md).
- [Final comparison review](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-engine-28-2026-10-11/gpu-performance/final-comparison-review.json).
- [Follow-up owned-result controls](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-engine-28-2026-10-11/owned-js-control/metadata.json).
- [Independent owned-result control review](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-engine-28-2026-10-11/owned-js-control/final-review.json).
