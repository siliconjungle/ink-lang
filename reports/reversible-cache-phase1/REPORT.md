# Reversible cache journal measurements

The same compiled two-row signed-Int program maintains an exact sum. Snapshot, database snapshot and reversible journal use the same compiler and delta-first source update expressions. The database-selected journal saves the replacement difference, applies `total + saved`, and restores `total - saved` in reverse write order. The database snapshot candidate instead saves the previous total and restores it directly, using the same generic bridge. Each save/apply/restore expression is checked against universal database proofs. Insert saves new and removal saves old with its own checked inverse. No optimisation-law catalogue was added to the core.

The handwritten Rust BigInt baseline is recompiled from the previous archived source. It validates before mutation, updates in place, omits undo storage, and reads the total directly for query digests. These remain meaningful differences, so this is a specific compiled application comparison rather than a universal language ranking.

Prepared signed inputs and initial state are outside timing. The common separately compiled C driver performs 30,000 updates per sample by default, with seven repeats, random variant order and zero or one digest query per update. No cross-ABI LTO or CPU isolation. Every timed sample is checked against independent Python integers; the native ABI suite also compares 128 updates for all widths/profiles/variants. Allocation instrumentation is a separate build and does not affect these timing binaries.

| Anchor exponent | Profile | Queries/update | Snapshot ns | DB snapshot ns | Journal ns | Rust ns | Snapshot/journal |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | small signed | 0 | 64.0 | 62.3 | 45.1 | 20.0 | 1.417× |
| 64 | small signed | 1 | 111.4 | 109.2 | 91.3 | 37.4 | 1.221× |
| 64 | wide signed | 0 | 297.0 | 305.9 | 305.4 | 63.0 | 0.972× |
| 64 | wide signed | 1 | 352.3 | 354.2 | 367.3 | 121.7 | 0.959× |
| 512 | small signed | 0 | 108.5 | 103.2 | 74.2 | 21.7 | 1.462× |
| 512 | small signed | 1 | 161.7 | 160.4 | 129.9 | 51.2 | 1.245× |
| 512 | wide signed | 0 | 305.6 | 304.7 | 302.1 | 78.7 | 1.011× |
| 512 | wide signed | 1 | 359.9 | 352.9 | 341.0 | 111.5 | 1.055× |
| 4096 | small signed | 0 | 132.0 | 127.3 | 91.2 | 30.0 | 1.448× |
| 4096 | small signed | 1 | 270.3 | 267.1 | 234.1 | 132.9 | 1.154× |
| 4096 | wide signed | 0 | 440.4 | 451.7 | 452.4 | 185.4 | 0.973× |
| 4096 | wide signed | 1 | 524.1 | 513.6 | 526.5 | 240.1 | 0.996× |
| 8192 | small signed | 0 | 140.3 | 140.4 | 101.0 | 42.2 | 1.389× |
| 8192 | small signed | 1 | 360.3 | 354.4 | 312.4 | 210.4 | 1.153× |
| 8192 | wide signed | 0 | 534.2 | 526.4 | 539.8 | 265.5 | 0.990× |
| 8192 | wide signed | 1 | 647.9 | 642.3 | 651.5 | 369.4 | 0.994× |

Geometric means: snapshot/journal = 1.139×; journal/Rust = 2.540×. Small-changing-row ratio = 1.305×; wide-changing-row ratio = 0.994×.

Timing here excludes failing actions and events. Integration tests cover signed wide values, tentative reads, repeated-write aborts, batches, event sequences and future checkpoint continuation. The checker proves cache algebra; table projection, journal scheduling, frontend and native backend remain trusted. The new journal is used only for exact BigInt caches; bounded u128 caches retain full snapshots. Full state refinement, durability, adaptive selection and broader language requirements remain unfinished.

[Samples](samples.json), [metadata](metadata.json), [correctness](correctness.json), [summary](summary.json).
