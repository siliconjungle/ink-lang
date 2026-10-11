# Batch37 independent scout

The recommended family is independent-list demand erasure of an unused indexed mapper:

```
zip(map_indexed(xs,f), ys, λignored.λv.g(v))
  = zip(xs, ys, λignored.λv.g(v))
zip(ys, map_indexed(xs,f), λv.λignored.g(v))
  = zip(ys, xs, λv.λignored.g(v))
```

`f : U32 → T → T` and `g : T → T` are arbitrary total pure callbacks, for T=U32/I32/U64/F32. The independent inputs may have different lengths. Both sides retain the shorter-list extent and original order; replacing the result with `map(ys,g)` alone is false when xs is shorter. Generalized `indexed.from(xs,n,f)` supports use a Nat offset and advance it on recursive tails, preserving the primitive's U32 index wrap. Public methods start at zero. Neither arithmetic grouping nor observed floating values change.

Full snapshot `7f5e7a94b49db567af55f5d1129dd07c5e2b469ebd45cb6e5cbc53595782b2be` contains 2,512 objects and 1,706 semantic endpoint objects. Independent alpha-normalized forward/reverse scanning found no exact endpoint duplicate for eight public and eight generalized-state candidates. Existing indexed22 zip laws require the same source input; indexed29 demand erasure observes only cardinality. This novelty check is an endpoint comparison, not a proof that no chain of old laws can derive the identities. Concrete admission and ordinary prior/current selections remain necessary.

This removes an entire indexed traversal, its materialized list, index updates and unobserved callback work. It uses existing primitive semantics and emits ordinary independent zip; no new core operator or target rule is required. Compositions such as nested indexed producers or mapped selected outputs can be checked source-bound bridges, preserving exact helper definitions. Optimized handwritten controls should directly project the retained input for `min(nx,ny)` elements, with the same output residency/allocation boundary. These laws can approach such controls; broad native superiority does not follow from erasing avoidable earlier Ink work.

Adversarial proof checks should retain both orientations, empty/one-empty/unequal lists, selected callback closure captures, F32 special values if claimed, and generalized offsets at U32 wrapping boundaries. Any callback that observes the discarded argument must reject specialization. A false endpoint dropping the shorter extent should be correctly rehashed and rejected. Helper and transitive-callee changes must reject even after module/context rehashing.

Benchmark both unused inputs larger and smaller than selected inputs, plus modest/expensive discarded helpers without inventing a false strong baseline. Confirm primary GPU route by exact function name and `graph_required`; a logical node count is insufficient. If the primary uses legacy shader execution, physical dispatch and transfer may remain unchanged even when declared graph nodes disappear. Keep complete output/nonmutation/lifetime checks, captured versus resident boundaries, all regressions and uncertainty. Compilation and runtime adaptation remain separate.

Loop-invariant choose lifting over lists is another plausible algebra family, but old gated mapper-sum, predicate-count and arbitrary-fold laws already cover several scalar forms. List-valued choose may also switch GPU routing to fallback. It needs a separate actual-source route probe before recommending it over indexed demand erasure.
