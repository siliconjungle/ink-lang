# Implementation status

Overview reviewed **13 October 2026** against the distribution and its independently
versioned packages. Ink is a working prototype. Execution, proof-based replacement
and measured performance have different coverage; the full design draft is wider
than all three. Package changes become distribution features only when their pins
are integrated here. Work being integrated is listed separately below.

Read [the philosophy and ambitions](docs/vision.md), [the design draft](docs/language-specification-draft.md),
[benchmark evidence](BENCHMARKS.md) and [production acceptance gates](PLAN.md).
Historical counts and milestone receipts are preserved in
[the previous status snapshot](docs/history/implementation-status-through-2026-10-11.md).

## Recent integrated capabilities

[Sequential callback preparation](docs/prepared-loop-callbacks.md) carries sealed
JavaScript captures through loops and strict expressions while iteration inputs
remain dynamic. The 147-case regression runs 1,510 prepared calls under each F32
carrier. Held-out large repeated membership/group/table work improves 165×/232×/23×;
small cases can regress, retained memory grows, and neural/text workloads retain
substantial gaps to faster controls. [All samples and validation](reports/prepared-loops-2026-10-16/README.md)
are retained. Source reverse AD, general mutable-session staging and full upstream
fidelity/performance remain open.

[Prepared binary64 text geometry](docs/prepared-text.md) ports Pretext's simple
counter and line-range walkers into ordinary Ink source. Separate count/height
and complete geometry paths match 232 upstream oracle cases; an additional
182-observation history checks compiled targets, cursor continuation, edits,
rollback and restore. Shape/budget validation rejects unsupported complex kinds.
The retained diagnostic still shows a substantial gap to Pretext's direct loop.
Full complex layout, segmentation/measurement preparation and speed parity remain
open; this does not complete the three-project programme.

[Explicit binary64](docs/binary64.md) adds suffixed literals, typed computation,
exact state/snapshots and shared native/JavaScript transport. The 65-case history
and a separate frozen-state history compare complete CPU/Wasm/native-GPU-host
observations, with an actual F32 dispatch in each. All 420 isolated core checks,
independent package checks and existing learning regressions pass. F64 proof
terms fail closed; source AD/neural libraries remain F32, and binary64 device
execution retains CPU fallback. This is Pretext precision groundwork; full text
behavior, general source reverse AD and broad performance parity remain open.

[Whole-computation differentiation](docs/differentiable-computation.md) adds source
`gradient`, `jvp` and `linearize`, including explicit piecewise policies, structured
numeric data and bounded authored rollouts. Existing learning contracts enforce
legal committed outcomes. Generated computation has independent numerical/analytic
oracles and complete CPU/Wasm/eligible-GPU coverage; the AD translation remains
trusted. [Context preparation measurements](bench/differentiable-preparation/README.md)
retain the initial small-input losses. [Batched propagation](bench/batched-differentiation/README.md)
now executes all directions through one primal pass, improving the retained large
JavaScript gradient 2.09×. Two exact-context database equations compare batched and
separate directions on nonlinear kernels; a handwritten derivative remains about
9× faster. Generic JavaScript scalar-record and F32-carrier bookkeeping also applies
to ordinary source. These measurements do not establish broad neural performance.

[Source-bound call facts](docs/interprocedural-word-facts.md) extend offline
unsigned analysis through bounded acyclic helper definitions. Two new laws replay
ordinary source normalization and bit-vector evidence; changed callees invalidate
summaries even if source metadata is rehashed.

[Explicit adaptive learning](docs/adaptive-learning.md) adds checked `trainable
state`, `adaptive fn` / `adaptive query` and `learn change` declarations, offline
training traces with portable model snapshots, and explicit online learning events.
The contextual example fits interacting inputs with an authored update rule;
automatic gradients now extend through the admitted pure computation. Authored
reverse graphs and 244-parameter ReGLU models are available through
[`std:neural` and companion libraries](docs/reverse-learning.md), including
explicit gradient policies, F32 Adam, frame backtracking and exact offline resume.
A [cooperative continuous service](docs/continuous-learning.md) now adds generic
queued sessions, serving/candidate versions and durable progress, including offline
CLI bootstrap. General source reverse AD, frozen arithmetic/graph specialization, trained implementation selection and parallel/device training
remain open. [Adaptive build-stage packaging](docs/trained-builds.md) now supports
complete trained startup and continued learning across targets. See the
[phase and lifecycle requirements](docs/learning-lifecycle.md). Learning
capabilities, rollback and exact snapshots are validated across CPU targets and
GPU-host execution, with a separate eligible device call.

[Numeric table preparation](docs/prepared-numeric-tables.md) proposes sharing
invariant table construction across a map with ordinary whole-function proofs.
The measured large case improves substantially while a small case regresses;
[retained evidence](bench/prepared-tables/README.md) keeps both visible. This is
an initial preparation mechanism rather than full Pretext text-layout parity.

[Conditional unsigned facts](docs/conditional-word-facts.md) extend the existing
word analyser with excluded values and comparisons between ranges. Offline
acquisition replays whole-function proofs and publishes four new reusable laws
through the ordinary database catalogue. Independent value oracles and compiled
reference/Rust/JS/Wasm tests include an eligible GPU call. The
[designed-workload report](reports/conditional-facts-2026-10-15/README.md) retains
small gains, distribution sensitivity and unchanged controls. General backward
requirements, call summaries and floating-point inference remain open.

[Packed bit-state algorithms](docs/bit-automata.md) add ordinary
`std:bit_automata` source, eight checked scalar component laws and independent
CPU/Wasm/eligible-GPU conformance. Literal-count experiments show search-focused
gains with resident data; [the report](reports/handwired-packed-circuits-2026-10-15/README.md)
retains native ownership losses, small-input controls and first-call limitations.
Allocation-free JavaScript UTF-8 reads and native lexical primitive borrowing are
integrated separately from the authored matcher. Complete GPU bundles now carry
the distribution planner asset in their child bundles as well as at the root.
The [broader investigation](docs/chenglou-optimisation-programme.md) includes
Freerange and Pretext; their mechanisms beyond these foundations remain open.

[Ordered query expressions](docs/query-expressions.md) add typed `list<T>{...}`
and `exists{...}` with `from`, `where`, `join` and `select`. They preserve list
order and duplicates, and elaborate to existing checked operations. The first
milestone includes generic/nested expressions, action input ordering and rollback,
cross-target conformance, and comparisons with ordinary pipelines and handwritten
loops. It adds no privileged query optimization or external-storage backend;
the [full implementation programme](docs/optimisation-language-programme.md)
keeps unordered collections and broader relational operators in scope.

[Approximation contracts](docs/approximation-contracts.md) lower explicit integer
absolute/rational-relative and finite-f32 ULP bounds to ordinary proof obligations.
Twelve error/finite-probability laws and three discovery templates live in the
database; the twelve laws also pass independent Lean replay. Pure JS/Rust
calibration validates inexact refinements against each checked plan's reference
execution. Maintained-fold selection now requires lifecycle evidence or a validated
work model; the former asymptotic-only exception is removed. These additions do
not certify transcendental real-error bounds or the entire compiler.

[Database planning](docs/database-planning.md) recursively composes independently
checked transformation layers and physical strategies. [Observed usage](docs/proved-usage-planning.md)
guides offline exploration and measured lifecycle selection; resource plans bind
final-use releases and admission credits, with runtime checks for future overload.
[Database-authored algorithms](docs/database-executable-extensions.md) can introduce
checked typed helpers and scratch types before proving their replacement.
[Source specifications](docs/source-contracts.md) create implementation, caller and
invariant obligations rather than trusted annotations. V9 binds bulk buffer ranges;
V10 binds source contracts. General dependent types remain outside this scope.

The [proof-growth study](docs/proof-growth-epoch3.md) records reusable law growth,
complete-call costs and regressions with each compiler held fixed. Its deliberately
chosen kernels are not an unseen-program generalisation estimate. The standalone
[MIT browser editor](https://github.com/siliconjungle/ink-environment) compiles and runs
single-file programs locally; its external knowledge-search and import limits are
separate from the distribution compiler's capabilities.

Planning is now observable end to end. Semantic search records near misses
(matched laws the checker rejected, with the failed premise as stated and as
instantiated), compiled-planning receipts carry a stage funnel and per-recipe
time, and `ink_planner.corpus` evaluates installed knowledge on the frozen
[planning corpus](bench/planning-corpus/README.md). Ordinary defaults now
acquire their own bounded synthetic probes. With no supplied inputs, they
select an alternative for 6 of the 10 held-out programs. Over all ten, the
held-out geomean is 1.61×, with 48 robust gains and 2 robust losses (both at
size 0) ([results](bench/planning-corpus/results-defaults-2026-10-14.md)).
[Structure laws](docs/structure-laws.md) state early exit for absorbing
accumulators and sort erasure before commuting fold steps once. They reach
programs through plan-time instances that `knowledge-check` admits per module,
and are admitted in 5 of the 10 held-out programs. Measured selection requires
its bootstrap interval to lie below the baseline before switching.
[Knowledge health](docs/knowledge-health.md) and
[action algebra](docs/action-algebra.md) reports, the latter with checked
commutation certificates for disjoint actions, are diagnostics without
selection authority.

With paired timings acquired on development inputs only, measured selection
now switches 5 of the 10 held-out programs. Against the previous unplanned
output, the held-out geomean is 1.73× (73 robust gains, 6 robust losses in
240 cells; [results](bench/planning-corpus/results-measured-2026-10-13.md)).
Several changes contribute:

- **Representation refusal.** The core refuses representation steps for
  modules without state, which were untimeable candidates.
- **[Order analysis](docs/structure-laws.md#order-analysis).** A kernel case
  analysis over weak orderings proves maximum, minimum and clamp steps.
- **[Guarded laws](docs/guarded-laws.md).** Data-dependent premises become
  runtime tests. They are checked but not yet selected on this corpus.
- **[In-place appends](docs/in-place-reuse.md).** The JavaScript and C
  backends reuse storage, from a unique-ownership analysis.

[Selection without timings](planner/docs/work-model.md) validated for counted
JavaScript iterations and was rejected for reference-interpreter fuel.
[Equality saturation and modular planning](planner/docs/search-modes.md) are
opt-in search modes. Two-key table lemmas certify that removals commute even
for equal keys.

[Sorted tables](docs/action-algebra.md#conditional-certificates-on-sorted-tables)
are a checked inductive invariant of the transition checker. Replacements may
assume every table is strictly sorted once the original actions are proved to
preserve it, and snapshot decoding already enforces it on restore. Under it,
writes, removals and lookups of different keys are certified to commute when
their keys differ (`put`/`put`, `erase`/`put`, `get`/`put`). This uses 26 general
row laws in `state-calculus`. Only word keys have laws so far, and nothing yet
consumes these certificates.

## Universal optimisation boundaries

Early termination, owned-buffer reuse and bounded helper unfolding are proposed
by installed database producers and checked against exact source definitions.
Backends emit `fold_until` and explicit owned operations literally. `ink-abi`
owns packed layouts and one native/browser decision contract; `ink-native-support`
owns emitted value/ownership primitives. Shared source analysis belongs in core.
Legacy optimisation APIs and compatibility features are removed.

The historical universal-optimisation snapshot contained 6,726 entries, including
eight early-exit and 28 owned-transform laws. That count belongs to its recorded
revision; the current catalogue has grown substantially. Exact current membership
is bound by `knowledge/store/snapshot.json`, not by this historical count.
Saved profiles guide eligible execution; runtime does not run profitability probes.
Historical measurements remain evidence of their recorded revisions, including
losing candidates. See [the operation and trust boundaries](docs/universal-optimisation.md).

Knowledge now also supplies universally checked two/four-row packed tables,
profile-specific dynamic-key indexes, Boolean any/all insertion deltas with refresh
fallbacks, and pure bulk collection construction laws. Measured lifecycle selection
retains losing candidates without making them defaults. Overlapping proof admission,
checked search-hint caching and incremental Merkle/index publication extend compiler
and discovery work. See [the exact scope and measurements](docs/storage-bulk-incremental.md).

[Mixed adaptive placement](reports/adaptive-placement-2026-10-12/REPORT.md) is
implemented for compiled pure browser pipelines: bounded planner partition/target
search, resident GPU groups, native JavaScript bridges, Wasm/JS workers, dependency
joins, simultaneous feedback, measured cold startup and CPU fallback. Offline
training and frozen complete-request holdouts are separate from execution.
Profiles remain opt-in and workload-bound; this closes the implementation gate
for this pipeline feature, while broad competitive execution remains open.

## Executable language and targets

| Area | Available now | Boundary |
| --- | --- | --- |
| Pure functions | Words, i32/f32, vectors, records, lists, higher-order collection operations, bounded loops, owned buffers/maps, guarded self recursion and ordered parallel maps | Supported types and resource limits are documented in [local collections](docs/local-collections.md) and [target parity](docs/lowering-parity.md) |
| State | Tables, queries, atomic changes, nested calls, Result propagation, rollback, ordered events and maintained results | Sequential source semantics; numerical state is supported, with explicit float-bit and comparison rules |
| CPU execution | Reference evaluator and literal C, Rust, JavaScript, C-Wasm and Rust-Wasm paths | Complete C uses shared Rust primitives; hosts/toolchains remain trusted |
| GPU execution | Eligible pure scalar/array work through browser WebGPU and native wgpu, mixed with host execution | Private scalar scratch buffers up to 64 cells and bounded resident graph feedback are supported; transactions, growing feedback and unsupported values stay on CPU |
| Persistence | Portable logical snapshots and durable file/IndexedDB hosts, outbox acknowledgements and bounded retry receipts | Declared single-writer/storage guarantees; at-least-once delivery requires receiver deduplication |
| Usability | Source modules, embedded helpers, relocatable installation, diagnostics and plan inspection | A small library and evolving diagnostics; the design reference includes proposed syntax |

[Numerical state](docs/numerical-state.md), [GPU compute](docs/gpu-compute.md),
[durable hosts](docs/durable-host.md), [modules](docs/modules.md) and
[installation](docs/installation.md) give the exact contracts.
Ordinary JavaScript retains deterministic scalar keeps until actual checked table
dependencies change, with rollback and restore handling. Composite keeps retain
their ownership path. Checked standalone representations can additionally maintain
admitted fixed-key and aggregate candidates through proved update algorithms. F32 programs use executable-core V8:
arithmetic rounds to binary32 and produces canonical NaNs; transport and negation
preserve payload bits. Packed GPU code uses integer lanes for this contract. Literal GPU scans and sorts are not a claim of
efficient parallel prefix/sorting algorithms.

## What the proof system can admit

| Admission path | Current capability | Important limit |
| --- | --- | --- |
| [Expression selection](docs/semantic-optimisation.md) | Typed laws compose through supported pure expressions, binders and exact helper definitions; applicability premises are checked locally | Execution support does not automatically grant logical correspondence for every primitive |
| [Pure action regions](docs/action-regions.md) | Eligible total expressions inside queries, changes and keeps can use the same checked selection boundary | Does not by itself replace an entire transaction |
| [Whole-action transitions](docs/action-transitions.md) | Complete transition equations preserve replies, logical roots, rollback, versions and ordered events; List values/count/u64 sum have fixed correspondence | Admitted source projection includes signed/float/exact-integer values, ordered keys, vectors and supported pure helpers; unsupported keys/operators fail closed |
| [Physical representations](docs/database-representations.md) | Canonical layouts and cached-query implementations supply universal encoding, observation and invariant-preservation evidence for every source action | Admitted scalar/collection/vector/pure-closure domains; standalone execution on C, Rust, JavaScript, both Wasm and GPU host lanes. Recursive state stays on the host |
| [Migration](docs/database-representations.md#compiled-execution-and-migration) | Portable checkpoint/restore switches between exact compiled variants at transaction boundaries; universal direct-bridge proofs remain checkable | Direct bridge emission is not implemented; publication follows successful restore. No autonomous live controller |
| [Lifecycle selection](reports/incremental-maintenance-selection/README.md) | External measured choice accounts for checking, initialisation, compilation, action counts, teardown, memory and exact migration costs | Comparable provenance and complete required phases are necessary; replay rechecks the selected request/bridge. This is explicit offline selection |
| [General laws](docs/general-laws.md) | Abstract sorts/functions, checked interpretations and discharged assumptions support reusable mathematics | Unsupported/open obligations cannot grant closed program authority |

Current representation candidates retain caches across queries, aborted changes
and supported unrelated changes. [Fixed-key point-query maintenance](docs/point-query-delta.md)
now handles supported same-key remove/replace chains by delta, with logical
post-state refresh for unsupported changes. List values/count/u64 sum and measured
lifecycle selection are integrated. General incremental algorithms and automatic live strategy selection remain open;
source correspondence is bounded by the documented admitted domains.

The integrated expression interface now covers existing Buffer edits/observations,
ordered Map operations and owned stopping-loop accumulators. [215 ordinary database
laws](docs/owned-optimisation.md) use their fixed meanings without adding a new
source primitive or proof rule. [Earlier collection laws](docs/local-collection-laws.md)
remain available. This does not establish arbitrary heap algorithms or broaden
the separate stateful preservation domain.

Old aggregate certificates, bounded caches, typed storage policies, source
maintenance evaluators and historical scalar loaders are removed. Current
representation admission uses the canonical database proof interface.


## Enforced execution coverage

The supported contract covers complete C, Rust, JavaScript and both Wasm paths,
with eligible exact GPU kernels and explicit host execution for transactions,
recursive physical state, arbitrary-size integers and general dynamic maps.
Required-GPU mode fails when device execution is unavailable; host fallback is
never counted as a device dispatch. Unrestricted device coverage still has gaps,
reported by the default all-GPU audit. The inventory and 19 mandatory suites are
in [the parity contract](docs/lowering-parity.md) and
[the integration evidence](reports/enforced-feature-parity-2026-10-11/README.md).
Passing this gate does not prove compiler correctness or unrestricted GPU coverage.

Ordinary representation programs carry no proof bundle or stateful interpreter.
Argument types/shapes/ranges are a caller obligation; malformed data is unsafe.
Checkpoint integrity and transaction/version rules remain explicit boundaries.
[The latest published compiled-state scaling experiment](reports/representation-scaling/standalone-main-2026-10-11/README.md)
shows competitive cached reads and large linked-list update costs. Its source,
package revisions and workload boundaries determine the timing claim.

## Knowledge, selection and replay

The canonical store contains immutable definitions, theorems, rewrite laws,
implementations, representations and bridges with exact dependencies and typed
interfaces. Content-addressed JSON files and authenticated snapshots are
canonical; SQLite is a disposable discovery index. The independently pinned
planner searches and composes proposals, while the core checks supplied proof
closures and applicability evidence. A failed proposal cannot gain authority
from a low estimated cost.

Frozen selections bind the original program and selected evidence. They replay
without the producer, SQLite or a current database. Checked selections retain
the original checkpoint identity; a raw modified program cannot claim it.
Performance observations are separate and require matching target/workload
provenance. The planner supports bounded structural selection and measured pure
route choice plus explicit measured representation selection. [Database implementation selection](docs/state-choice.md) compares supplied entry IDs
through existing proof-package protocols. Ordinary emission is an empty selection
package in the database, without a privileged compiler branch. Replay binds the
source/compiler/target and exact pinned candidate. Supplied lifetime and portable
migration costs enter external ranking; missing comparable evidence retains the
supplied baseline. General profitability remains incomplete. Active physical-representation examples are re-authored and universally checked against current source identities. Ordinary action blocks preserve their earlier checked identities; mutable assignments use the V8 continuation machinery. Archived measurements retain their original exact packages.

Repeated database-only proof batches have removed traversals and intermediate
results with compiler/runtime/lowering sources unchanged. Some selected variants
regress on measured workloads. Proof admission establishes semantic validity;
it does not establish faster execution. See [the evidence index](BENCHMARKS.md).

## Parallel execution and independent verdict

[Ordered parallel work, owned partitions, checked recursion and GPU scratch](docs/parallel-execution.md)
use executable-core V5, with general control/owned transforms in V6 and F32
arithmetic in V7 and generic language additions in V8. Complete native C/Rust use bounded workers; JavaScript and both Wasm paths
use host workers with ordered results. Browser entry points are asynchronous
and require cross-origin isolation; small or nested work can remain sequential. Browser and native GPU scratch
support bounded split/rejoin and push within 64 elements; resident graph feedback
preserves capacity and simultaneous assignments. Unsupported cases retain
compiled CPU fallback. Guarded self
recursion is checked; tail calls are iterative while non-tail calls retain host
stack limits. Raw native timing samples record workload-specific gains, not a
promise that every callback benefits.

The optional `check-boolean-verdict` command runs Ink's existing check and Lean
4.19.0 on exact input bytes. Its separate Boolean equality calculus has proved
soundness; its source translator and the rest of the compiler remain unverified.
It grants no additional production optimisation authority. See the
[trust scope and evidence](docs/parallel-execution.md).

## Work being integrated


These are active implementation/research lanes, not additional guarantees of the
currently pinned distribution. Consult their eventual integration receipts and
contracts before relying on them.

| Lane | Concrete work | Remaining gate |
| --- | --- | --- |
| [General reusable machinery](docs/general-machinery-plan.md) | Checked value predicates, abstract record interfaces, source-bound facts, ordinary database proof closures and actual-prefix checks for direct calls, captured results and supported callback domains, plus generic arena/chunked-sequence groundwork using shared owned storage and precise loop carriers | Dependent callback/loop domains, interchangeable/owned interfaces, general storage, authored termination, local frame/loop reasoning, compositional maintenance, performance acceptance and integrated publication |
| Incremental maintenance costs | Further attribution of plan copying, complete-state transport and validation; broader read/write and lifetime studies | Demonstrate repeatable complete-session gains before generalising cache control; measured small fixtures favour direct lookup |
| Physical execution | Conservative facts through composed functions, less intermediate allocation/copying and prepared resources | Correctness checks plus complete-call gains on independently varied sizes, shapes and distributions |
| Broader profitability | Generalise completed saved-profile mixed placement to unfamiliar workloads and representation lifecycles | Independent program/distribution evaluation and repeatable complete-session gains; no speculative effect execution |

## Ambition and assurance

The next performance goal is reliable improvement across unfamiliar programs:
general knowledge that removes unnecessary work, lowerers that retain that saving,
and selection that avoids known losing alternatives. Stateful gains must preserve
future actions, rollback, replies, events and restoration. Read/write frequencies
and session lifetime can guide caching; exact changes establish cache validity.

The Rust checker, fixed source projection, codecs, literal target emitters,
host adapters, toolchains and device drivers remain trusted implementations.
Adversarial tests and generated conformance provide evidence within their recorded
scope. Lean research proves specified mathematical models or separate calculi;
it is not an end-to-end verification of Ink or generated machine code.

Editor support and schema evolution are outside the current acceptance scope.
Installation, debugging, crash recovery, broader proof coverage and competitive
complete execution remain in scope. [PLAN.md](PLAN.md) retains the full gates.

## Physical table ownership

The first ownership improvement detaches shared inductive spine edges without
allocating empty replacement nodes during release. Generated native storage
passes a 100000-node shared-copy/release test with zero release allocations and
an exact free count on a 1 MiB stack. The independently checked Lean ownership
model states its reference-count/acyclicity assumptions. C, Rust, both Wasm
and native GPU use this storage host; JavaScript/browser GPU retain GC storage.
Cross-target observable parity remains checked. See the
[matched measurements and artifacts](reports/table-ownership-2026-10-11/README.md).

In that ownership-only experiment, Rust write-heavy cells improved about 1.7–2×;
the 4000-row write-only linked-list cell still lost by over 900× to a maintained
handwritten tree. The indexed candidate added below supersedes the earlier
statement that indexed physical tables remain unfinished. This allocation fix does not change linear update traversal,
prove generated compiler correctness or extend GPU device coverage.

Generic inverse journals now remove whole-table copying from ordinary C hosts
and JavaScript changes. The matched 4000-row point workload measures native C
queries/writes about 14.9×/14.5× faster, C-Wasm about 9.6×/14.1×, and JavaScript
writes about 381× faster; JS queries are approximately unchanged. Rust already
used journals. These are within-lane steady-state results, not cross-language
rankings or GPU-device claims. Existing cached linked-list writes remain costly:
ordinary Rust wins write-heavy mixes, while cached aggregates win read-only work.
See [raw samples, generated code and limits](reports/indexed-source-choice-2026-10-12/README.md).

## Indexed cached tables and incremental durability

The database now admits an ordered sequence-tree representation combining key
range pruning with filtered u64 sum/count. Fifteen whole-action obligations cover
initialisation, snapshots, replies/errors/events/versions and both preserved
relations. Arbitrary row order and duplicate keys remain in the mathematical
domain. Source-oracle parity passes all CPU and GPU-host representation lanes.
Database field frame/dependency and grouped-update laws are also available.

Durable operations now use retained journals or immutable roots and a checksummed
append log between periodic checkpoints. New query IDs persist receipts only.
Native/JavaScript process-death recovery, both Wasm paths and IndexedDB browser
continuation pass. Generic observer demand projection avoids logical flattening
on each representation call. Existing measured selection remains external.
See [scope, boundaries and artifacts](docs/indexed-aggregate-durable.md).

## Generic language foundations

[Bounded surface and value additions](docs/generic-language-foundations.md) cover
ordinary pure/action value consistency, lazy conditionals, list literals, exact
counts, fixed word operations, generics/aliases/constants, payload enums/matching,
finite local iteration, fixed arrays and pure nonescaping callbacks. Fallible
pre/postcondition validation uses ordinary Result errors and transaction rollback.
External theorem authoring checks canonical evidence through the existing kernel.
Exact integer arithmetic/count/sum now have executable semantic correspondence.

Generic sets, grouping, joins, partition mapping and checked division are external
Ink definitions. Scoped native/JavaScript buffer partitions share disjoint ranges
and rejoin adjacent ranges without element copies; growth detaches before overlap.
Generated ownership support lives in ink-native-support, independent of reference
execution. Clone counters/backing identity and compiled conformance validate this
mechanism; complete-workload timing improvements are not claimed here.
Knowledge supplies 247 finite-list laws and three authored exact-integer laws.
The compiler's JavaScript fold shortcut is removed. C/Rust/JavaScript/both Wasm
conformance is mandatory; actual eligible GPU dispatch and compiled fallback retain
the explicit device capability boundary. This does not close compact numerical
carriers, packed Bytes, new borrowing syntax, static refinements or the full design
draft. The scope document records the exact admission and resource limits.

## Bulk buffer workload foundations

[General owned range operations](docs/bulk-buffer-workloads.md) bind executable
core V9 without extending source grammar. Clipped range fill and overlapping
snapshot copy execute literally on all five CPU targets and GPU hosts, with
bounded partition writes and native allocation reuse. Knowledge supplies ordinary
voxel box painting, run-length/packed-word codecs and ECS column movement/gathering,
plus 48 checked laws; the existing planner selects admitted work elimination.
Cross-target observations include malformed inputs, rollback and snapshots, and
one real eligible wgpu numeric dispatch. Native workload measurements improve over
scalar Ink loops but remain workload-bound and often lose to handwritten Rust.
These foundations do not provide a complete sparse voxel engine, archetype ECS,
byte ABI, region scheduler or device bulk-range executor.

Competitive workload evidence now compares unit-face extraction with block-mesh,
a homogeneous dense component update with Flecs (including cached queries and
bulk creation), and word codecs with LZ4/Zstd. General final-use movement removes
Rust copies without changing syntax; voxel traversal and adaptive raw/RLE formats
remain ordinary knowledge libraries. Results establish specific kernel gaps and
improvements, not full-engine competitiveness. See docs/competitive-workloads.md.

### Source contracts and refinement

Implemented: `spec fn/query/change`, static `requires`/`ensures`, `before`,
committed-state `invariant`, private value state and assignment, generic/callback
specifications, named implementations, finite multiset equality and uniqueness
predicates, and normal-return commits for non-Result changes. Every implementation
and caller is checked. Canonical database laws and state theorems supply external
proofs; the planner discovers proof-carrying contract refinements. Public checked
hosts enforce preconditions and reject invariant-violating snapshots.

See [source contracts](docs/source-contracts.md) for syntax, proof authoring,
trusted boundaries, CPU/GPU coverage and the admitted state-proof domain.

JSON tooling now includes the ordinary `std:json` knowledge library, six checked laws, exact/fallible JSON codecs, generic schema-bound binary transport, borrowed validation and raw binary pure calls across native/JavaScript/both-Wasm hosts. Recursive JSON state/events/checkpoints share CPU parity; dynamic JSON remains host-only. See `docs/json-and-portable-values.md` for number, schema, resource and trust contracts.

## Opt-in adaptive state host

[Recent-window adaptive execution](docs/adaptive-state.md) adds offline checked
JavaScript bundles, empirical cost profiles, shared native/Wasm decision policy,
bounded usage/latency recording and serialized checkpoint/restore switching.
Correctness admission stays offline; no speculative state calls or runtime fitting.
Sustained savings must cover migration, memory, pause and residence limits. Unknown
workloads retain the current variant. The report retains both gains and overheads:
this is opt-in, not an automatic default or a general performance guarantee.

Optional access diagnostics now expose bounded locality, size, scan and invalidation
summaries through the shared Rust/Wasm ABI. Independent compiled collections can
adapt separately; explicit native/JavaScript JSON read views grow member indexes
incrementally. A fixed state host can disable recording entirely. Offline lifecycle
replay separates the best fixed choice, migration-charged hindsight and actual host
execution. The [measurement report](reports/adaptive-learning-2026-10-14/README.md)
records gains from local adaptation and wide-object JSON lookup, plus losses from
cheap operations and overly responsive switching. Defaults and proof authority are
unchanged; none of this introduces AI, inferred state partitioning or automatic
JSON source rewrites.

[Authored reward learning](docs/policy-learning.md) adds generic categorical policy
gradients and delayed trajectory returns. The example combines whole-context source
AD, constrained updates, versioned pending feedback and exact optimizer resume.
Goals and invariants remain application-defined; no product objective is built in.
This does not close frozen arithmetic/graph specialization, off-policy or device training, or broad
Handwired/Pretext/Freerange performance and fidelity requirements.


[Immutable deployment state](docs/frozen-state.md) and explicit build-stage
`--freeze` / `--freeze-roots` now bind trained rows in a new checked source,
withdraw writers/callers and preserve complete logical checkpoint payloads.
Rust/JavaScript/Wasm restore rejects changed fixed rows, including raw F32 bits.
Partial freezing retains other learning and application actions. Mandatory artifact
verification replays the restriction, including against rehashed tampering.
The transition model derives fixed-value equalities for ordinary proof consumers;
automatic neural/arithmetic specialization and measured speed gains remain open.


[Structured preparation](docs/structured-preparation.md) now reuses immutable
composite keeps through checked root dependencies on compiled CPU hosts. A prepared
neural architecture remains valid through mutable optimizer updates; private data,
rollback and exact restore are validated across targets. Held-out JavaScript
prediction improves 3.45× in the retained study. Selected structured observations
also improve, while cold setup, frequent invalidation, training-only turns and
retained memory can lose. No automatic retention profitability rule or broad
native/device speed conclusion follows. The independent core package now has a
private-checkout/private-target validation path, avoiding shared-build evidence
contamination. General staging/specialization, source reverse AD and the full
Handwired/Pretext/Freerange requirements remain open.


[Prepared value-state defaults](docs/prepared-initializers.md) now compose explicit
state-independent keeps with mutable/trainable cells, without another keyword.
Bounded transitive dependency checks, hygienic scopes and derived interface reads
preserve source contracts. The complete staged neural/default histories match all
CPU targets and GPU-host execution; separate numeric calls dispatch on GPU.
[Measured JavaScript lifecycles](reports/prepared-initializers-2026-10-16/README.md)
show a further 1.19× prediction gain over structured keeps, with slightly slower
cold prediction and higher observed heap use. Private standalone core validation,
exact training replay and frozen-source composition strengthen specific evidence.
Automatic stage selection, native performance ranking, source reverse AD,
graph/arithmetic specialization, F64/Pretext fidelity and upstream parity remain open.


[Pure helper preparation](docs/prepared-helpers.md) now retains stable checks and
readonly work through bounded, lazily created JavaScript helper calls. Graph-bound
prediction/derivative tokens validate topology once while changing weights/context
still compute fresh values; source errors, forged records, ownership and fallback
are checked. All 48 standalone JavaScript and 23 integration tests passed locally.
The [isolated-process study](reports/prepared-helpers-2026-10-16/README.md) retains
1.11× / 1.025× heldout gains, ordinary-call/setup losses and faster Handwired/dense
controls. Stateful training does not silently adopt this pure-call lane. Broader
specialization, device/native preparation and the full programme remain open.
