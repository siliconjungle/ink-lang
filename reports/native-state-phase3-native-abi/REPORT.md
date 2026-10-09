# Native stateful comparison

The stateful language is compiled to typed Rust and machine code. No AST evaluator runs in timed code. Every variant maintains the total incrementally. These results are about the implemented compiler/runtime and application, not a universal ranking of languages.

Across the 18 cells, the bounded variant is **1.71× faster** than the current BigInt variant by geometric mean. It still takes **1.75× the handwritten Rust u128 baseline’s time** and **2.56× the fastest baseline’s time** per cell, aggregated geometrically. The biggest within-build gain is approximately 4.5× in a query-heavy case. The native stateful compiler is therefore not yet competitive with the best baseline overall.

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
| 64 | steady | 0 | 57.6 | 45.7 | 8.5 | 26.6 | 22.1 | 33.1 | 5.38× |
| 64 | steady | 1 | 75.2 | 44.5 | 8.8 | 26.0 | 22.5 | 49.5 | 5.06× |
| 64 | steady | 10 | 228.0 | 50.7 | 16.8 | 32.4 | 29.2 | 205.0 | 3.02× |
| 64 | mixed | 0 | 58.1 | 49.4 | 24.9 | 31.4 | 30.8 | 35.3 | 1.99× |
| 64 | mixed | 1 | 74.6 | 47.7 | 25.4 | 30.9 | 30.3 | 51.3 | 1.88× |
| 64 | mixed | 10 | 233.9 | 53.4 | 33.2 | 37.9 | 38.4 | 198.2 | 1.61× |
| 4096 | steady | 0 | 95.6 | 81.7 | 16.6 | 48.7 | 42.0 | 53.5 | 4.93× |
| 4096 | steady | 1 | 110.8 | 80.2 | 16.5 | 51.2 | 42.1 | 70.2 | 4.86× |
| 4096 | steady | 10 | 266.3 | 87.5 | 22.5 | 58.4 | 48.2 | 217.5 | 3.88× |
| 4096 | mixed | 0 | 96.2 | 87.9 | 63.1 | 64.0 | 49.5 | 56.3 | 1.78× |
| 4096 | mixed | 1 | 114.7 | 89.2 | 62.2 | 62.2 | 49.7 | 69.8 | 1.79× |
| 4096 | mixed | 10 | 279.3 | 95.9 | 71.4 | 70.9 | 56.5 | 216.4 | 1.70× |
| 65536 | steady | 0 | 158.0 | 142.5 | 47.9 | 97.0 | 76.3 | 85.5 | 2.97× |
| 65536 | steady | 1 | 177.2 | 142.4 | 47.4 | 117.9 | 75.3 | 102.4 | 3.00× |
| 65536 | steady | 10 | 343.0 | 144.6 | 66.7 | 143.4 | 84.3 | 264.6 | 2.17× |
| 65536 | mixed | 0 | 121.4 | 116.2 | 452.2 | 105.8 | 76.7 | 70.4 | 1.65× |
| 65536 | mixed | 1 | 144.3 | 118.6 | 455.1 | 112.1 | 68.2 | 95.5 | 1.74× |
| 65536 | mixed | 10 | 302.2 | 123.7 | 463.1 | 124.6 | 77.1 | 249.1 | 1.60× |

A ratio greater than one means the generated language implementation takes longer. Differences include representation, transaction strategy, cloning, allocations and ABI conversion; they cannot all be attributed to the surface language.

Correctness: 2,005 deterministic operations are checked against an independent Python integer/state model for each native implementation. The reference interpreter is also checked on the same source and stream. The new native range tests also exercise equivalent certificates with negative and greater-than-128-bit intermediate values. See [correctness.json](correctness.json), [raw samples](samples.json), [toolchain and source metadata](metadata.json), and [generated code](generated-lib.rs).

The broader language, general proof kernel, durable recovery, adaptive selection and stateful Wasm remain unfinished. These measurements do not close the full project goal.
