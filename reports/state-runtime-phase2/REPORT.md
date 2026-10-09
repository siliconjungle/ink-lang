# Stateful runtime milestone measurements

Provenance: `metadata.json` records source hashes at the measurement checkpoint. Subsequent parser, checker and CLI hardening changed frontend files; the measured state runtime, aggregate implementation and benchmark executable source are unchanged. These are historical measurements, not a rerun of every later frontend revision.

The complete inventory application now executes in the Rust reference runtime. A checked maintenance package selects incremental exact totals. This report measures that implementation against its recomputing mode. **Stateful native code generation and the corresponding C/C++/Rust comparison are still pending.** These speed ratios must not be presented as a lead over optimised native implementations.

Every case performs 100 committed updates. Input construction and initial cache installation are outside the timed loop; installation is separately reported. Query results are checked during timing in both modes. Checkpoints and restoration are validated after each trial. Five samples per mode, with randomised mode order.

| Rows | Queries per update | Scan time ms | Maintained time ms | Scan divided by maintained | Cache install ms |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | 0 | 1.143 | 1.354 | 0.84× | 0.067 |
| 64 | 1 | 5.898 | 1.442 | 4.09× | 0.065 |
| 64 | 10 | 50.454 | 1.986 | 25.40× | 0.066 |
| 1024 | 0 | 1.158 | 1.474 | 0.79× | 0.823 |
| 1024 | 1 | 79.167 | 1.539 | 51.43× | 0.914 |
| 1024 | 10 | 757.820 | 1.965 | 385.76× | 0.830 |
| 8192 | 0 | 1.238 | 1.439 | 0.86× | 7.841 |
| 8192 | 1 | 748.382 | 1.443 | 518.67× | 7.786 |
| 8192 | 10 | 7547.981 | 1.942 | 3887.37× | 7.994 |

The update-only cases expose maintenance overhead. The query cases demonstrate the expected change from repeated table traversal to a maintained result. A production selector must account for update/query balance, initial construction and migration costs.

Correctness tests separately compare 2,000 mixed operations between the two implementations, including inserts, replacements, deletes, nested failures, tentative queries, filtered sums, counts, checkpoint restoration and implementation switching. They compare results, events, versions and logical snapshot bytes.

The certificate checker validates exact-integer arithmetic premises for a fixed finite-map induction schema. The Rust checker, application of the schema to supported row-local pipelines, runtime and storage encoding remain trusted. This is not the general dependent-type proof kernel or end-to-end machine-code verification.

This milestone includes an in-memory transactional outbox and portable reference JSON snapshots. It does not yet include a durable write-ahead log or crash-safe storage adapter.

[Raw samples](samples.json) · [Implementation status](../../STATUS.md)
