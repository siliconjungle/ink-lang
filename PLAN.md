# Ink production acceptance gates

The objective remains the broad language in
[the specification](docs/language-specification-draft.md), with fair evaluation
against C, C++ and Rust. The executable subset and its evidence are documented
in [lowering parity](docs/lowering-parity.md). A successful example does not close
an entire gate. Editor support and schema evolution are outside the current scope.

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
| 5 | Durable deployment | Persist state and outbox before returning success; recover from interrupted writes and crashes. Persist acknowledgements; demonstrate at-least-once delivery with receiver deduplication and bounded request retry receipts. Declare single-writer and storage limits. Test native and browser storage, compiled JavaScript/Wasm continuation and corruption rejection. |
| 6 | Trust-boundary hardening | Adversarial/fuzz and independent checking of admission and codecs; connect any external metatheory explicitly to the implemented checker before verification claims. Report concurrency and resource boundaries, raw measurements and remaining trusted components. |

## Outstanding architecture requirements

The old aggregate, bounded-cache and layout admission paths remain migration
debt until their authority uses the common checked entry/evidence interface.
Moving their files does not complete that migration. General stateful admission
must connect logical models to real source actions and physical execution;
isolated layout lemmas are insufficient.

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
