# Database-defined representations and migrations

`representation::check` admits immutable canonical database entries against the
fixed transition projection of the actual source module. Aggregate certificates,
bounded-total cache authority, typed storage policies and their experimental
compatibility paths have been removed. Maintained physical representations use
the general database proof interface below.

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

## Compiled execution and migration

Representations are checked before compilation and become ordinary native typed
state. There is no generic stateful representation runtime in the distribution.
Versions, transaction rollback and ordered pending events belong to each emitted
program. Calls do not reconstruct logical tables or encode snapshots for runtime
validation. Explicit checkpoint/restore retains the original program/schema
identity and portable snapshot integrity checks.

Switch a compiled implementation at a transaction boundary by checkpointing the
old program, restoring those bytes into the compiled target, then publishing the
new instance only after restore succeeds. Versions, pending events and
acknowledgements survive; failure retains the old instance. Baseline and compiled
programs share this logical snapshot namespace. This is a portable migration,
with codec work at the explicit boundary, not constant-time switching.

Database bridge entries and `check-migration` still check universal preservation
against exact endpoint closures. The former proof-aware multi-executor runtime
and its direct-switch API have been removed. A bridge proof alone does not expose
a new runtime entrypoint. Optimized native direct bridges would need standalone
emission and equal backend coverage before becoming executable again.

`execute-representation` is a compile-and-run tool. It checks every requested
representation and external argument before compiling fixed Rust variants. A
`migrate` script step performs the same portable checkpoint/restore switch. The
compiled child has ordinary codec dependencies and contains no checker, proof
bundle, source AST, generic ground-term transport or interpreter. The tool requires
a Rust toolchain and cached dependencies (`cargo build --offline --release`);
`INK_CARGO` can select Cargo. Prefer an already compiled application for normal
execution. Script inputs and replies are bounded at 16 MB, scripts at 100,000
steps and bundles at sixteen variants. Source argument nesting/list/integer bounds
remain 32/4,096/4,090 bits. Source syntax and snapshot container version are unchanged.

`emit-representation` emits a standalone compiled program for the selected
representation across Rust, C, JavaScript, both Wasm lanes and GPU host lanes.
All source, definition and preservation checking finishes before
emission. The generated `State` stores native physical data, version, pending
events and the portable snapshot layout. Changes invoke the literal checked execute/observe/next functions directly.
Targets emit the checked execute, observe and next definitions literally.
Database candidates express compact queries and physical-state retention. C uses a generated type-specific borrowed
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
Standalone code fixes each implementation at compilation; switching compiled
implementations uses portable checkpoint/restore.

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
and may include `{ "migrate": "another-request.json" }`. The compile-and-run tool
checks all variants before running and switches through portable snapshots. Pinned request JSON contains
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
Each generated application invokes the sealed definitions directly, without a
proof-aware state session or ground-term transport. Checked JavaScript programs
export `createState` and maintain admitted fixed-key keep caches.
Ordinary baseline keeps still recompute. The point-query fixtures supply no
incremental Int aggregate candidate. GPU device eligibility remains separate
from complete host execution. Resource failures
are host errors, not mathematical proof premises. The reference codec limits a
table/event list to 4096 entries and source values to depth 32; the general
checker and definition executors use the explicit bounds in that document.
Persistence still requires the ordinary host durable-write protocol; compiled
state alone is not a WAL or crash-recovery implementation. Measured performance and
its workload limits are reported separately in
[`reports/representation-performance`](../reports/representation-performance/README.md).

The representation tests compare future action histories, rollback, ordered
outbox entries and byte-identical portable snapshots; exercise baseline restore,
reverse/generic/direct migration, failed migration and version exhaustion;
compile cached database definitions and replay them offline; and reject stale
source, missing action evidence, missing objects and authentic but false proofs.

## Compile-and-run tooling

```sh
ink execute-representation app.ink request.json calls.json --snapshot-out saved.inksnap
ink emit-representation app.ink request.json --target javascript -o application.mjs
ink emit-representation app.ink request.json --target c -o build/application
```

`execute-representation` compiles fixed standalone Rust variants after preflight
checking; it requires Cargo. Use `emit-representation` for the other target
applications. All five CPU applications share the exact replies, rollback,
events, checkpoints and restore contract. Portable switching publishes a restored
new instance only after it is valid; it does not validate a full logical snapshot
on every call. Direct bridge proofs are still checked, but the former generic
executor's direct-switch API is retired as described above.

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
Every action executes its checked physical step and observation. Query transport
uses the same outcome and validation contract. Compact query alternatives are
explicit database definitions; backends do not derive typed shortcuts from the
observation envelope. Values use the established exact BigInt/decimal boundary.

The compiler accepts only representations admitted by the fixed source model
and supported by the standalone codecs. Unsupported source types/operations
fail closed before emission. Cross-target conformance covers u64 keys,
u64/u32/i32/f32 and fixed vectors, Bool/Unit/exact Int, nominal records and enums, Option/Result and List,
including the model's admitted table and collection operations. Each additional
source domain needs correspondence and standalone codec coverage on every target.
Ordinary whole-language lowerings retain their existing broader capability
contract. The historical proof-aware stateful executor APIs have been removed.

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

The [path-local sequence candidates](path-local-indexed-tables.md) add generic
shared-owner preservation, checked compact observations and explicit continuation
frames for single-site recursion, with proof-view and execution resource bounds.
