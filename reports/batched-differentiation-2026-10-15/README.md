# Batched derivative execution

[Source, procedure, performance and limits](../../bench/batched-differentiation/README.md).
`summary.json` binds the raw samples, before/after emitted modules, source, local
acceptance logs, actual GPU receipts and the two concrete database proof admissions.
`metadata.json` records implementation source hashes and the distribution parent.

Held-out large polynomial gradient: 18.779 ms previous → 8.985 ms batched (2.09×).
Handwritten control: 1.000 ms. These are warm full JavaScript calls on one host,
not a general neural-performance or first-call/GPU-training measurement.

Local validation: 394 core tests, 47 JavaScript tests, and 13 learning/AD tests.
The latter include 105 cross-target values/outcomes/exact snapshots and five actual
GPU calls across four scenarios. The two source-context equations compare batch
and scalar-direction implementations on fixed polynomial/nonlinear kernels;
they do not prove general AD translation or backend correctness. CI status is not
inferred from these local logs.

Audit:

```sh
python3 bench/batched-differentiation/analyse.py reports/batched-differentiation-2026-10-15
```
