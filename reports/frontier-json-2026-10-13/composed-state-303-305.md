# Proved layout and protocol composition

Ordinary record-wrapper codec proofs and sum-spine roundtrip/inverse proofs compose with source-derived preflight for the same source module. The candidate selects six record elisions and four sum layouts; the control retains plain layouts with the same preflight actions. Complete checker replay and a mixed-32 smoke passed before timing.

Three fresh processes, nine rotated rounds each, 4,096-row replacements. Each process validates complete replies, checksums, versions and exact initial/final Ink portable checkpoints. Prepared input capture is outside both libraries; ordinary capture is inside.

| Lane | Median of process medians (µs/call) |
|---|---:|
| frontier-state-main-patch | 1.527 |
| frontier-state-main-prepared-patch | 1.235 |
| ink-js | 3.483 |
| ink-js-control | 5.803 |
| ink-js-control-prepared | 1.359 |
| ink-js-prepared | 1.264 |

The median paired ordinary-call ratio versus plain preflight is 0.583; all three paired processes improve. Ordinary capture still loses to Frontier. Prepared results vary, including a regression in process 305; they establish no general prepared-call win. Do not compare absolute timings with the earlier 299–301 cohort: host conditions and the comparison control differ.

Diagnostic capture samples concentrate in flattened-sum guards and recursive member capture, with about 9% garbage collection. These profiles do not establish speed gains. The layout proofs license representation equivalence, not skipping validation or assuming JSON number grammar/member uniqueness.

Shared host, no exclusive reservation or confidence bounds. One replacement workload; no equivalent startup, retained/peak memory, mixed-history, query or complete JSON text ranking. No all-metrics Frontier win. Exact plans, receipts, generated modules, harness sources and profiles are archived in artifacts/composed-state-303-305.
