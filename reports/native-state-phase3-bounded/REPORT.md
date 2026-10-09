# Native stateful comparison

The stateful language is compiled to typed Rust and machine code. No AST evaluator runs in timed code. Every variant maintains the total incrementally. These results are about the implemented compiler/runtime and application, not a universal ranking of languages.

## Compared implementations

| Variant | Table | Total | Transaction implementation |
| --- | --- | --- | --- |
| language | Rust BTreeMap | BigInt | Generated undo journal, staged events, checked maintenance expressions |
| language_bounded | Rust BTreeMap | checked u128 cache, BigInt query result | Generated undo journal and staged events |
| c_flat | Sorted contiguous array | unsigned 128-bit | Handwritten, validates before mutation |
| cpp_tree | std::map | unsigned 128-bit | Handwritten, validates before mutation |
| rust_tree | Rust BTreeMap | u128 | Handwritten, validates before mutation |
| rust_bigint | Rust BTreeMap | BigInt | Handwritten, validates before mutation |

The exact sum of a finite table keyed by u64 with u32 values is at most `2^64 × (2^32 − 1)`, below `2^96`. A 128-bit unsigned total therefore preserves this application's exact arithmetic for every possible table. The bounded compiler variant now derives this range from declared types; the ordinary variant retains BigInt caches. The query ABI still materialises an exact BigInt result in both generated variants. BigInt Rust isolates part of the arithmetic/storage cost. C uses a flat ordered table, so insertion/removal costs differ from the tree variants.

The handwritten aborting transaction is reduced to a presence check: every present-key execution returns Overflow and leaves no writes or events, while an absent key returns Missing. Generated code still performs and rolls back speculative writes. This valid baseline optimisation exposes another compiler opportunity.

## Method

Each sample begins with a fresh table of the stated size. Setup is excluded. The steady stream adds one to existing random keys. The mixed stream includes insert, delete, successful/failed restock, overflow and an always-aborting two-write transaction. Queries run after each attempted update. All successful commits advance the version; events remain in an in-memory outbox. End-of-run checks compare every candidate row, exact totals, statuses, versions and ordered event digests across variants.

All variants use the same separately compiled C driver, without cross-boundary LTO. ABI query conversion and return-value handling are included. Seven repeats by default, randomised variant order. No CPU pinning or isolated-machine claim. The table reports median nanoseconds per attempted update **including its queries**.

| Rows | Stream | Queries/update | Language ns | Bounded ns | C flat ns | C++ tree ns | Rust tree ns | Rust BigInt ns | Bounded / fastest baseline |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | steady | 0 | 70.2 | 51.6 | 8.2 | 26.2 | 21.7 | 34.6 | 6.27× |
| 64 | steady | 1 | 83.2 | 71.1 | 8.7 | 25.8 | 22.3 | 48.7 | 8.20× |
| 64 | steady | 10 | 242.8 | 238.1 | 16.8 | 33.3 | 30.0 | 201.8 | 14.17× |
| 64 | mixed | 0 | 64.5 | 54.3 | 24.9 | 30.4 | 30.3 | 35.2 | 2.18× |
| 64 | mixed | 1 | 82.2 | 77.3 | 26.2 | 32.8 | 31.5 | 52.3 | 2.95× |
| 64 | mixed | 10 | 232.5 | 256.1 | 33.0 | 38.8 | 37.9 | 197.7 | 7.75× |
| 4096 | steady | 0 | 122.5 | 101.3 | 16.9 | 49.8 | 43.1 | 55.6 | 6.00× |
| 4096 | steady | 1 | 143.9 | 124.1 | 16.8 | 50.8 | 42.5 | 68.2 | 7.37× |
| 4096 | steady | 10 | 303.2 | 290.4 | 21.8 | 57.8 | 49.1 | 218.0 | 13.30× |
| 4096 | mixed | 0 | 121.2 | 114.9 | 62.5 | 63.6 | 48.5 | 53.5 | 2.37× |
| 4096 | mixed | 1 | 137.7 | 132.5 | 62.7 | 60.9 | 49.3 | 69.5 | 2.69× |
| 4096 | mixed | 10 | 302.3 | 305.8 | 70.0 | 69.9 | 57.1 | 223.2 | 5.36× |
| 65536 | steady | 0 | 207.1 | 191.1 | 45.2 | 102.0 | 74.1 | 88.3 | 4.23× |
| 65536 | steady | 1 | 222.6 | 217.1 | 47.2 | 111.0 | 73.4 | 107.3 | 4.60× |
| 65536 | steady | 10 | 390.2 | 396.7 | 62.5 | 134.0 | 79.8 | 267.5 | 6.35× |
| 65536 | mixed | 0 | 158.2 | 145.7 | 453.0 | 120.0 | 74.7 | 73.6 | 1.98× |
| 65536 | mixed | 1 | 177.5 | 172.7 | 451.9 | 123.7 | 70.2 | 87.3 | 2.46× |
| 65536 | mixed | 10 | 341.1 | 352.8 | 469.2 | 144.6 | 84.4 | 250.7 | 4.18× |

A ratio greater than one means the generated language implementation takes longer. Differences include representation, transaction strategy, cloning, allocations and ABI conversion; they cannot all be attributed to the surface language.

Correctness: 2,005 deterministic operations are checked against an independent Python integer/state model for each native implementation. The reference interpreter is also checked on the same source and stream. The new native range tests also exercise equivalent certificates with negative and greater-than-128-bit intermediate values. See [correctness.json](correctness.json), [raw samples](samples.json), [toolchain and source metadata](metadata.json), and [generated code](generated-lib.rs).

The broader language, general proof kernel, durable recovery, adaptive selection and stateful Wasm remain unfinished. These measurements do not close the full project goal.
