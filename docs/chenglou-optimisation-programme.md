# Contracts, preparation and compact execution

James requested that Freerange and Pretext join the ongoing Handwired
investigation. This document records mechanisms to integrate into Ink, their
semantic conditions and measurable acceptance criteria. These are compiler and
knowledge-library requirements, not a request to add website dependencies.

## Pinned sources and current integration

| Project | Investigated revision | Role |
| --- | --- | --- |
| [Handwired](https://github.com/chenglou/handwired/tree/09f23d276d3b9284cea4eec61ffd934950cc979e) | `09f23d27` | Construct algorithms as circuits, exploit exact bits and ranges, stage compact device execution |
| [Freerange](https://github.com/chenglou/freerange/tree/4ee586f19f166377ac7c56f6ea4081cbd7ef2066) | `4ee586f1` | Infer numeric facts and caller requirements, propagate branch information, explain analysis limits |
| [Pretext](https://github.com/chenglou/pretext/tree/0a27bbe0f109c689b0a2af2fb1d2e659ddabf5b8) | `0a27bbe0` | Separate measurement/preparation from repeated layout, compute only the observation requested |

All three are MIT licensed. Preserve attribution and license notices with any
source transfer. The current bit-state library is independently authored.

The separate Ink documentation website already imports Pretext 0.0.9 for panel
and text measurement and runs Freerange 0.0.5 over numeric layout helpers at build
time. That use does not implement these mechanisms in Ink. The investigated
Pretext source is version 1.0.0; Freerange's investigated source still declares
0.0.5, so its package version alone does not identify the source revision.

## Freerange: infer useful facts without making users write every premise

Freerange's [number domain](https://github.com/chenglou/freerange/blob/4ee586f19f166377ac7c56f6ea4081cbd7ef2066/src/domain/number.ts)
tracks inclusive bounds, integrality, possible NaN/infinity and one excluded
value. It refines branches and follows supported same-file calls. Leading
assertions express caller requirements; later assertions are obligations. It
deliberately limits JavaScript analysis, including assumptions about stable
property reads. Its [documented limits](https://github.com/chenglou/freerange/blob/4ee586f19f166377ac7c56f6ea4081cbd7ef2066/README.md)
are part of what makes its results interpretable.

Ink should carry this ergonomics into the existing proof architecture:

| Mechanism | Ink work and acceptance criterion |
| --- | --- |
| Forward range and branch inference | A knowledge-side producer proposes facts tied to exact typed expression paths, binders and numeric semantics. Core replays proof obligations before a fact removes a check or admits a representation. Unknown means retain the original implementation. |
| Backward requirements | Explain which input bound, nonzero condition, shape or exclusivity condition blocks a candidate. Do not turn Ink's fallible runtime `requires` into unchecked assumptions. A declared requirement needs an admitted static proof or an explicit validating boundary. |
| Interprocedural summaries | Bind parameter and result relations to exact source and effects, transport through generic callbacks and module calls, and invalidate when their dependencies change. A matching printed expression is not sufficient identity. |
| Facts as optimisation inputs | Reuse checked facts for packed lanes, narrow indices, allocation bounds, mask-to-gather proposals and bounds-check elimination. Measure fact discovery and proof replay as well as emitted execution. |
| Visible analysis scope | Report proved, guarded, caller-required, externally assumed and unknown facts separately, with the missing premise and source location. An unsupported feature must not silently acquire a fact. |

Freerange analyzes JavaScript binary64. Ink's wrapping words, arbitrary integers
and F32 need their own transfer rules. For example, the unsigned range of
`x + 1` cannot stay monotone across overflow. NaNs, signed zero, subnormals and
rounding points also constrain deductions. Importing Freerange's result as
rewrite authority would bypass Ink's checker; use it as an inference design,
not a trusted certificate format.

Acceptance needs arithmetic-boundary counterexamples, invalid/stale facts and
independent reference results. At least one packed numeric, one index/buffer and
one layout workload should consume the same general fact mechanism. Search
alone cannot establish broad benefit.

## Pretext: move work to the frequency at which its inputs change

Pretext's [preparation API](https://github.com/chenglou/pretext/blob/0a27bbe0f109c689b0a2af2fb1d2e659ddabf5b8/src/layout.ts)
normalizes, segments and measures text before repeated arithmetic layout.
Its [line counter](https://github.com/chenglou/pretext/blob/0a27bbe0f109c689b0a2af2fb1d2e659ddabf5b8/src/line-break.ts)
avoids building line strings when only height/count is requested, with prepared
flags selecting applicable walkers. The [research log](https://github.com/chenglou/pretext/blob/0a27bbe0f109c689b0a2af2fb1d2e659ddabf5b8/RESEARCH.md)
also treats cache construction, lifetimes and invalidation as real costs.

These mechanisms generalize beyond text:

| Mechanism | Ink work and acceptance criterion |
| --- | --- |
| Separate stable and changing inputs | Stage schemas, fonts/measurement data, patterns, meshes or query configuration into a prepared representation. Reuse only while the bound source inputs and external environment remain valid. Compare zero, one and many repeated calls. |
| Compute the requested observation | Derive count/exists/height or selected columns without building unobserved strings, rows or trees. Any omitted work must preserve errors, effects, evaluation order and divergence/resource behavior required by the source contract. A projection alone does not grant permission to skip an effectful producer. |
| Store facts needed by the hot loop | Compare parallel arrays, compact flags, optional side tables and layouts selected from checked predicates. Keep the public logical value independent of a private representation. Charge encoding, retained memory and reconstruction costs. |
| Maintain changes at their natural granularity | Explore paragraph/item/batch invalidation and changed-region upload. Share the mechanisms with maintained queries and device sessions; verify edits, rollback and restoration rather than measuring unchanged inputs alone. |
| Make the oracle boundary explicit | A font engine, database or device supplies external facts once; validated immutable data feeds pure compiled computation. Record the dependencies that make those facts valid. Pure processing of measured widths does not prove the font measurement. |
| Keep small-output pipelines resident | Batch independent layout/query work on CPU/Wasm/GPU and transfer only requested observations. Include dispatch, transfer and synchronization; compare small interactive requests with large batches. Sequential work inside a paragraph does not become parallel merely by choosing WebGPU. |

Text layout is a strong adverse test for numerical contracts. Pretext uses
JavaScript binary64; casting measured widths to F32 can change the branch that
chooses a line break. A small width error can produce an entire extra line.
Do not claim equivalent layout from an F32 error bound alone. Specify fixed
units with a separately accepted layout meaning, preserve the required numeric
domain, or establish a decision margin and fall back when it is insufficient.
Browser matching additionally depends on segmentation, whitespace, shaping,
language and engine behavior. A word-width toy is not Pretext parity.

### Precision direction

The recommended baseline is first-class F64 semantics on the reference, CPU,
JavaScript and Wasm paths, with explicit conversion and bit behavior, rather than
changing a binary64 algorithm while porting it. This is new language/ABI/proof
work, not an existing Ink capability. Establish arithmetic, comparison, NaN,
signed-zero, serialization and conversion conformance before making optimisation
claims. Source-to-proof correspondence must name the new domain explicitly.

After that baseline, range inference can propose checked narrower execution.
For a fit test against 300 pixels, an enclosing interval entirely below the
threshold establishes the same decision; an interval crossing it does not.
Bounds must include conversion and every accumulated rounding error. Guarded
execution can discard an uncertain pure paragraph result and rerun it under the
baseline semantics before publishing output. Do not publish speculative effects
or assume that checking only the last comparison repairs an earlier wrong branch.
Keeping line breaks alone also does not preserve returned exact line widths.

Place stages independently. Current [WGSL concrete floating types](https://www.w3.org/TR/WGSL/#floating-point-types)
provide F32 and F16, without native F64. CPU/Wasm execution remains a valid
baseline for sensitive work; a GPU proposal can use checked narrower arithmetic,
explicitly priced software arithmetic, or an appropriate source contract. Charge
guard, rerun and transfer costs before selecting it. These are acceptance
requirements, not a claim that an adaptive precision implementation exists.

## One connected optimisation programme

The common direction is **infer facts, prepare stable work, execute a compact
representation, and materialize only the required observations**. Different
implementations can target CPU, Wasm, GPU or storage while preserving the same
checked logical contract. Choosing between them still needs comparable lifecycle
evidence; a correct cache can lose on short-lived inputs.

The [Handwired inventory](handwired-integration.md) and
[fourteen-family language programme](optimisation-language-programme.md) remain
open. Existing foundations include const parameters, checked physical bounds and
codecs, effects, retained state and resident GPU sessions. They are not completion
of general inferred facts, automatic staging, projection-sensitive lowering or
external-storage placement.

The first retained [matched report](../reports/handwired-packed-circuits-2026-10-15/README.md)
shows search gains, with separate CPU losses and first-call limitations. No
Freerange-derived compiler optimisation, Pretext-compatible Ink layout engine or
new cross-domain performance gain is claimed by this design document.

Next acceptance work should include repeated prepared queries/layout, cold and
single-use controls, changed-input histories, dense/sparse numeric cases and
different requested output sizes. Preserve strong handwritten and upstream
controls, independent complete-output checking, held-out inputs, raw samples and
per-phase timing/memory. Keep each implemented mechanism and each remaining gap
visible in published results.
