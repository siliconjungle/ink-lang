# Frozen source-cost calibration

The schema2 mechanism is implemented and tested, but these fitted models are not
accurate enough to enable by default. They are untrusted, opt-in hypotheses.
No theorem admission rule, proof, core compiler, runtime dispatch policy or
planner default price was changed by this calibration producer.

The frozen protocol used only affine, compaction and scan training cells at 32
and 16384 elements. Every cohort preserves host, target, exact timer boundary,
variant and emitter compiler hash. All five raw numeric training-round ns values
entered deterministic relative-residual nonnegative coordinate least squares;
column scales used training data only. The positive unknown-work price floor
of 1e-9 ns is a schema fallback constraint, not a physical instruction price.
Six synthetic producer smoke tests pass.

All coefficients and 3,762 predictions were frozen before heldout error or
choice statistics were computed. The freeze SHA is
`5ff911e9a4ab629a48f8a4959da6582b9ce904c544f35f7137acfe469aab94e4`.
Nineteen models were fitted; every model has rank 5 or 6 across 13 columns.
Sixteen cohorts have no training support. Zero-support columns remain disclosed
as unidentified. Nonzero feature support does not resolve collinearity.
Exported model cardinalities are maxima from training inputs; a concrete caller
must supply its own workload hypotheses. They never validate runtime inputs.

Heldout evaluation scores 2,562 cells and retains 288 unsupported scalar-boundary
cells. Median absolute relative prediction error across cohorts is 54.5–57.0%
for JavaScript, 75.2–86.0% for CPU Wasm, 40.9–70.5% for native C, and 20.2–22.3%
for GPU. Detailed split/family/cohort errors are retained in `evaluation.json`.
These are source-component estimates; they do not resolve physical GPU filter
rank/compaction, serial scan/reduction, CPU scheduling, target reuse, or full host
transport/consumption costs.

Among 1,206 comparable heldout compiler choices, the predeclared 10% estimated
saving threshold selects the candidate compiler in 72 cells. Twenty-one of those
selections are slower than the baseline median. Across all choices, 564 incur
positive measured regret, with maximum relative regret 373%. Median regret is
zero. All losses and 198 incomplete comparisons are preserved. Small timing
differences have not been converted into confidence or significance claims.
The source suite has **zero rewrite applications in both emitter versions**;
these results assess engine/lowering alternatives, not new DB-law profitability.
Controls were excluded from fitting. No cross-host ranking is performed.

`preparation-final` binds the actual selected semantic bodies, core parameter
signatures, protocol, estimator, producer and importer bytes. Measured compilers
are the preserved preintegration baseline `04f42856…` and final candidate
`dc9e2523…`; later main integration does not inherit these timings automatically.
The initial preparation and interrupted validation attempt are retained. That
attempt was stopped before fitting while an older importer repeatedly hashed
large result files. The final preparation binds the cached importer, with no
feature or fitting-policy change. No heldout retuning was performed.

The producer's phases are `prepare`, `freeze`, and `evaluate`. Every output is
created exclusively; existing artifacts cannot be overwritten. `freeze.json`
binds model, fit and prediction files; evaluation rejects drift. `summary.json`
and `completion.json` bind the final evidence and its scope.
