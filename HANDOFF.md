# Resume Ink functionality work on another computer

Read this file first, then `AGENTS.md`, `PLAN.md` and the linked domain docs.
This is a continuation of existing work, not a new optimization research task.

Continuation policy update, 2026-10-17: James explicitly authorized changing or
raising limits when justified by the system. The historical prohibitions on
budget increases below are superseded by that instruction. Keep each allowance's
purpose explicit, preserve finite checking and storage bounds, and require actual
proof replay and applicable execution validation. A larger limit is not evidence
that a proposal is correct, admitted or profitable.

## User's current priority and intended result

> Focus on functionality first. Don't worry about hyper optimisation yet.
> Let's get this all working.

Bring the relevant mechanisms from Cheng Lou's Handwired, Pretext and Freerange
into Ink as general language/compiler/runtime capabilities. Continue the adaptive
and trainable computation layer. The user has become frustrated with the duration
and with many small performance experiments displacing major capabilities.
Prioritize working end-to-end features and explicit completion milestones. Do
not start another buffer-layout or throughput study as the next task.

The intended system combines ordinary authored computation, learned behavior,
representation/algorithm alternatives, queries/database work and CPU/JS/Wasm/GPU
execution. Learning should operate through authored computation and explicit full
context, not merely tune one field or collect listener events. The programmer
defines objectives, invariants and permitted degrees of freedom. There is **no
built-in engagement objective**. Source constraints must remain enforced; a loss
penalty does not establish an invariant.

Support offline/pre-compilation training, explicitly staged build-time training,
feedback-triggered runtime updates, and continuous learning during execution.
Ordinary application logic must be able to configure, trigger or coordinate other
learners. The adaptive planner can use programmer-authored/learned goals instead
of only latency, without discarding correctness/applicability/evidence gates.
Authored algorithms can stay fixed while gradients pass through their inputs.
Discrete choices may use search or policy gradients; do not claim every program
is differentiable or silently soften hard execution.

Relevant upstream repositories:

- https://github.com/chenglou/handwired
- https://github.com/chenglou/pretext
- https://github.com/chenglou/freerange

Their website packages are also older pinned dependencies of the documentation
site. That integration is separate from transferring their ideas into Ink. Do not
present website dependency integration as compiler capability delivery.

## Checkout and build

The handoff branch is `codex/ink-functionality-handoff-2026-10-17` in
https://github.com/siliconjungle/ink-lang . All implementation changes below are
already published on main in their respective repositories. The branch adds this
context and portable reproductions.

```sh
git clone --recurse-submodules --branch codex/ink-functionality-handoff-2026-10-17 \
  https://github.com/siliconjungle/ink-lang.git
cd ink-lang
git submodule update --init --recursive
cargo build --locked --bin ink
```

Use a current Rust toolchain, Python 3 and Node. Recent local checks used Rust
1.99.0 / Node 25.3.0 for compiler validation and Node 22.22.1 for older performance
studies; those observations do not imply a strict Node version requirement.
Install `wasm32-unknown-unknown` when running Wasm integration suites. Do not copy
the previous computer's Cargo caches, binaries, credentials or absolute paths.

Read the Cargo path patches and independent submodule pins; do not replace them
with whichever upstream revision happens to be newest. Root core is tracked
source, not a submodule. The current committed core is unchanged by this milestone.

## Published implementation and immediate state

| Repository | Published revision |
| --- | --- |
| Distribution `ink-lang` | `9bb7627584f64641c62f9cc885e6f55518ef061a` |
| `ink-knowledge` | `2395c677e49c7551e857cd65a0acea1097923715` |
| `ink-spec-site` | `5637c25d2ab22e2b66e410b3336587d80373e10d` |

The remaining package pins are recorded authoritatively by this branch's gitlinks.
No submodule was left dirty. Root had one pre-existing uncommitted file:
`core/src/syntax/query.rs`. It was **not** used in the validated compiler build,
changed by this work, staged, committed or published as implementation.

Its exact diff is preserved at
[`local-query-parser.patch`](handoff/functionality-2026-10-17/local-query-parser.patch).
SHA-256: `750cc8098faaad5bd8278f93760af008129ce3c136a79471334c7f604aa564ab`.
It adds semi/anti join parsing and revised clause accounting. Carry it as separate
unvalidated work; do not silently apply it or include it in the following checks.
It remains dirty on the original computer. A fresh checkout is intentionally
clean and includes the patch as data.

## What works already

These are implemented foundations with documented domain limits, not universal
claims about all application graphs or backends:

- Trainable/adaptive source declarations, authored objectives, constraints and
  explicit state; offline/build/runtime learning and coordination between learners.
- Cooperative continuous sessions with observation queues, cadence/work budgets,
  serving/candidate versions, publication checks, cancellation and durable recovery.
- Forward differentiation/JVP, bounded F32 source reverse differentiation,
  authored reverse graphs, optimizer continuation, Adam/backtracking and categorical
  score-function policy gradients.
- Complete state/optimizer snapshots, events, rollback and frozen trained builds.
- Frozen operation-sequence specialization, source extensions, balanced helpers,
  whole-function and whole-action proof paths; guarded mutable-structure examples.
- Authored planner objectives, captured learned context, retargeting and learned
  source-frontier advice. This is not general learned physical implementation search.
- Query/maintained-state, owned collection, prepared text/numeric and eligible GPU
  execution foundations. Learning currently runs primarily on CPU hosts.

Start with these current descriptions and working examples:

- [Learning phases](docs/learning-lifecycle.md), [adaptive interfaces](docs/adaptive-learning.md),
  [continuous sessions](docs/continuous-learning.md), [trained builds](docs/trained-builds.md).
- [Source reverse differentiation](docs/source-reverse-differentiation.md),
  [reverse learning](docs/reverse-learning.md), [policy learning](docs/policy-learning.md).
- [Programmable objectives](docs/programmable-objectives.md),
  [learned search](docs/learned-search.md), [adaptive execution](docs/adaptive-state.md).
- [Frozen composition](docs/frozen-composition.md),
  [learned programs](docs/learned-programs.md), [frozen state](docs/frozen-state.md).
- `examples/neural-adaptive.ink`, `examples/staged-neural.ink`,
  `examples/prepared-neural.ink`, `examples/source-reverse-learning.ink`,
  `examples/learning-orchestration.ink`, `examples/continuous-learning.ink`,
  `examples/programmable-objective.ink`, `examples/learned-program.ink`.

## The last completed functional change

Knowledge commit `2395c677e4` adds:

1. Following fully closed immutable `keep` values during specialization, with
   lexical shadowing/cycle handling and no cached dynamic state reads.
2. Selected `Option`/`Result` `map`, `map_err` and `fold` callbacks, retaining
   dynamic captures and selected-arm laziness; known successful `?` unwrapping.
3. Bounded calls to the independent reference evaluator to propose closed
   pure-function literals. These are untrusted proposals, never proof authority.
4. Original element-type retention for residual literal collection receivers,
   fixing graph output indices accidentally inferred as U64 instead of U32.
5. Counting actual distinct helpers at the existing cap, permitting reuse, and
   transactional action-level rollback on exhausted optional expansion. A large
   training action need not discard already constructed serving helpers.
6. Preserving prepared keeps in changing strict defaults, avoiding expansion of
   a large default optimizer into every action while preserving its execution.

No new syntax, checker allowance, primitive semantics, automatic selection,
trained profitable representation model or performance claim was added.

Files to study:

- `knowledge/producers/frozen_specialization.py` — `Partial`, `closed_keep`,
  `sum_callback`, receiver typing and `ReferenceCalls` integration.
- `knowledge/producers/closed_reference_calls.py` — typed argument transport,
  exact F32 bits, original pure functions only, 16 distinct calls, 30s timeout,
  default reference evaluation budget and bounded output.
- `knowledge/producers/frozen_composition.py` — `ChunkPartial`, helper interning,
  per-action transactional proposal and complete plan admission.
- `knowledge/producers/frozen_build.py` — the same mechanism during build discovery.
- `knowledge/tests/test_prepared_frozen_computation.py` — complete checked plan,
  changing weights, JavaScript outputs/exact snapshots, false evaluated defaults,
  forged selected returns, shadowing, laziness, failures and budget tests.

## Immediate unfinished milestone: real full-network proof admission

The real application has **232 nodes, 244 trainable parameters, 10 inputs,
hidden widths [6,6], and 4 outputs**. Initially it produced zero specialized
helpers. The new mechanism produces **117 helpers**, and that complete source
passes `check-core`. It is **not yet a proof-admitted specialized executable**.
The full compiled-plan producer exhausts `fold chunk proposal work budget`.
Do not increase that budget or pretend source checking proves equivalence.

Portable files are in [`handoff/functionality-2026-10-17`](handoff/functionality-2026-10-17):

- `network/source.core.json`: original authored application, not frozen.
- `network/model.snapshot` and `reference-history.json`: original trained
  application baseline; these do not belong to the separately authored frozen source.
- `network/authored-frozen.core.json`: explicit frozen Architecture initialization.
- `network/constructor-args.json`, `reference-receipt.json`: bounded default
  constructor evaluation and historical provenance.
- `network/source-checked-proposal.core.json`, `prepared-summary.json`: current
  proposal and source-check result.
- `network/proof-frontier.json`: first `ComputationEquality.prove` frontier
  (left/right/environment/hypotheses); helper objects can be regenerated.
- `validation/full-network-proof-failure.log`: current complete failure trace.
- `manifest.json`: byte hashes for transfer integrity, **not** proof authority.

The authored frozen source changes initial logical rows and source identity.
**Never rehash the original checkpoint into that namespace or claim an original
snapshot migration.** This is an explicit authored restriction/initialization.

Reproduce from the branch root:

```sh
python3 tools/reproduce_prepared_network_handoff.py --ink target/debug/ink
```

This verifies the handoff inventory, regenerates and checks the source proposal,
then attempts complete plan construction in `build/prepared-network-handoff`.
The recorded expected state is source success followed by a nonzero proof-authoring
exit. A future fix must turn that into genuine checked plan success, then test
baseline/selected full outputs, dynamic weights, failures, events, restoration and
exact snapshots across the applicable targets. Do not suppress the failure.

Suggested next investigation:

1. Retain the complete model/definition objects and locate the unmatched structure
   that sends `frozen_composition.produce` into `ComputationEquality` fallback.
2. Inspect `knowledge/producers/computation_equality.py`, `fold_chunks.py`,
   `closed_data_bridges.py`, `function_equality.py` and `function_specialization.py`.
   Reuse modular checked equations and shared definitions instead of repeatedly
   expanding whole transition contexts or closed constructors.
3. The recorded frontier enters `ComputationEquality` at work count 79,458; it
   contains repeated nested matches with differing pure-call IDs. Determine their
   definitions before choosing a fix. The remaining work is not diagnosed as
   simply needing a larger helper count or larger numeric buffer.
4. Preserve the working generic mechanisms and add regressions for the actual
   structural gap. Then admit the real plan and exercise the full application.

## Validation and external jobs at transfer

Local checks completed successfully with a genuine compiler built from committed
distribution `802dac62e9bc58698d5a6363e42ac6e62c4125d8`
(see the historical compiler SHA in the reproduction provenance). Root executable
source has not changed in the current functionality milestone. Use this branch's
clean committed source and rebuild on the new computer.

The retained logs show **51 passing tests**:

```sh
INK_COMPILER="$PWD/target/debug/ink" PYTHONPATH=knowledge:planner \
  python3 -m unittest discover -s knowledge/tests -p 'test_prepared_frozen_computation.py' -v
INK_COMPILER="$PWD/target/debug/ink" PYTHONPATH=knowledge:planner \
  python3 -m unittest discover -s knowledge/tests -p 'test_frozen*.py' -v
INK_COMPILER="$PWD/target/debug/ink" PYTHONPATH=knowledge:planner \
  python3 -m unittest knowledge.tests.test_owned_frozen_graph \
  knowledge.tests.test_function_specialization knowledge.tests.test_closed_data_bridges \
  knowledge.tests.test_guarded_specialization -v
```

The new prepared test is mandatory in `.github/workflows/conformance.yml`.
Docs `npm run build:pages` passed type checks, Freerange checks and Vite build.
The browser editor package was deliberately not resynchronized.

External job IDs, last observed queued/pending (recheck authoritatively):

- Root conformance: https://github.com/siliconjungle/ink-lang/actions/runs/38992773334
  at `9bb7627584f64641c62f9cc885e6f55518ef061a`.
- Docs Pages: https://github.com/siliconjungle/ink-spec-site/actions/runs/38992808637
  at `5637c25d2ab22e2b66e410b3336587d80373e10d`.
- Earlier docs run `38992792139` may precede the current one in the Pages group.

Do not call full CI green until **every job** is terminal success. Do not restart
or cancel confirmed live jobs merely because observation times out or queues are
slow. After Pages succeeds, fetch the public guide and verify the section
`specialize-prepared-computation-structure` and its pinned root docs link.

## Broader functional backlog: keep the whole goal intact

The detailed, versioned inventory and delivery checklist are in
[the Cheng Lou programme](docs/chenglou-optimisation-programme.md). Some older
table statuses predate subsequent deliveries; read the later sections too.

Outstanding groups include:

1. **Whole-computation/model graph and tape compilation:** finish the real network
   above, wider function shapes and reusable graph execution with dynamic data.
2. **Learned implementation and goal choices:** complete the path from authored
   learned context to actual eligible representation/algorithm/placement variants,
   checked migration/fallback and programmable objective changes. Existing source
   advice and frozen examples are foundations, not general autonomous selection.
3. **Learning execution:** F64 AD, broader source/control-flow domains, batched
   GPU-resident gradients/optimizer/training, and explicit concurrency semantics.
   A pure GPU dispatch beside CPU learning does not demonstrate device training.
4. **Freerange transfer:** reusable forward numeric/branch facts, backward missing
   requirements, source-bound interprocedural summaries/diagnostics, checked
   narrowing and whole-region fallback, and compact/packed consumers.
5. **Pretext transfer:** broader stable/varying-input preparation, environment-bound
   invalidation, requested fields/count/exists/height/windows, incremental edits
   and faithful geometry/text behavior beyond current prepared examples.
6. **Cross-stack composition:** ordinary code/query/device plans, resident
   intermediates, changed-region transfers and database/external-storage execution.
7. **Implementation assurance and contracts:** strengthen translation/runtime/ABI
   checking, preserve explicit approximation/error/probability domains, and expose
   useful staleness/capacity/tie/fallback contracts with actual consumers.

Do not claim the complete programme or broad Handwired parity is delivered.
Performance acceptance remains future work after working capabilities; the user
has explicitly reprioritized functionality over hyper optimization.

## Constraints and communication

- `AGENTS.md` governs architecture and publication. New general semantics/checking
  live in core; algorithms, laws and proposals live in independently pinned knowledge.
- Literal backend implementation, database equality authority and planner
  profitability are separate gates. No matcher, hash, learned score or reference
  evaluator answer grants rewrite authority.
- Automatic choices require comparable lifecycle evidence or an admitted validated
  work model, including maintained folds. The former asymptotic exception was removed.
- Preserve values, exact errors/events, ownership, operand order, strict defaults,
  callback laziness, raw float NaNs/signed zeros, rollback and portable snapshots.
- No budget increases, fake Cargo fingerprints or reused binaries claimed as fresh
  builds. No unvalidated parser change in published implementation.
- Editor/schema work stays excluded. Use actual device work for device claims.
- The user authorized publishing validated implementation on main and redeploying
  docs. This context branch was explicitly requested for transfer. No PR is needed.
- Do not spawn subagents without explicit authorization. Do not send external
  messages. Do not copy credentials or private machine configuration into Git.
- Communicate concrete capability progress and remaining gaps. Avoid lengthy
  performance-report cycles, vague reassurance or implying near completion.
- Full goal completion needs evidence for the whole requested functionality;
  completing a small milestone does not complete the goal.

## Resume prompt to paste into Codex

> Read HANDOFF.md and AGENTS.md on this branch. Continue the Ink functionality-first
> goal, starting with full-network proof admission. Preserve the separate parser
> patch, rebuild from committed sources, inspect current CI/deployment state, and
> get the actual end-to-end capabilities working. Do not resume microbenchmark or
> buffer-layout tuning. Keep the broader adaptive/three-project scope intact.
