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
| 64 | steady | 0 | 57.2 | 46.7 | 10.2 | 28.1 | 23.8 | 41.6 | 4.58× |
| 64 | steady | 1 | 73.1 | 46.4 | 9.2 | 27.9 | 22.2 | 50.1 | 5.05× |
| 64 | steady | 10 | 231.8 | 52.5 | 17.2 | 35.1 | 29.8 | 209.2 | 3.06× |
| 64 | mixed | 0 | 58.5 | 51.1 | 25.5 | 32.0 | 31.3 | 36.2 | 2.01× |
| 64 | mixed | 1 | 75.6 | 48.2 | 26.2 | 31.9 | 31.1 | 52.4 | 1.84× |
| 64 | mixed | 10 | 230.6 | 54.0 | 33.3 | 38.0 | 38.5 | 223.1 | 1.62× |
| 4096 | steady | 0 | 92.6 | 85.2 | 17.1 | 50.1 | 42.8 | 48.2 | 4.98× |
| 4096 | steady | 1 | 105.1 | 80.3 | 17.1 | 51.8 | 42.6 | 95.8 | 4.71× |
| 4096 | steady | 10 | 267.9 | 87.8 | 22.8 | 58.9 | 51.0 | 262.8 | 3.86× |
| 4096 | mixed | 0 | 98.9 | 92.0 | 63.9 | 63.2 | 51.6 | 53.3 | 1.78× |
| 4096 | mixed | 1 | 119.3 | 91.6 | 65.8 | 63.8 | 50.1 | 81.9 | 1.83× |
| 4096 | mixed | 10 | 275.5 | 96.5 | 71.5 | 71.7 | 56.5 | 226.6 | 1.71× |
| 65536 | steady | 0 | 156.6 | 142.6 | 46.6 | 107.3 | 75.6 | 86.3 | 3.06× |
| 65536 | steady | 1 | 176.1 | 145.2 | 48.4 | 138.3 | 78.2 | 111.5 | 3.00× |
| 65536 | steady | 10 | 350.5 | 159.3 | 68.4 | 145.3 | 86.5 | 282.6 | 2.33× |
| 65536 | mixed | 0 | 125.6 | 117.2 | 459.1 | 121.0 | 70.4 | 74.0 | 1.67× |
| 65536 | mixed | 1 | 147.1 | 119.6 | 456.1 | 105.2 | 70.6 | 89.2 | 1.69× |
| 65536 | mixed | 10 | 322.1 | 122.9 | 464.4 | 116.4 | 74.8 | 261.9 | 1.64× |

A ratio greater than one means the generated language implementation takes longer. Differences include representation, transaction strategy, cloning, allocations and ABI conversion; they cannot all be attributed to the surface language.

Correctness: 2,005 deterministic operations are checked against an independent Python integer/state model for each native implementation. The reference interpreter is also checked on the same source and stream. Separate native range tests exercise equivalent legacy certificates with negative and greater-than-128-bit intermediate values. See [correctness.json](correctness.json), [raw samples](samples.json), [toolchain and source metadata](metadata.json), and [generated code](generated-lib.rs).

The broader language, full stateful refinement, durable recovery and adaptive selection remain unfinished. These measurements do not close the full project goal.

Across 18 cells, bounded Ink takes 1.77× Rust tree time and 2.55× the fastest baseline's time by geometric mean. BigInt Ink takes 1.68× bounded Ink time. See [summary.json](summary.json).
