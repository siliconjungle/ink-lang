# Closed CRDT/compiler performance pass

The compiler-focused optimisation pass is finished. The performance objective
was not achieved across all workloads. No complete Diamond Types port,
universal CRDT convergence theorem or full FugueMax bridge is claimed.

## Retained work

General ownership analysis, scoped loans, callback/field observations, exact
word-width conversions, typed snapshot support (including reconstruction of derived maintained views)
and checked proof authoring
remain independent of CRDT names and algorithms. Planning reuses bounded
immutable analysis and reports unfinished discovery. Source/layout proposals
still need ordinary kernel checks and comparable measurements.

The ordinary Ink ordered document and its generic data structures are retained
as research applications. The current merged source has finite cross-target
checks and 409 native-oracle cases at 1,595 retained prefixes. Save/load, future
merges, exact duplicate document images and valid interior batch frontiers are
included. Tests do not establish universal source preservation.

## Excluded work

The slower cached-causal alternative, unfinished small-frontier document and
older incompatible stateful measurement adapter are excluded from publication.
Their original sources and results remain in the local research checkout.
Adaptive execution provided no gain and is not enabled. Native inline hints
remain an optional checked generic capability; tested CRDT candidates were
slower and the producer is excluded from the default registry. Scalar observation
hoisting removes a payload copy on its mechanism fixture, but was not selected
on the CRDT training workload.

## Performance evidence

The retained audited comparison used the frozen C13 compiler and the ordered
source before integration with subsequent main changes. The reports bind exact
compiler, plan and emitted bytes. These historical timings are not measurements
of the newly published compiler or renamed source helpers.

Ratios are Ink/native Diamond Types elapsed time; less than one is faster.
The direct native baseline uses upstream revision
`89ae3a0ab8d941a2885e6ec89d094bc9ce9d2922`, with 33 paired rounds and chunks of 64.

| Workload | Ratio | Acquisition confidence interval |
| --- | ---: | --- |
| C1 | 0.9757 | 0.9206–1.0519 |
| C2 | 1.4294 | 1.3446–1.5442 |
| A1 | 0.7009 | 0.3849–0.9669 |
| A2 | 0.2289 | 0.2031–0.2755 |
| Older late fork | 1.1581 | 0.9231–1.2921 |
| Newer late fork | 1.0604 | 0.9838–1.1362 |

C1 is approximately parity; C2 remains about 43% slower. These workload-specific
results do not close snapshot, memory, full-trace or complete-port requirements.

[Evidence and publication receipt](evidence/crdt-wrapup/publication.json) retain
exact package pins, test scopes and hashes. Canonical proof snapshots in the
knowledge repository are historical research records; source hashes, profiles
and timing receipts confer no proof authority. No further optimisation or
measurement is scheduled by this wrap-up.
