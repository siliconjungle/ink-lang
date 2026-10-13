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
- Remaining requirements include interchangeable abstract interfaces and owners, general
  storage and externalisation, authored termination, local frame/loop relations,
  broader cross-consumer fact transport, compositional incremental maintenance,
  canonical database publication, full performance evidence and integrated main
  publication. None is waived by the foundation above. See
  `docs/value-invariant-interfaces.md` for the current mechanism and limits.
