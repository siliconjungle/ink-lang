# Cache lowering and database update comparison

This experiment separates two changes: borrowing exact integer operands during base lowering, and selecting a database-proved delta-first replacement expression. The source meanings and observable state machine are unchanged. All handwritten baselines maintain totals too.

`language_cloned` recompiles the prior archived BigInt runtime source. `language` compiles the canonical certificate with borrowed operands and owned arithmetic temporaries. `language_delta` selects `total + (new - old)` through two new universal database theorems. `language_bounded` retains the checked u128 cache and direct query ABI; its emitted source is byte-identical to the prior bounded implementation. C uses a flat sorted array, C++ std::map, and Rust BTreeMap. Rust BigInt uses exact totals; the remaining baselines use a sufficient u128 bound.

The delta candidate was first checked with the original unchanged compiler (`proof-extension.json`). The small-core requirement allows efficient primitive lowering; no arithmetic rewrite law was added to the compiler. The existing table pipeline recogniser, cache/transaction protocol and bounded range analysis still need migration to database refinement evidence.

All variants use the same C timing driver and matched operation streams. Seven repetitions by default, random order, 30,000 attempted updates per sample. Setup and final complete state checks are outside timing. Queries per update are included. No cross-ABI LTO, no CPU pinning, warm in-memory single-threaded execution. Actual backend CPU settings and pinned toolchain versions are archived.

| Rows | Stream | Queries/update | Cloned ns | Borrowed ns | Delta ns | Bounded ns | C ns | C++ ns | Rust u128 ns | Rust BigInt ns |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | mixed | 0 | 54.4 | 53.8 | 52.0 | 44.7 | 23.4 | 27.9 | 28.1 | 32.1 |
| 64 | mixed | 1 | 69.9 | 67.8 | 67.4 | 45.4 | 23.2 | 29.4 | 28.0 | 47.3 |
| 64 | mixed | 10 | 226.4 | 221.3 | 222.2 | 50.3 | 29.7 | 34.5 | 35.6 | 198.0 |
| 64 | steady | 0 | 56.8 | 57.5 | 54.5 | 42.3 | 8.8 | 24.8 | 20.7 | 33.5 |
| 64 | steady | 1 | 71.8 | 70.7 | 68.8 | 43.6 | 8.1 | 24.6 | 20.5 | 44.8 |
| 64 | steady | 10 | 223.2 | 217.5 | 221.3 | 47.3 | 15.7 | 29.6 | 27.2 | 190.4 |
| 4096 | mixed | 0 | 92.6 | 90.4 | 91.1 | 83.6 | 56.8 | 59.0 | 47.0 | 51.2 |
| 4096 | mixed | 1 | 109.5 | 110.1 | 106.4 | 82.8 | 60.2 | 58.7 | 46.0 | 67.1 |
| 4096 | mixed | 10 | 261.1 | 260.3 | 262.5 | 90.6 | 66.6 | 65.3 | 53.1 | 214.5 |
| 4096 | steady | 0 | 88.1 | 85.2 | 85.2 | 79.2 | 14.6 | 46.5 | 37.9 | 49.1 |
| 4096 | steady | 1 | 102.3 | 101.6 | 105.2 | 77.1 | 15.1 | 46.8 | 37.8 | 64.8 |
| 4096 | steady | 10 | 254.8 | 254.3 | 254.5 | 80.1 | 20.7 | 53.9 | 44.4 | 210.3 |
| 65536 | mixed | 0 | 115.4 | 117.2 | 116.5 | 108.8 | 436.9 | 109.7 | 63.0 | 69.2 |
| 65536 | mixed | 1 | 138.9 | 135.1 | 133.5 | 108.2 | 434.3 | 115.3 | 70.1 | 90.1 |
| 65536 | mixed | 10 | 292.3 | 290.1 | 294.7 | 120.3 | 445.9 | 139.3 | 78.3 | 237.0 |
| 65536 | steady | 0 | 150.6 | 144.0 | 143.3 | 132.2 | 43.7 | 106.6 | 70.5 | 81.6 |
| 65536 | steady | 1 | 166.3 | 165.9 | 163.2 | 133.7 | 41.9 | 105.4 | 68.3 | 104.9 |
| 65536 | steady | 10 | 322.6 | 316.9 | 322.8 | 139.6 | 61.0 | 138.3 | 80.0 | 255.0 |

Across 18 cells: cloned/borrowed time = 1.014×; borrowed/delta time = 1.005×; delta/Rust BigInt time = 1.464×; bounded/Rust u128 time = 1.774×. These are geometric means of per-cell median ratios, not universal language rankings.

Ratios near one, particularly for nanosecond workloads on this shared host, do not establish a meaningful change. The fixed nonnegative-u32 workload mostly has small totals; a separate wide-Int experiment is needed to test delta ordering across large totals and signs. This report does not infer benefits outside the measured application.

Correctness checks 2,005 deterministic operations per native variant against an independent Python state/integer model: statuses, exact total, version, event order/digest/count and touched rows. Timed streams also compare complete final state and statuses. Separate Rust tests exercise signed 512-bit data, tentative reads, aborts, batches and future portable checkpoints.

[Raw samples](samples.json), [metadata and source/artifact hashes](metadata.json), [correctness](correctness.json), [summary](summary.json). The full PLAN.md language, proof architecture, durability, adaptation and performance requirements remain unfinished.
