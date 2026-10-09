# Borrowed outcomes and ordered storage comparison

Same source, maintenance certificate and transaction protocol. The original compiler already has contiguous storage and moved rows. The current compiler adds borrowed event outcomes. Original paths retain the original owned-result ABI; current paths use the generated view API. All expose identical observations; no aborting transaction is elided. All variants use the same separately compiled C driver. Setup and teardown are excluded, seven repeats, randomized order, 30,000 updates/sample. Every timed observation agrees across variants; 28,070 independent native and 4,010 reference observations pass. This is an interactive Apple M4 Pro host, without CPU pinning.

Contiguous rows keep `(key,value)` tuples in one vector. Columns keep separate key/value vectors. The `small` policies promote to BTreeMap when insertion exceeds 256 rows, once per state; `flat` policies stay contiguous. Promotion occurs inside execution if crossed, though the large benchmark initializations cross it outside timing. Flat insertion/removal shifts buffers and can lose badly on large mixed workloads.

Handwritten Rust layout controls use the same storage primitives, with validate-before-mutation transactions and direct mutable row access. Generated Ink retains undo, tentative writes and staged events. Original/current tree and column comparisons isolate the borrowed-outcome change. Owning an independent outcome still copies events; borrowed views prevent State mutation until the view is released. Storage policies are typed data, not proofs of physical refinement. Cache arithmetic/table-history proofs and trusted native-storage implementation remain distinct.

| Rows | Stream | Queries | Old Ink tree | Old columns small | Old columns flat | Ink tree | Ink rows small | Ink columns small | Ink rows flat | Ink columns flat | Rust tree | Rust rows flat | Rust columns flat | Rust columns small | C flat | C++ tree |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | mixed | 0 | 44.0 | 27.7 | 27.6 | 40.0 | 26.1 | 24.7 | 26.3 | 25.2 | 27.5 | 21.4 | 19.9 | 19.9 | 22.8 | 27.6 |
| 64 | mixed | 1 | 43.9 | 28.6 | 27.7 | 40.6 | 26.2 | 25.4 | 27.2 | 25.7 | 28.2 | 22.3 | 20.1 | 20.2 | 22.7 | 28.2 |
| 64 | mixed | 10 | 48.6 | 35.3 | 34.4 | 44.6 | 32.2 | 30.9 | 33.3 | 30.2 | 34.5 | 29.3 | 26.7 | 26.5 | 29.7 | 34.2 |
| 64 | steady | 0 | 41.6 | 26.4 | 25.0 | 27.8 | 11.4 | 9.9 | 10.6 | 10.8 | 20.2 | 7.2 | 6.2 | 6.6 | 7.9 | 24.1 |
| 64 | steady | 1 | 41.5 | 24.1 | 27.9 | 27.4 | 13.7 | 11.9 | 13.7 | 13.8 | 19.9 | 7.1 | 6.9 | 6.7 | 8.1 | 23.5 |
| 64 | steady | 10 | 46.7 | 32.4 | 33.8 | 32.2 | 20.3 | 19.2 | 19.6 | 18.7 | 26.1 | 14.1 | 14.5 | 14.4 | 14.9 | 29.0 |
| 4096 | mixed | 0 | 81.3 | 80.2 | 59.0 | 78.2 | 77.1 | 77.7 | 63.5 | 54.5 | 45.8 | 57.9 | 49.5 | 47.8 | 58.3 | 54.7 |
| 4096 | mixed | 1 | 81.2 | 81.3 | 59.3 | 79.4 | 77.1 | 76.9 | 64.4 | 56.0 | 45.0 | 58.9 | 52.0 | 48.7 | 57.7 | 57.6 |
| 4096 | mixed | 10 | 86.9 | 89.3 | 65.5 | 84.2 | 84.5 | 85.3 | 70.6 | 61.3 | 51.8 | 66.2 | 57.0 | 53.2 | 66.0 | 63.8 |
| 4096 | steady | 0 | 74.5 | 72.7 | 30.5 | 65.2 | 67.4 | 64.5 | 15.6 | 13.7 | 37.3 | 11.4 | 9.1 | 35.8 | 14.8 | 45.2 |
| 4096 | steady | 1 | 71.5 | 73.8 | 31.3 | 65.7 | 65.1 | 67.5 | 19.7 | 17.1 | 37.6 | 12.3 | 9.7 | 35.8 | 15.4 | 48.3 |
| 4096 | steady | 10 | 79.9 | 78.7 | 34.1 | 66.2 | 67.0 | 68.2 | 26.5 | 24.5 | 44.2 | 19.6 | 15.5 | 41.5 | 20.0 | 51.8 |
| 65536 | mixed | 0 | 112.9 | 108.2 | 372.8 | 105.3 | 104.3 | 101.9 | 441.2 | 364.4 | 61.9 | 435.5 | 354.6 | 65.1 | 427.1 | 90.9 |
| 65536 | mixed | 1 | 105.8 | 109.7 | 371.6 | 104.6 | 103.0 | 102.9 | 442.9 | 365.2 | 60.5 | 429.6 | 354.7 | 64.1 | 427.4 | 93.0 |
| 65536 | mixed | 10 | 114.7 | 114.7 | 376.7 | 111.6 | 114.4 | 110.6 | 448.1 | 374.4 | 69.0 | 446.0 | 364.6 | 71.7 | 433.7 | 103.6 |
| 65536 | steady | 0 | 130.1 | 127.7 | 101.4 | 115.8 | 114.6 | 116.8 | 85.5 | 68.1 | 64.8 | 34.1 | 27.5 | 64.5 | 41.5 | 81.0 |
| 65536 | steady | 1 | 128.9 | 132.7 | 100.3 | 120.3 | 116.1 | 115.4 | 75.2 | 60.3 | 66.7 | 53.1 | 33.0 | 63.8 | 41.9 | 90.0 |
| 65536 | steady | 10 | 140.1 | 134.9 | 109.9 | 126.4 | 125.4 | 125.2 | 74.9 | 60.2 | 72.1 | 55.8 | 46.6 | 70.3 | 55.3 | 103.3 |

Times are median nanoseconds/update including queries. Ratios and raw measurements: [summary.json](summary.json), [samples.json](samples.json). Source bytes, compiler identities, measured binary hashes, commands and toolchains: [metadata.json](metadata.json).

This first pass does not implement general arenas, compact graph links, variable-size inline enums, zero-copy snapshots, full ownership inference or database-proved physical installation. Those and the broader language/performance requirements remain open.
