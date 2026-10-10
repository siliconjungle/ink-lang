# Database-defined representations and migrations

Ink source syntax is unchanged. The default compiler no longer admits aggregate
certificates, bounded-total caches or typed storage policies as optimisation
authority. `representation::check` admits immutable canonical database entries
against the fixed transition projection of the actual source module. The
historical paths are available only with `legacy-optimisation-research`, an
explicit experimental feature that restores their disclosed historical trust.
It is not part of the production small-core guarantee.

## Contract

A representation entry supplies arbitrary total first-order definitions for its
physical state, logical-to-physical encoding, decoding, invariant relations, and
execution/observation/next-state functions for **every** source action. Relations
are equations over physical and logical state, not compiler-owned cache schemas.
The core derives the following universal obligations using the existing general
equality checker:

- Encoding establishes every relation for every logical state.
- Related physical state decodes to that exact logical state.
- Every action's observed result equals the fixed original source transition,
  for every related state, version and argument. The observation includes the
  reply, committed flag, version, logical post-state and ordered staged events;
  host failure has its original logical state and version.
- Every action preserves every relation with the original logical post-state.

Exact source identity, action coverage, fixed source definitions, derived
interfaces and complete authenticated dependencies are checked before sealing.
Assumptions and abstract symbols cannot discharge closed obligations. The
content hash and Merkle membership authenticate bytes; they do not prove their
meaning. SQLite remains a disposable index. The core has no producer names,
layout whitelist, cache recogniser or profitability test in this admission path.

`knowledge/producers/representations.py` is an untrusted authoring example. It
publishes two different physical tuple definitions, a direct migration, and
optionally a maintained parameterless query (`--cache-query`). It can compose
existing whole-action optimisation proofs (`--replacement --selected-model`).
The complete-action removal optimisation comes from the pinned knowledge laws,
not a new compiler rewrite. The cached-query implementation reads a stored
reply and retains the physical state without refreshing it on that query; its
encoder refreshes the reply after changes from the logical state. This establishes
expressibility and correctness, not efficient delta maintenance. Ordinary queries
with a direct unchanged-state observation now retain their physical state too,
with universal observation and preservation proofs. They avoid refreshing an
unrelated cache after each `get(key)`. `--rebuild-queries` reproduces the earlier
candidate for comparison. Other entries can define different layouts, cache updates and
specialisations under the same obligations without adding core rules.

## Runtime migration

`ink_runtime::representation::Session` uses a sealed representation. Logical
portable checkpoints retain the original program/schema identity. Restore may
encode them into any checked representation of that program, including after
restoring a snapshot produced by the baseline. Baseline restore also accepts
these checkpoints.

`migrate` decodes the old physical state and encodes the new one. Endpoint
proofs already establish logical preservation. A database `bridge` entry can
instead supply a direct physical conversion; `check_migration` verifies every
new relation under the old relations and checks exact pinned endpoint closures.
Both operations complete at a transaction boundary and install the candidate
only after execution and logical transport checks succeed. Versions, pending
outbox entries and acknowledgements belong to the host and survive the switch.
An execution/transport failure leaves the old session intact. Calls stage their
new state/events and publish only after all checks succeed; aborted calls and
exhausted successful commits publish no mutation or events.

The reference executor runs checked first-order definitions. The independently
versioned Rust lowering literally compiles their bodies and emits an executor
bound to the exact sealed definition identities. It can contain up to sixteen
representations and sixteen direct migrations. It rejects unknown closures.
No compiler optimiser chooses algorithms while emitting those definitions.

Native action execution decodes its arguments once, runs the checked execute
function once and applies the checked observation/next projections to the typed
intermediate. It transports only the two final outputs. The reference and older
executors retain the equivalent three-call implementation through the default
`Executor::transition`. Native immutable datatype fields share `Arc` storage;
clones preserve structural equality and no pointer identity has semantic meaning.
This sharing is generic across constructor types, not a cache/layout recogniser.
Ordinary definition emission keeps its existing `Box` ABI. The runtime also
caches the fixed logical snapshot layout rather than hashing the source on every
call. Snapshot encoding, resource validation and atomic publication still run.

## Tooling

```sh
ink emit-action-model app.ink -o model.json
python3 knowledge/producers/representations.py model.json -o proposal.json
# Extract one member of proposal.requests into request.json.
ink check-representation app.ink request.json
ink check-migration app.ink from.json to.json bridge.json
ink execute-representation app.ink request.json calls.json --snapshot-out state.bin
ink emit-representation app.ink request.json -o definitions.rs
```

Execution scripts use the existing `{ "call": "name", "args": [...] }` shape
and may include `{ "migrate": "another-request.json" }`. Runtime callers can use
`migrate_direct` with a separately checked bridge. Pinned request JSON contains
all required definitions, proofs and membership witnesses; checking, execution
and generated native execution need no producer, SQLite index or live database.
Planner search and measured cost selection remain external. These commands
select explicit requests; they do not silently turn an unverified database
search result into a selection.

## Scope and trust

Admission currently uses the documented `action_model` domain: u64 table keys,
u64/Bool/Unit/enums/records/Option/Result values, supported fixed primitive
operations, table operations, nested changes/queries, Try, replies and events.
Unsupported source domains fail closed and continue to use ordinary baseline
execution. This does not extend representation admission to exact-Int aggregates,
keeps, floating-point arithmetic, other key domains or all language features.
Those require fixed source correspondence before their candidates can replace
execution. Retiring their old specialised approval is not claiming that all old
optimised catalogue entries have been ported to the new contract.

The new path adds no proof-kernel rule and changes no source syntax or snapshot
wire format. The fixed source projection, general checker, codecs, literal Rust
emitter, Rust/LLVM and host remain trusted implementations; there is no formal
compiler-correctness claim. Other CPU/GPU backends retain baseline execution;
the new physical-definition executor is currently Rust only. Resource failures
are host errors, not mathematical proof premises. The reference codec limits a
table/event list to 4096 entries and source values to depth 32; the general
checker and native definition dispatcher also retain their existing bounds.
Persistence still requires the ordinary host durable-write protocol; `Session`
alone is not a WAL or crash-recovery implementation. Measured performance and
its workload limits are reported separately in
[`reports/representation-performance`](../reports/representation-performance/README.md).

The representation tests compare future action histories, rollback, ordered
outbox entries and byte-identical portable snapshots; exercise baseline restore,
reverse/generic/direct migration, failed migration and version exhaustion;
compile cached database definitions and replay them offline; and reject stale
source, missing action evidence, missing objects and authentic but false proofs.
