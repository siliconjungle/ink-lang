# Source-state preflight comparison

Three fresh Node processes, nine rotated rounds each, 4,096-row replacements. The database proposed preflight for put/erase; checker replay bound each plan to the same source. Input capture is outside the prepared lanes and included in ordinary lanes. Complete replies, checksums, versions and exact initial/final Ink portable checkpoints validated before timing. Frontier adapters preserve the compared events, rollback, versions and acknowledgement.

| Lane | Median of process medians (µs/call) |
|---|---:|
| frontier-state-main-patch | 1.180 |
| frontier-state-main-prepared-patch | 0.698 |
| ink-js | 3.476 |
| ink-js-control | 3.960 |
| ink-js-control-prepared | 1.101 |
| ink-js-prepared | 0.836 |

The median paired process ratio for prepared preflight/general is 0.793. This is an improvement against Ink, but preflight does not beat Frontier in every process. Ordinary calls remain about three times slower at the median; diagnostic CPU samples spread across recursive input captures and report about 13% garbage collection. Prepared samples primarily land in the preflight result/commit kernel, acknowledgement and dispatch. Profiles are diagnostic and never performance evidence.

This is a shared-host cohort without exclusive CPU reservation or confidence bounds. It measures one replacement workload, not cold startup, retained/peak memory, queries, mixed histories or a complete JSON text pipeline. The plan uses plain source storage; combining proved record/sum layouts remains a separate experiment. No all-metrics Frontier win is established.

Exact plans, checker receipts, generated modules, preparation/harness source and profiles are archived in artifacts/state-protocol-299-301. Raw process JSON and summary are alongside this report.
