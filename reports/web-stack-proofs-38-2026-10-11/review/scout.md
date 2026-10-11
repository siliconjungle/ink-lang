# Batch38 independent scout

Recommend observed same-origin indexed prefix fusion with an appended suffix:

```
zip(indexed(xs,f), concat(indexed(xs,g),ys),h)
  = indexed(xs, λi.λx.h(f(i,x),g(i,x)))
zip(concat(indexed(xs,f),ys), indexed(xs,g),h)
  = indexed(xs, λi.λx.h(f(i,x),g(i,x)))
```

Both callback results are observed. `f` and `g` are arbitrary total pure U32-indexed callbacks; `h` is arbitrary and may be noncommutative. The same-origin property is structural: both indexed producers use the exact same xs. The complete common prefix is present before arbitrary appended ys, so the output has length(xs), independent of the suffix length. Both padding orientations preserve h's left/right argument order. No caller condition or runtime check is required.

Full pinned snapshot `6df4df9aae82d58eba9eac5e8d36b41ce37147ed5d661285903745f4c136d9e3` has 2,534 objects and 1,728 semantic endpoint objects. Independent forward/reverse alpha comparison found no direct duplicate of eight indexed public, eight Nat-state and eight plain-mapped candidate endpoints across U32/I32/U64/F32. Final scope is narrower: six integer public endpoints, six Nat/beta supports and four U32 helper-bound source certificates, sixteen fresh objects. F32 and plain-map alternatives are scout-only and must not inflate publication counts.

Existing indexed22 equalities fuse unpadded same-origin producers. Existing collection9/11 padding equalities restrict pair arithmetic and postmap forms. Neither directly matches arbitrary two-observed indexed callbacks and arbitrary h. This establishes endpoint novelty, not absence of a derivation using a longer chain of old laws.

The actual prototype uses one-list induction on xs over a function of arbitrary Nat starting index. At a cons, both callbacks receive nat.word(start), and recursion advances with nat.succ. The appended suffix remains unchanged. The empty base works because the unpadded side is empty even when the padded side contains ys. Normalization, congruence, the beta support and the induction hypothesis preserve every observed callback operation and exact grouping. No associative or commutative law for h is used. This checks correctly with the current kernel and needs no new primitive.

False cases to retain: prepend the suffix instead of append; change one producer's origin; swap h arguments; reset a recursive index to zero; remove one observed mapper. Use asymmetric, index-dependent f/g/h in finite checks, arbitrary Nat offsets across U32 wrap, empty xs with nonempty ys, both suffix-size orientations, full-width words and zero divisors. Correctly rehashed source-helper and transitive-callee mutations must reject.

This can remove two producer traversals plus concat materialization and its irrelevant suffix copy, replacing them with one indexed traversal. Handwritten controls should already compute f(i,x), g(i,x) and h(f,g) once per xs element with equivalent ownership/residency, ignoring suffix values while retaining the declared input transport. These controls remain essential; beating old materialized Ink output is not broad native superiority.

Inspect the exact named GPU primary and graph_required after ordinary selection. No legacy/graph route assumption follows from earlier batches. If a graph executes, recompute all node capacities and physical counters; if flat shaders execute, declared stage removal may already be inactive and a driver may eliminate unused suffix work. Counter evidence must decide physical savings. Keep all-word vector consumption, complete output/nonmutation/lifetime checks, all regressions and uncertainty, and distinct captured/resident boundaries.
