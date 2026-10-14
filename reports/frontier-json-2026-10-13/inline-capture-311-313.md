# Rejected literal capture-inlining prototype

The prototype inlined already-proved single-field record captures at selected sum leaves. It retained wrapper shape checks, getter evaluation order, source node/depth charges and output representation. Composed-layout, malformed-input, ownership, getter/resource and complete snapshot tests passed.

Three fresh process runs, nine rotated rounds, 4,096-row replacements, same checked physical/protocol plan. Complete replies, checksums, versions and exact initial/final Ink portable checkpoints validated.

| Lane | Median of process medians (µs/call) |
|---|---:|
| frontier-state-main-patch | 0.810 |
| frontier-state-main-prepared-patch | 0.473 |
| ink-js | 1.750 |
| ink-js-control | 1.675 |
| ink-js-control-prepared | 0.690 |
| ink-js-prepared | 0.466 |

The ordinary-call prototype/control ratios are 1.040, 0.970 and 1.065. That does not establish improved capture. Prepared ratios improve, but prepared calls do not execute this capture path; those samples cannot demonstrate its intended mechanism. Shared-host/JIT variation and different allocation sites may affect results. The production prototype is rejected; broader composed-layout regression coverage is retained.

No confidence bounds, equivalent startup/memory ranking or all-metrics Frontier win. Exact prototype source/patch, checked plan, generated modules, validation logs and harness sources are archived in artifacts/inline-capture-311-313.
