# Native stateful comparison

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
| 64 | steady | 0 | 56.0 | 47.2 | 8.9 | 26.7 | 24.4 | 33.3 | 5.32× |
| 64 | steady | 1 | 69.7 | 43.8 | 9.1 | 25.9 | 21.0 | 47.8 | 4.83× |
| 64 | steady | 10 | 226.9 | 50.0 | 15.6 | 31.4 | 27.5 | 194.6 | 3.20× |
| 64 | mixed | 0 | 56.6 | 48.7 | 23.9 | 29.6 | 29.7 | 35.0 | 2.03× |
| 64 | mixed | 1 | 74.3 | 49.6 | 24.3 | 30.3 | 30.7 | 48.7 | 2.04× |
| 64 | mixed | 10 | 229.7 | 53.5 | 33.5 | 36.7 | 38.5 | 201.4 | 1.60× |
| 4096 | steady | 0 | 84.5 | 78.5 | 15.2 | 47.5 | 40.9 | 52.2 | 5.16× |
| 4096 | steady | 1 | 104.9 | 79.4 | 16.0 | 49.8 | 41.3 | 66.4 | 4.96× |
| 4096 | steady | 10 | 263.5 | 84.6 | 20.9 | 53.9 | 46.7 | 220.4 | 4.04× |
| 4096 | mixed | 0 | 94.2 | 87.7 | 60.7 | 59.6 | 47.2 | 52.4 | 1.86× |
| 4096 | mixed | 1 | 112.6 | 85.9 | 60.8 | 60.0 | 46.3 | 67.5 | 1.86× |
| 4096 | mixed | 10 | 266.4 | 91.6 | 68.5 | 67.1 | 56.3 | 216.7 | 1.63× |
| 65536 | steady | 0 | 150.1 | 137.8 | 44.4 | 107.7 | 71.7 | 86.9 | 3.11× |
| 65536 | steady | 1 | 169.6 | 144.2 | 42.0 | 107.1 | 72.5 | 107.4 | 3.43× |
| 65536 | steady | 10 | 327.9 | 145.5 | 64.2 | 106.3 | 81.7 | 270.2 | 2.27× |
| 65536 | mixed | 0 | 123.1 | 114.8 | 447.8 | 106.0 | 70.3 | 75.5 | 1.63× |
| 65536 | mixed | 1 | 141.8 | 115.1 | 443.9 | 107.9 | 72.7 | 92.5 | 1.58× |
| 65536 | mixed | 10 | 312.5 | 122.1 | 463.5 | 130.4 | 71.9 | 248.8 | 1.70× |

A ratio greater than one means the generated language implementation takes longer. Differences include representation, transaction strategy, cloning, allocations and ABI conversion; they cannot all be attributed to the surface language.

Correctness: 2,005 deterministic operations are checked against an independent Python integer/state model for each native implementation. The reference interpreter is also checked on the same source and stream. Separate native range tests exercise equivalent legacy certificates with negative and greater-than-128-bit intermediate values. See [correctness.json](correctness.json), [raw samples](samples.json), [toolchain and source metadata](metadata.json), and [generated code](generated-lib.rs).

The broader language, full stateful refinement, durable recovery and adaptive selection remain unfinished. These measurements do not close the full project goal.

Across 18 cells, bounded Ink takes 1.77× Rust tree time and 2.62× the fastest baseline's time by geometric mean. BigInt Ink takes 1.68× bounded Ink time. See [summary.json](summary.json).
