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

`emit-representation` emits a standalone compiled program for the selected
representation across Rust, C, JavaScript, both Wasm lanes and GPU host lanes.
All source, definition and preservation checking finishes before
emission. The generated `State` stores native physical data, version, pending
events and the portable snapshot layout. Changes invoke the literal checked execute/observe/next functions directly.
Queries whose normalised observation keeps logical state and version unchanged
and emits no events compile to the reply alone, retaining the old physical state. C uses a generated type-specific borrowed
ABI into immutable typed storage; its functions do not repack physical state.
JavaScript emits literal functions and immutable native constructor objects, with
an explicit call stack only for functions that depend on inductive recursion;
other functions use ordinary synchronous calls. Wasm uses the C or Rust program;
wgpu uses the native C host and WebGPU uses the JavaScript host. Recursive state
representations execute on the host, consistent with the general GPU contract.
The executable carries no proof bundle,
checker context, source AST, `CheckedRepresentation`, generic `Term`/constructor
transport or executable-identity dispatch. Generated programs import no Ink crate.
Native/Wasm ordinary
dependencies are serde_json, sha2 and num-bigint for JSON and the unchanged
portable snapshot codec.

The reference executor remains a proof-aware interpreter for tooling and
conformance. The explicit `representation_native::lower` bundle interface remains
available for historical executor/migration research, including up to sixteen
representations and sixteen direct migrations. It rejects unknown closures.
Compiled emission uses each backend’s standalone `representation_program` path.
Emission does not choose a replacement algorithm. Existing definitional
computation can erase a read-only observation envelope; the residual reply body
is type-checked before literal emission. This adds no proof-kernel rule.

**Generated calling contract:** callers must supply the declared argument arity,
types, shapes, tags, canonical numeric ranges and valid native pointer lifetimes.
Handing in bad data is unsafe. It may crash, trap, return a wrong answer or corrupt
state; raw native pointer interfaces may corrupt memory. No diagnostic, rollback,
or parity guarantee applies outside this contract. The application owns input
validation when it needs it. Source type checking and proof checking remain
compile-time requirements.

Generated calls perform representation conversion when required by JSON/native
storage/Wasm/device transport, without a separate runtime type-validation pass.
They do not decode every logical table or encode a portable snapshot before
publication. Source-defined Result errors, version exhaustion, event order and
transaction publication remain part of valid-program semantics. Explicit
checkpoint/restore still use the bounded, integrity-checked portable codec and
exact source snapshot identity. Checkpoint resource limits are checkpoint limits,
not an implicit cap on every invocation; an oversized live state may fail to
checkpoint. Profile frequency does not establish an input or state invariant.
Standalone code fixes the implementation at compilation; switching compiled
implementations currently uses portable checkpoint/restore. The research bundle
API retains its separately checked direct migration functionality.

The research executor's native action execution decodes its arguments once, runs the checked execute
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

The generated Rust module exposes `State::new()`, `State::restore(bytes)`,
`invoke_json(name, args)`, `checkpoint()`, `version()` and
`acknowledge_through(commit, position)`. Construction and restore require no
source, request, proof files, producer or checker. Append an application entry
point or include the module in a Cargo project with the ordinary dependencies
above. The old `Native: Executor` output is no longer the command's output ABI.

Execution scripts use the existing `{ "call": "name", "args": [...] }` shape
and may include `{ "migrate": "another-request.json" }`. Runtime callers can use
`migrate_direct` with a separately checked bridge. Pinned request JSON contains
all required definitions, proofs and membership witnesses. Checking and reference
execution need no producer, SQLite index or live database. Generated standalone
execution also needs no request JSON or proof/checker objects.
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

Admission currently uses the documented `action_model` domain: u64 table keys,
u64/u32/i32/Int/f32, fixed u32/i32/f32 vectors, Bool/Unit/enums/records/Option/Result/List values, supported fixed primitive
operations, table operations, nested changes/queries, Try, replies and events.
Unsupported source domains fail closed and continue to use ordinary baseline
execution. Keeps, filtered list traversal, exact-integer reductions, binary32 reductions
in source order and nominal stored-value equality now have fixed correspondence. Other
key domains and temporary buffer/map constructs require their own fixed correspondence and
standalone codec coverage. This is not admission of all language features.
Those require fixed source correspondence before their candidates can replace
execution. Retiring their old specialised approval is not claiming that all old
optimised catalogue entries have been ported to the new contract.

Source syntax and snapshot wire format are unchanged. General word extensionality
and fixed word/binary32 primitives are disclosed in [the small-core document](small-core-and-knowledge.md#general-mechanisms-added-for-representation-scale). The fixed source projection, general checker, codecs, literal target
emitters, native/Wasm/JavaScript toolchains and host remain trusted implementations; there is no formal
compiler-correctness claim. All lowering targets now expose the standalone representation contract.
All five CPU paths also support the portable literal executor through
`ink_runtime::representation::compiled::prepare`; its bounded transport is
separate from the standalone generated interface. Checked JavaScript bundles
export `createRepresentationState` and maintain admitted fixed-key keep caches.
Ordinary baseline keeps still recompute. The point-query fixtures supply no
incremental Int aggregate candidate. GPU device eligibility remains separate
from complete host execution. Resource failures
are host errors, not mathematical proof premises. The reference codec limits a
table/event list to 4096 entries and source values to depth 32; the general
checker and definition executors use the explicit bounds in that document.
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
trusted host decision, not proof of backend correctness. `execute-representation` uses this portable definition transport for the
checked `Session` host API. `emit-representation` emits the standalone target
application described below.

### Standalone target parity

```sh
ink emit-representation source.ink request.json --target rust -o program.rs
ink emit-representation source.ink request.json --target javascript -o program.mjs
ink emit-representation source.ink request.json --target c -o c-project
ink emit-representation source.ink request.json --target wasm32 -o wasm-project
ink emit-representation source.ink request.json --target rust-wasm -o rust-wasm-project
ink emit-representation source.ink request.json --target wgpu -o native-gpu-host
ink emit-representation source.ink request.json --target webgpu -o browser-host.mjs
```

Native/Wasm projects contain literal code, ordinary codec dependencies and the
handle/buffer state ABI. `cargo build --offline` builds them; Wasm adds
`--target wasm32-unknown-unknown`. C/Wasm accepts INK_CC/INK_AR cross-compiler
wrappers. Generated Wasm projects declare an 8 MiB stack, matching the native
stack budget used for the admitted inductive input limits; conformance includes
a 4096-element list. JavaScript exports `createState()` with asynchronous `invoke`/
`invoke_json`, checkpoint and restore. Invocation executes synchronously before
its promise resolves; restore rejects overlapping operations while decoding.
Simplified queries also have synchronous `query_NAME(...args)` methods returning
just the reply. Rust/C native hosts expose analogous typed `query_NAME` methods,
without JSON conversion or an outcome envelope. The compatibility invocation and
Wasm handle APIs retain their public reply envelope. Values use the established exact BigInt/decimal integer boundary.

The compiler accepts only representations admitted by the fixed source model
and supported by the standalone codecs. Unsupported source types/operations
fail closed before emission. Cross-target conformance covers u64 keys,
u64/u32/i32/f32 and fixed vectors, Bool/Unit/exact Int, nominal records and enums, Option/Result and List,
including the model's admitted table and collection operations. Each additional
source domain needs correspondence and standalone codec coverage on every target.
Ordinary whole-language lowerings retain their existing broader capability
contract. Historical proof-aware executor APIs remain explicitly research tools.

`tests/representation_parity.rs` compares every standalone target using one
source oracle, exact replies/errors, portable snapshots and pending events. It
checks restoration after every request, acknowledgement, counter exhaustion,
malformed snapshots and absence of checker/Ink runtime dependencies. Invocation
checks deliberately break the snapshot encoder and still require valid calls to
match the source. Malformed arguments are excluded from compiled conformance. Both Wasm
lanes are enabled with INK_TEST_ZIG and required in executable conformance CI.
Compile-time executable reachability starts at the sealed selected exports and
follows literal function calls and datatype fields. It excludes proof-only and
unused mathematical dependencies while keeping internal call targets unchanged.
The generic graph traversal grants no new proof or replacement authority; all
bundle proofs are still checked before emission. An authenticated unused-datatype
fixture and selected-export comparison check this boundary.

The Lean model adds conditional backend/history refinement and temporary-arena
erasure. Its explicit emitter/codec correspondence assumptions remain trusted;
the model proves the contract, not generated machine code. See
`reports/representation-parity-2026-10-11` for the local validation record.

Filtered u64 sum/count delta definitions and their checked update/migration laws live in
[`knowledge/research/filtered-aggregate`](../knowledge/research/filtered-aggregate/README.md).
The arithmetic and update tactics are external; correctness is independent of profitability.

Caller-trusted code generation and the valid-domain/query-erasure Lean results
are recorded in `reports/leaner-generated-code-2026-10-11`. Emission, codecs and
target toolchains remain trusted; Lean does not prove the generated binaries.
