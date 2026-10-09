# Ordered storage comparison

Same source, maintenance certificate and transaction protocol. Only native ownership lowering and selected storage change. All variants use the same separately compiled C driver. Setup and teardown are excluded, seven repeats, randomized order, 30,000 updates/sample. Every timed observation agrees across variants; 24,060 independent native and 4,010 reference observations pass. This is an interactive Apple M4 Pro host, without CPU pinning.

Contiguous rows keep `(key,value)` tuples in one vector. Columns keep separate key/value vectors. The `small` policies promote to BTreeMap when insertion exceeds 256 rows, once per state; `flat` policies stay contiguous. Promotion occurs inside execution if crossed, though the large benchmark initializations cross it outside timing. Flat insertion/removal shifts buffers and can lose badly on large mixed workloads.

Handwritten Rust layout controls use the same storage primitives, with validate-before-mutation transactions and direct mutable row access. Generated Ink retains undo, tentative writes and staged events. The original/current compiler comparison isolates ownership changes under BTreeMap. Storage policies are typed data, not proofs of physical refinement. Cache arithmetic/table-history proofs and trusted native-storage implementation remain distinct.

| Rows | Stream | Queries | Old Ink tree | Ink tree | Ink rows small | Ink columns small | Ink rows flat | Ink columns flat | Rust tree | Rust rows flat | Rust columns flat | Rust columns small | C flat | C++ tree |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | mixed | 0 | 46.7 | 48.0 | 31.3 | 29.4 | 31.9 | 29.4 | 29.1 | 22.8 | 21.6 | 21.0 | 24.3 | 29.7 |
| 64 | mixed | 1 | 47.5 | 47.2 | 31.7 | 30.6 | 33.1 | 30.5 | 31.8 | 23.7 | 21.3 | 21.4 | 24.3 | 30.5 |
| 64 | mixed | 10 | 51.8 | 52.0 | 39.3 | 36.4 | 38.4 | 35.7 | 36.9 | 29.6 | 28.2 | 28.0 | 31.1 | 36.7 |
| 64 | steady | 0 | 43.1 | 45.7 | 25.6 | 25.6 | 25.1 | 25.2 | 22.1 | 7.0 | 6.5 | 6.4 | 8.4 | 25.5 |
| 64 | steady | 1 | 43.3 | 43.8 | 25.4 | 25.7 | 25.5 | 26.3 | 20.9 | 7.7 | 7.4 | 7.0 | 8.0 | 24.7 |
| 64 | steady | 10 | 50.3 | 48.5 | 33.0 | 33.2 | 33.8 | 33.1 | 27.7 | 15.1 | 15.3 | 15.4 | 15.5 | 31.2 |
| 4096 | mixed | 0 | 89.0 | 88.6 | 85.9 | 87.5 | 73.9 | 63.3 | 50.2 | 62.1 | 54.9 | 50.4 | 61.6 | 59.9 |
| 4096 | mixed | 1 | 87.1 | 86.3 | 86.8 | 87.2 | 71.6 | 61.3 | 47.9 | 62.1 | 53.4 | 51.7 | 61.0 | 61.9 |
| 4096 | mixed | 10 | 95.1 | 93.6 | 93.6 | 93.7 | 77.4 | 69.4 | 55.1 | 68.5 | 61.4 | 57.9 | 68.5 | 69.1 |
| 4096 | steady | 0 | 78.6 | 76.4 | 78.8 | 77.7 | 41.3 | 32.8 | 40.5 | 12.1 | 9.8 | 37.9 | 15.7 | 45.5 |
| 4096 | steady | 1 | 82.8 | 78.4 | 77.9 | 77.4 | 40.4 | 33.1 | 40.8 | 13.7 | 10.9 | 39.3 | 16.6 | 51.4 |
| 4096 | steady | 10 | 87.8 | 87.6 | 87.6 | 90.4 | 47.3 | 38.3 | 48.4 | 22.1 | 17.5 | 47.3 | 23.2 | 59.0 |
| 65536 | mixed | 0 | 112.9 | 113.7 | 113.9 | 115.8 | 461.9 | 386.1 | 68.3 | 448.0 | 370.5 | 74.0 | 439.1 | 112.9 |
| 65536 | mixed | 1 | 113.1 | 111.6 | 116.5 | 116.6 | 461.8 | 384.5 | 74.4 | 447.2 | 369.5 | 68.5 | 443.8 | 99.7 |
| 65536 | mixed | 10 | 125.0 | 124.1 | 123.8 | 122.9 | 474.3 | 393.2 | 77.8 | 459.8 | 383.0 | 75.5 | 456.0 | 133.1 |
| 65536 | steady | 0 | 138.2 | 140.4 | 138.9 | 140.9 | 137.9 | 113.1 | 72.6 | 36.4 | 31.0 | 69.5 | 40.6 | 94.2 |
| 65536 | steady | 1 | 137.9 | 136.6 | 138.8 | 137.3 | 134.8 | 110.0 | 72.9 | 56.8 | 31.7 | 70.1 | 42.6 | 103.0 |
| 65536 | steady | 10 | 145.9 | 144.4 | 145.1 | 144.7 | 146.6 | 119.7 | 82.7 | 60.3 | 54.9 | 76.6 | 60.7 | 116.0 |

Times are median nanoseconds/update including queries. Ratios and raw measurements: [summary.json](summary.json), [samples.json](samples.json). Source bytes, compiler identities, measured binary hashes, commands and toolchains: [metadata.json](metadata.json).

This first pass does not implement general arenas, compact graph links, variable-size inline enums, zero-copy snapshots, full ownership inference or database-proved physical installation. Those and the broader language/performance requirements remain open.
