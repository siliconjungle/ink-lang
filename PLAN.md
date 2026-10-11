# Ink production acceptance gates

The objective remains the broad language in
[the specification](docs/language-specification-draft.md), with fair evaluation
against C, C++ and Rust. The executable subset and its evidence are documented
in [lowering parity](docs/lowering-parity.md). A successful example does not close
an entire gate. Editor support and schema evolution are outside the current scope.

The philosophy is to keep program meaning stable while implementation knowledge
accumulates. Reusable alternatives and proved laws belong in knowledge; the core
supplies fixed semantics and general checking. Measurements rank admitted
alternatives. [Design and ambitions](docs/vision.md) explains this separation;
[status](STATUS.md) distinguishes integrated features from active work.

## Responsibilities and authority

- **ink-core:** fixed language semantics, checked typed IR, reference execution,
  general evidence checking and application correspondence.
- **ink-knowledge:** immutable content-addressed definitions, candidates,
  applicability conditions, dependencies and proofs; separate performance
  observations. Git objects are canonical; SQLite is a rebuildable index.
- **ink-planner:** bounded discovery, composition, cost selection and replayable
  plans over pinned snapshots. Search exhaustion retains the baseline.
- **ink-runtime:** compiled execution, host ABIs, mixed-target orchestration,
  profiling, safe fallback, persistence and delivery.
- **Lowerings:** literal target emission and device operations. Profiling,
  repository identities and hashes never confer proof authority.

## Current priorities

| Priority | Deliverable | Acceptance gate |
| --- | --- | --- |
| 1 | Database-supplied table representation and query maintenance | Admit a candidate against an actual unchanged Ink application. Execute it through compiled backends; preserve arbitrary future updates, replies, errors, aborts, ordered events, checkpoints and restoration. Compose independently supplied candidates. Reject incorrect conditions/evidence. Preserve a baseline and replay the pinned selection. |
| 2 | Competitive complete execution | Measure construction, execution, teardown, retained memory, compile time and proof-check cost against algorithm/layout-matched C/C++/Rust. Improve baseline primitives and admit database alternatives without new catalogue rules in the core. GPU selection includes transfer, setup and readback; bounded search/adaptation checks guards, migration and fallback. |
| 3 | Permanent backend conformance gate | Generate bounded well-typed programs and action histories; compare reference, C, Rust, JavaScript and both Wasm paths. Exercise eligible WebGPU/wgpu separately, including resident empty/shrinking pipelines. Compare exact portable snapshots and preserve failing seeds. Unsupported GPU features use the compiled baseline. |
| 4 | Usable language and distribution | Modules/imports, a small standard library, actionable diagnostics, installation and debugging; consistent existing types across pure and stateful boundaries. Keep executable and draft features explicit. |
| 5 | Durable deployment | Persist state and outbox before returning success; recover from interrupted writes and crashes. Persist acknowledgements; demonstrate at-least-once delivery with receiver deduplication and bounded request retry receipts. Declare single-writer and storage limits. Test native compiled C/Rust and browser storage, compiled JavaScript/Wasm continuation and corruption rejection. |
| 6 | Trust-boundary hardening | Adversarial/fuzz and independent checking of admission and codecs; connect any external metatheory explicitly to the implemented checker before verification claims. Report concurrency and resource boundaries, raw measurements and remaining trusted components. |

## Outstanding architecture requirements

[Engine39](reports/web-stack-engine-39-2026-10-11/REPORT.md) supplies bounded
facts through composition, destination reuse, a twenty-regression diagnosis,
seven-family comparisons and separately frozen target/adaptive models. These are
implemented experiments, not a closed competitive-execution gate. Next work must
reduce complete-call transport and remaining multi-pass storage, improve physical
target features/training coverage, and isolate fused scheduling/representation
losses. Heldout errors and adverse selections rule out enabling the broad fitted
model by default. Resident GPU and complete requests retain distinct accounting.

Stateful research should use exact relevant changes to maintain results and
workload frequencies/lifetime to choose whether maintenance pays. Charge setup,
proof checking, additional writes, memory and migration. Trial bounded saved-profile
or batch/session selection with an explicit static policy before a general live
controller; never benchmark an effectful action by executing it speculatively.

Default aggregate, bounded-cache and typed-policy admission is retired. Canonical
source-bound representation entries now check all-action observation/invariant
preservation and direct physical migrations, and execute through a literal Rust
definition backend with baseline-compatible logical snapshots. See
[the contract, tests and limits](docs/database-representations.md). Historical
experiments require an explicit research feature. Priority 1 remains open beyond
the current u64 transition subset: fixed exact-Int/keep correspondence, broader
source domains, general incremental aggregates and other native
representation executors still require implementation. Fixed-key remove/replace
delta candidates, List value/count/u64-sum correspondence, owned collection
laws and external lifecycle/migration/memory selection are implemented;
[the current measurements](reports/incremental-maintenance-selection/README.md)
favour the simpler direct layout. Native resource limits and copying costs still
constrain these prototypes. No performance gate is
closed by representation correctness tests.

Ownership and representation work must include contiguous/compact layouts,
fewer copies and allocations, general arenas and ownership inference, narrow
relative links, variable-sized inline data/enums and construction into final
destinations. Representation choices belong in the database and need native
correspondence and future-update safety. Typed storage policies alone do not
satisfy this requirement.

Core builds must work without the catalogue. Integration pins exact knowledge,
planner, runtime and backend revisions; locally checked proof bytes establish
admission. Generated code, Rust/LLVM/C toolchains, fixed GPU primitives, host ABIs
and device drivers remain disclosed trusted components.

Historical milestones, inputs, receipts and open requirements are preserved in
[the archived plan](docs/history/implementation-plan-through-parity.md) and
`reports/`. Keep them when updating active tools. New formats need no historical
compatibility layer.

## Generic language foundation

The bounded implementation and its exact limits are documented in
[generic language foundations](docs/generic-language-foundations.md). Ordinary
value consistency, hygienic generics/aliases/constants, payload enums/matching,
finite local iteration, fixed arrays and nonescaping pure callbacks are
implemented. External collection/checked-division libraries and 202 checked
finite-list laws provide reusable algorithms and work skipping. CPU conformance
is mandatory; broad GPU coverage and proof correspondence beyond admitted source
domains remain open. Compact words/Bytes, scoped views and efficient physical
updates, practical contracts/refinements and external theorem authoring remain
acceptance work. Totality is not weakened to admit unrestricted loops or closures.
