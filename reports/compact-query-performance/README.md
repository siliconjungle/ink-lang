# Compact database query transitions

The database candidate eliminates duplicated table roots from query
intermediates. On the measured three-call Rust executor, 48-row query latency
falls by **21.5–23.7%** (1.27–1.31× throughput). Fused execution is about 2–6%
slower in these trials, including small changes in unchanged control actions.
The candidate remains explicit: correctness does not imply profitability on
every executor. No source syntax, core, runtime or backend change is required.

## Definition and proof

For the cached query, the original source observation already carries both its
cached reply and logical post-state. Its next-state function reconstructs the
physical tuple from those fields, with no auxiliary transition carrier. Ordinary
queries carry only the cached value and original observation. Uncached physical
layouts use the original observation directly. Query cache values are preserved
without refreshing the cached query. All complete observations and physical
relations remain universally checked using existing general equality rules.

Both measured candidates include identical checked change-boundary cache
maintenance and the canonical complete-action removal law. Only query transition
definitions differ. The source program and source snapshot identity are unchanged.
Table roots still cross the final observation and next-state outputs, and full
logical snapshot/resource validation remains inside each call. This work removes
redundant intermediate transport; it does not make full calls constant time.

## Results

Each cell is the median of three standalone process-run medians, with nine
alternating-order rounds of 512 complete calls and 32 warmup calls per candidate.
Compilation and tests finished before the archived runs. Restore, admission,
explicit checkpoints and durable I/O are outside the timing loop.
`Session::invoke_json`, JSON result handling, acknowledgement and call-time
snapshot validation are timed. Source-runtime parity is checked outside timing.

| Rows | Action | Three-call before µs | Three-call compact µs | Fused before µs | Fused compact µs |
| ---: | --- | ---: | ---: | ---: | ---: |
| 8 | `zero` | 26.92 | 24.93 | 10.71 | 11.09 |
| 8 | `get` | 26.49 | 25.22 | 10.28 | 10.87 |
| 8 | `flagged` | 26.34 | 25.00 | 10.25 | 10.84 |
| 8 | `erase` | 24.70 | 26.06 | 11.09 | 11.47 |
| 8 | `put` | 26.41 | 27.44 | 11.66 | 12.11 |
| 24 | `zero` | 40.67 | 34.60 | 15.68 | 16.18 |
| 24 | `get` | 40.67 | 35.26 | 15.84 | 16.51 |
| 24 | `flagged` | 40.64 | 35.10 | 15.87 | 16.34 |
| 24 | `erase` | 34.83 | 36.13 | 16.90 | 17.31 |
| 24 | `put` | 36.00 | 37.48 | 17.62 | 18.11 |
| 48 | `zero` | 68.76 | 53.69 | 26.15 | 26.70 |
| 48 | `get` | 69.01 | 54.17 | 26.52 | 27.16 |
| 48 | `flagged` | 71.71 | 54.71 | 26.57 | 27.08 |
| 48 | `erase` | 54.80 | 56.17 | 28.40 | 28.97 |
| 48 | `put` | 56.77 | 58.19 | 29.29 | 30.09 |

Three-call query latency decreases by about 5–7% at eight rows, 13–15% at
24 rows and 22–24% at 48 rows. `erase` and `put` are unchanged controls; their
measured cost shifts show why small differences should not be generalised.
Neither the prior candidate nor the new one is automatically selected.

## Database evidence and reproduction

The 60 canonical timing observations under `knowledge/store/observations` pin
both candidates, the original source, executor mode, hardware/toolchain and exact
workload. Each contains 27 per-call batch samples (three runs × nine rounds).
`metrics.peak_bytes` is `null` because peak memory was not measured; zero remains
a distinct measured value. These evidence records are separate from mathematical
entries and do not alter the proof snapshot. They survive disposable-index
rebuild and can be queried with `Store.observations` for exact comparable target
and workload data. Recording them does not add automatic representation search.

```sh
CARGO_INCREMENTAL=0 cargo test --release --test representations \
  benchmark_compact_query_transitions -- --ignored --nocapture
```

The driver is [compact-queries.rs.txt](../../bench/representations/compact-queries.rs.txt).
Frozen previous/direct/cached requests and a direct migration are in
[`knowledge/research/compact-queries`](../../knowledge/research/compact-queries/README.md).
The producer option is `--compact-queries`; older requests and earlier benchmark
reports remain unchanged. The fixture has 8/24/48 nonzero main-table keys, one
Boolean-table key and absent cached key 0. `get` reads the last key, `flagged`
reads Boolean key 0, `erase` aborts, and `put` replaces the last key.

Sixteen representation tests cover source parity, cached and ordinary queries,
both physical layouts, cache presence/absence, rollback/events, exact snapshots,
restore/migration, exhausted versions and rejection of a content-authentic false
cached reply. Seven knowledge-store tests include unknown-memory preservation
through index rebuild and target separation. The release harness also validates
native fused/default and reference histories before measurement.

These are small recursive fixtures on a shared Apple M2 desktop with uncontrolled
background activity. There is no large-table, peak-memory, durable-I/O or
baseline-language performance claim. Native transport/resource limits remain.
See [provenance.json](provenance.json) for exact pins, input and executable hashes.
