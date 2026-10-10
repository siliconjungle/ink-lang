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

Total pure action/keep regions now use the existing semantic equality selection
interface, with sealed lexical slots and scoped branch facts. Their checked
selection alone grants the original program snapshot identity; raw hashes cannot
grant it. Whole-action/physical representation authority remains open. See
docs/action-regions.md. General FOL laws additionally use abstract sorts/functions
and checked Instance interpretations, with every assumption discharged and
transitive parameter dependence rejected at closed program obligations. This is
a new general kernel mechanism, not an optimisation pattern or an unchanged-rule
claim. Preserve its adversarial tests and unchanged resource limits; see
docs/general-laws.md.

Whole-action source transition admission now exists for the documented subset in
core/src/action_model.rs, with database-supplied equality proofs consumed through
Package.action_replacement. Preserve exact source/public-interface binding and
all-action proof coverage. The stable removal law belongs in ink-knowledge;
source projection and literal primitive meanings belong in the core. No kernel
rule changed. Nested calls, Try, other numbers, ID keys and maintained-view or
physical-representation admission are still open. Do not treat conformance as a
proof of native emission. See docs/action-transitions.md and retain PLAN.md scope.


Existing numerical source types now cross state/action/event/keep boundaries.
Preserve the explicit typed-actions V2 marker for numerical domains and unchanged
old-domain V1 bytes. Floats use IEEE scalar comparisons and raw-bit aggregate
identity; no total float key ordering or floating rewrite authority is admitted.
Snapshot container V1 binds new schemas without migration. Preserve WGSL's
separate float contract and numerical logical projection's fail-closed boundary.
See docs/numerical-state.md; no source Type or proof-kernel change was made.
