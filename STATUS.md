# Implementation status

Overview reviewed **11 October 2026** against the distribution and its independently
versioned packages. Ink is a working prototype. Execution, proof-based replacement
and measured performance have different coverage; the full design draft is wider
than all three. Package changes become distribution features only when their pins
are integrated here. Work being integrated is listed separately below.

Read [the philosophy and ambitions](docs/vision.md), [the design draft](docs/language-specification-draft.md),
[benchmark evidence](BENCHMARKS.md) and [production acceptance gates](PLAN.md).
Historical counts and milestone receipts are preserved in
[the previous status snapshot](docs/history/implementation-status-through-2026-10-11.md).

## Universal optimisation boundaries

Early termination, owned-buffer reuse and bounded helper unfolding are proposed
by installed database producers and checked against exact source definitions.
Backends emit `fold_until` and explicit owned operations literally. `ink-abi`
owns packed layouts and one native/browser decision contract; `ink-native-support`
owns emitted value/ownership primitives. Shared source analysis belongs in core.
Legacy optimisation APIs and compatibility features are removed.

The pinned knowledge snapshot contains 3,460 entries, including eight early-exit
and 28 owned-transform laws. Counts describe this snapshot, not proof coverage.
Saved profiles guide eligible execution; runtime does not run profitability probes.
Historical measurements remain evidence of their recorded revisions, including
losing candidates. See [the operation and trust boundaries](docs/universal-optimisation.md).

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
JavaScript maintained results are recomputed. F32 programs use executable-core V7:
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
| [Migration](docs/database-representations.md#runtime-migration) | Checked decode/encode or direct bridges between exact representations, switching at transaction boundaries | Explicit checked requests; not an autonomous live workload controller or a durability protocol |
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
use executable-core V5, with general control/owned transforms in V6 and F32
arithmetic in V7. Native Rust uses bounded scoped workers;
other CPU paths preserve sequential values. Browser and native GPU scratch
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
| Profitability and adaptation | Diagnosis of composed-helper regressions, target component costs and saved-profile/static backend policies | Independent evaluation, full selection/setup/transfer costs and stable bounded decisions without repeating effectful actions |

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
