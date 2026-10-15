# Prepare numeric data once within an invocation

An invariant numeric table inside a map can now be proposed for preparation once:

```ink
return indices.map(fn(i) => values.map(fn(v) => (v*3+7)*5).at_or(i,999));
```

The external loop-invariant producer builds a reusable table outside the callback,
with an empty-input guard. The existing core Normalize checker replays the whole
function equality. The backend then emits the selected computation literally.
If the table depends on `i`, it remains inside the callback. This adds no trusted
Pretext matcher, no cross-call cache and no new floating-point approximation.

The measured large case is substantially faster, while a small case loses.
See [the benchmark procedure](../bench/prepared-tables/README.md) and raw receipts
in `reports/prepared-tables-2026-10-15`. The proposal still needs comparable cost
evidence before any automatic profitability decision. This is an initial numeric
preparation mechanism; Unicode segmentation, browser measurement, layout cursors,
selective materialisation and environment-bound caching remain separate work.
