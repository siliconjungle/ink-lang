# Native stateful comparison

This run uses the database-backed exact maintenance bridge. The compiler independently checks the actual source expressions against canonical integer/list definitions and universal induction proofs, with no v1 polynomial authority on this path. The installed certificate and raw proof objects are archived in [maintenance.json](maintenance.json). Table projection, the transactional cache protocol, range analysis and native lowering remain trusted; this is not complete state-transition verification.

The new proof path does not itself change the update algorithm or generated native code. This report tests its actual runtime against the same maintained C/C++/Rust baselines. Database growth is not a performance claim. Actual backend CPU targets are archived in [backend-targets.json](backend-targets.json); Clang and Rust can resolve `native` differently.

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
| 64 | steady | 0 | 60.1 | 43.4 | 8.3 | 26.1 | 21.5 | 33.9 | 5.25× |
| 64 | steady | 1 | 73.5 | 43.4 | 8.4 | 26.3 | 21.3 | 48.9 | 5.17× |
| 64 | steady | 10 | 230.3 | 50.1 | 16.5 | 32.7 | 27.7 | 192.7 | 3.03× |
| 64 | mixed | 0 | 55.5 | 48.3 | 24.1 | 29.4 | 30.6 | 34.7 | 2.01× |
| 64 | mixed | 1 | 71.6 | 46.3 | 24.6 | 30.3 | 29.9 | 50.5 | 1.88× |
| 64 | mixed | 10 | 226.7 | 50.9 | 32.5 | 36.9 | 37.2 | 203.3 | 1.57× |
| 4096 | steady | 0 | 95.6 | 77.5 | 15.9 | 45.8 | 42.0 | 52.0 | 4.86× |
| 4096 | steady | 1 | 105.6 | 76.3 | 15.5 | 49.3 | 39.4 | 65.5 | 4.91× |
| 4096 | steady | 10 | 261.6 | 82.2 | 20.7 | 56.5 | 47.2 | 213.8 | 3.97× |
| 4096 | mixed | 0 | 94.9 | 86.8 | 60.9 | 59.3 | 48.4 | 52.6 | 1.79× |
| 4096 | mixed | 1 | 110.9 | 85.9 | 61.7 | 57.6 | 48.6 | 67.2 | 1.77× |
| 4096 | mixed | 10 | 267.0 | 92.7 | 68.5 | 69.4 | 55.5 | 219.7 | 1.67× |
| 65536 | steady | 0 | 150.9 | 137.4 | 44.4 | 107.9 | 72.6 | 81.4 | 3.10× |
| 65536 | steady | 1 | 167.8 | 138.1 | 45.2 | 106.2 | 68.0 | 98.2 | 3.06× |
| 65536 | steady | 10 | 325.9 | 144.2 | 61.7 | 127.1 | 81.1 | 258.5 | 2.34× |
| 65536 | mixed | 0 | 120.4 | 115.2 | 441.2 | 113.0 | 73.7 | 70.3 | 1.64× |
| 65536 | mixed | 1 | 140.2 | 113.7 | 442.2 | 106.3 | 67.5 | 95.9 | 1.69× |
| 65536 | mixed | 10 | 298.6 | 124.1 | 452.6 | 131.2 | 76.9 | 246.6 | 1.61× |

A ratio greater than one means the generated language implementation takes longer. Differences include representation, transaction strategy, cloning, allocations and ABI conversion; they cannot all be attributed to the surface language.

Correctness: 2,005 deterministic operations are checked against an independent Python integer/state model for each native implementation. The reference interpreter is also checked on the same source and stream. Separate native range tests exercise equivalent legacy certificates with negative and greater-than-128-bit intermediate values. See [correctness.json](correctness.json), [raw samples](samples.json), [toolchain and source metadata](metadata.json), and [generated code](generated-lib.rs).

The broader language, full stateful refinement, durable recovery and adaptive selection remain unfinished. These measurements do not close the full project goal.

Across 18 cells, bounded Ink takes 1.75× Rust tree time and 2.57× the fastest baseline's time by geometric mean. BigInt Ink takes 1.72× bounded Ink time. See [summary.json](summary.json).
