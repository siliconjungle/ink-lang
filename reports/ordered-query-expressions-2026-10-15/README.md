# Ordered query expressions: first milestone

This milestone adds typed ordered `list<T>{from ...; where ...; join ... on ...; select ...;}`
and Boolean `exists{...}`. It includes nested/lateral queries, generic values,
once-only independent input evaluation and checked pure compute helpers in actions.
See [syntax and exact scope](../../docs/query-expressions.md).

This closes only the ordered-query foundation within family 2 of the
[full programme](../../docs/optimisation-language-programme.md). Other relational
operators, Bag/Set meanings, query optimizer proposals and storage execution remain open.

## Validation

On base `72b6d270ed66a8f2a95d03cb1d149d7a504d3bdc` plus this milestone:

- Standalone core: 385 tests passed across 67 test binaries/doc-test summaries.
- Import, foundation, law source and source syntax suites: 25 tests passed.
- The mandatory generic-library query fixture: 113 independently expected values,
  outcomes and exact snapshots matched reference/native Rust/JavaScript/Rust-Wasm
  and wgpu-host execution. Nineteen eligible calls actually dispatched to the GPU;
  unsupported nested collection queries used compiled CPU execution.
- Checks include duplicate and empty inputs, wrapping words, raw float bits,
  lexical hygiene, input order, ordered events, errors, rollback and restore;
  invalid types, ownership, effects and unproved preconditions reject.
- Ordinary equality replay admits the elaborated query/pipeline correspondence;
  a rehashed law changing `>=` to `>` rejects. No query theorem whitelist exists.

[Validation receipt](validation.json) records exact commands, pins and source hashes;
the three accompanying logs retain outputs. Publication CI was pending at receipt
creation. A green local test does not establish whole compiler correctness.

## Held-out warm call measurements

Times below are nanoseconds per complete call, including output consumption.
They are medians of three process medians, with eleven samples per process.
These are measurements on this Apple Silicon host, without confidence intervals
or an automatic selection decision. See [all development/holdout results](report.json).

| Target and workload | Query | Ordinary Ink pipeline/loop | Handwritten target control |
| --- | ---: | ---: | ---: |
| Rust, empty filter | 3.31 | 3.34 | 3.41 |
| Rust, filter 8 | 23.30 | 23.13 | 66.03 |
| Rust, filter 4096 / broad result | 5,525.88 | 5,756.75 | 5,454.02 |
| Rust, filter 4096 / selective | 3,114.07 | 3,435.40 | 2,201.23 |
| Rust, exists / first of 4096 | 197.72 | 196.80 | 4.16 |
| Rust, exists / missing in 4096 | 687.02 | 1,537.88 | 149.98 |
| Rust, join 8 × 8 | 91.06 | 96.02 | 27.05 |
| Rust, join 256 × 256 | 24,759.93 | 36,945.80 | 21,413.90 |
| JS, empty filter | 21.62 | 19.57 | 13.48 |
| JS, filter 4096 / broad result | 25,988.45 | 26,060.55 | 23,789.39 |
| JS, filter 4096 / selective | 5,631.71 | 5,574.22 | 5,230.67 |
| JS, exists / first of 4096 | 18.06 | 17.29 | 12.13 |
| JS, exists / missing in 4096 | 1,621.22 | 1,450.93 | 2,084.03 |
| JS, join 8 × 8 | 46.26 | 179.31 | 76.63 |
| JS, join 256 × 256 | 91,369.14 | 131,805.98 | 54,412.77 |

The broad filter is close to handwritten Rust and to the ordinary pipeline in
both targets. Selective filters, larger JS joins and native early-exit searches
retain substantial gaps. Native exported typed functions own their `Vec` inputs;
the harness includes cloning reusable caller data, while handwritten Rust borrows
slices and can use the standard vectorized membership operation. This makes the
first-match comparison primarily a call/storage-boundary comparison. It motivates
borrowed views rather than establishing an intrinsic query traversal cost.
JavaScript compares exported trusted calls against direct handwritten functions;
allocation, wrapper and object-representation costs are included.

One generator lowers to existing map/filter operators, exposing their iterator
lowering. The initial exploratory Buffer accumulation version was roughly four
times slower than the native pipeline on the broad filter; it was replaced before
this measured milestone. Nested joins still use ordered Buffer accumulation and
have no index/hash-join selection. Any apparent win on a small case is a host/run
observation, not a universal speed claim.

## Reproduction and retained data

```sh
cargo build
python3 tools/bench_queries.py --compiler target/debug/ink \
 --output build/query-benchmark --processes 3
```

Use the distribution's pinned packages and the source/scripts bound by
`validation.json`. This run used Rust 1.99, Node 22 and macOS 15.7.4 arm64.
`source.ink` and `core.json` retain the exact source and elaboration. The twelve
`rust-*.json` / `javascript-*.json` files retain every process sample, batch count,
setup duration and consumed sink. `development.json` / `holdout.json` retain the
independent seeded inputs and complete independently computed expectations;
the `module` property is the original local generated-JS path and is recreated
by the script on another machine. There are 24 cases per cohort, including
empty/small inputs, selective filters, early/late/missing witnesses and joins.
All complete outputs are checked before and after timing; lane order is shuffled.

The report separates source emission and native release build from warm calls;
JS process import setup and whole process elapsed times are in the raw receipts.
The first process is subject to host filesystem/build cache state. No GPU
profitability, storage-engine, durability or complete-application benchmark is
claimed here. The core/JS/Rust-Wasm/wgpu conformance coverage is separate evidence.
