# Native stateful comparison

**Measurement warnings:** Apple Clang version does not identify its upstream LLVM major; backend version matching is unestablished; uncommitted changes in a measured checkout.

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

All variants use the same separately compiled C driver, without cross-boundary LTO. ABI query conversion and return-value handling are included. Generated writes also reuse the previous value returned by map insertion/removal, avoiding a redundant lookup. 1 discarded warmup run(s), then 3 interleaved rounds with randomised variant order. No CPU pinning or isolated-machine claim. The table reports median nanoseconds per attempted update **including its queries**.

| Rows | Stream | Queries/update | Language ns | Bounded ns | C flat ns | C++ tree ns | Rust tree ns | Rust BigInt ns | Rust literal-fail ns | Bounded / fastest baseline |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | steady | 0 | 42.6 | 29.8 | 8.0 | 26.7 | 22.6 | 33.6 | 22.3 | 3.72× |
| 64 | steady | 1 | 58.1 | 29.8 | 8.7 | 26.6 | 21.9 | 49.4 | 21.6 | 3.41× |
| 64 | steady | 10 | 220.9 | 36.1 | 16.2 | 32.9 | 29.9 | 200.4 | 29.1 | 2.22× |
| 64 | mixed | 0 | 52.5 | 44.5 | 24.6 | 30.6 | 30.4 | 34.4 | 37.3 | 1.81× |
| 64 | mixed | 1 | 65.2 | 41.2 | 25.2 | 31.5 | 30.7 | 52.8 | 37.9 | 1.63× |
| 64 | mixed | 10 | 230.4 | 47.8 | 33.9 | 38.1 | 38.0 | 207.9 | 44.7 | 1.41× |
| 4096 | steady | 0 | 71.6 | 69.2 | 16.3 | 49.5 | 41.0 | 53.6 | 41.5 | 4.26× |
| 4096 | steady | 1 | 89.5 | 68.9 | 16.7 | 52.0 | 43.3 | 68.0 | 40.8 | 4.13× |
| 4096 | steady | 10 | 264.3 | 71.7 | 22.9 | 59.2 | 48.2 | 216.4 | 49.3 | 3.14× |
| 4096 | mixed | 0 | 94.5 | 86.6 | 69.0 | 65.2 | 48.5 | 54.5 | 68.2 | 1.78× |
| 4096 | mixed | 1 | 111.5 | 88.5 | 70.2 | 63.4 | 50.2 | 70.6 | 65.9 | 1.76× |
| 4096 | mixed | 10 | 271.3 | 95.1 | 77.5 | 75.6 | 56.3 | 221.7 | 73.5 | 1.69× |

### Ratios with 95% paired bootstrap intervals

| Rows | Stream | Queries/update | Bounded ÷ Rust tree | Bounded ÷ Rust literal-fail | Bounded ÷ BigInt language |
| ---: | --- | ---: | ---: | ---: | ---: |
| 64 | mixed | 0 | 1.46× [1.39, 1.49] | 1.19× [1.14, 1.22] | 0.85× [0.84, 0.85] |
| 64 | mixed | 1 | 1.34× [1.31, 1.40] | 1.09× [1.00, 1.13] | 0.63× [0.62, 0.66] |
| 64 | mixed | 10 | 1.26× [1.25, 1.28] | 1.07× [1.05, 1.13] | 0.21× [0.20, 0.22] |
| 64 | steady | 0 | 1.32× [1.29, 1.32] | 1.34× [1.34, 1.37] | 0.70× [0.68, 0.73] |
| 64 | steady | 1 | 1.36× [1.32, 1.43] | 1.38× [1.29, 1.40] | 0.51× [0.50, 0.51] |
| 64 | steady | 10 | 1.21× [1.10, 1.31] | 1.24× [1.22, 1.26] | 0.16× [0.16, 0.17] |
| 4096 | mixed | 0 | 1.78× [1.67, 1.83] | 1.27× [1.26, 1.36] | 0.92× [0.92, 0.93] |
| 4096 | mixed | 1 | 1.76× [1.73, 1.83] | 1.34× [1.32, 1.37] | 0.79× [0.76, 0.82] |
| 4096 | mixed | 10 | 1.69× [1.66, 1.72] | 1.29× [1.29, 1.30] | 0.35× [0.35, 0.36] |
| 4096 | steady | 0 | 1.69× [1.68, 1.79] | 1.67× [1.67, 1.76] | 0.97× [0.84, 1.03] |
| 4096 | steady | 1 | 1.59× [1.52, 1.65] | 1.69× [1.67, 1.74] | 0.77× [0.72, 0.79] |
| 4096 | steady | 10 | 1.49× [1.43, 1.67] | 1.45× [1.38, 1.70] | 0.27× [0.26, 0.29] |

A ratio greater than one means the generated language implementation takes longer. Differences include representation, transaction strategy, cloning, allocations and ABI conversion; they cannot all be attributed to the surface language.

Correctness: 2,005 deterministic operations are checked against an independent Python integer/state model for each native implementation. The reference interpreter is also checked on the same source and stream. Separate native range tests exercise equivalent legacy certificates with negative and greater-than-128-bit intermediate values. See [correctness.json](correctness.json), [raw samples](samples.json), [toolchain and source metadata](metadata.json), and [generated code](generated-lib.rs).

The broader language, full stateful refinement, durable recovery and adaptive selection remain unfinished. These measurements do not close the full project goal.

Across 12 cells, bounded Ink takes 1.48× Rust tree time and 2.39× the fastest baseline's time by geometric mean. BigInt Ink takes 1.95× bounded Ink time. See [summary.json](summary.json).
