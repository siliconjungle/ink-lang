# Allocation-free physical table path release

The standalone typed storage host allocated empty replacement Arc nodes when
releasing old persistent table paths. Recursive edges now use pointer-sized
optional Arc storage. `take()` detaches the edge once; iterative release stops
at a shared suffix. Live values and literal checked definitions are unchanged.
C, Rust, both Wasm targets and native GPU share this storage host. JavaScript
and browser GPU hosts retain garbage-collected immutable values and equivalent
observable behaviour. Recursive table state still executes on GPU hosts.

The Lean model in knowledge/research/ownership checks roundtrip, one-time detach,
shared suffix preservation, surviving owners and zero replacement allocations.
A generated 100000-node retained/released table has zero release allocations,
exact frees and bounded stack usage. Six cross-target representation fixtures
include lists, nested nominal values and exact integers. Nine proof/history
checks cover migrations, rollback, events, snapshots and forged proof rejection.

## Matched Rust measurements

Three alternating process pairs, three samples per process, 100 complete calls
per sample. All replies, events and final snapshots agree with the reference
and handwritten scanning/maintained controls. Setup, migration and checkpoints
are outside the timed calls. CPU source baseline is present solely as a control.
Raw measurements and both generated artifacts are retained here.

| Rows | Reads | Before ms/100 | After ms/100 | Speedup | After / maintained Rust |
| --- | --- | --- | --- | --- | --- |
| 256 | 0% | 10.30525 | 5.16767 | 1.99× | 52.2× |
| 256 | 90% | 1.05492 | 0.61067 | 1.73× | 25.0× |
| 256 | 100% | 0.04521 | 0.04033 | 1.12× | 2.1× |
| 4000 | 0% | 160.13517 | 95.88292 | 1.67× | 916.1× |
| 4000 | 90% | 17.44542 | 8.66767 | 2.01× | 328.6× |
| 4000 | 100% | 0.04896 | 0.04129 | 1.19× | 2.4× |

These are Rust measurements on a shared macOS arm64 machine. Within a sample
executors have fixed order; machine load limits precision. Conformance on other
targets is not a performance claim. Improvements of 1.7–2× in write-heavy cells
remove reclamation overhead but leave linear list traversal/path reconstruction.
At 4000 rows, write-only calls remain over 900× slower than the maintained tree
control. Efficient indexed physical layouts remain an open priority.
