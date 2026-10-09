# Native stateful comparison

The stateful language is compiled to typed Rust and machine code. No AST evaluator runs in timed code. Every variant maintains the total incrementally. These results are about the implemented compiler/runtime and application, not a universal ranking of languages.

## Compared implementations

| Variant | Table | Total | Transaction implementation |
| --- | --- | --- | --- |
| language | Rust BTreeMap | BigInt | Generated undo journal, staged events, checked maintenance expressions |
| c_flat | Sorted contiguous array | unsigned 128-bit | Handwritten, validates before mutation |
| cpp_tree | std::map | unsigned 128-bit | Handwritten, validates before mutation |
| rust_tree | Rust BTreeMap | u128 | Handwritten, validates before mutation |
| rust_bigint | Rust BTreeMap | BigInt | Handwritten, validates before mutation |

The exact sum of a finite table keyed by u64 with u32 values is at most `2^64 × (2^32 − 1)`, below `2^96`. A 128-bit unsigned total therefore preserves this application's exact arithmetic for every possible table. This is a justified application-specific baseline optimisation; the compiler has not yet inferred it. BigInt Rust isolates part of the arithmetic/storage cost. C uses a flat ordered table, so insertion/removal costs differ from the tree variants.

The handwritten aborting transaction is reduced to a presence check: every present-key execution returns Overflow and leaves no writes or events, while an absent key returns Missing. Generated code still performs and rolls back speculative writes. This valid baseline optimisation exposes another compiler opportunity.

## Method

Each sample begins with a fresh table of the stated size. Setup is excluded. The steady stream adds one to existing random keys. The mixed stream includes insert, delete, successful/failed restock, overflow and an always-aborting two-write transaction. Queries run after each attempted update. All successful commits advance the version; events remain in an in-memory outbox. End-of-run checks compare every candidate row, exact totals, statuses, versions and ordered event digests across variants.

All variants use the same separately compiled C driver, without cross-boundary LTO. ABI query conversion and return-value handling are included. Seven repeats by default, randomised variant order. No CPU pinning or isolated-machine claim. The table reports median nanoseconds per attempted update **including its queries**.

| Rows | Stream | Queries/update | Language ns | C flat ns | C++ tree ns | Rust tree ns | Rust BigInt ns | Language / fastest baseline |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | steady | 0 | 63.2 | 8.7 | 25.9 | 21.6 | 33.4 | 7.30× |
| 64 | steady | 1 | 77.3 | 8.7 | 25.6 | 21.3 | 48.8 | 8.89× |
| 64 | steady | 10 | 230.2 | 16.3 | 32.3 | 28.3 | 195.9 | 14.15× |
| 64 | mixed | 0 | 63.3 | 24.7 | 30.1 | 30.4 | 34.2 | 2.56× |
| 64 | mixed | 1 | 78.2 | 24.7 | 30.3 | 30.2 | 51.4 | 3.16× |
| 64 | mixed | 10 | 232.5 | 32.5 | 37.8 | 38.7 | 196.7 | 7.15× |
| 4096 | steady | 0 | 122.3 | 15.8 | 48.3 | 41.9 | 53.0 | 7.74× |
| 4096 | steady | 1 | 144.9 | 16.5 | 49.8 | 41.3 | 67.0 | 8.78× |
| 4096 | steady | 10 | 304.4 | 22.4 | 57.5 | 47.8 | 218.4 | 13.61× |
| 4096 | mixed | 0 | 121.6 | 62.9 | 64.3 | 48.2 | 54.0 | 2.52× |
| 4096 | mixed | 1 | 138.2 | 62.4 | 61.3 | 49.1 | 70.2 | 2.81× |
| 4096 | mixed | 10 | 291.7 | 69.9 | 70.3 | 56.3 | 214.2 | 5.18× |
| 65536 | steady | 0 | 200.4 | 46.6 | 109.0 | 69.0 | 82.9 | 4.30× |
| 65536 | steady | 1 | 222.3 | 47.6 | 110.3 | 69.8 | 102.2 | 4.67× |
| 65536 | steady | 10 | 377.4 | 63.8 | 139.8 | 83.2 | 264.4 | 5.92× |
| 65536 | mixed | 0 | 155.8 | 447.5 | 121.5 | 65.2 | 79.6 | 2.39× |
| 65536 | mixed | 1 | 173.2 | 448.4 | 116.5 | 73.5 | 89.3 | 2.36× |
| 65536 | mixed | 10 | 341.8 | 464.8 | 142.1 | 78.0 | 254.7 | 4.38× |

A ratio greater than one means the generated language implementation takes longer. Differences include representation, transaction strategy, cloning, allocations and ABI conversion; they cannot all be attributed to the surface language.

Correctness: 2,005 deterministic operations are checked against an independent Python integer/state model for each native implementation. The reference interpreter is also checked on the same source and stream. See [correctness.json](correctness.json), [raw samples](samples.json), [toolchain and source metadata](metadata.json), and [generated code](generated-lib.rs).

The broader language, general proof kernel, durable recovery, adaptive selection and stateful Wasm remain unfinished. These measurements do not close the full project goal.
