# Batch 34 independent prepared review

The proposed equality removes an unused mapped stream while retaining independent-list zip truncation:

```ink
xs.map(f).zip(ys, fn(unused) => fn(y) => g(y))
// equal to:
xs.zip(ys, fn(unused) => fn(y) => g(y))
```

The right orientation reverses the two zip arguments. The mapped input still contributes its length. Returning `ys.map(g)` would be invalid when xs is shorter or empty. Callbacks must be total pure Ink functions; dropping evaluations is not a theorem about arbitrary effectful JavaScript host callbacks, exceptions or external callback counters.

Existing collection8 projection laws use the same original input; batch31 uses a filtered subsequence of that same input; batch33 erases independent scans but leaves the mapped stage. The full current 2,485-object structural audit found 26 rewrite-from spines with mapped and independent free list arguments, none with a callback that ignores that mapped value. This is bounded structural novelty, not a global nonderivability claim.

The actual six U32/I32/U64 endpoints are derived shortcuts. Their proof inserts an identity postmap using the symmetric old identity-map equality, instantiates the old independent mapped-zip/postmap fusion law, then normalizes the ignored callback argument. No new induction rule, arithmetic theorem or primitive is needed. They expose an existing consequence directly to bounded search. The semantic novelty and cost-search effect must be described separately. F32/Bools are sound future projection candidates in the abstract pure value domain, but the selected producer does not publish those instances and no performance claim includes them.

The source bridges retain helper calls to avoid the callback expansion cost inflation observed in batch33. Their exact module contexts must bind discarded and retained helper definitions, including transitive calibrate/repair helpers. New raw sources map the discarded input through a two-helper quotient/remainder composition; heldouts preserve the exact batch33 function and helper bodies, with the module header changing from Pipeline33 to Pipeline34, and first apply existing scan erasure. The exact 2,485-object canonical fair prior already contains the two identical old-only scan certificate IDs and receives no additional objects; current alone receives the ten fresh map-demand endpoints and deployments. No forced law selection or timing-derived model update is needed.

Independent finite corroboration evaluates the complete mapped input eagerly and compares both zip orientations with a directly indexed min-length result: 51,200 modulus16 cases, 4,000 32/64-bit cases, 6,498 raw F32 word model cases and 450 Bool cases. Empty/singleton and unequal lists are included. Observed mapper and map-only truncation counterexamples are retained. These model checks do not establish universal proof correctness, source emission correctness or unselected F32/Bools deployment.

The target emitter can already omit ignored mapper loads on its legacy per-output GPU shader path. Therefore this DB law may reduce JS/native allocations and work while producing little or no GPU gain. Manifest graph node counts are not actual device dispatch counts. GPU contracts must follow the emitted selected execution path: graph-required executes every stage even for empty outputs, uploads payload plus list headers and reads the populated result; legacy shaders dispatch over maximum input capacity, upload metadata of args+1 words, and read capacity plus the output header. All actual counters and neutral/adverse results must remain visible.

Strong handwritten JS/Rust controls must already compute only the selected shorter prefix and omit discarded mapper/scans, with fresh or destination output ownership aligned to each measured boundary. Source/helper transport, proof selection, full-output/nonmutation/lifetime validation and measured profitability remain separate evidence. Comparisons should retain the exact frozen compiler, model and production-source binding, with all prior observations preserved. No broad native language superiority follows from a speedup over a less optimized generated pipeline.
