# Prepared numeric tables

Run `knowledge/tests/test_loop_invariants.py OUTPUT` with `INK_COMPILER` and
`PYTHONPATH=knowledge:planner`, emit baseline and selected JavaScript, then run:

```
node bench/prepared-tables/run.mjs BASELINE.mjs SELECTED.mjs SEED
```

The producer shares an invariant numeric List expression across iterations of one
map. Ordinary whole-function Normalize proofs authorize each selected rewrite.
Dependent tables, effectful helpers and early-stop callbacks remain excluded.
The empty-input guard avoids allocating a table when the outer map is empty.
This is a preparation mechanism inspired by Pretext, not text-layout parity.

Retained evidence: `reports/prepared-tables-2026-10-15`. Three fresh Node processes
per seed (development 21431, holdout 49139), eleven paired samples per cell,
randomized lane order, independently checked complete outputs before and after
samples. Timings include preparation and full output consumption, with no cache
retained across calls. Each sample repeats complete invocations; it is not a cold
first-call measurement. The unchanged dependent expression is a control.

On the recorded M4 Pro, the held-out 512-index/256-value case changes from
147.208 to 1.291 microseconds. The 32-index/16-value case regresses from 1.383 to
2.143 microseconds. These designed workloads establish a mechanism and its limits;
they are not evidence for automatic selection or application-wide speedups.

Cross-target conformance: 94 reference comparisons across Rust, JavaScript and
Rust-Wasm, including empty inputs, wrapping integers and exceptional F32 bits.
GPU-host execution also compares all 94 results, with zero GPU calls: these cases
are explicitly CPU-only. Separate conditional-fact coverage has 88 comparisons
and one actual GPU dispatch. Full required-target logs are retained beside results.
