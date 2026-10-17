# Ink production acceptance gates

The objective remains the broad language in
[the specification](docs/language-specification-draft.md), with fair evaluation
against C, C++ and Rust. The executable subset and its evidence are documented
in [lowering parity](docs/lowering-parity.md). A successful example does not close
an entire gate. Editor support and schema evolution are outside the current scope.

The philosophy is to keep program meaning stable while implementation knowledge
accumulates. Reusable alternatives and proved laws belong in knowledge; the core
supplies fixed semantics and general checking. Measurements rank admitted
alternatives. [Design and ambitions](docs/vision.md) explains this separation;
[status](STATUS.md) distinguishes integrated features from active work.

## Responsibilities and authority

- **ink-core:** fixed language semantics, checked typed IR, reference execution,
  general evidence checking and application correspondence.
- **ink-knowledge:** immutable content-addressed definitions, candidates,
  applicability conditions, dependencies and proofs; separate performance
  observations. Git objects are canonical; SQLite is a rebuildable index.
- **ink-planner:** bounded discovery, composition, cost selection and replayable
  plans over pinned snapshots. Search exhaustion retains the baseline.
- **ink-runtime:** compiled execution, host ABIs, mixed-target orchestration,
  profiling, safe fallback, persistence and delivery.
- **Lowerings:** literal target emission and device operations. Profiling,
  repository identities and hashes never confer proof authority.

## Current priorities

| Priority | Deliverable | Acceptance gate |
| --- | --- | --- |
| 1 | Database-supplied table representation and query maintenance | Admit a candidate against an actual unchanged Ink application. Execute it through compiled backends; preserve arbitrary future updates, replies, errors, aborts, ordered events, checkpoints and restoration. Compose independently supplied candidates. Reject incorrect conditions/evidence. Preserve a baseline and replay the pinned selection. |
| 2 | Competitive complete execution | Measure construction, execution, teardown, retained memory, compile time and proof-check cost against algorithm/layout-matched C/C++/Rust. Improve baseline primitives and admit database alternatives without new catalogue rules in the core. GPU selection includes transfer, setup and readback; bounded search/adaptation checks guards, migration and fallback. |
| 3 | Permanent backend conformance gate | Generate bounded well-typed programs and action histories; compare reference, Rust, JavaScript and Rust-based Wasm paths. Exercise eligible WebGPU/wgpu separately, including resident empty/shrinking pipelines. Compare exact portable snapshots and preserve failing seeds. Unsupported GPU features use the compiled baseline. |
| 4 | Usable language and distribution | Modules/imports, a small standard library, actionable diagnostics, installation and debugging; consistent existing types across pure and stateful boundaries. Keep executable and draft features explicit. |
| 5 | Durable deployment | Persist state and outbox before returning success; recover from interrupted writes and crashes. Persist acknowledgements; demonstrate at-least-once delivery with receiver deduplication and bounded request retry receipts. Declare single-writer and storage limits. Test native compiled Rust and browser storage, compiled JavaScript/Wasm continuation and corruption rejection. |
| 6 | Trust-boundary hardening | Adversarial/fuzz and independent checking of admission and codecs; connect any external metatheory explicitly to the implemented checker before verification claims. Report concurrency and resource boundaries, raw measurements and remaining trusted components. |
| 7 | Measured generalisation | On the frozen planning corpus, ordinary defaults improve held-out programs they were not written for, with bounded planning time and reported regressions. Every knowledge publication reports the corpus funnel, near misses and cross-program reuse. Selection needs comparable evidence acquired without per-program authoring: paired measurements under one target description, or a calibrated work model validated on held-out cells. |

## Outstanding architecture requirements

[Engine39](reports/web-stack-engine-39-2026-10-11/REPORT.md) supplies bounded
facts through composition, destination reuse, a twenty-regression diagnosis,
seven-family comparisons and separately frozen target/adaptive models. These are
implemented experiments, not a closed competitive-execution gate. Next work must
reduce complete-call transport and remaining multi-pass storage, improve physical
target features/training coverage, and isolate fused scheduling/representation
losses. Heldout errors and adverse selections rule out enabling the broad fitted
model by default. Resident GPU and complete requests retain distinct accounting.

[Mixed pure browser placement](reports/adaptive-placement-2026-10-12/REPORT.md)
now implements bounded joint partition/target search, resident GPU groups and
parallel JS/Wasm workers with measured setup, full bridges, feedback and fallback.
Its scoped implementation gate is complete. Profiles remain opt-in, and broader
competitive execution, stateful placement and unfamiliar-workload selection retain
the gates above.

Stateful research should use exact relevant changes to maintain results and
workload frequencies/lifetime to choose whether maintenance pays. Charge setup,
proof checking, additional writes, memory and migration. Trial bounded saved-profile
or batch/session selection with an explicit static policy before a general live
controller; never benchmark an effectful action by executing it speculatively.

Legacy aggregate certificates, bounded caches, typed-policy admission and their
compatibility paths are removed. Canonical database representations check
all-action observation and invariant preservation against the admitted fixed
source projection. Standalone Rust/JavaScript and Wasm emit the checked
definitions literally; recursive state executes on GPU hosts. Supported scalar,
collection, vector and pure helper correspondence is documented in
[the representation contract](docs/database-representations.md). Unsupported
keys/operators fail closed, and broader source correspondence remains open.
Portable checkpoint/restore performs executable migration; direct bridge proofs
remain checkable but direct bridge emission is not implemented.

The permanent supported parity contract is enforced in CI, including actual
workers, exact eligible GPU kernels and explicit required-GPU failures. The
unrestricted device audit retains its disclosed missing capabilities. Passing
conformance does not close compiler correctness or competitive execution.
The latest compiled-state scaling report shows that cached reads can approach
a maintained handwritten control while linked-list writes remain expensive.
GPU placement follows measured profitability rather than requiring every feature
to execute on the device. Database implementation packages, including ordinary empty selections, compete
with cached layouts through [external selection](docs/state-choice.md); per-target
lifetime evidence determines whether caching is worth its write/setup costs.
Next physical-state work must reduce traversal, allocation and copying in updates,
with representation/source proofs and equal backend coverage. Preserve the
current slow candidates as benchmark controls and report memory and lifecycle costs.

Priority 1 remains open for arbitrary cross-row grouped/ordered maintenance,
unbounded group discovery, full dependency/storage deduplication and additional
physical executors. Strictly sorted tables are now a checked inductive
invariant of transition equality ([action algebra](docs/action-algebra.md)).
Ordered maintenance proofs may assume it once preservation is proved; none use
it yet beyond certified commutation of writes to different keys. Bounded grouped u64 aggregates, exact per-row ordered
contributions, proved field projection retention and shared observations are now
implemented. Existing numerical/keep, String/ID and local-owner
correspondence, guarded dynamic point deltas, independent cache composition,
ordinary column/Boolean packing candidates, proved direct column reads, explicit
packed Rust/Wasm scalar and data-cell storage, direct physical mutations, dense
and bucket point indexes, generation-stamped scratch, bounded identity memoisation,
proved aggregate fusion and direct native entry points are included in the
Frontier integration. Exact whole heap/grid query caches preserve source observations.
The implementation ledger, measurements and limits are in [Frontier extensions](reports/frontier-extensions/README.md).
Fixed-key remove/replace delta candidates, List value/count/u64-sum correspondence,
owned collection laws and external lifecycle/migration/memory selection are implemented;
[the current measurements](reports/incremental-maintenance-selection/README.md)
favour the simpler direct layout. Native resource limits and copying costs still
constrain these prototypes. No performance gate is
closed by representation correctness tests.

Ownership and representation work must include contiguous/compact layouts,
fewer copies and allocations, general arenas and ownership inference, narrow
relative links, variable-sized inline data/enums and construction into final
destinations. Representation choices belong in the database and need native
correspondence and future-update safety. Typed storage policies alone do not
satisfy this requirement.

Core builds must work without the catalogue. Integration pins exact knowledge,
planner, runtime and backend revisions; locally checked proof bytes establish
admission. Generated code, Rust/LLVM/C toolchains, fixed GPU primitives, host ABIs
and device drivers remain disclosed trusted components.

Historical milestones, inputs, receipts and open requirements are preserved in
[the archived plan](docs/history/implementation-plan-through-parity.md) and
`reports/`. Keep them when updating active tools. New formats need no historical
compatibility layer.

## Generic language foundation

The bounded implementation and its exact limits are documented in
[generic language foundations](docs/generic-language-foundations.md). Ordinary
value consistency, hygienic generics/aliases/constants, payload enums/matching,
finite local iteration, fixed arrays and nonescaping pure callbacks are
implemented. External collection/checked-division libraries and 247 checked
finite-list laws provide reusable algorithms and work skipping. CPU conformance
is mandatory; broad GPU coverage and proof correspondence beyond admitted source
domains remain open. Scoped disjoint buffer views now share native/JavaScript
storage with checked affine source use. Compact words/Bytes, broader borrowing,
efficient physical updates and static refinements remain acceptance work. Fallible pre/postcondition
validation and external theorem authoring are implemented through ordinary checked
values/evidence; neither silently grants assumptions or rewrite authority. Totality is not weakened to admit unrestricted loops or closures.

Prepared reverse graphs now have an authored VJP, explicit sparse/hard-gradient
policies and a 244-parameter ReGLU example with F32 Adam/backtracking state and
exact offline resume. See [scope and validation](docs/reverse-learning.md). This
advances the learning programme without closing source-wide reverse AD, frozen
model specialization, device graph training, certified approximation or the
Handwired matched-speed requirement. F64 text-layout fidelity, broader call facts
and the other Pretext/Freerange/Handwired acceptance gates remain required work.

James additionally requires every [learning phase](docs/learning-lifecycle.md):
pre-compilation fitting, explicit build-stage training/packaging, adaptive runtime
updates and integrated continuous observation/training/publication. A repeated
update call alone does not complete continuous lifecycle support. Queue capacity,
work budgets, publication cadence, serving versions, cancellation, durable progress
and exact recovery must be explicit and tested. Preserve shared objectives,
constraints and full optimizer lineage across phases.

Training orchestration must remain programmable: ordinary source policies and
learning actions can configure and trigger other learners, with full explicit
context, declared capabilities and transactional rollback. The checked
`examples/learning-orchestration.ink` demonstrates this across targets.
The [cooperative continuous path](docs/continuous-learning.md) now implements
bounded source queues, candidate progress, version-checked publication and durable
recovery on a compiled JavaScript host. [Adaptive build-stage packages](docs/trained-builds.md) now capture fitting inputs
and compile a bound startup checkpoint across targets. Parallel workers, device
training, frozen arithmetic/graph specialization and trained implementation selection remain required.

[Discrete policy learning](docs/policy-learning.md) now adds categorical scores,
authored reward feedback, reward-to-go and trajectory gradients. A contextual source
AD example preserves policy tickets, pending feedback, full Adam state and rollback.
Objectives and invariants belong to the application; no product goal is built in.
This does not close off-policy algorithms, frozen arithmetic/graph specialization or device training.


[Explicit immutable deployment](docs/frozen-state.md) now binds fitted rows in
source, removes their writers/callers, preserves the whole logical checkpoint and
rejects changed fixed rows on every supported restore boundary. Source-derived
constant facts reach the ordinary proof model. The next specialization gate is
reusable database-authored preparation/arithmetic/graph transformations with
complete behavior checks and measured compile/startup/steady-state/memory costs;
immutable source binding alone does not close it.


[Immutable structured keeps](docs/structured-preparation.md) extend stable-input
preparation to neural architecture and ordinary structured data. Whole-call reuse
and owned observations are measured, with cold/invalidation/memory and training-only
losses retained. Next preparation work must choose profitable lifecycles, reduce
unobserved representation/output construction, specialize graphs through ordinary
proofs and close the remaining query/pure-method surface differences. This is not
completion of universal staging or the matched upstream performance requirement.


[Prepared defaults](docs/prepared-initializers.md) now reuse explicit state-independent
keeps while retaining mutable model/optimizer state. Source admission, lexical
hygiene, transitive interfaces, whole-state continuation and explicit freezing are
validated. The retained lifecycle report includes setup/memory costs and a distinct
source identity; it grants no automatic selection. The next frozen staging input
is retained with real checked row bindings. General proof-backed partial evaluation
and observation-directed/borrowed execution must close the remaining large gap to
the dense numeric control; this milestone does not complete the programme.


[Preparation through pure helpers](docs/prepared-helpers.md) now carries sealed
stable-input masks through lazy JavaScript helper factories and caches successful
stable checks. Fresh neural primal/reverse values, forged graph rejection and
ordinary fallback are validated. Heldout complete predictions improve 1.11× and
gradients 1.025× over prior prepared execution; ordinary calls and setup regress in
the same study. The range-specialized Handwired and dense controls still lead.
Next work must reduce remaining dispatch/temporary/output costs, avoid paying for
unused preparation, compose profitable staging with live state and other targets,
and establish ordinary proof-backed graph/arithmetic specialization. This is not
source reverse AD, an automatic cost policy or completion of the programme.

[Prepared binary64 text geometry](docs/prepared-text.md) now supplies an exact
simple-walker fidelity baseline against pinned upstream counts, heights and full
cursor ranges. It rejects complex kinds and preserves explicit measured-data
boundaries. The 232-case oracle and 182-observation compiled history pass; the
first diagnostic still exposes a large execution gap to Pretext's direct loop.
Stable preparation now reaches sequential loop callbacks; the remaining work must
reduce record, dispatch and transport costs without stale dynamic inputs. Port the complete
complex walker, segmentation/shaping preparation and incremental invalidation,
then establish matched lifecycle performance. This is not full Pretext parity or
completion of the learning programme.

[Sequential callback preparation](docs/prepared-loop-callbacks.md) now retains
fixed helper work through ordinary loops and strict expressions, with dynamic
iteration bindings and source-order/lazy fallback preserved. The matched study
shows large repeated-index/table gains, small-case losses, retained-memory costs
and no material neural/layout improvement. Direct and upstream controls still
lead. Next work must remove unobserved construction/dispatch, implement general
source reverse AD and full preparation/layout fidelity, and compose measured
staging with mutable learning and other backends. This does not complete the
three-project performance requirement.

Finite binary64 constants now avoid runtime bit conversion in JavaScript; the
matched short text diagnostic improves the large counter 1.49×, retaining an
approximately twelve-fold gap to Pretext and small ordinary-call losses. Continue
reducing loop/record/helper overhead and implementing complete text preparation
and complex walkers; this literal support does not close the broader programme.


Source reverse differentiation now elaborates named pure objectives over dynamic
F32 parameter lists and nested records into fresh bounded tapes. Optional/result
context, helpers, zip, ordinary loops and both early-stop contracts are covered;
one selected variant arm can consume an affine capture once. See
[the implementation and remaining scope](docs/source-reverse-differentiation.md).
Full source/contract transport, device tape training, frozen specialization,
matched performance and the complete three-project programme remain required.

[Immutable JavaScript bindings](docs/immutable-javascript-bindings.md) now avoid
redundant const aliases while retaining snapshots of mutable loop/branch/call
slots. Text/model/collection emitted modules shrink 2.12%/2.95%/0.54%; the retained
timings are mixed. Full standalone and required-target histories validate the
change, with exact-bit swap/recursion regressions. This is code-size progress;
substantial upstream speed gaps and the complete complex text walker remain open.


The separate `std:prepared_complex_text` source port extends prepared geometry to
all complex break kinds and rich-inline facts with explicit numerical profiles.
Its upstream-only compressed oracle covers full cursor geometry and continuation;
required-target histories exercise state replacement, events, rollback and restore.
This advances fidelity, not the requested performance parity. The repeated complex
count diagnostic and profiler still expose substantial record/helper overhead.
Finish independent cross-target validation and matched lifecycle measurements,
then reduce that overhead through general execution mechanisms. Segmentation,
shaping/font measurement, incremental preparation, broader Handwired/Freerange
integration and the complete adaptive-model programme remain required work.

[Local record/helper execution](docs/local-record-helpers.md) now keeps readonly
record fields through bounded helper expansion, conditional merges and value
loops, including binary64 and immutable composite fields. It preserves ordinary
fallback, owned storage, exact values and normal compiler-stack limits. New
reference/target fixtures cover whole results and snapshots. Matched text and
neural controls retain small-call losses and VM warm-up sensitivity; this step
does not complete upstream parity, learned structural selection or the full
adaptive-model programme.

[Normalized JavaScript F32 carriers](docs/normalized-f32-carriers.md) now avoid
repeated carrier normalization while preserving raw NaN tags, typed host reads,
mutable snapshots and arithmetic rounding. Complete derivative results improve
in the matched neural workload; prediction is mixed and text code is unchanged.
The retained report includes independent values, required-target snapshots,
upstream controls and cold costs. Broader learned structure/representation
specialization, arbitrary adaptive planner search and the full three-project
performance programme remain open.

Frozen numeric structures can now materialize exact F32 coefficients, specialize
readonly helper/record choices and retain IEEE comparisons. Ordered action
continuations reuse existing primitive meanings after argument effects, with
unsupported projection domains still rejecting. Independent core tests and a
configured/frozen example cover bit payloads, live numeric updates, rollback and
compiled checkpoints. This supplies a building block for model specialization;
general graph unrolling, learned physical choices and matched speed remain open.

Closed-list traversal proposals now bind every intermediate once and can compile
a frozen operation sequence while coefficients remain trainable. The eight-op
program retains learning actions, dynamic ReLU decisions and live data, with
complete proof replay and cross-target state histories. A bounded structural
conversion strategy compares common structure and removes known control before
substitution duplicates a primal. This introduces no source-specific equality
rule. Larger frozen values and long action continuations still require scalable
sharing/factored proofs; full neural graph/tape specialization and the broader
Handwired/Freerange/Pretext acceptance programme remain open.

The [frozen-program release study](reports/frozen-program-2026-10-16/README.md)
retains six paired processes, the initial unrolling regression and final literal
binding-placement gain (1.57× serving; 1.13× updating weights every request).
The selected package remains larger than baseline. Compact checked proofs reduce
its payload, and fresh committed compiler/package sources reproduce executed
images and startup state byte for byte. These finite checks advance performance
and implementation assurance without closing large graphs, upstream parity or
the broader adaptive-model programme.

[Shared frozen literals](docs/frozen-literal-sharing.md) now retain long list and
table spines in transparent checked definitions, with exact source rebinding.
Exhaustive case proofs keep their established equation instead of expanding the
entire conclusion again; bounded authoring hints can retain the typed call.
450 private core tests pass, including complete 512-value results and exact-bit
transport. Focused knowledge tests specialize complete finite parameter lists
up to 512 elements. This removes a data-transport bottleneck; it does not unroll
long action continuations or complete graph/tape specialization and upstream
performance parity. Those remain required parts of the full programme.

The [retained sharing acquisition](reports/frozen-literal-sharing-2026-10-16/README.md)
adds complete 244-value model histories while a separate learner remains live,
plus explicit browser replays for both the model and the earlier eight-op
program. It distinguishes native wgpu evidence from browser execution and
corrects the earlier report's overbroad coverage wording. The next concrete
proof bottleneck identified there was equivalent long exceptional-value
literals: 64 values specialized but 128/244 exhausted the proposer. The factored
literal proofs below resolve that limit without widening checking bounds.

[Factored closed-data proofs](docs/factored-literal-proofs.md) now propose exact
typed chunk equalities and reuse them in complete action proofs. Finite and
exceptional parameter lists reach 512 values; wrong payloads and authenticated
invalid theorems reject. A runnable 244-value build-stage example freezes only
its model root, preserving separate training state, events and checkpoint
lineage. These are ordinary database lemmas, with no new trusted kernel case or
runtime performance claim. [Balanced typed helper composition](docs/frozen-composition.md)
now proposes longer closed `foldl` computations through conservative source
extensions and complete action proofs. The 32- and 128-operation cases preserve
live weights and exact checkpoints across CPU targets and GPU hosts. The same
path now passes through normal initialized trained-artifact publication and
mandatory proof replay, including compiled browser CPU fallbacks. Next,
generalize capture abstraction and extend larger
graph/tape domains. Warm lifecycle measurements now exist for 32/128 operations;
short-lived and broader upstream workloads still require acceptance evidence.
Device training and the broader upstream-parity programme remain required work.


Repeated typed helper code now shares parameter/lexical-alpha-equivalent bodies
through an untrusted knowledge proposal, with ordinary source-extension and
complete-action replay. The repeated 32/128 cases use 3/5 definitions instead
of 7/31. Separate paired comparisons measure smaller JavaScript and improved
warm serving/import/first-binding diagnostics; the unspecialized baseline still
has lower startup costs. Expanded code remains an explicit checked layout option.
Actual GPU prefix checks cover 64 operations and eleven raw F32 input/weight
classes. At that milestone the 128-operation pure root exceeded the graph stage budget;
source/dispatch fusion, broader graph/tape domains and device training remain
required. Prefix proof views are still substantial (3.29 MB for the 128 case).


Suffix-parametric prefix proofs now share universal helper equations across
remaining tails, with separate checked witnesses for closed data. The 128-operation
plan falls from 3.29 MB to 836 KB without changing selected runtime code. The
512-operation configured model now checks and passes full CPU/GPU-host histories,
including live weights and exact checkpoints. Existing checker and authoring
budgets remain unchanged; same-typed false-tail claims reject. This resolves the
recorded prefix-proof bottleneck, while capture abstraction, general graph/tape
fusion, learned representation choices and device training remain required.


Eligible scalar helper graphs now share a literal ordered GPU stage. Full
32/128/512-operation roots pass actual GPU execution with exceptional F32 classes;
wide-word, signed, record and lazy-default cases also pass. The 64-operation
helper falls from 64 stages to one and paired complete GPU calls improve about
1.84×. CPU/JavaScript remain much faster for a single scalar request. Collection
stages, state/learning execution and arithmetic contracts are unchanged. Next,
measure batched/resident whole-application pipelines and extend proof-backed
query/state fusion, learned representation/goal selection and device training.

The [learned instruction-program example](docs/learned-programs.md) now learns a
32-operation program from a full-computation objective, rather than accepting a
configured opcode answer. Generic joint/total policy scores and explicit current
choice likelihood support authored policy updates and elite distillation. On one
retained seed, the finite grammar's matching-program probability rises from
4.30% to 85.16%; this is neither convergence nor held-out generalization evidence.
Exact split resume, continuous runtime updates, goal-version changes and rollback
pass cross-target conformance. Freezing only instruction structure preserves
weights, goals and ordinary runtime state. Ordinary prefix and open-fold induction
lemmas replay complete action equations through residual workloads and typed
Result helpers, without increasing checker budgets. Fixed integer-to-F32 source
correspondence has 466 private standalone core checks. Learned representations,
general graph/tape compilation, automatic goal-directed profitable selection,
device training and the full upstream workload/performance programme remain open.


[Modular mathematical action projection](docs/modular-action-projection.md) has
480 passing standalone core tests across all 80 integration targets. The complete
staged neural fixture projects all six actions with live optimizer/control state.
Transparent lexical helpers, dependency-ordered source functions and shared branch
suffixes preserve the source's control/state interfaces; cast and paired/sum
callback correspondence extend the ordinary checking domain. Matching independent
packages are published. This is a foundation for graph specialization, with no
new executable graph rewrite or measured runtime gain. Source graph/code
transformations and the broad Handwired/Pretext/Freerange acceptance programme
remain required.

[Source fold-state projection](docs/fold-state-projection.md) now proposes smaller
owned loop carriers through the existing general fold law and a checked universal
step simulation. A shared function-body rewrite covers pure and stateful callers;
111 reference/Rust/JavaScript/Wasm calls retain events, rollback and exact state.
The separate 32-node F32 graph projection matches 175 reference histories, with
six paired JavaScript measurements and noisy samples retained. Complete owned
frozen-graph action proofs also replay with the existing checker limits; 486
standalone core tests cover the bounded conversion change. The unrolled record
pilot lost performance, and projected/unrolled composition still exhausts proof
resources. Profitable automatic representation selection, broad graph/tape
compilation, device training and full upstream parity remain required.

The speculative conversion extension's existing eight-operation CI regression is
repaired by checking necessary outer syntax before copying arguments. All 488
core tests, the complete legacy first-order corpus check and the existing
144-outcome native/JS/Wasm history pass locally without higher limits. Exact
native JavaScript F32 literal emission passes all 44 integration targets; six
paired Adam update measurements give 1.068× median throughput while small map
changes remain near control variation. The
[retained report](reports/conversion-and-f32-literals-2026-10-17/README.md)
separates these bounded results from general training, held-out profitability,
device execution and full upstream parity.

Owned field projection and frozen graph specialization now compose without a
core change: source wrappers open before generated chunks, and universal prefix
equations retain forwarding helpers. The four-step F32 plan passes 88 complete
reference/Rust/JavaScript/Wasm outcomes and five restores. Six process triples
retain the loss: combined JavaScript throughput is 0.876–0.907× baseline while
the projected fold reaches 1.144–1.159×. Six native Rust triples instead measure
1.744–1.811× for the combined graph, with every checksum/checkpoint matching the
JavaScript controls. The bounded frozen corpus compiles all ten programs; all
retain baseline at the measurement-evidence gate. Private COW index snapshots
complete that run without duplicating entire cache files; a subsequent atomic
replacement/read-pager follow-up passes all 23 corpus/cache tests. See the
[composition report](reports/composed-frozen-graph-2026-10-17/README.md).
Profitable code generation for the unrolled choice, mutable graph staging,
general learned representation selection, device training and upstream parity
remain required.

Pure function correspondence now admits source-bound universal equalities through
an ordinary `functions` plan step. The knowledge producer specializes closed call
arguments inside authored pure boundaries while weights stay live. A mutable
32-node owned graph, with an authored structural guard and generic fallback,
matches 335 reference/native/JavaScript/Wasm outcomes and six restores; initialized
JavaScript startup also matches. The combined standalone core preserves concurrent
word-count proof support and passes 501 tests across 83 integration targets. Exact
final package sources and 271 knowledge source files, including embedded
libraries, are checked against Git, and the publication compiler reproduces the JS/Rust images and complete
loss/update/frame projections. See the
[retained evidence](reports/mutable-function-specialization-2026-10-17/summary.json).
Guard generation is now available as an explicit knowledge proposal: a checked
configuration helper and fallback, a semantic guard rewrite, then universal
function specialization. The 32-node mutable graph checks on the ordinary 2 MiB
test stack after factoring structural comparison into a reusable list-identity
law. A separate regression checks recursive helper correspondence with two
recursive children. Boundary tests exposed repeated reads of raw F32 host tags;
the JavaScript implementation now captures used scalars into private immutable
carriers while preserving unused-parameter and borrowed-field demand.
The generated guard now passes learning updates to both structure (`Code`) and
weights: 335 complete outcomes and six restores match across reference, Rust,
JavaScript and Wasm. The separate authored-guard control also passes. The aligned
standalone core passes 503 tests across 83 integration targets; all 59 JavaScript
package tests and 24 knowledge regressions pass. The [retained report](reports/guarded-function-specialization-2026-10-17/README.md)
includes an audited 1,030-file compiler inventory with embedded package-root
resources, a replayable plan and exact runtime images. The earlier inventory's
missing embedded ABI resource is documented in its historical resource supplement.
Automatic opportunity discovery, profitable learned representation selection,
device training and the complete Handwired/Pretext/Freerange performance programme
remain required; this milestone makes no new performance claim.

The next lifecycle cohort now measures generated guards on JavaScript. Eight
groups of four fresh processes compare generic, guarded, projected and composed
plans with matching/early-mismatch/late-mismatch/empty graphs, three input sizes,
short lifetimes and live graph/weight learning writes. The guard loses: the
baseline/guard median ratio is 0.657 for one input and 0.858 for 64. Projection
alone gives 1.106 and 1.064 respectively; composition still loses. All variants
check 96 independent finite reference values and the 335-outcome exact-snapshot
history in each process. These shared-host diagnostics are not admitted planner
evidence. See the [complete lifecycle report](reports/guarded-specialization-lifecycle-2026-10-17/README.md).
An explicit `--prefix-plan` now composes checked preparation before guard
generation and exactly reproduces the measured six-step plan. Legacy feature
version rebinding and canonical empty proof-map handling are fixed; all 26
related knowledge regressions pass. Moving stable guard work to configuration
changes, useful learned representation search and matched native/GPU/upstream
performance remain active requirements.

Literal stateful JavaScript arithmetic now retains rounded Number intermediates
inside adjacent F32 expressions and fresh immutable arithmetic locals, keeping
exact bit boundaries and every source rounding point. The complete 60-test JS
suite passes; 772 new reference/Rust/JavaScript/Wasm outcomes preserve snapshots,
events and rollback. Six fresh-process pairs on each of two 244-weight neural
examples show 1.13–1.24× training throughput while prediction is mostly flat.
Tiny cases and earlier slower prototypes remain in the
[retained report](reports/rounded-f32-carriers-2026-10-17/README.md).
These shared-host diagnostics are not automatic planner evidence. Profitable
graph/representation selection, device training and the complete three-project
performance programme remain required.

Affine JavaScript record carriers now stay local through bounded helpers and
repeat/left/right/inclusive folds, preserving private owner handles, readonly
List sharing and simultaneous updates. Fresh literal initializers avoid a wrapper;
borrowed host-record initializers keep ordinary fold behavior. The standalone
package passes 61 tests and the new required CPU suite matches 1,251 complete
reference/Rust/JavaScript/Wasm outcomes with exact snapshots. Repeated neural
studies show roughly 1.20–1.32× prediction and 1.27–1.36× training throughput;
one earlier process regresses substantially and remains recorded. These are
shared-host diagnostics, not universal guarantees or automatic planner evidence.
See [scope, all cohorts and remaining work](reports/affine-record-carriers-2026-10-17/README.md).

Further private F32 storage experiments retain 36 fresh-process complete neural
comparisons and new exact-bit partition/bulk/worker controls. Numeric/tagged
buffers, typed integer/float views and shared scalar decodings all lose to the
published emitter on this workload, so none changes the default compiler or
physical capability set. The [negative study and replay auditor](reports/f32-storage-experiments-2026-10-17/README.md)
keep these results available for subsequent structure/staging and measured layout
work. Full graph/tape compilation, learned physical selection, device training and
the complete three-project programme remain open.
Full upstream parity, trained profitable representation choice and device training
remain required.

Bounded JavaScript helper expansion now also accepts direct checked owned
parameters without an already split argument, retaining callee-local List sharing
and ordinary recursive/oversized fallback. All 62 standalone tests pass. The new
mandatory history matches 388 reference/Rust/JavaScript/Wasm values/outcomes and
exact snapshots, while the native GPU host matches its results/final checkpoint
and one actual word dispatch. Two six-pair complete neural studies improve
prediction about 1.13–1.19×; training is mixed, including an adverse cadence in
study 1. [Source, all cohorts and replay evidence](reports/direct-owned-helpers-2026-10-17/README.md)
retain the setup/code-size costs and scope. General graph/tape compilation,
learned representation/goal selection, device training and the whole three-project
programme remain active requirements.

## Functionality first: prepared computation structure

The current priority is working capabilities, rather than further throughput
tuning or competitive benchmark cohorts. Frozen specialization now follows
closed `keep` values, selected Option/Result callbacks and successful `?`, with
bounded reference-call literal proposals and complete proof admission. Residual
collection receivers preserve their original numeric element types. Distinct
helper accounting permits reuse at the cap, and action-level construction rolls
back on exhausted optional expansion while retaining successful serving work.

The prepared Result/list regression checks the complete plan, changing weights,
JavaScript outcomes and exact snapshots. False evaluated defaults and altered
selected returns reject; a failed publication retains its prior artifact.
The real 232-node/244-parameter network now has a complete admitted 464-helper,
10,120-object plan. Generic immediate-step equations, explicit closed computation
lemmas and a finite aggregate capacity increase close the earlier proof-admission
failure. The exact standalone core passes 519 tests, the final producer suite
passes 91 tests, and native execution matches 24 complete outcomes with exact
checkpoints across native, JavaScript and Wasm. Both guarded/mutable-code
specialization histories pass 335 complete outcomes each, and all 63 standalone
JavaScript tests pass. The final corpus compiles all ten programs, exposes two
with alternatives and admits four laws, with zero default selections or
cross-program law reuse. See the [execution evidence](bench/functionality/prepared-network/README.md).
Working learned implementation/goal choices and device training remain required.
No new speed claim is made by this milestone.


V8-inspired exact expression sharing now also covers immutable numeric lists and
nested lists through ordinary source-bound database proofs. The required CPU
suite checks 354 complete reference/Rust/JavaScript/Wasm outcomes and exact
snapshots. A retained complete-call JavaScript study shows a modest held-out
7.5% gain for a 4,096-element map reused by two different folds; complete list
output is mostly flat and small controls include regressions. Automatic selection
still requires its existing evidence gates. Compact alpha-equivalent helper
proofs and syntactic signature reuse reduce redundant proof-authoring work.
The real full-network plan now passes ordinary complete admission; its producer
reproduction matches the retained plan byte for byte. Cross-target network
execution now passes; broader graph/tape compilation, useful learned choices,
device training and the full functionality programme remain required.


## Binary64 source differentiation

The shared source-AD transforms now support F32/F64 forward gradients, JVPs,
linearization and bounded reverse tapes. Scalar precision binds homogeneous
trainable shapes, generated helpers/constants and tape/adjoint fields, while
contexts remain untracked. Both modes reject unsupported proof-precondition
transport. The runnable F64 learner uses 64 coordinates, authored updates,
transaction constraints and portable restore; a forward trajectory uses finite
record coordinates. See [source AD](docs/differentiable-computation.md#binary64-precision)
and [reverse learning](docs/source-reverse-differentiation.md#binary64-source-learning).
F64 proofs/library generalization, broader source/contract support, device
training and the complete programme remain required. No speed claim follows.

## Resident source-gradient training

A 244-parameter 10->[6,6]->4 source learner now keeps coordinate-forward gradients,
ordered batch accumulation, Adam records and feedback on the GPU. Generic bounded
private lists and literal lazy list graph stages enable ordinary authored source;
no network/optimizer matcher or selection exception is added. Native/browser GPU
histories each make 44 actual dispatches, match ten complete CPU reads, and perform
no transfers during step calls. Browser Wasm and the initial JavaScript gradient
also match; independent reverse calculation checks every initial coordinate.
Validation includes empty/shorter/malformed batches, invalid configuration,
nonfinite gradients/state, exhausted counters and restart. See
[the consumer and remaining scope](docs/resident-source-training.md).
Existing prepared-graph/reverse-tape learning remains on CPU. Device reverse tapes,
binary64 arithmetic, wider graph/control/contract domains, useful learned choices
and full programme acceptance remain required; this milestone makes no speed claim.
