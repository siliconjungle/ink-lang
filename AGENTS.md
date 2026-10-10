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
