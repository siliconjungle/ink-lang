# Implementation status

Overview reviewed **12 October 2026** against the distribution and its independently
versioned packages. Ink is a working prototype. Execution, proof-based replacement
and measured performance have different coverage; the full design draft is wider
than all three. Package changes become distribution features only when their pins
are integrated here. Work being integrated is listed separately below.

Read [the philosophy and ambitions](docs/vision.md), [the design draft](docs/language-specification-draft.md),
[benchmark evidence](BENCHMARKS.md) and [production acceptance gates](PLAN.md).
Historical counts and milestone receipts are preserved in
[the previous status snapshot](docs/history/implementation-status-through-2026-10-11.md).

## Integrated composed execution work

[Engine39](reports/web-stack-engine-39-2026-10-11/REPORT.md) adds bounded,
source-derived collection facts across helper composition and target-specific
fresh-buffer/destination reuse. Existing caller capacity/disjointness contracts
remain trusted; no validation wrapper or new syntax is introduced. Runtime hosts
support saved-profile adaptive selection, explicit static execution and retained
pure GPU sessions. Broad target component costs and frozen calibration live in the
planner/knowledge packages, outside proof authority. Their heldout failures prevent
a default profitability claim. Broad comparisons still trail strong Rust controls;
measured gains and losses are preserved separately from correctness evidence.

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
JavaScript maintained results are recomputed. GPU floats follow WGSL and are not
promised to match CPU bits. Literal GPU scans and sorts are not a claim of
efficient parallel prefix/sorting algorithms.

## What the proof system can admit

| Admission path | Current capability | Important limit |
| --- | --- | --- |
| [Expression selection](docs/semantic-optimisation.md) | Typed laws compose through supported pure expressions, binders and exact helper definitions; applicability premises are checked locally | Execution support does not automatically grant logical correspondence for every primitive |
| [Pure action regions](docs/action-regions.md) | Eligible total expressions inside queries, changes and keeps can use the same checked selection boundary | Does not by itself replace an entire transaction |
| [Whole-action transitions](docs/action-transitions.md) | Complete transition equations preserve replies, logical roots, rollback, versions and ordered events; List values/count/u64 sum have fixed correspondence | Restricted u64-keyed, word/Boolean/record/Option/Result/List domain with supported nested calls/helpers; broader numbers, IDs, keeps and other operations need correspondence |
| [Physical representations](docs/database-representations.md) | Canonical layouts and cached-query implementations supply universal encoding, observation and invariant-preservation evidence for every source action | Restricted transition domain; literal physical-definition execution is currently Rust only |
| [Migration](docs/database-representations.md#runtime-migration) | Checked decode/encode or direct bridges between exact representations, switching at transaction boundaries | Explicit checked requests; not an autonomous live workload controller or a durability protocol |
| [Lifecycle selection](reports/incremental-maintenance-selection/README.md) | External measured choice accounts for checking, initialisation, compilation, action counts, teardown, memory and exact migration costs | Comparable provenance and complete required phases are necessary; replay rechecks the selected request/bridge. This is explicit offline selection |
| [General laws](docs/general-laws.md) | Abstract sorts/functions, checked interpretations and discharged assumptions support reusable mathematics | Unsupported/open obligations cannot grant closed program authority |

Current representation candidates retain caches across queries, aborted changes
and supported unrelated changes. [Fixed-key point-query maintenance](docs/point-query-delta.md)
now handles supported same-key remove/replace chains by delta, with logical
post-state refresh for unsupported changes. List values/count/u64 sum and measured
lifecycle selection are integrated. General incremental aggregates, exact-Int/keep
correspondence, other key domains and additional physical executors remain open.

The integrated expression interface now covers existing Buffer edits/observations,
ordered Map operations and owned stopping-loop accumulators. [215 ordinary database
laws](docs/owned-optimisation.md) use their fixed meanings without adding a new
source primitive or proof rule. [Earlier collection laws](docs/local-collection-laws.md)
remain available. This does not establish arbitrary heap algorithms or broaden
the separate stateful preservation domain.

Old aggregate certificates, bounded-cache and typed-storage-policy approval are
retired from default production builds. Historical reproduction requires the
explicit `legacy-optimisation-research` feature; it does not extend the current
small-core guarantee.

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
route choice plus explicit measured representation selection; general profitability
remains incomplete.

Repeated database-only proof batches have removed traversals and intermediate
results with compiler/runtime/lowering sources unchanged. Some selected variants
regress on measured workloads. Proof admission establishes semantic validity;
it does not establish faster execution. See [the evidence index](BENCHMARKS.md).

## Parallel execution and independent verdict

[Ordered parallel work, owned partitions, checked recursion and GPU scratch](docs/bend-inspired.md)
are integrated with executable-core V5. Native Rust uses bounded scoped workers;
other CPU paths preserve sequential values within each function. The browser
pipeline runtime can distribute independent pure groups across bounded Wasm/JS
workers. Browser and native GPU scratch
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
[trust scope and evidence](docs/bend-inspired.md).

## Work being integrated

These are active implementation/research lanes, not additional guarantees of the
currently pinned distribution. Consult their eventual integration receipts and
contracts before relying on them.

| Lane | Concrete work | Remaining gate |
| --- | --- | --- |
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
