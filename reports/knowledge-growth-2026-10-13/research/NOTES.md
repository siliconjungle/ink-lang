# Source research and limits

The sources and observations are separate from mathematical authority. Exact
versions, tarball integrity, source revisions and failed acquisition are in the
frozen upstream manifest. Additional path correction is separately recorded.
The ten ports were frozen before the new laws; their syntactic authoring bias
still limits generalisation. They are not ten complete applications.

| Domain / primary source | Reusable idea | Current epoch boundary |
|---|---|---|
| Lodash `every`, `includes`, `uniq` | Stop after an absorbing Boolean answer; preserve stable first-appearance set order | Two Boolean directions are one family; helper instantiation is an adapter, not a family. No JS coercion/identity semantics claim |
| TypeScript `findAncestor` | First witness in parent order; stop visiting later ancestors | Finite parent-chain port; callback’s `quit` protocol, AST construction, parsing, cycles and compiler work are excluded |
| VS Code piece tree (`lineStarts`, `lf_left`, `size_left`) | Retain length/line summaries and reuse unchanged subtrees | The measured CR/LF summary is a partial kernel. Persistent ownership, tree-balance and update/query summary invariants would need source/action-bound proofs; they are not supplied by the new pure laws |
| tldraw `Box.collides`, `includes` | Bounds queries and early witness search compose with filtering | Drawing-hit is a partial axis-aligned integer-box query; no geometry, scene graph, hit-test precedence or renderer claim |
| VerletJS `frame`; gl-matrix `vec2.scaleAndAdd` | Separate simultaneous position reads from writes; ordered numerical steps | Euler position update is a partial kernel, not Verlet constraints. gl-matrix control is exact only on the frozen dyadic domain where its F64 intermediate arithmetic agrees with binary32 step rounding |
| RBush `search`, `collides` | Early collision witness, pruning by maintained bounding summaries; bulk-loaded R-tree | Complete Boolean query result is comparable. Timed control builds its index every call; it does not measure resident indexed queries or prove the scan beats a retained index |
| CRoaring array containers | Alternative sparse/dense representations, cardinality-only intersection, early `intersect` | Arbitrary unsorted ID membership can stop early. Binary search requires sortedness at the actual site; Roaring compression requires exact codec/cardinality/representation proofs, not observed density |
| Differential Dataflow `Arranged` and traces | Share an indexed arrangement across readers and update only changes | Existing state/physical source obligations remain mandatory. No whole retained-arrangement implementation admitted in this epoch; timestamps, frontiers and concurrency are not modelled by finite distinct traces |
| RxJS `distinctUntilChanged` | Unchanged-value cut-off with complete ordered emissions | Finite value-trace port plus actual subscribe/distinct/toArray control; scheduling, errors, cancellation and reentrancy are excluded |
| Flecs bulk entity work | Batch changes while preserving ordered effects and exact final rows | Pure returned row-update kernel; no event/transaction/rollback authority follows from it |

[Coutts, Leshchinskiy and Stewart, Stream Fusion](https://doi.org/10.1145/1291151.1291199)
provides the motivation for exposing producer/consumer structure and removing
intermediates. These proposals use existing finite lists and controlled folds;
they do not install a stream executor or assume associative reductions.
[Hinze and Paterson, Finger Trees](https://www.cs.ox.ac.uk/ralf.hinze/publications/FingerTrees.pdf)
explains reusable measured structures. A useful summary requires a proved measure
law, so binary32 addition cannot silently be treated as a monoid.
[McSherry et al., Differential Dataflow](https://www.cidrdb.org/cidr2013/Papers/CIDR13_Paper111.pdf)
explains retained indexed differences and partially ordered versions. That is a
research direction, not a semantic-equivalence claim for this small finite corpus.
[Microsoft's piece-tree account](https://code.visualstudio.com/blogs/2018/03/23/text-buffer-reimplementation)
shows why complete call boundaries, native transport and real workloads matter.
[Roaring design research](https://arxiv.org/abs/1603.06549)
supports the sparse/dense representation investigation; no SIMD or new host
capability is introduced here.

The new controlled-map law may evaluate the mapper in both stop and step
callbacks. The filtered version may similarly evaluate a predicate twice.
Purity and totality make the value proof valid; they do not make that duplication
free. Regressions must remain visible. The stop sees the old accumulator and the
step still executes on the stopping item, exactly as the pinned primitive defines.
Boolean absorbing-state termination visits at most one extra item after finding
an answer; it never changes the accumulator’s order or arithmetic.

Existing ordered fold/filter/map, first-result and concatenation families are
reused as combinations. They are not counted as newly invented families. Two
support lemmas, concrete carriers and source-bound transports are counted
separately from the two incremental reusable mechanisms.

Source faithfulness is a material limitation. Lodash and RBush already use early
termination; the declarative Ink fold ports expose an opportunity to recover that
implementation. Improving these ports is not evidence that the original upstream
implementation became faster. The drawing pipeline is an authored composition,
not a verbatim tldraw routine. A heldout port can still favour a rewrite through
its syntax. Actual upstream controls and the unchanged complete-output kernels
are therefore retained, and the conclusion must distinguish capability from
independently chosen whole-software improvement.
