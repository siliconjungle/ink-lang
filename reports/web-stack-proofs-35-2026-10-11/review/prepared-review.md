# Batch35 independent scout

Direct left, right and both-input map/zip fusion preserves the shorter-list extent and original ordered pairing:

```ink
xs.map(f).zip(ys.map(r), h)
// equal to
xs.zip(ys, fn(x) => fn(y) => h(f(x))(r(y)))
```

The one-sided cases omit the corresponding map. Both arguments remain observed by arbitrary curried h. These are derived shortcuts: insert an identity postmap by symmetry of the existing map identity law, instantiate the existing batch17 independent mapped-zip/postmap law with identity g, and normalize. No associativity, commutativity or arithmetic identity is used. Callback reordering and effects are outside the theorem: f/r/h are total pure Ink functions. Ignoring work beyond min input length is semantically safe under that domain. The generic producer's current numeric sorts do not automatically establish mixed-sort fusion support.

A pinned full 2,495-object catalogue audit finds no exact from/to duplicate among twelve typed templates (left/right/both U32/I32/U64/F32). The eight direct independent map/zip rewrite roots are batch34 unused-projection endpoints and source bridges. This is exact syntactic endpoint novelty, not alpha-equivalence analysis or mathematical nonderivability. Existing batch17 laws already entail the result.

Source checks must preserve helper calls and bind the exact full module/helper contexts, including transitive f/r/h callees. Negatives should mutate correctly rehashed direct and nested helper bodies; unequal/one-empty inputs and noncommutative h expose incorrect truncation or argument swapping. Strong JS/Rust controls must already traverse the selected min-length prefix and compute both observed maps inside their fused loop. Output ownership and complete results must be validated before timing.

The exact primary GPU function selected by name determines the route. Graph node counts alone do not establish physical dispatch, upload, readback or memory changes. Existing legacy per-output shaders can already compute mapped zip values inside one dispatch. Prior and checked emitted shaders, physical counters and routes must therefore be recorded independently. No broad native performance or GPU improvement claim follows from the mathematical law.
