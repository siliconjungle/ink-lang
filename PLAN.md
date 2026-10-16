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
generalize capture abstraction, share repeated helper code/prefix
lemmas to reduce the measured code/first-binding costs, and extend larger
graph/tape domains. Warm lifecycle measurements now exist for 32/128 operations;
short-lived and broader upstream workloads still require acceptance evidence.
Device training and the broader upstream-parity programme remain required work.
