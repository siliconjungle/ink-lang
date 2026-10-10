# Representation performance follow-up

Complete native representation calls measured **2.54–3.67× faster** than the
previous boxed, three-call path on these 8–48-row fixtures. This comparison
includes the cached logical snapshot layout, fused native projections and shared
immutable constructor fields. It is a comparison of representation execution
paths; the ordinary source-language runtime is used for correctness, not timed
as a competitor.

## Changes

The knowledge producer publishes universal proofs for ordinary queries that
retain physical state instead of reconstructing it and refreshing an unrelated
cached reply. Frozen old and new requests remain in the canonical store. Native
lowering executes once and applies both projections while the intermediate is
still typed, and uses generic immutable `Arc` fields to avoid recursive copies.
The runtime caches the original snapshot layout. Source syntax, proof-kernel
rules, all-action obligations, call-time snapshot/resource validation and atomic
publication remain unchanged. Changes still recompute the cached query; this
is not incremental delta maintenance.

## Results

Numbers are the median of three process-run medians, each comprising nine
samples of 128 complete calls. Times include JSON result handling,
acknowledgement and call-time snapshot validation; admission, restore,
compilation, explicit checkpoints and durable I/O are outside the timed loop.

| Rows | Action | Previous µs/call | Improved µs/call | Ratio |
| ---: | --- | ---: | ---: | ---: |
| 8 | `zero` | 30.77 | 8.39 | 3.67× |
| 8 | `get` | 28.65 | 8.40 | 3.41× |
| 8 | `put` | 30.97 | 9.69 | 3.20× |
| 8 | `erase` | 29.61 | 9.35 | 3.17× |
| 24 | `zero` | 45.78 | 13.45 | 3.40× |
| 24 | `get` | 41.02 | 13.62 | 3.01× |
| 24 | `put` | 44.78 | 15.75 | 2.84× |
| 24 | `erase` | 43.23 | 15.20 | 2.84× |
| 48 | `zero` | 79.26 | 23.41 | 3.39× |
| 48 | `get` | 66.44 | 23.64 | 2.81× |
| 48 | `put` | 72.82 | 27.06 | 2.69× |
| 48 | `erase` | 69.86 | 27.53 | 2.54× |

The current driver also isolates selection from execution overhead:
`before` uses the old database candidate through the three-call executor;
`database_only` uses the retained candidate through that same executor;
`runtime_only` uses the old candidate through fused native execution;
`after` uses the retained candidate through fused execution. All four share the
new runtime/layout and native storage in the **after** reports.

In that matched fused comparison, retained `get` calls improve by about 4–6%.
This is small and close to the variation seen on unchanged control actions;
most of the overall gain comes from runtime/native transport. In the three-call
comparison, retaining `get` is about 4–21% slower because its extra intermediate
carrier is transported repeatedly. Keep the previous candidate available and
use measured target/workload costs for selection. A universally correct candidate
is not automatically profitable on every executor.

## Method and provenance

See [the driver and reproduction command](../../bench/representations/README.md)
and [provenance.json](provenance.json). Raw before/after trials are the six JSON
files beside this report. For the overall comparison use `before` in each
`before-N.json` and `after` in each `after-N.json`. The before executable preserves
the previous ABI, boxed storage and per-call layout work; it was compiled earlier
in this session and is retained in the ignored build directory. Its SHA is in the
provenance. The committed driver reproduces the four matched current-path
comparisons; measuring an historical whole path also requires its corresponding
runtime/backend implementation, rather than silently comparing to the current
cached layout.

This ran on an Apple M2 desktop with Rust 1.96.0, release libraries, generated
Rust optimisation and thin LTO. Three process runs alternate mode order. The
machine also runs other applications and background services; these are local
measurements, not an isolated performance laboratory. Peak memory was not
measured. The row counts stay within the native recursive-input depth limit;
there is no large-table scalability, durability-throughput or constant-time
end-to-end cached-query claim. Full logical state transport remains proportional
to state size.

The timed driver checks results and byte-identical snapshots separately.
Eleven representation tests pass, including 48-row compiled histories,
fused/default parity, cached-query updates/aborts, direct/generic migration,
restore, version exhaustion, authentic false-proof rejection and offline frozen
replay. Seven generic native-definition tests, two machine tests and six canonical
store tests pass. Independent Rust/runtime locked/offline builds and C, Rust,
JavaScript and both Wasm whole-action conformance checks pass. Core source and its
exact downstream revision remain unchanged.
