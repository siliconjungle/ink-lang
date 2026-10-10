# Ink architecture

The language implementation lives in this repository. Proof objects, alternative
implementations, canonical discovery data and Lean research
live in the independently versioned `siliconjungle/ink-knowledge` repository,
pinned here as the `knowledge` submodule.

Keep the semantic core and checking rules small. New optimisation laws,
representation choices, range-specialisation strategies and work-skipping
algorithms should be database definitions, candidates and checked proofs.
Do not add package-name whitelists, trusted theorem flags or optimisation-specific
kernel rules. A new core mechanism needs a general semantic/checking justification,
an explicit trust-boundary update and meaningful validation.

Keep fixed primitive semantics in the core. The user explicitly moved target
lowering to independently versioned backend packages. The distribution facade
can depend on those packages; ink-core must not. Keep target selection and bridge
cost search external, and validate composed computations with general proofs.
The modular-polynomial compiler path has been retired. The existing aggregate
schema, bounded-cache and layout mechanisms remain migration debt; moving files
is not evidence that their authority has been externalised.
See `docs/small-core-and-knowledge.md` and the production milestones in `PLAN.md`.

The core must build without the knowledge checkout. Full integration tests use
`git submodule update --init knowledge` and its exact committed revision. Never
silently fetch or select the latest catalogue. Check supplied proof bytes locally;
repository pins, hashes, profiles and server receipts do not establish correctness.

Keep correctness, application conditions and measured profitability separate.
Preserve archived benchmark inputs and results when changing active tools.

Planner search and cost selection belong in the pinned ink-planner repository.
Backend-neutral execution, bundle assembly, host ABIs, profiling and fallback
belong in ink-runtime. Target emission and GPU device operations remain in
lowering packages. Core source belongs in core/src, never distribution src.
Canonical entries and pinned snapshots are the knowledge storage contract;
SQLite is a disposable index, never mathematical authority. New interface
changes do not need backward compatibility for historical research formats.

## Direct action execution and production scope

The reference now executes source-bound typed bodies directly, using resolved
slots and ordered nodes. Actions/keeps do not consume the reconstructed source
adapter; it remains a backend compatibility interface. General primitive
semantics and transaction/snapshot boundaries are unchanged. Legacy maintained
row contributions still use their source evaluator and specialised admission.
No new proof-kernel rule or stateful replacement authority was added. Continue
with a whole-action logical interpreter, primitive correspondence and universal
representation preservation; passing conformance tests does not close those
gates. See docs/typed-actions.md and reports/typed-execution-phase1.

Parallel lowering/runtime parity is integrated. Preserve the independently
versioned pins and validate CPU values/errors/events/exact snapshots and eligible
GPU execution after semantic changes. GPU scan/rank-sort are literal current
algorithms, not efficiency claims. James excludes editor support and schema
evolution; installation, diagnostics/debugging and crash recovery remain in scope.

Complete code-data binding is implemented in core/src/source_syntax.rs. Its private
witness authenticates exact full module and typed-action data, not interpreter
meaning or candidate admission. Do not treat arbitrary database interpreters as
authoritative merely because their definitions pass general type checking. The
next gate is fixed action semantics/primitive correspondence and all-future
stateful candidate preservation. The external source-image and view-proof producers
belong to ink-knowledge. --prove-views falls back to recomputation when a proof
cannot be checked; --require-views fails. Builds without these flags keep their
legacy disclosed trust. Claude's 20 additional Lean laws are locally checked only,
not Hunchroom/Nanoda accepted. See reports/source-syntax-phase1.

Parallel module/durable-host/runtime improvements are integrated from 5a43118,
runtime a7ee91b. Preserve the concise PLAN and its archived full acceptance scope.
Module loading is distribution-owned; core parsing accepts a bounded constructor
name hint only, with no type or proof authority. Full-code binding includes linked
imported helpers. Source/effect/stateful replacement admission remains this chat's
ownership; coordinate parser/distribution edits with the parallel backend chat.
Final enabled conformance compares 516 requests/exact snapshots on all five CPU
paths and 102 actual wgpu calls; generated durability uses JS and both Wasm paths.
Snapshots/outbox/retry receipts are durable under the declared host guarantees,
not permanent exactly-once delivery. Native C/Rust executable embedding now
uses the runtime durable host and synced-file adapter; incremental logs and the
mixed-wgpu runner remain separate work. Keep numerical
state/action-boundary consistency and logical action/primitive correspondence open.

General action values in core/src/action_values.rs bind complete code and exact
carrier definitions independently of aggregate certificates. Flat postorder
images preserve the supported action domain, use binary exact-integer magnitudes
and reject aliasing, forward/unused references and noncanonical order. The
external producer is knowledge/producers/action_values.py. These are data checks,
not logical interpreter, primitive arithmetic or stateful replacement authority.
Keep existing proof/transport limits and the trusted codec boundary explicit.
