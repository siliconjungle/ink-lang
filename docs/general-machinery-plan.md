# General machinery implementation programme

Requested on 13 October 2026 in the attachment to the Ink philosophy chat.
All six workstreams below are required. An individual feature or passing focused
test does not complete the request. This file records implementation decisions,
remaining requirements and evidence so work can continue without losing scope.

The objective is disproportionate growth in reusable implementation knowledge
for each general semantic/checking extension. Core size alone is not a goal.
Algorithms, layout choices, proof search and profitability policy remain external.

## Working repositories

Distribution staging checkout: `research/ink-general-machinery-2026-10-13`,
initial distribution revision `5205dca1d32f5b1e0126cd4128a92e5e0ddab2de`.
Independent package checkouts are initialized to that revision's exact gitlinks.
The staging checkout was necessary because the existing main and research
checkouts contain unrelated changes. The app worktree tool could not create it
from the projectless chat directory; Git created the isolated checkout.

## Full requirements and completion evidence

| Workstream | Required result | Evidence required before completion |
| --- | --- | --- |
| Invariant-bearing abstract types and interfaces | Generic reusable value invariants; checked construction and operation preservation; abstraction and composition; validation at untrusted ingress; database implementations/laws that avoid redundant normalization | Positive and forged-evidence tests; imported/generic/nested values; all CPU targets and both Wasm hosts; state, rollback and invalid checksummed restore; independently checked published proof closures; complete-call measurements against strong controls |
| General physical storage | Regions, contiguous storage, typed handles/offsets, variable-sized values and borrowing; checked correspondence to logical values; database-defined chunked sequences, arenas, sparse indexes and compact trees | Two substantially different database-authored structures using the same mechanisms without a new strategy case; bounds/alias/lifetime rejection; codec round trips and future-action preservation; compiled cross-target parity; measured setup/update/query/transport/memory costs |
| Externalise implementation knowledge | Move relevant compiler-specific strategies into reusable database definitions without losing performance | Inventory of existing cases; semantic/capability replacement; fixed-source before/after performance and conformance; no privileged names or identity-based admission |
| Recursive source types and termination | Generic recursive datatypes, induction/source correspondence and execution; checked authored decreasing measures and reusable termination evidence | Trees, tries, recursive codecs and divide-and-conquer examples; invalid/non-decreasing/forged measures rejected; database proof families; native/JS/Wasm parity and resource limits; complete-call controls |
| Local relational reasoning | Region/loop relations and footprints that compose with unaffected state; in-place algorithms, incremental repairs, fusion and independent caches | Checked initialization/step/exit/frame obligations; intermediate reads, errors, aborts, versions and ordered events preserved; alias/overlap/capture adversaries; multiple independently authored database families and measured proof/execution costs |
| Reusable facts through lowering | Exact source-bound evidence reused by compatible consumers for bounds, algorithm selection, destinations, layouts and eligible vector execution | A single established fact used by multiple consumers; stale scope/module/representation evidence rejected; proof obligations retained at every consumer; generated-code audit and cross-target values/errors/snapshots; measured allocation/checking/execution effects |
| Compositional incremental maintenance | Database-owned change algebra and maintenance laws; generic core extensions only for recurring demonstrated gaps | Composed map/filter/join/group/aggregate maintenance, insertion/deletion/replacement and refresh fallback; simultaneous caches/shared dependencies; full history equivalence and published proofs; read/write/lifetime/migration/selection/memory benchmarks |
| Distribution and publication | Integrated pinned packages, actionable docs/diagnostics, reproducible examples and evidence, verified publication on main | Core-only build; affected package tests; mandatory feature parity including actual eligible GPU dispatch and explicit unsupported capabilities; immutable benchmark receipts; published independent revisions and verified distribution main revision |

## Implementation order

1. Introduce checked nominal value invariants on ordinary immutable records.
   Derive construction and interface obligations from exact types; use existing
   proof kernels and checked host guards. Then extend to abstract, imported and
   generic interfaces and nested ingress, with reusable library implementations.
2. Extend source datatypes/termination and the physical storage foundation in
   concert, preserving executable meanings and portable logical observations.
3. Add compositional local relations/footprints and common fact transport, then
   use them for database-owned incremental and physical algorithm families.
4. Externalise existing strategies, optimise full execution and checking costs,
   run the complete acceptance audit and publish the integrated repositories.

Each implementation phase must include actual code and evidence, not just this
plan. Do not declare a bounded example, restricted interface or host fallback to
be the full requested substrate. GPU-host correctness is separate from device
support. Missing capability stays explicit while implementation continues.

## Current state

Latest checkpoint (14 October): the programme is still incomplete. Recursive
raw-value validators, mutual structural descent and portable recursive definition
contexts are now implemented. The checked-tree library produced 72 pure
interface obligations with 53 canonical proof objects; both source-bound and
unrelated-source portable replay pass. These are pure interface proofs, not
recursive action, codec or induction correspondence. The standalone core suite
passed 300 tests; 17 recursive-value cases passed the complete CPU/Wasm and wgpu
host paths with an actual eligible numeric GPU control. Detailed evidence is in
`docs/evidence/general-machinery/recursive-value-validation.json` and
`build/general-machinery/recursive-context-full-core.log`.

Knowledge main now contains the canonical proof publication at
`20a78ee97f2f21bafeea7f5f7f80182c575ae6be`; native-support main contains the
scoped storage support at `ca9bc59f119db62c2c1ea5000b6baf390f94705a`.
Current upstream integration passed 300 core tests across 51 test/doc runs,
13 standalone Rust tests, 31 standalone JavaScript tests, 10 GPU package tests
and all 182 planner tests. The standalone Wasm crate also builds/tests (it has
no unit tests; execution coverage comes from the target parity suites). The
remaining C/runtime closure, complete-target checks and distribution main
publication are still being completed. Historical local-only publication statements below describe
their respective earlier checkpoints.

The largest remaining implementation requirements are the real invariant-bearing
Set interface (the collection alias remains), interchangeable abstract/owner
interfaces, allocation provenance and general layout/codec relations, recursive
source induction and state correspondence, effectful mutation/loop frames,
fact transport through changed selected source and additional lowering consumers,
and composed incremental history/lifecycle/memory/performance evidence. The
scoped-range performance observations retain regressions and do not establish
a blanket speedup.

- Isolated current-main distribution and exact independent packages prepared.
- Source/contract, induction, representation and physical capability boundaries
  inspected. Existing compositional machinery will be extended, not duplicated.
- Immutable nominal record predicates and hygienic generic construction are
  implemented. Core reconstructs constructors, raw nested validators, inferred
  interface contracts and snapshot/state guards from the real source types.
  Field opacity is now implemented; interchangeable abstract implementations and
  owner interfaces remain unfinished.
- Established source equations become ordinary conditional database laws with
  narrowed definition contexts. Interface preconditions now also reach exact
  physical bounds obligations: the indexed-sequence example uses one guarantee
  for a semantic observation and a checked physical read. A different index is
  declined, and relocating/rehashing its certificate rejects.
- Untrusted state proof production now composes Boolean projections, scalar
  abstraction/RUP certificates and separately strengthened conditional helper
  lemmas. The `Zero` value-state example authors and independently replays one
  pure and eleven state proofs; its frozen closure is 52 mathematical objects.
- Core regressions cover nested invalid inputs, forged machinery, capture,
  action field evaluation order/events, state commits, aborts, invalid arguments
  and valid-checksum invalid restores. The focused latest run passed 13 value
  tests (`build/general-machinery/state-and-facts-core.log`). Earlier focused
  physical capability and Boolean induction replay tests also passed.
- The latest imported interface conformance run passed C, Rust, JavaScript and
  both Wasm paths with exact snapshots and a real eligible numeric wgpu dispatch
  (`build/general-machinery/value-parity-final.log`). This does not claim that
  predicates or state transitions execute on the GPU device.
- Seventeen affected producer/database tests passed in
  `build/general-machinery/producer-tests-final.log`. The declared python-sat version
  is installed in the isolated `build/general-machinery/python` environment.
  Producers bind scalar-certificate caches to the explicitly selected compiler.
- New state conformance and selected indexed-read native/Rust-Wasm conformance
  passed. The selected read also rejects invalid ingress; a generated-code audit
  confirms an unchecked read only at the certified site. Their logs are
  `value-state-parity.log` and `indexed-physical-parity.log` under
  `build/general-machinery`. The complete updated standalone core suite passed
  206 tests across 33 test/doc binaries in `core-tests-final.log`.
- The current proof producer reproduced the frozen state packet byte-for-byte.
  Local canonical publication contains the 48 scoped laws, the complete state
  proof closure and the indexed-read certificate (102 contributed/reused objects,
  61 names). Snapshot `bb1454240a8a5a74038b888092d9c82929ac2ab29c451fdef9202e5da0d30799`
  retains prior objects and names. Both proof domains replayed against views from
  that canonical publication in `published-state-replay.log` and
  `published-fact-replay.log`. This is local staging publication, not verified
  remote main publication.
- The original 1024-attempt planner run rejected its result because a concurrent
  Cargo integration build changed the compiler binary during search. Its partial
  `fact-selection-current.json` is not admitted evidence. Search is rerunning
  against the frozen `build/general-machinery/frozen/ink` (identity recorded in
  `frozen/compiler.json`) completed and checked its selected chain. Its 1024
  attempts admitted three applications; structural cost changed from 1427 to
  1187. This is not a measured runtime speedup. Results are in
  `fact-selection-frozen.json` and `fact-selection-frozen.log`; the failed receipt
  is retained. Fresh whole-chain replay and JavaScript emission also passed.
- `bench/value-invariants/run.mjs` measures literal, selected and strong
  handwritten u32 uniqueness calls with validity checks retained. At 512 items,
  selected/literal median ratios are 0.497 for typed values and 0.507 for complete
  checked binary-wire calls. The latter remains 19.376 times the handwritten
  control using identical codecs. Raw interleaved samples and all boundaries are
  in `docs/evidence/general-machinery/value-performance.json`. This is one
  fixture, not automatic profitability or complete performance acceptance.
- Local checkpoint commits are distribution
  `fcd82cfafc2c4e5c0e0f654206611bf981244f4b` and knowledge
  `1a963549659e62298d2f83a8516c323f90d9ff64`. Neither is published on remote main.
- Import isolation testing exposed an importing module's same-named `unique`
  function changing the library's invariant elaboration. Collection syntax now
  resolves in its defining module before graph assembly; linked callback calls
  also retain local parameter bindings. Regressions reject the duplicate-value
  construction and invalid runtime input while retaining ordinary same-named
  source functions. The updated complete core suite passed 207 tests, and all
  six module plus five value-invariant integration tests passed with the compiled
  CPU/Wasm and eligible GPU host legs enabled. Receipts are
  `core-tests-lexical-final.log` and `lexical-target-parity.log`. The unaffected
  interface core image remains byte-identical and the canonical state packet
  still replays. Complete abstract-interface and module-visibility work remains
  open; this fix is not a claim that field opacity is implemented.
- Source `abstract record` declarations now hide construction and fields across
  actual module imports, generic specialisation and callback inlining. Aliases,
  nested records, actions, state expressions and contract clauses retain the
  restriction. Origins avoid source-name capture and erase before executable
  encoding; the four database value interfaces now use it. Their existing core
  image remains byte-identical (`abstract-image-replay.log`).
- General equality normalization now follows alias chains without discarding all
  remaining premises on the first replacement. Regressions cover a twelve-value
  chain, a missing predicate premise and cyclic aliases. A read-only action's
  call obligations can use checked boundary invariants; mutating actions and keep
  initialization retain their independent obligations. Generated long nominal
  constructor labels also fit the existing first-order kernel's input bounds.
- The imported generic abstract value-state fixture authors and independently
  replays nine pure and ten state obligations. Its pure closure has eight objects
  and its first-order closure has 55. Source evidence is frozen in
  `tests/fixtures/abstract-interfaces/proofs.json`; the successful authoring receipt
  is `abstract-proof-authoring-v2.log`. The earlier failed authoring attempt is
  retained in `abstract-proof-authoring.log`, where missing stable-state premises
  correctly prevented admission. The frozen successful compiler is recorded in
  `build/general-machinery/frozen-abstract-state/compiler.json`.
- The final standalone core run passed 214 tests in
  `core-tests-abstract-final.log`. Sixteen affected database tests passed in
  `abstract-producer-tests.log`. The four abstract-interface, six module and five
  value-invariant tests passed with C/Rust/JavaScript, both Wasm paths and eligible
  wgpu legs enabled (`abstract-target-parity-final.log`). The abstract fixture
  compared ten replies and exact snapshots with one actual numeric GPU dispatch;
  its predicate/state work executes on the host. Five broader feature-parity
  checks passed in the earlier run; its inventory test then caught the missing
  new suite in the auditing script. After fixing the script, that inventory test
  passed independently in `abstract-feature-inventory.log`.
- The local canonical snapshot is now
  `8c5ad9027b69996066dd28403de4a763b9bf0e7c47b6c721110e58961f6782df`.
  It retains the preceding snapshot and contributes/reuses 63 objects with 19
  names under `abstract-interfaces/`; the exported publication view independently
  replayed in `abstract-published-replay.log`. Knowledge staging checkpoint:
  `71b99644908120def7415e7a1ed302204dd179fa`. This is not remote publication.
- The previously rejected `List<Hidden<u32>>` observer probe now checks. Pure
  callback-call obligations quantify over the fixed consumer's actual domain
  using existing semantic terms and ordinary proof replay. List/variant domains,
  exact application, indexed map/zip, folds and bounded/early-stop loops share
  this transport. Accumulator traces preserve direction, zero work and the
  stopping fold's final step; no nominal predicate is granted to raw inputs.
  The imported composition fixture authors/replays 19 pure obligations with a
  17-object closure, including two ordinary Result case proofs. General database
  variant proposals use fresh payload names and the kernel's required marker.
  The final standalone run passed 223 core tests in `callback-core-final.log`;
  all five abstract integration tests passed in `callback-target-parity-final.log`.
  The new fixture matches 16 replies/snapshots across C/Rust/JS/both Wasm paths
  with one actual eligible GPU control dispatch. The prior abstract state fixture
  still matches ten replies/snapshots and its eligible dispatch. The canonical
  view replays in `callback-published-replay.log`; snapshot identity is
  `76f9c298d1759aba67bf7a0e9f57d0dfc7068b4f3f9751be205703954a906996`.
  Seventeen affected database tests passed in `callback-db-tests-final.log`
  and `callback-db-regressions.log`. This is local staging publication and no
  runtime performance claim follows. Action callback transport, owned accumulator predicates and reusable arbitrary
  fold preservation proofs remain open. Receipt:
  `docs/evidence/general-machinery/callback-domains.json`.
- Action pure-expression callback obligations now share the semantic consumer
  domains. Typed readonly observations connect state-table reads to those domains;
  actual readonly action-call preconditions remain checked separately. Boundary
  state invariants remain restricted to actions with no writes. Eager fallback
  requirements and compound guards retain their execution scope, and the action
  model now covers the existing pure Option/Result constructors.
- Standalone and imported abstract action fixtures each author/replay two pure
  and 25 state obligations. Frozen packets live in the core and distribution
  fixtures. The previous failed attempts are retained in the
  `action-callback-proof-authoring*.log` files. The successful standalone attempt
  is `action-callback-proof-authoring-v5.log`; the imported attempt is
  `action-abstract-proof-authoring.log`.
- State proof authors now balance transitivity and close deep branches under
  exact typed parameters and premises. The checker still replays every helper
  and verifies each use's premises. Existing proof-stack and canonical-object
  nesting limits are unchanged. `action-proof-balance-replay-v2.log` records an
  ordinary 40-step proof rejecting at the kernel limit and its balanced form
  checking. The first probe hit the JSON nesting limit instead and is retained.
- The final standalone core suite passed 228 tests in
  `action-callback-core-final-v4.log`; 19 affected database tests passed in
  `action-callback-db-tests.log`. All six abstract integration tests passed in
  `action-callback-target-parity-final.log`. The new action fixture matches 15
  replies and exact snapshots across C/Rust/JS/both Wasm paths, with one eligible
  numeric GPU dispatch. Earlier abstract value and pure-composition fixtures
  retain their ten and 16 replies respectively and their device controls.
- Local canonical publication contributes/reuses 296 objects and 54 names for
  the two action fixtures. Snapshot identity is
  `d82ee95630dc9a95bedd53bcd53370f7f8002026dfb3744c849472dcab327347`.
  Both exported views replay with the final frozen compiler in
  `action-callback-published-replay-final.log` and
  `action-abstract-published-replay-final.log`. This is a staging publication;
  no remote main or runtime performance claim follows. Receipt:
  `docs/evidence/general-machinery/action-callback-domains.json`.
- Remaining callback paths include dependent query calls inside callbacks,
  conditional query observations, ownership-bearing accumulators, general fold
  preservation laws and direct pure-loop expressions in action bodies. These
  paths retain conservative admission; they are not waived by the fixtures.
- An adversarial nested-query probe exposed state-dependent result guarantees
  being transported after a write invalidated their boundary premise. The old
  frozen compiler authored two pure/eight state proofs for the unsafe source,
  while reference execution reported a failed precondition. Receipts are
  `nested-query-boundary-authoring.log` and `nested-query-boundary-runtime.log`.
  New source-bound action-result guarantee obligations reject that probe at
  `broken:action-guarantee:0:ensures:0`; the rejected authoring receipt is
  `nested-query-boundary-rejection.log`.
- Positive result-guarantee fixtures author/replay four pure and 27 state
  obligations. The field-order fixture was re-authored with one pure/twelve state
  obligations for the added guarantee checks. Actual action typing supplies
  binding types, including calls to changes. General intermediate-state/prefix
  relations and nested state-dependent replacement domains remain open.
- The completed result-guarantee checkpoint passes 232 standalone core tests
  (`result-guarantee-core-final-v3.log`). The new nine-reply fixture matches values,
  errors and exact snapshots across C/Rust/JS/both Wasm paths with one eligible
  GPU control dispatch (`result-guarantee-target-parity.log`). Canonical views
  replayed against the final frozen compiler. Local snapshots are
  `451e5cd950ac7d64c74d801eebfdca998548df96c3d08cb21ffac7d4a752d3a5`
  and `4e1a40bc0d29039336e71edf41cf4566698fb1db4b3dac7858fbb31e699a1665`.
  Receipt: `docs/evidence/general-machinery/result-guarantees.json`. This is local
  staging evidence, not completion of the full programme or remote publication.
- Exact source-site value observations now reuse the action transition CPS.
  They bind local slots and actual results in the intermediate state, preserve
  nested query/change error distinctions, and retain a failed observation through
  later aborts. Earlier exits do not observe an unexecuted site. Checked node
  selectors carry no mathematical authority; ordinary kernel proofs check the
  resulting Bool functions. No runtime instrumentation or new proof axiom was
  introduced, and original action definitions/objects remain byte-identical.
  Callback sites fail closed rather than silently appearing unvisited.
- This is a foundation for actual-prefix reasoning. Contract generation still
  uses its conservative arbitrary-state checks. Exact source/lexical capture
  transport, before-call requirements, loop/frame composition and database proof
  families remain open. Evidence is recorded separately in
  `docs/evidence/general-machinery/action-observations.json`; prior canonical
  result-guarantee proof packets still replay unchanged. The final standalone
  suite passes 238 tests, including six observation tests, in
  `action-observation-core-final-v2.log`. Seven abstract-interface integration
  tests pass with C/Rust/JS/both Wasm paths and eligible wgpu work enabled in
  `action-observation-target-parity.log`. These are conformance checks, not
  observation-runtime or proof-production performance measurements.
- Captured action-result checks now reconstruct exact nodes and lexical slots
  from the sealed action tree and original source, then prove the clause through
  the actual caller prefix. Entry invariants/caller requirements apply only to
  initial state; local facts and intermediate writes are computed. Direct repairs,
  nested-change repairs, shadowed locals, abort rollback and ordered commit events
  are checked. Synthetic keep initializers retain conservative checks. Before-call
  requirements and complete frame/loop/replacement domains remain open.
- The database producer authors and independently replays four pure/38 state
  obligations for the extended repair fixture and one pure/twelve state obligations
  for field order. Canonical publication contributes/reuses 134 and 41 objects;
  its current local snapshot is
  `d1d3e32a56afdb1ef0159e410f7b13117b64190c146bc161e256b720c8e1a7c5`.
  The order closure reuses current members without changing the snapshot root.
  Published views replay independently (`prefix-guarantees-published-replay.log`,
  `prefix-order-published-replay.log`). The broken-state probe still rejects with
  an actual `false = true` observation (`prefix-broken-rejection.log`).
- The final suite passes 239 standalone core tests, ten affected database tests
  and seven abstract integration tests. The result fixture now compares fifteen
  replies and exact snapshots across C/Rust/JS/both Wasm paths with an eligible
  GPU control dispatch. Logs: `prefix-guarantees-core-all.log`,
  `prefix-guarantees-db-tests.log`, `prefix-guarantees-target-parity.log`. Receipt:
  `docs/evidence/general-machinery/prefix-guarantees.json`. This is partial local
  staging progress, not full programme completion, performance acceptance or
  remote main publication.
- Direct source-call preconditions now check immediately after ordered argument
  evaluation and before invocation. Predicates receive actual values and current
  state; expressions with mutation/events are not rerun. A callee's later repair
  cannot validate its entry requirement. Generated binders avoid free, bound and
  state/keep names. Fixed value primitives enclosing monitored sites consume
  already-evaluated typed inputs through existing primitive meanings. Callback
  domains and keep initializers retain their preceding conservative checks.
- The new call fixture authors ten state obligations with a 53-object closure;
  refreshed result, field-order and value-state closures have 130, 39 and 72 objects
  respectively. Published views independently replay all four sources. The final
  local snapshot is
  `9419d947001993fbd7a60ef96cb378e67ff009ba5e6ed83f5459d5ae87b48c12`.
  Reversed effectful arguments reject at `bad_arguments:action-call:0:requires`
  (`before-call-bad-arguments-rejection.log`).
- Final verification passes 245 core tests, ten affected database tests and
  thirteen abstract/value integration tests across C/Rust/JS/both Wasm paths and
  eligible wgpu work. The new fixture compares thirteen replies, ordered events
  and exact snapshots, including invalid public calls and rollback after repairs.
  Logs: `before-call-core-verified.log`, `before-call-db-tests.log`,
  `before-call-target-parity-final.log`, and the four published-replay logs.
  Receipt: `docs/evidence/general-machinery/before-call.json`. Earlier failed
  regressions/authoring remain diagnostic data, not admitted evidence. No runtime
  or proof-production performance claim follows from this conformance checkpoint.
- Supported callback-domain checks now use expression-entry observations at the
  actual caller state. Entry predicates retain readonly query inputs and lexical
  slots; closed state reads inside callbacks are sampled without assuming a
  boundary invariant after mutation. Zero-argument readonly queries additionally
  require a source closure without nontrivial call contracts. Dependent and
  unsupported domains retain stronger checks. Empty domains remain vacuous.
  Total value correspondence and observation visitation are separate summaries;
  readonly list receivers sequence through existing map/filter meanings.
- Database proof search now exposes constructor payload equalities through Match
  congruence, retains relevant relational origins after extraction, and proposes
  separately checked concrete-result lemmas for recursive observations. The repair
  fixture authors two pure/twelve state proofs with a 124-object closure. Refreshed
  standalone/imported callback closures have 172/170 objects and two pure/25 state
  proofs each. Constructor projection independently replays; a rehashed theorem
  with the wrong conclusion rejects. Current local publication is recorded in
  `consumer-entry-publication.json` and its exported source views.
- Final verification passes 252 core tests, twelve affected database tests and
  fourteen abstract/value integration tests across C/Rust/JS/both Wasm paths with
  eligible wgpu work. The new fixture compares thirteen replies and exact snapshots
  for repairs, empty domains, readonly receiver captures, commits and rollback.
  The bad callback followed by a repair rejects (`consumer-entry-bad-rejection.log`).
  Logs: `consumer-entry-core-all.log`, `consumer-entry-db-tests.log`,
  `consumer-entry-target-parity.log`, and the published replay logs. Receipt:
  `docs/evidence/general-machinery/consumer-entry.json`. This remains partial local
  staging; no execution/proof-production performance acceptance or remote main
  publication is claimed.
- Remaining requirements include interchangeable abstract interfaces and owners, general
  storage and externalisation, authored termination, local frame/loop relations,
  broader cross-consumer fact transport, compositional incremental maintenance,
  canonical database publication, full performance evidence and integrated main
  publication. None is waived by the foundation above. See
  `docs/value-invariant-interfaces.md` for the current mechanism and limits.
- Word-storage library groundwork now builds an arena of variable-size rows and
  a chunked sequence from the same owned-buffer/record/loop primitives. Neither
  adds a data-structure strategy case. Success values retain checked span/width
  invariants at imported interfaces and raw ingress. Handles are relative slots
  and extents, not allocation provenance or borrow-lifetime evidence.
- Nested builders exposed over-broad loop state. Source loops now carry only
  assigned outer locals, keeping unmodified values as lexical captures. Six
  regressions cover nested owners, bounded loops, conditional assignment,
  shadowing, invalid consumption and the limit on actual carried variables.
  Empty-option definition replay preserves constructor trees and explicit source
  bindings; proof-produced receivers obtain type hints only when needed.
- Database search now proposes cases through known applications and closed local
  callbacks, including positive predicates compared with Boolean literals.
  Combined catalogue admission keeps the existing work/depth budget per entry,
  with bounded catalogue/dependency traversal and size limits. Resource tests
  prove independently bounded entries compose and a single oversized proof rejects.
  `eval::call_checked` reuses a sealed module's admission while retaining input
  validators and fuel; raw-program execution still checks admission.
- The imported storage fixture replays thirty pure obligations with twenty-two
  canonical objects. Local snapshot is
  `e018db7c5d2868e1316fe6e1762437b30c9f15d2c7c73bd913213861f7bfe45a`.
  Its published source view replays and a freshly rehashed false proof rejects.
  The final checks pass 263 core tests, thirteen affected database tests and two
  storage integration tests. Thirty-one replies, ordered events and exact
  snapshots match across C/Rust/JavaScript/both Wasm paths and the wgpu host, with
  one actual numeric GPU dispatch. The debug fixture uses an explicit 16 MiB
  test-thread stack after the initial 2 MiB run overflowed.
- This is storage groundwork, not universal codec/layout proof or performance
  acceptance. General element types, direct views/borrowing, sparse indexes,
  compact trees, strategy extraction, recursive termination, local relations,
  broader fact consumers, incremental maintenance and integrated publication
  remain required. Details: `docs/storage-regions-foundation.md`. Receipt:
  `docs/evidence/general-machinery/storage-regions.json`. Logs:
  `storage-core-verified.log`, `storage-contract-db-tests-final.log`,
  `storage-target-parity-final.log`, `storage-published-replay-final.log`, and
  `storage-forged-replay-v2.log`.
- The earlier nine abstract-interface and five value-invariant integration tests
  also pass across the same complete CPU/Wasm and eligible wgpu paths with the
  updated checker (`storage-interface-regressions.log`).
- Knowledge staging checkpoint: `81e435a64853e665113b0a3e673e55983aed8893`.
  This is a local foundation checkpoint while the full programme remains active.
- Storage libraries now share generic element parameters: `Arena<T>`,
  `Chunked<T>` and typed relative `Handle<T>`. Payload storage/observation is
  named `items`. Strings, ordinary records with variable-sized fields and nested
  lists reuse the same builders. Source rejects element-type-confused handles
  and representation access. No new physical strategy case was introduced.
- Repeated authoring can retain an immutable `contracts::ProofContext` through
  `check-contract-proof-stream`. Each proposal and dependency bundle still
  replays with the existing limits. The source identity is fixed at readiness;
  this does not admit the original source contracts. Pure/state, changed-source,
  malformed-request, byte-limit and rejected-then-valid tests pass. Generic
  fixture evidence is identical to independent single-request authoring.
- `storage-observations.ink` adds a general left-fold observer theorem with a
  checked per-step assumption, generic buffer push/append, and list/owned-buffer
  instances. Six ordinary canonical laws replay; a discarding step instance
  rejects. These are reasoning components, not arena/chunk codec proofs.
- Local publication retains historical entries and adds/reuses 22 objects for
  27 generic integer obligations, 30 objects for 30 heterogeneous-payload
  obligations, and six observer laws. Current snapshot is
  `f8fd3a6375c939ad07b6d7269bd4a434c9900a5c51b066556fbfe9c3d3b2272c`.
  Published source/observer views replay. Checks pass 265 core tests, fifteen
  affected database tests, four storage tests, three stream tests and the observer
  authoring test. Forty-seven replies and exact snapshots match across all five
  CPU/Wasm paths and the wgpu host, including two actual numeric GPU dispatches.
  Receipt: `docs/evidence/general-machinery/storage-generic.json`.
- A refined-element probe still needs owned-loop preservation evidence and is
  not admitted. Checked borrowing/views, codec relations, new storage families,
  strategy extraction, authored recursion, local relations, broader fact
  transport, maintenance, performance acceptance and integrated publication
  remain part of the full objective. No performance claim follows from these
  conformance/authoring results.
- Knowledge staging checkpoint: `ecd91d1aaac3718c9dc3e80466803fd415b3fc64`.
  The full programme remains active; this is not remote main publication.

## Continued general machinery (14 October)

The full six-workstream objective remains open. The following additional features
are implemented in the staging checkout; they do not mark the programme complete:

- Refined-element Buffer copying now replays six pure and eleven source-action
  obligations, using reusable fold observation/preservation laws. Fifteen replies,
  invalid ingress, invalid checksummed restoration, abort and exact snapshots
  passed across C/Rust/JavaScript/both Wasm and the wgpu host, including one actual
  eligible GPU dispatch (`owned-storage-parity-v3.log`).
- Authored unsigned measures bind every recursive call to a source-derived strict
  decrease goal and independently verified RUP proof. Derived distance, variable
  subtraction, imports and generic String payloads execute. Lexicographic products
  support later resets after an earlier decrease; increasing the first component
  is a solver counterexample. The final packet covers five call sites. See
  `docs/authored-termination-measures.md` and `termination-lex-database.log`.
- Proper immutable subvalue descent admits recursive record/list and Option chains
  and imported generic tree traversals. Reconstructed parents, ancestor calls and
  loop accumulators cannot grant descent. Ten tree replies and snapshots passed
  all CPU/Wasm targets and the wgpu host with one actual numerical GPU control
  (`recursive-tree-parity.log`). This does not complete source recursive induction
  or recursive refined-value correspondence (`docs/structural-source-descent.md`).
- General structural equality facts now pass through Boolean relational premises
  while scalar IEEE equality remains excluded from bit identity. Six ordinary
  database fold/frame/simulation laws, three scoped range observation laws and
  eleven incremental algebra laws check. Wrong frames, missing assumptions,
  omitted join cross terms and incorrect deletion signs reject
  (`law-regressions-v3.log`, `docs/local-relational-laws.md`).
- Scoped clipped read-only Buffer borrows preserve the original owner and reject
  mutation, capture consumption, parameter-time owner consumption and escape.
  Native slices share payloads; reference snapshots remain independent. Nineteen
  baseline replies passed all CPU/Wasm targets and wgpu host, with one real GPU
  control, and selected direct Rust/Rust-Wasm parity passed. A bounded borrowed
  loop emits one checked read certificate; four potentially unsafe read sites are
  declined (`scoped-range-selected-parity.log`, `docs/scoped-buffer-views.md`).
- The complete standalone core suite passed 275 tests across 48 binaries/doc
  runs (`core-structural-final.log`). Subsequent fixture/product and range-argument
  checks and the broader integration regression run have separate final receipts.
- Whole JavaScript copied-window/borrowed-window/handwritten calls have raw
  interleaved typed/wire samples for small, large and empty windows at five input
  sizes. The database algorithm skips empty range work while retaining the outer
  loop's resource semantics. Results are mixed, with workload/boundary regressions
  retained. Concurrent local work limits performance conclusions. No automatic
  profitability or broad speedup follows. Raw records are in
  `docs/evidence/general-machinery/scoped-range-performance*.json`.

Still required: interchangeable abstract representations and complete owner
interfaces; provenance-bearing storage and general source-bound layout relations;
recursive source induction/validator/codec proofs; effectful region-frame proofs
covering intermediate reads, abort and ordered events; proof transport through
changed selected source and broader lowering consumers; complete compositional
maintained representations/history/lifecycle/memory/performance evidence; and
verified main integration/publication in each changed independent repository.

The final updated standalone core suite passed 276 tests in 48 test/doc runs
(`core-final-v2.log`). Read-only callback contracts now use the actual clipped
view domain; an empty view still checks its one callback invocation. Parameter-time
consumption of the borrowed owner rejects (`borrow-callback-contracts.log`).
Selected direct and packed-column Rust/Rust-Wasm carriers passed; the column test
includes widening u32::MAX beyond its selected 8-bit lane
(`scoped-range-columns-parity.log`). A generated-code audit finds exactly one
literal unchecked read and retains the four uncertified reads.

Local canonical publication added 123 entries and 50 names at snapshot
`6bbb39a8d0ef0dc86ef14a03d264f8330db2889d71227439a2c3cda1b6f59e12`.
All ten storage-observation, six local-relation, eleven incremental and three view
laws independently replay against an unrelated empty source context. Owned pure/
state contracts, all five decreasing calls and the source read capability replay
from repinned canonical bundles. Nine additional column codec entries replay at
snapshot `7c0226b3b51f32946f2d50caab8ad23f1aa4b666464f09c8d18a6a99a92cc8a8`.
Receipts are in `docs/evidence/general-machinery/publication-v2.json` and
`columns-publication.json`; these are pinned local snapshots, not main publication.

Planner discovery classifies termination entries as source-proof dependencies,
without assigning them replacement authority. A bounded planner run on the
measure-bearing source checked its plan and retained the baseline for lack of
comparable lifecycle evidence (`measure-planner-v2.log`). Source import, proof
attachment and standalone package pins remain separate checks.

The broader complete-target regression run passed all 43 tests across abstract
interfaces, source laws, imports, storage regions and value invariants
(`target-regressions-v4.log`). A fresh final scoped-borrow run passed 20 replies,
exact snapshots, baseline C/Rust/JavaScript/both Wasm, wgpu host plus one actual
GPU control, and selected packed-column Rust/Rust-Wasm (`scoped-range-final-parity.log`).
Independent package suites passed with the new exact core/support dependency pins:
13 Rust lowering, 17 JavaScript lowering, 13 C lowering, 7 runtime and 19 native
support tests. The 15 database contract regressions, 4 adversarial termination
producer tests and 7 discovery tests passed. The JavaScript native-surface audit
now excludes the separate checked wire codec while retaining all prior native
performance/safety assertions; this fixes two stale whole-file assertions.

Core checkpoint `96cf06db81e083ba39c34dbe216a96def7a15bfa` and the changed
independent packages are published on staging branches to make exact dependencies
fetchable. They are not merged into remote main. Main has accumulated independent
changes while this programme was staged; integration must preserve those changes
and rerun the complete checks. The full workstreams above remain open.
