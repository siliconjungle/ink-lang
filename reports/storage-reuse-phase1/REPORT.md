# Integer storage reuse measurements

The same two-row signed-Int application and same checked version-3 certificates are emitted by the preserved previous compiler and the new compiler. Old/new snapshot variants select the database full-total snapshot; old/new journal variants select the database reversible difference. The base lowering now moves the cached integer into its final use, allowing num-bigint to reuse capacity. Earlier uses copy it. The source expression tree and arithmetic order are unchanged; no new algebraic rewrite law or proof checker is introduced.

All timed Ink variants still use source-generated actions, transactions and cache journals. The handwritten Rust baseline is the same archived BTreeMap/BigInt program with validation before mutation and in-place delta maintenance, without an undo journal. Its query digests read the total directly, while Ink returns an owned Int. Those differences remain part of the comparison.

Prepared signed inputs and initial state are outside timing. A common separately compiled C driver performs 30,000 updates per sample by default, seven repetitions and randomized variant order. Each cell has zero or one digest query per update. Every timed outcome is checked against independent Python integers; native ABI validation additionally checks 128 updates for every width/profile/variant. No cross-ABI LTO, CPU pinning or isolated-machine claim. Allocation counts come from separate instrumented builds.

| Anchor exponent | Profile | Queries/update | Old snapshot ns | Old journal ns | Snapshot ns | Journal ns | Rust ns | Old/new journal |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | small signed | 0 | 62.0 | 44.5 | 36.2 | 26.6 | 19.6 | 1.676× |
| 64 | small signed | 1 | 110.5 | 90.1 | 76.3 | 63.4 | 35.5 | 1.421× |
| 64 | wide signed | 0 | 291.0 | 302.0 | 300.5 | 259.2 | 62.0 | 1.165× |
| 64 | wide signed | 1 | 348.2 | 359.5 | 349.0 | 334.2 | 119.0 | 1.076× |
| 512 | small signed | 0 | 104.7 | 74.3 | 52.7 | 27.8 | 21.6 | 2.675× |
| 512 | small signed | 1 | 157.5 | 136.9 | 107.0 | 88.7 | 50.6 | 1.544× |
| 512 | wide signed | 0 | 309.0 | 304.7 | 292.9 | 278.8 | 74.8 | 1.093× |
| 512 | wide signed | 1 | 359.5 | 344.0 | 343.6 | 340.0 | 109.2 | 1.012× |
| 4096 | small signed | 0 | 128.5 | 89.1 | 79.1 | 35.5 | 29.2 | 2.513× |
| 4096 | small signed | 1 | 262.4 | 230.1 | 212.6 | 178.1 | 130.4 | 1.292× |
| 4096 | wide signed | 0 | 451.4 | 454.7 | 440.6 | 432.8 | 182.7 | 1.051× |
| 4096 | wide signed | 1 | 527.4 | 520.6 | 513.4 | 500.2 | 238.6 | 1.041× |
| 8192 | small signed | 0 | 138.1 | 98.4 | 79.3 | 46.5 | 40.2 | 2.117× |
| 8192 | small signed | 1 | 348.4 | 306.9 | 286.1 | 261.5 | 206.1 | 1.173× |
| 8192 | wide signed | 0 | 520.1 | 523.0 | 507.1 | 498.2 | 262.8 | 1.050× |
| 8192 | wide signed | 1 | 635.8 | 635.8 | 617.1 | 614.5 | 358.1 | 1.035× |

Geometric means: old/new journal = 1.356×; old/new snapshot = 1.252×; journal/Rust = 1.902×. Small-changing-row old/new journal ratio = 1.728×; wide-changing-row = 1.064×.

Timing here excludes failing actions and events. Integration tests preserve multi-table repeated-write aborts, tentative reads, event order, checkpoints and exhausted commit counters. The source checker proves cache algebra; primitive ownership/BigInt lowering, table projection and journal scheduling remain trusted. Full state refinement, durability, adaptive selection and the broader language acceptance criteria remain unfinished.

[Samples](samples.json), [metadata](metadata.json), [correctness](correctness.json), [summary](summary.json).
