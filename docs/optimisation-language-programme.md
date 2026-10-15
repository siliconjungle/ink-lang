# Optimisation language implementation programme

James requested implementation, tests and benchmarks for the complete syntax
review on 2026-10-15, with each completed feature published on main. This is the
scope ledger, not a completion certificate. Partial milestones do not close a
feature family. The review's fourteen families and their subrequirements remain
in scope until executable, checked and measured evidence establishes them.

## Requirements and acceptance evidence

| Family | Required capability | Current work / completion evidence |
| --- | --- | --- |
| 1 Collections | Distinct List/Bag/Set meanings; multiplicity, structural identity, order-safe observations and explicit ordered conversion; no change to existing collection order | Open |
| 2 Relational expressions | Typed from/where/join/group/select/exists/distinct/order; outer and anti joins, top-k and windows; composable queries and ordinary checked optimization proposals | Ordered list/exists foundation implemented and validated; grouping, other operators and optimization proposals remain open |
| 3 Refinements and shapes | Compact refinement types; sorted/key-unique collections, related lengths and indices, matrix shapes, ranges/capacities and cross-call fact transport | Existing refined records and const arrays are foundations; broader interfaces open |
| 4 Algebraic interfaces | Named operations with independently checked identity/associativity/commutativity/inverse/idempotence/monotonicity obligations; reusable reduction/lattice/equivalence instances and physical consumers | Open |
| 5 Valid witnesses | Any match/maximum/ties/path/schedule and bounded objective; correct absence, top-k membership and candidate discovery | Existing loose specs; predicates, proofs and broader discovery open |
| 6 State restrictions | Append/insert-only state, immutable records, monotone and checked-merge transitions; admission across all actions, rollback, migration and restore | Open |
| 7 Composable changes | Typed version-bound insertion/deletion/replacement and signed multiplicities; maintained-query composition, simultaneous join cross terms and transactions | Existing keeps/representations are foundations; general change calculus open |
| 8 Fixed points | Typed relation/rule blocks, least fixed point, finite domain/termination, recursive aggregates, stratified negation, explicit resource failure, indexed/incremental proposals | Open |
| 9 Effects and frames | Inferred and declared checked key/range frames, higher-order effect propagation, complete action observation preservation | Existing effects and key analyses are foundations; compositional interfaces open |
| 10 Time and observations | Explicit frontiers/lateness and violation policy, final outputs, batches, bounded version staleness and windows; coherent reads and safe retention | Open |
| 11 Physical plans | Composable scheduling artifacts for tiling/tails/vectorization/parallelism/sharing/recompute/residency/layout/guards; capability, proof and lifecycle selection gates | Existing physical packages are foundations; compositional plan language open |
| 12 Scoped storage | Owner-tied views, exclusive partitions, invocation regions, consuming pipelines and producers without forced intermediates; escape/alias checking and literal lowering | Existing affine buffers/loans are foundations; extension and measured acceptance open |
| 13 Staging | Static schema/dimension/comparator/config specialization, guard generation, proof transport and measured selection | Existing const parameters/guarded laws are foundations; broader staging open |
| 14 Approximation | One-sided/norm/optimality/quantization/probabilistic/composed budgets, reusable checked error relations, explicit distributions and multi-call scope; exceptional float values | Existing absolute/relative/ULP and finite probability are foundations; extensions open |

For each milestone retain positive and negative admission tests, stale/forged
evidence controls where applicable, independent reference expectations and
compiled target conformance. Stateful changes additionally cover errors, events,
rollback and portable snapshots. Actual eligible GPU calls and host fallbacks
are reported separately. No test result is called a proof of backend correctness.

Benchmarks consume complete results, include boundary/transport costs and report
setup/checking/compilation separately. Compare appropriate handwritten or
specialist controls; include small/adverse workloads and independent held-out
inputs. Correctness never implies profitability. No automatic choice bypasses
the existing comparable-lifecycle-evidence gate.

Algorithms, reusable laws, proposal search and fitting stay in the independent
knowledge/planner repositories. The source core supplies general semantics and
checking, not optimization-specific recognizers. Completed work must be tested,
benchmarked, published in each changed package and pinned in the distribution.
Record exact revisions, commands, results and remaining limitations per milestone.

The query/plan boundary must leave room for execution beyond RAM: streaming and
chunked producers, disk-backed state, database pushdown and partitioned storage.
James explicitly highlighted eventual convergence of application runtime and
database execution. An explicit List result still materializes its finite output;
future relational interfaces must not force full source materialization. Storage
choices must preserve logical values/transactions/errors/snapshots, with I/O and
network movement priced alongside CPU/memory. This architectural direction does
not claim an external-storage backend is implemented by surface syntax alone.

James's preferred eventual architecture includes an Ink-native storage engine,
sharing checked types, transaction meaning and physical planning with compiled
application code. Keep the storage boundary explicit so memory/disk/database
implementations can be compared, with recovery/durability and transport costs in
acceptance evidence. Surface-query milestones do not close this storage work.

## Milestones

- Typed ordered query expressions: implemented with existing map/filter, folds,
  buffers and lexical binders; independent reference/compiled-target checks and
  comparative benchmarks are recorded in the ordered-query milestone report.
  This is one part of family 2, not completion of relational queries or unordered
  collection semantics. Publication and CI status belong to that report.
