# Contracts, preparation and compact execution

James requested that Freerange and Pretext join the ongoing Handwired
investigation. This document records mechanisms to integrate into Ink, their
semantic conditions and measurable acceptance criteria. These are compiler and
knowledge-library requirements, not a request to add website dependencies.

The implementation scope also includes explicit adaptive/trainable source forms,
requested on 15 October 2026. Designated parameters or state-to-parameter models
must support offline fitting before deployment and explicit learning events during
runtime. Authored rules remain fixed; learning updates only designated state and
preserves its admitted constraints, transaction/rollback and checkpoint meaning.
Context-dependent models must be able to learn interactions between inputs, not
merely one global constant. Training objectives, observation inputs and update
timing are explicit. Gradient generation, discrete-choice/search policies and
behavior-preserving implementation tuning require distinct contracts. These are
additional implementation requirements, not capabilities established by the
earlier search/fact milestones.

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
shows search gains, with separate CPU losses and first-call limitations.
[Conditional unsigned facts](conditional-word-facts.md) now extend the existing
analyser with excluded points and relational range refinement. Offline
acquisition independently checks complete equations, and four new laws enter the
ordinary database proposal catalogue. The [mechanism report](../reports/conditional-facts-2026-10-15/README.md)
retains cross-target conformance, scope limits and designed-workload measurements.
A Pretext-compatible layout engine and broad application gains remain open.

## Delivery checklist

This is one workstream across all three projects. Adding website dependencies,
publishing this inventory, or completing F64 alone does not finish it. The search
milestone was published in distribution `a0a4fa0f` with local validation; its
GitHub conformance run was still queued when this checklist was recorded.

| Work package | Remaining delivery | Current status |
| --- | --- | --- |
| Source and experiment coverage | Map upstream modules, examples, research decisions and failed experiments to an Ink mechanism, an existing equivalent or an explicit reason not to transfer it. Retain revision, evidence and acceptance condition. | Initial mechanism inventory exists; exhaustive coverage audit remains open |
| Inferred facts and requirements | Forward numeric/branch facts, backward missing premises, source-bound call summaries and useful diagnostics; replay evidence before facts authorize optimisations. Start with existing integer domains as well as floats. | Excluded unsigned values, relational ranges, checked acquisition and catalogue reuse implemented; general requirements, summaries, diagnostics and additional domains remain open |
| Precision | Faithful F64 semantics across reference/CPU/JS/Wasm and their ABI, followed by checked narrowing and whole-region guarded fallback with rounding/error propagation. | Design only; does not block integer, ownership or preparation work |
| Fact-driven compact execution | General checked bit/grid/exclusivity transport; integer and packed representations; one-hot selection to gathers; reject fractional bits, multiple active choices and invalid nonfinite premises. | Authored bit-state algorithms and eight scalar laws delivered; automatic general consumption remains open |
| Circuit and loop scheduling | Pure-term sharing, liveness, sparse versus dense execution, bounded reusable loops, checked associative scans and transition composition; retain simultaneous assignment and rounding points. | Existing loops/scans/last-use foundations; general proposals and comparison remain open |
| Preparation and specialisation | Separate stable inputs from varying inputs, reuse kernels with parameters as data, compare staged and direct execution, bound caches and bind all invalidation dependencies. | Invariant numeric-table preparation with checked whole-function equality delivered; broader staging, caches and environment binding remain open |
| Requested observations | Compute count/exists/height, selected fields or output windows without building unnecessary full results. Preserve observable failures, effects and ordering. | Existing query/fusion/codec foundations; general observation-directed optimisation remains open |
| Incremental work and placement | Maintain item/paragraph/batch changes, share derived state, upload changed regions and keep intermediate values resident. Compose query/ordinary code/device plans and price I/O. | Partial maintained-state and GPU foundations; broader composition, transfer planning and external storage remain open |
| Ownership and execution overhead | Remove measured helper/capture clones, reuse searchers/prepared inputs, compare layouts and allocation behavior across target engines. | UTF-8 and primitive borrowing improvements delivered; native whole-workload ownership gap remains open |
| Behavioral contracts | Explicit permitted staleness, capacity, first/any/tie selection and fallback; preserve transaction and observation meaning. | Partial specification foundations; relevant source contracts and consumers remain open |
| Differentiation and learning | Separate exact circuits, forward-preserving gradient interfaces, learned proposal ranking and intentionally approximate replacements. Demonstrate a useful kernel and validate each claimed contract independently. | Source gradient/JVP, authored reverse graphs, complete optimizer state and cooperative queued sessions delivered; general source reverse AD, frozen arithmetic/graph specialization, broader domains and performance parity remain open |
| Cross-domain and lifecycle acceptance | Real layout/prepared computation, JSON/structured data, relational/bitset and sparse numeric workloads; matched first-call, steady-state, edits, memory and adverse cases against strong controls. | Complete-count search evidence delivered; broader parity/performance and comparable first-call evidence remain open |

The next implementation priorities are reusable checked facts and their consumers,
preparation plus requested-output execution, and the measured ownership/transfer
gaps. F64 establishes fidelity for binary64 workloads alongside those priorities.
Circuit scheduling and differentiation need separate executable milestones; they
must not disappear behind the search milestone or be renamed complete because
their foundations exist. Introduce syntax when a concrete general mechanism needs
it, rather than assigning a source keyword to every upstream implementation trick.

Next acceptance work should include repeated prepared queries/layout, cold and
single-use controls, changed-input histories, dense/sparse numeric cases and
different requested output sizes. Preserve strong handwritten and upstream
controls, independent complete-output checking, held-out inputs, raw samples and
per-phase timing/memory. Keep each implemented mechanism and each remaining gap
visible in published results.

## Prepared numeric tables: initial delivery

The loop-invariant producer now proposes invariant numeric List preparation, with
ordinary whole-function Normalize proofs and an empty-input guard. The retained
[benchmark](../bench/prepared-tables/README.md) includes both a large win and a
small regression; it grants no automatic cost decision. Full required-target
validation compares 94 cases across Rust/JavaScript/Wasm and GPU-host fallback
(zero device calls). A separately rerun conditional-fact suite compares 88 cases
and confirms one actual device dispatch. Both complete-target logs are retained
in `reports/prepared-tables-2026-10-15`. Earlier smoke invocations did not request
Wasm/GPU; these explicit full-target reruns close that verification gap.

The pinned [source inventory](../reports/chenglou-source-audit-2026-10-15/README.md)
catalogues tracked files and subsystem coverage. Semantic extraction and all
remaining roadmap acceptance criteria remain open; an inventory is not a port.

## Explicit learning: initial delivery

[Adaptive declarations and training](adaptive-learning.md) now enforce which state
learning may change and provide offline replay plus explicit online updates. A
contextual interaction model, held-out predictions, failed-update rollback, module
transport and complete-target conformance establish this initial path. Updates and
objectives are authored Ink code. Broader source AD, additional discrete
training algorithms and frozen-model specialization remain open; this does not close
the broader Handwired or eight-package programme.

## Whole-computation training and further reuse

[Differentiable computation](differentiable-computation.md) now propagates automatic
derivatives through the complete admitted objective, including a twelve-step
authored world/controller rollout. Existing `requires`/`ensures` clauses constrain
learning's degrees of freedom and preserve rollback. Cross-target checks include
actual GPU dispatch of a batched trajectory-gradient computation. The AD transform
remains trusted; unsupported domains and hard-decision policies are explicit.

[Call summaries](interprocedural-word-facts.md) extend checked unsigned inference
across exact helper definitions, with two new laws, stale-context rejection and
bounded acquisition. Preparation also seeds immutable AD context once per request.
The [retained comparison](../bench/differentiable-preparation/README.md) includes
small-input regressions and a substantially faster handwritten derivative control.
These are further deliveries across all three investigations, not completion of
the larger programme or a claim of Handwired training-performance parity.


## Batched learning execution and implementation assurance

Full gradients now propagate their basis directions through one primal execution.
Generic JavaScript local scalar-record storage and native F32 carrier bookkeeping
support the generated wide arithmetic and ordinary authored code. There is no
F32 reassociation or zero-times-infinity shortcut. [Fresh-process measurements](../bench/batched-differentiation/README.md)
show a 2.09× improvement on the large polynomial case while retaining empty-input
and handwritten controls. This is a specific training-path improvement, not a
cross-domain performance conclusion.

Two source-bound database equations universally compare batched and separate
JVP results on polynomial/nonlinear kernels. Normalization, exact definition
attachment, stale-context rejection and actual selected GPU execution are checked.
These equations strengthen concrete implementation checks; the whole AD transform,
checker and generated backends remain trusted. General source reverse AD,
F64/complete Pretext fidelity, broad call inference and the remaining work packages
are still open.

[Prepared reverse graphs and models](reverse-learning.md) now add an authored VJP
library, explicit sparse zero-cotangent and hard-operation policies, fused affine/
ReGLU nodes, 244-parameter models and complete Adam/backtracking state. Offline
training resumes the exact optimizer and control state. General interpreter
lexical capture and requested field/index observation reduce copying of unrelated
prepared values. This carries preparation and observation ideas into computation;
it does not establish full Pretext text-layout fidelity or complete upstream parity.

The [learning lifecycle requirement](learning-lifecycle.md) now explicitly covers
pre-compilation fitting, training as a build stage, feedback-triggered adaptation
and continuous learning while serving. Shared objectives, constrained degrees of
freedom and complete optimizer lineage must cross these phases. Continuous queues,
budgets, publication, cancellation and recovery are required work; repeated online
calls alone do not close that requirement.


[Cooperative continuous learning](continuous-learning.md) now composes a generic
source session with compiled action scheduling and the existing durable host.
Queued feedback, candidate progress and serving versions survive restart; source
controls pause/budgets/cadence, stale publication fails, and offline CLI state can
bootstrap the service. This is a serialized CPU-host milestone, not parallel/device
training, build-stage freezing or closure of the matched performance requirement.


[Captured adaptive builds](trained-builds.md) integrate explicit fitting with target
compilation and versioned package publication. Training/parent lineage, source,
complete checkpoint and emitted files are bound; optional replay checks the whole
training result. Startup and continued learning have complete CPU/Wasm comparisons,
native durable recovery and actual native/browser GPU dispatch. This adds a build
phase to the lifecycle, without claiming frozen specialization or a new throughput
win. Pure invocation holders avoid retaining a deployed state they cannot observe.

[Authored discrete policies](policy-learning.md) now add categorical score-function
gradients, masks, reward-to-go and trajectory reduction. The contextual example
uses source AD, delayed feedback tickets, full Adam continuation and rollback.
The application defines every objective, reward, constraint and acceptance rule;
no engagement or other product goal belongs in the compiler. This source-library
delivery does not establish convergence, universal machine-level unbiasedness,
PPO/off-policy correction, device training or the outstanding performance target.


[Structured keep preparation](structured-preparation.md) now retains private
immutable lists/records/results and recursive data on CPU hosts, using the common
checked effect graph. The neural example reuses an architecture during ongoing
training. Same-source comparisons retain repeated-query wins and cold, memory,
invalidation and training-only losses. Source restrictions for explicit frozen
builds are delivered; arithmetic/graph specialization and automatic lifecycle
profitability remain open. These mechanisms add reuse outside search without
closing F64/Pretext fidelity or complete matched-performance acceptance.


[Prepared value-state defaults](prepared-initializers.md) now allow explicit keeps
whose complete dependency closure contains no state/action access. Hygienic source
elaboration composes these with ordinary mutable cells and existing private keep
retention. Same-state comparisons across source variants add a 1.19× JavaScript
prediction gain beyond structured keeps, retaining cold/memory costs. Complete
learning lineage and explicit immutable source binding compose. The frozen module
is a concrete input for subsequent ordinary-proof specialization; it is not an
already specialized graph, a new GPU training engine or closure of upstream parity.


[Pure helper preparation](prepared-helpers.md) now carries sealed stable inputs
through ordinary JavaScript helper boundaries. Source topology/policy checks can
persist with a graph while weights, context and targets vary; full primals and
reverse values remain fresh. This applies the preparation idea to neural
computation without a model-name recognizer or unchecked validity flag. The
[complete-result comparison](../reports/prepared-helpers-2026-10-16/README.md)
retains gains and ordinary/setup regressions, plus faster Handwired and dense
controls. This explicit pure-call capability does not automatically stage mutable
learning sessions or complete graph specialization, broader target support or
Pretext fidelity.
