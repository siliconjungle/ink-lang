# Ink architecture

Ink separates program meaning from accumulated implementation knowledge.
Keep fixed primitive semantics and general checking in `core/src`. Optimisation
laws, work skipping, range specialisations, maintained representations and layout
alternatives belong in the independently pinned `ink-knowledge` database.
No target matcher, theorem whitelist or hash may grant rewrite authority.

The distribution pins C, Rust, JavaScript, Wasm and GPU lowering packages.
Each backend emits checked programs literally and reports unsupported capabilities.
General visitors, lexical binding and expression limits belong in core analysis.
A new primitive needs general semantics, explicit trust documentation and meaningful
adversarial and cross-target validation. `foldr` and `fold_until` have distinct fixed
iteration semantics; proofs selecting early termination stay in the database.

Every backend uses `ink-abi`. It owns value descriptors, packed layouts, C headers,
and the shared host decision contract. Browser hosts run the same Rust decision
and workload-feature code through Wasm; do not duplicate those algorithms.
`ink-native-support` owns emitted value/ownership primitives and state exports.
Keep dynamic and typed representations separate where their contracts differ.
The independently implemented reference evaluator stays in core.

Planner search and model fitting belong in `ink-planner`. Structural prices,
immutable measurements and fitted models live in knowledge. Runtime executes
already eligible implementations, applies the common decision contract, enforces
resource limits and falls back on device failure. Runtime does not run profitability
probes. Missing comparable evidence retains the compiled CPU baseline.
Correctness, applicability and profitability are separate gates.

Legacy aggregate certificates, bounded cache/narrowing, typed storage policies,
source maintenance evaluators and historical scalar loaders are removed.
Do not restore compatibility flags, experiment admission paths or obsolete APIs.
Archived evidence may remain as data; current tooling uses current contracts.

Core must build without the knowledge checkout or any backend. Integration uses
exact independent repository revisions; never silently select the latest catalogue.
Canonical entries and snapshots are the storage contract. SQLite is a disposable
index. Check proof bytes locally: pins, observations and profiles are not proof.

Source image checks bind complete modules and typed values, not interpreter meaning.
Selection binds exact source and checks applicable equality proofs. Physical
representations additionally require universal source/action preservation and
checked encode/decode or migration. Keep each admitted proof domain and its
remaining limitations explicit; tests do not prove backend correctness.

Validate reference/native/JavaScript/Wasm values, errors, events and exact snapshots
when changing semantics or generated support. Exercise actual eligible GPU work.
Ordered parallel map has sequential value semantics. Grain and worker counts are
scheduling hints; owned captures, recursion and scratch bounds remain checked.
GPU feedback preserves simultaneous assignment and bounded capacity. Resource
failure retains CPU execution. Do not make performance claims from conformance.

Editor support and schema evolution remain outside James's requested scope.
Installation, diagnostics, durable snapshots, transaction rollback, recovery and
portable logical state remain in scope. Keep broader proof ambitions distinct from
what is currently admitted; see PLAN.md and the domain-specific docs.

Source correspondence covers the admitted scalar, collection, vector and pure closure domains. Preserve fail-closed unsupported keys/operators and standalone representation conformance across CPU, JavaScript, both Wasm and both GPU hosts. Recursive physical state executes on the host. Keep caller-trusted standalone calls and explicit checked codec boundaries distinct; benchmark checking, compilation, migration and steady state separately.

The generic stateful representation executor, research bundle adapters and per-call
logical snapshot validation are removed. Do not restore them under a new name.
Compilation checks representation/bridge proofs; ordinary compiled state retains
transaction semantics and portable checkpoint/restore migration.
