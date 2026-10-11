# Ink: design and ambitions

Ink aims to let programs benefit from an expanding body of checked optimisation
knowledge. Programmers describe computation, persistent state, permitted changes
and observable results. The implementation may choose a better algorithm, layout
or execution plan when it can establish that the program still means the same
thing.

This is a working architecture with incomplete coverage. [Status](../STATUS.md)
describes the executable subset; [the specification](language-specification-draft.md)
describes the wider language; [the plan](../PLAN.md) defines acceptance gates.

## Philosophy

**Keep program meaning stable; let implementation knowledge accumulate.**

Programs should describe the required results and permitted changes clearly
enough that implementations can evolve around them. Knowledge gained for one
program should help other programs. A useful proved transformation should become
a reusable entry that can be discovered, checked and applied again.

Authority should be concentrated in explicit semantics and checking. Authors,
AI agents and search can propose creative alternatives without becoming trusted
sources of truth. Local proof checking determines admission; hashes and repository
identity authenticate content. Neither reputation nor measured success replaces
an obligation to establish correctness at the application site.

Correctness and cost are different kinds of knowledge. Preserve the intended
contract precisely, then use evidence to improve its execution. Exact information
about a change can justify retaining a result; a statistical pattern can help
choose a strategy. An approximate numerical contract must be explicit rather
than silently introduced as an optimisation.

Keep fixed semantics and general checking machinery in the core. Put reusable
algorithms, transformation laws and representation choices in independently
evolving knowledge. Add general mechanisms where execution or correspondence
needs them, with their trust obligations exposed.

Measure progress through useful work avoided, efficient remaining work and
improvements that carry across programs. Search, setup, copying, maintenance,
migration and teardown are part of the cost. A correct alternative that loses on
a workload should remain optional. Reproducible evidence and honest limits are
part of the design.

## Knowledge that can improve existing programs

A conventional compiler gains transformations when its implementation gains new
passes. Ink additionally lets reusable definitions, alternatives and proved laws
arrive as independently versioned data. Its untrusted planner discovers applicable
entries and composes them. The core checks the resulting evidence against fixed
semantics and the actual program before accepting a replacement.

A map-fusion theorem can serve many pipelines. An order-insensitivity theorem can
remove a sort before an eligible observation. An incremental-update theorem can
justify repairing a derived result after a change. The goal is to make useful
reasoning reusable across programs.

New knowledge does not automatically extend the language or its proof domain.
The core must already express the operations and establish their correspondence
to executable meaning. Missing correspondence requires general semantic machinery;
an operation that cannot be expressed or efficiently executed may require a
general primitive or better lowering. Optimisation-specific recognisers and trusted
theorem names would undermine the architecture.

## Three kinds of information

| Information | Role |
| --- | --- |
| Types, ownership, ranges, purity and provable structure | Establish which transformations or memory behaviours are permitted |
| Exact committed changes and dependencies | Establish which derived results must change and which can be retained |
| Measured sizes, operation frequencies, lifetime, hardware and residency | Estimate which permitted implementation is worth selecting |

The first two can establish correctness conditions. The third describes costs.
A profile that says a key rarely changes can favour a cache; it cannot establish
that the cached value is still correct after an unexamined update.

Useful facts must reach code generation. A theorem that eliminates intermediate
collections has limited value if the emitter recreates their copying costs.
Conversely, efficient buffer reuse does not prove that changing the algorithm
preserves results. The proof path and physical execution need to improve together.

## Stateful programs and incremental work

Ink already has typed tables, transactions, rollback, ordered events and portable
snapshots. The representation interface admits database-supplied physical state,
encoding, decoding, invariants and per-action implementations for a restricted
source domain. It requires universal observation and invariant-preservation
evidence for every action. A checked migration relates exact endpoints; the
runtime publishes a switch at a transaction boundary.

The ambition extends to indexed access, compact layouts, maintained aggregates
and selective recomputation. Relevant updates should repair only affected work;
unrelated changes and aborted transactions should retain valid results. Future
actions, replies, errors, events and restoration must remain correct after every
accepted change. Broader source domains and efficient physical executors are
still required.

Caching has an economic condition as well as a mathematical one. Reads saved must
pay for setup, extra write work, storage, migration and selection overhead. Short
sessions can prefer direct computation even when a cache is correct. The cost of
transporting and validating complete state can dominate the lookup itself.

## Execution and adaptation

The implementation targets native CPUs, JavaScript, WebAssembly and eligible GPU
work. It aims to approach strong handwritten implementations by removing avoidable
work and making the remaining work efficient. Target-specific memory behaviour,
ownership, scheduling and device residency matter as much as expression size.

Most selection can happen during compilation or from previously collected
profiles. Runtime choices are useful where current size, residency or workload
changes materially affect cost. The intended policy is bounded choice among
checked alternatives at pipeline, batch or transaction boundaries, with explicit
static execution available for predictability. Adaptive and static execution
must satisfy the same semantic contract; numerical approximation is a separate
contract.

Live general adaptation remains an ambition. Candidate eligibility, resource
limits, migration costs, stable selection and fallback need explicit implementation
and evidence. Effectful actions cannot be speculatively repeated to benchmark
alternatives.

## Where to test the idea

Promising workloads include composed data transforms, simulation steps, repeated
queries over changing application state and long-lived pipelines that can retain
prepared resources. They expose opportunities for fusion, sharing, precise delta
maintenance and amortised setup. These are research targets whose performance
must be established against strong controls.

Success means that adding general knowledge improves previously unfamiliar
programs, with bounded discovery/checking costs and fewer regressions. Evaluation
must include full returned results, lifecycle costs and adverse cases. A larger
database or a shorter selected expression alone does not establish progress.

## Assurance and scope

The database is currently delivered through the independently pinned Ink
repositories. Immutable files and a disposable discovery index implement its
data contract. Selected proof closures can be checked and replayed offline.
Hashes authenticate bytes; proof checking establishes mathematical admission.
Measurements remain separate.

Ink combines established ideas in proof-carrying transformations, external
optimisation knowledge and independent checking. Its practical integration is
the contribution being explored; an external database alone is not a claim of
historical novelty.

The Rust checker, source projection, literal emitters, codecs, runtime hosts and
toolchains remain disclosed trust boundaries. Lean proofs of a model or a
separate calculus strengthen those particular claims; they do not automatically
verify Ink's implementation. Broad checker assurance and backend correspondence
remain active goals. Editor support and schema evolution are outside the current
acceptance scope.
