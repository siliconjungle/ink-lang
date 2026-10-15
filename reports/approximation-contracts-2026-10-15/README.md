# Checked approximation and selection assurance

This adds source approximation clauses, reusable mathematical evidence and
execution validation. See [the contract](../../docs/approximation-contracts.md)
for exact semantics and limits, and `validation.json` for recorded checks.

- Integer absolute and rational-relative bounds use exact `Int` arithmetic.
- Finite-f32 ULP bounds exclude NaNs/infinities and identify signed zeros.
- The database publishes twelve checked laws and three discovery templates;
  all twelve mathematical statements also pass Lean 4.34.1 independently.
- Maintained folds, extrema and grouped views require lifecycle evidence or
  a validated work model. Asymptotic cost alone cannot select an alternative.
- Pure JavaScript/Rust measurements validate each inexact refinement against
  its own source-bound interpreter results before and after timing. Inputs and
  call schedules must remain identical. Native numeric comparison preserves
  distinct full-width integer outputs instead of rounding through binary64.
- The Lean exporter rejects unsupported float arithmetic and conflicting helper
  definitions, and commits declaration contexts only after successful export.

The full standalone core suite, 294 planner tests (five optional skips), fourteen
source-contract tests, twenty-five source/module/emission tests and fourteen
Lean-exporter tests passed locally. The new execution tests cover 126 observations
on native Rust, JavaScript and Rust-Wasm, plus false proofs and rehashed invalid
refinements. Nine updated automatic-probe tests and CI partition coverage pass.

`javascript-measurements.json` and `rust-measurements.json` retain complete warm
portable/JSON calls, per-plan reference outputs, setup observations, raw samples
and target context. Both final experiments retain the baseline. Rust's training
choice was vetoed by its independent holdout. This small designed eight-step
kernel is a capability check; it establishes no broad speedup or generalisation.

Reproduce with:

```sh
python3 tools/bench_approximation.py --compiler target/debug/ink \
  --output build/approximation-js
python3 tools/bench_approximation.py --compiler target/debug/ink \
  --output build/approximation-rust --target rust
```

GitHub's complete distribution and independent Lean workflows were queued at
publication; local results are not a claim of an all-green CI run. No new GPU
device coverage, universal transcendental real-error theorem, general HLL
confidence theorem or whole-compiler correctness proof is claimed.
