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
candidate for comparison.

`--cache-query zero --preserve-cache` additionally proposes database-defined
work skipping at change boundaries. Aborted changes and host failures retain the
previous cached value and reconstruct the physical tuple from source post-state. Successful changes to tables that the cached query does
not read install the new logical roots and retain its cached reply. Changes to a
read table still recompute the reply. The producer uses conservative syntactic
analysis to propose this definition, then supplies universal branch equations
using existing equality rules; neither the analysis nor dependency metadata
is a premise accepted by the core. The complete original observation, including
errors, versions and staged events, remains the execution result. A forged
unchanged-root claim fails mathematical checking even with authentic hashes and
membership. This candidate composes with checked whole-action replacements. The frozen
`composed.json` candidate combines it with the database removal-idempotence law,
so the source can still remove twice while the selected implementation removes
once under a universal equality proof.

Only the cached reply and source observation cross the transition intermediate;
carrying the whole previous state would duplicate roots during transport.
The candidate is explicit, with the refresh candidate retained for cost comparison.
See `knowledge/research/cache-maintenance` for standalone requests and direct
migration, and `reports/cache-maintenance-performance` for measured costs.
Other entries can define different layouts, cache updates and specialisations
under the same obligations without adding core rules.


`--compact-queries` additionally removes duplicated table roots from query
intermediates. A cached query's source observation supplies its cached reply and
logical post-state directly. Other direct-observation queries carry only the
cached value when necessary; uncached layouts use the source observation alone.
Existing universal observation/preservation equations authorise these definitions.
The frozen `knowledge/research/compact-queries` requests compose with the same
change-boundary maintenance and removal law as the previous candidate. Matched
three-call query measurements improve on the small fixtures, while fused costs
do not; this remains an explicit executor/workload choice. Comparable timing
observations live separately in the database, with unmeasured memory recorded as
`null`. See `reports/compact-query-performance` for samples and limits.

The database also supplies [fixed-key incremental query maintenance](point-query-delta.md),
with refresh fallback, and the planner supplies [measured lifecycle selection](../planner/README.md).
These remain explicit alternatives; correctness does not establish profitability.

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

The frozen `knowledge/research/layout-switch` bridges switch between the two
query implementations while retaining their identical cached physical state.
`producers/representation_bridge.py` proposes an identity function and universal
preservation proofs for identical relations. Direct execution avoids encoder/cache
recomputation, while both decodes and logical validation still run. Native tests
verify this with an encoder counter and future histories. This does not establish
constant-time switching or a measured migration-latency gain.

Cost evidence lookup filters requested plans before limiting its results and uses
a covering SQLite index. Unrelated plans cannot exhaust the evidence budget;
only matching canonical evidence files are read and hash-validated. This improves
discovery rather than source action execution. The standalone synthetic timings
and exact baseline are in `reports/knowledge-lookup-performance`.

The reference executor runs checked first-order definitions. The independently
versioned C, Rust and JavaScript lowerings literally compile their bodies and emit executors
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

Canonical subset export now retains checked witnesses while traversing the
dependency closure, using one SQLite read snapshot and authenticating identical
membership proof bytes once per export. Every ID still requires authenticated
leaf membership, and every object's canonical bytes are read and hashed. Later
indexed exports recheck both; no persistent indexed authentication cache is introduced. This
reduces bundle assembly overhead without changing the mathematical snapshot or
the core's independent local checking. Measurements are in
`reports/knowledge-export-performance` and exclude mathematical admission and
source action execution.

## Scope and trust

Admission uses the documented `action_model` domain: u64 table keys, supported
word scalars, binary32 words, exact integers, fixed numeric vectors and
Bool/Unit/enums/records/Option/Result/List values. Fixed source correspondence
covers supported arithmetic and collection operations, nested changes/queries,
Try, replies, events and keep bodies. Strings, recursive source types, other key
domains and unsupported operations still fail closed. Every physical candidate
must separately prove all-action preservation; type support alone grants no
replacement authority. The point-query fixtures supply fixed-key maintenance,
including guarded overwrite/removal. They supply no incremental Int aggregate
candidate or measured performance evidence.
Retiring their old specialised approval is not claiming that all old
optimised catalogue entries have been ported to the new contract.

The portable execution path changes no source syntax or snapshot
wire format. The fixed source projection, general checker, codecs, literal
emitters, C/Rust/JavaScript/Wasm toolchains and hosts remain trusted; there is no
formal compiler-correctness claim. All five CPU targets can execute the sealed
physical definitions through `ink_runtime::representation::compiled::prepare`.
The JavaScript bundle exports `createRepresentationState`. GPU physical-definition
execution remains unimplemented. Resource failures
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

## Portable literal executor tooling

```sh
ink execute-representation app.ink request.json calls.json --target javascript
ink execute-representation app.ink request.json calls.json --target c-wasm --zig /path/to/zig
ink emit-representation app.ink request.json --target javascript -o application.mjs
ink emit-representation app.ink request.json --target c -o build/definitions
```

`execute-representation` accepts `c`, `rust`, `javascript`, `c-wasm`, `rust-wasm`
and never substitutes reference execution. `--build-dir` controls the artifact
directory. Revisited migration closures reuse an exact registered target; mixing
targets for one closure is rejected. C/Rust-Wasm and native C definition artifacts
use a bounded postorder word ABI; JavaScript uses tagged exact values. Inputs
reject aliases, forward references and unused nodes. C's global word ABI requires
serial access; the runtime executor serialises its persistent subprocess channel.
Definition manifests identify sealed code; registering arbitrary artifacts is a
trusted host decision, not proof of backend correctness. Native Rust application
bundles and JavaScript bundles can be emitted as source files. Other targets emit
a directory containing literal definitions and their manifest, for the common
`Session` host API.
