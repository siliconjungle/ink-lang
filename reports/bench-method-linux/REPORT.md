# Native stateful comparison

**Measurement warnings:** rustc uses LLVM 22 but clang uses LLVM 18: C/C++ and Rust code generation differ by backend version; uncommitted changes in a measured checkout.

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

| Rows | Stream | Queries/update | Language ns | Bounded ns | C flat ns | C++ tree ns | Rust tree ns | Rust BigInt ns | Rust literal-fail ns | Bounded / fastest baseline |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | steady | 0 | 78.3 | 57.6 | 53.8 | 72.0 | 44.2 | 53.2 | 44.2 | 1.30× |
| 64 | steady | 1 | 93.2 | 57.3 | 54.0 | 73.4 | 45.6 | 68.0 | 46.1 | 1.26× |
| 64 | steady | 10 | 229.1 | 69.2 | 70.1 | 90.1 | 60.5 | 202.1 | 62.0 | 1.14× |
| 64 | mixed | 0 | 90.9 | 75.9 | 64.1 | 55.3 | 53.0 | 56.6 | 61.7 | 1.43× |
| 64 | mixed | 1 | 101.4 | 75.3 | 64.3 | 57.6 | 53.9 | 71.3 | 63.0 | 1.40× |
| 64 | mixed | 10 | 230.7 | 84.8 | 77.9 | 70.5 | 67.5 | 198.6 | 75.8 | 1.26× |
| 4096 | steady | 0 | 160.9 | 138.3 | 96.6 | 120.5 | 76.8 | 88.4 | 78.2 | 1.80× |
| 4096 | steady | 1 | 192.7 | 148.1 | 103.3 | 127.6 | 79.8 | 105.6 | 79.8 | 1.86× |
| 4096 | steady | 10 | 305.5 | 152.8 | 111.4 | 143.7 | 89.5 | 235.8 | 89.6 | 1.71× |
| 4096 | mixed | 0 | 165.8 | 154.1 | 173.0 | 105.6 | 87.1 | 90.3 | 115.4 | 1.77× |
| 4096 | mixed | 1 | 184.2 | 153.2 | 171.5 | 107.2 | 86.6 | 106.0 | 114.4 | 1.77× |
| 4096 | mixed | 10 | 315.8 | 165.2 | 184.7 | 124.1 | 101.5 | 238.4 | 127.5 | 1.63× |

### Ratios with 95% paired bootstrap intervals

| Rows | Stream | Queries/update | Bounded ÷ Rust tree | Bounded ÷ Rust literal-fail | Bounded ÷ BigInt language |
| ---: | --- | ---: | ---: | ---: | ---: |
| 64 | mixed | 0 | 1.43× [1.18, 1.64] | 1.23× [1.13, 1.55] | 0.84× [0.68, 1.01] |
| 64 | mixed | 1 | 1.40× [1.37, 1.41] | 1.20× [1.17, 1.21] | 0.74× [0.73, 0.75] |
| 64 | mixed | 10 | 1.26× [1.12, 1.34] | 1.12× [1.08, 1.17] | 0.37× [0.36, 0.38] |
| 64 | steady | 0 | 1.30× [1.24, 1.34] | 1.30× [1.25, 1.34] | 0.74× [0.69, 0.76] |
| 64 | steady | 1 | 1.26× [1.04, 1.30] | 1.24× [1.02, 1.30] | 0.62× [0.60, 0.76] |
| 64 | steady | 10 | 1.14× [1.04, 1.29] | 1.12× [1.03, 1.29] | 0.30× [0.29, 0.34] |
| 4096 | mixed | 0 | 1.77× [1.57, 1.84] | 1.33× [1.28, 1.42] | 0.93× [0.88, 0.97] |
| 4096 | mixed | 1 | 1.77× [1.75, 1.92] | 1.34× [1.24, 1.40] | 0.83× [0.82, 0.88] |
| 4096 | mixed | 10 | 1.63× [1.52, 1.69] | 1.30× [1.23, 1.35] | 0.52× [0.50, 0.55] |
| 4096 | steady | 0 | 1.80× [1.76, 1.90] | 1.77× [1.70, 1.84] | 0.86× [0.81, 0.90] |
| 4096 | steady | 1 | 1.86× [1.81, 1.95] | 1.86× [1.80, 1.98] | 0.77× [0.75, 0.89] |
| 4096 | steady | 10 | 1.71× [1.68, 1.79] | 1.70× [1.63, 1.78] | 0.50× [0.49, 0.52] |

A ratio greater than one means the generated language implementation takes longer. Differences include representation, transaction strategy, cloning, allocations and ABI conversion; they cannot all be attributed to the surface language.

Correctness: 2,005 deterministic operations are checked against an independent Python integer/state model for each native implementation. The reference interpreter is also checked on the same source and stream. Separate native range tests exercise equivalent legacy certificates with negative and greater-than-128-bit intermediate values. See [correctness.json](correctness.json), [raw samples](samples.json), [toolchain and source metadata](metadata.json), and [generated code](generated-lib.rs).

The broader language, full stateful refinement, durable recovery and adaptive selection remain unfinished. These measurements do not close the full project goal.

Across 12 cells, bounded Ink takes 1.51× Rust tree time and 1.51× the fastest baseline's time by geometric mean. BigInt Ink takes 1.58× bounded Ink time. See [summary.json](summary.json).
