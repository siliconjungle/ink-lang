# Exact binary32 optimization laws

V8's machine, typed/simplified and representation reductions distinguish NaNs,
signed zero, truncation observations and ordinary numeric equality. Its typed
lowering explicitly contracts self equality to `!isNaN(x)`. This batch adds a
general source proof capability and fifteen reusable database laws for exact
F32 bit casts, raw sign negation, classification and IEEE self comparisons.
Arithmetic stays opaque; F64 semantic proof terms still reject. All equality
applications require independently replayed RUP proofs, including callbacks and
ordinary helpers. Strict false comparisons retain operand execution.

The upstream source revision is
`c4e049d3cbda775e2c3af9410f6e18b18388d68b`; source receipts and unresolved
families remain in `../audit.json` and `../coverage.md`. The implementation and
header of `src/compiler/js-typed-lowering` are fully read. V8 dynamic coercions,
reference equality, prototype guards, context cells and promise/generator paths
do not supply Ink source facts or authorize new unchecked transformations.

Both local and isolated exact-package core validation pass 454 tests. The gate
oracle tests all six IEEE comparisons over boundary/random pairs in both gate
encodings, nonzero high first-order word bits, classification and payload-preserving
negation. Source regressions reject forged NaN reflexivity even with a recomputed
CNF identity, substituted modes, missing proofs, exhausted work and closed nested
F64 terms. Six knowledge tests pass, replaying all 83 old word and 15 new F32 laws.
The required suite matches 326 reference/native/JavaScript/Rust-Wasm results and exact snapshots, plus all 326 native GPU-host results with four actual device dispatches. The GPU package passes all eleven tests. Final pin-bound replay passes the same 326 cases/four device dispatches and all 26 related knowledge regressions, including the independently merged closed-data bridge work.

## Complete-call evidence

The table reports medians across the retained samples for the nonempty phase.

Default 32-check discovery selects the bit-roundtrip law inside a map
callback, reducing structural estimated cost 105 to 73. It checks three candidate
applications without raising production budgets. This is improved admissible
search coverage; structural costs are not timing evidence.

| Generated call boundary | Training baseline / candidate ns | Holdout baseline / candidate ns |
|---|---:|---:|
| JavaScript trusted values | 243599 / 236877 | 238623 / 235111 |
| Native generated JSON values | 30945 / 30868 | 30697 / 30672 |

Both retain the baseline under the unchanged 10% minimum-gain and sample-extrema
guard. No runtime speedup is established. Each split uses three fresh processes,
eleven rounds, disjoint lengths/typed values, complete nonempty list outputs and
an empty control. Finite F32 values are exactly representable binary fractions;
NaN/payload/subnormal correctness is validated separately. The source interpreter
checks full outputs and unchanged inputs before/after timing. Inputs are prepared
outside the resident call; ordinary per-target execution/JSON handling and complete
output consumption stay in the measured boundary. Build, setup/loading and whole
host peak RSS are recorded separately. Absolute target numbers are not comparable
as a language benchmark. The shared host includes other required work.

`measure.py` uses the official acquisition and rank interfaces. `replay.py`
reconstructs both selection decisions from retained immutable observations.
Emitted sources, requests, proof packets, typed inputs, toolchain/build contexts
and native Cargo locks are retained without build targets/private mutable stores.
The historical acquisition compiler hash is in `results.json`; the exact core
package/source relationship is in `core-package.json`, validated in an isolated
checkout and target. Reproduction uses the repository's local Cargo entry point
and declared dependency-source preparation, preserving timed compiler flags.

## Frozen corpus

The required ten-program quick corpus completes all ten compilations. All ten
admit checked alternatives; 24 distinct laws are observed and six are reused
across programs. No representation is admitted and no alternative is selected:
the final gate is measurement evidence for all ten. All quick time budgets are
exhausted; the median reported compilation interval is 52.909 seconds, excluding
substantial private knowledge preparation. No new F32 law is attributed, and no
near-miss reason is recorded. This does not establish broad generalization or a
compiler/runtime speedup from the fifteen new entries.

`../corpus-f32-bits` retains the captured inputs, plans and exact run context;
`../corpus-f32-bits-summary.json` records attribution against the immutable F32
library. This acquisition predates the later merge of independent closed-data
bridge work. That merge is validated separately and is not included in the
corpus source digest.

## Literal GPU context correction

Actual device validation found an existing direct-shader bug in number-only
nested branches: their callback result was re-inferred as U64 instead of the
checked U32 carrier, producing invalid WGSL. The GPU backend now propagates the
checked element carrier through literal callbacks, helper expansion, choices
and carrier-preserving collection operations. Map source/output carriers remain
distinct and existing traversal limits remain in force. The regression validates
all emitted direct and graph shaders with Naga for U32/I32/U64/F32 literal
contexts, while actual classification dispatch checks complete results. This
correctness fix grants no algebraic or profitability authority and its effect
is outside the historical CPU-only timing/corpus compiler image.

Final integration merges concurrent distribution-main work (compact complete
trained-plan JSON and its factored-data evidence). The combined compiler again
passes all 326 cases/four GPU dispatches and 26 knowledge tests; its exact image
and source pins are in `integration/pins.json`. The semantic core tree remains
identical to the isolated 454-test package. Four CI partition checks and the
inherited report's 39-file binding audit pass. This does not claim completed
remote CI or attribute the independent trained-model work to V8.
