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
  This does not yet provide field opacity or interchangeable abstract interfaces.
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
- Remaining requirements include actual abstract opacity/interfaces, general
  storage and externalisation, authored termination, local frame/loop relations,
  broader cross-consumer fact transport, compositional incremental maintenance,
  canonical database publication, full performance evidence and integrated main
  publication. None is waived by the foundation above. See
  `docs/value-invariant-interfaces.md` for the current mechanism and limits.
