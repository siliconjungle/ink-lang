# Reversible-journal native stateful comparison

This run selects version-3 reversible maintenance from the proof database. The exact BigInt cache saves a checked difference and reverses it during abort; bounded u128 caches retain full snapshots. Save, apply and restore expressions are independently checked for forward equivalence and inverse identity over arbitrary signed totals. Complete table/transaction/backend refinement remains unfinished.

The stateful language is compiled to typed Rust and machine code. No AST evaluator runs in timed code. Every variant maintains the total incrementally. These results are about the implemented compiler/runtime and application, not a universal ranking of languages.

## Compared implementations

| Variant | Table | Total | Transaction implementation |
| --- | --- | --- | --- |
| language | Rust BTreeMap | BigInt | Generated undo journal, staged events, checked maintenance expressions |
| language_bounded | Rust BTreeMap | checked u128 cache and exact word-pair query ABI | Generated undo journal and staged events |
| c_flat | Sorted contiguous array | unsigned 128-bit | Handwritten, validates before mutation |
| cpp_tree | std::map | unsigned 128-bit | Handwritten, validates before mutation |
| rust_tree | Rust BTreeMap | u128 | Handwritten, validates before mutation |
| rust_bigint | Rust BTreeMap | BigInt | Handwritten, validates before mutation |

The exact sum of a finite table keyed by u64 with u32 values is at most `2^64 × (2^32 − 1)`, below `2^96`. A 128-bit unsigned total therefore preserves this application's exact arithmetic for every possible table. The bounded compiler variant now derives this range from declared types; the ordinary variant retains BigInt caches. The bounded variant uses a compiler-generated allocation-free exact word-pair view for direct bounded aggregate queries. Ordinary language/JSON queries still return Int; both host paths expose the same exact unsigned total. BigInt Rust isolates part of the arithmetic/storage cost. C uses a flat ordered table, so insertion/removal costs differ from the tree variants.

The handwritten aborting transaction is reduced to a presence check: every present-key execution returns Overflow and leaves no writes or events, while an absent key returns Missing. Generated code still performs and rolls back speculative writes. This valid baseline optimisation exposes another compiler opportunity.

## Method

Each sample begins with a fresh table of the stated size. Setup is excluded. The steady stream adds one to existing random keys. The mixed stream includes insert, delete, successful/failed restock, overflow and an always-aborting two-write transaction. Queries run after each attempted update. All successful commits advance the version; events remain in an in-memory outbox. End-of-run checks compare every candidate row, exact totals, statuses, versions and ordered event digests across variants.

All variants use the same separately compiled C driver, without cross-boundary LTO. ABI query conversion and return-value handling are included. Generated writes also reuse the previous value returned by map insertion/removal, avoiding a redundant lookup. Seven repeats by default, randomised variant order. No CPU pinning or isolated-machine claim. The table reports median nanoseconds per attempted update **including its queries**.

| Rows | Stream | Queries/update | Language ns | Bounded ns | C flat ns | C++ tree ns | Rust tree ns | Rust BigInt ns | Bounded / fastest baseline |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | steady | 0 | 60.8 | 46.0 | 8.2 | 26.0 | 22.8 | 32.7 | 5.59× |
| 64 | steady | 1 | 75.8 | 43.6 | 8.5 | 25.0 | 21.9 | 47.9 | 5.15× |
| 64 | steady | 10 | 230.6 | 48.8 | 16.0 | 31.2 | 27.7 | 199.5 | 3.05× |
| 64 | mixed | 0 | 59.4 | 47.2 | 24.2 | 29.6 | 29.1 | 34.0 | 1.95× |
| 64 | mixed | 1 | 75.0 | 46.7 | 24.9 | 28.6 | 29.6 | 49.4 | 1.88× |
| 64 | mixed | 10 | 231.6 | 52.1 | 32.1 | 35.5 | 37.6 | 197.7 | 1.62× |
| 4096 | steady | 0 | 90.5 | 78.8 | 15.3 | 45.2 | 40.3 | 52.0 | 5.16× |
| 4096 | steady | 1 | 108.2 | 78.1 | 15.8 | 49.6 | 39.8 | 67.6 | 4.93× |
| 4096 | steady | 10 | 265.9 | 81.8 | 21.4 | 54.8 | 46.6 | 214.0 | 3.83× |
| 4096 | mixed | 0 | 95.6 | 87.8 | 59.6 | 60.1 | 48.4 | 53.1 | 1.81× |
| 4096 | mixed | 1 | 114.7 | 87.0 | 60.4 | 61.0 | 47.6 | 69.0 | 1.83× |
| 4096 | mixed | 10 | 270.4 | 94.4 | 70.2 | 68.0 | 57.1 | 220.4 | 1.65× |
| 65536 | steady | 0 | 153.8 | 137.0 | 44.4 | 93.5 | 70.2 | 83.2 | 3.08× |
| 65536 | steady | 1 | 172.2 | 136.8 | 42.9 | 110.5 | 71.8 | 105.6 | 3.19× |
| 65536 | steady | 10 | 329.7 | 142.5 | 62.5 | 134.1 | 80.6 | 259.9 | 2.28× |
| 65536 | mixed | 0 | 123.9 | 115.3 | 441.6 | 116.2 | 64.4 | 76.7 | 1.79× |
| 65536 | mixed | 1 | 144.8 | 114.7 | 440.7 | 109.6 | 65.7 | 94.9 | 1.75× |
| 65536 | mixed | 10 | 298.9 | 121.9 | 451.6 | 125.5 | 76.6 | 244.1 | 1.59× |

A ratio greater than one means the generated language implementation takes longer. Differences include representation, transaction strategy, cloning, allocations and ABI conversion; they cannot all be attributed to the surface language.

Correctness: 2,005 deterministic operations are checked against an independent Python integer/state model for each native implementation. The reference interpreter is also checked on the same source and stream. Separate native range tests exercise equivalent legacy certificates with negative and greater-than-128-bit intermediate values. See [correctness.json](correctness.json), [raw samples](samples.json), [toolchain and source metadata](metadata.json), and [generated code](generated-lib.rs).

The broader language, full stateful refinement, durable recovery and adaptive selection remain unfinished. These measurements do not close the full project goal.

Across 18 cells, bounded Ink takes 1.77× Rust tree time and 2.61× the fastest baseline's time by geometric mean. BigInt Ink takes 1.75× bounded Ink time. See [summary.json](summary.json).
