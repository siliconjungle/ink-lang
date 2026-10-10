# Database cache maintenance performance

The database now expresses cache reuse across aborted changes, host failures and
committed writes to unrelated tables, using universally checked source-bound
entries. Its compact transition carrier transports only the cached reply and
the complete source observation, avoiding duplicated table roots. No source
syntax, core checker, runtime or backend change is needed.

Cache retention alone has **no consistent end-to-end benefit** on these small
fixtures. Composing it with the canonical removal-idempotence law reduces
48-row aborted `erase` latency from **29.73 to 28.04 µs** (5.7% lower, 1.06×
throughput), and 24-row latency by 2.4%. There is no consistent improvement on
other calls, and the three-call executor has a different cost profile. Both
candidates remain explicit; neither is an automatic profitability selection.

## Results

Each number is the median of three standalone process-run medians. Each process
alternates candidate order per round, with nine samples of 512 complete calls
and 32 warmup calls per candidate. Both candidates use exactly the same runtime
and release native lowering. The refresh baseline already retains state after
ordinary queries. The source runtime establishes correctness but is not timed.

| Rows | Action | Refresh µs | Cache reuse µs | Refresh µs (composed trial) | Reuse + removal law µs |
| ---: | --- | ---: | ---: | ---: | ---: |
| 8 | `erase` | 10.70 | 10.95 | 10.72 | 10.78 |
| 8 | `flag` | 10.88 | 11.11 | 11.00 | 11.31 |
| 8 | `put` | 11.00 | 11.24 | 11.20 | 11.43 |
| 8 | `zero` | 9.75 | 9.94 | 9.86 | 10.02 |
| 24 | `erase` | 16.86 | 17.11 | 17.05 | 16.65 |
| 24 | `flag` | 17.63 | 16.81 | 16.29 | 16.61 |
| 24 | `put` | 17.01 | 17.18 | 16.99 | 17.34 |
| 24 | `zero` | 15.14 | 15.29 | 15.24 | 15.45 |
| 48 | `erase` | 29.83 | 29.58 | 29.73 | 28.04 |
| 48 | `flag` | 26.99 | 26.86 | 26.94 | 26.88 |
| 48 | `put` | 28.70 | 29.29 | 28.83 | 28.93 |
| 48 | `zero` | 25.47 | 25.60 | 25.47 | 25.65 |

The native composed `erase` ratios are 1.00×, 1.02× and 1.06× at 8/24/48 rows.
The 48-row three-call comparison gains about 1.7%, while its smaller cases and
other actions generally lose a few percent. The basic three-call cache candidate
is approximately 1–5% slower. Raw samples and controls are retained; small
differences should not be interpreted as a general speedup.

The first carrier retained the whole previous physical state. That experiment
gave no consistent fused gain and slowed change calls through the three-call
executor by about 14–32%. `whole-state-*.json`, `whole-state-driver.rs.txt` and the
canonical `whole-state.json` request preserve it. The producer now carries only
the cached reply. This avoids the experiment’s duplicated full-state transport
but does not make cache reuse automatically profitable.

## Scope and reproduction

Use the commands in [bench/representations](../../bench/representations/README.md).
`benchmark_cache_maintenance` generates/checks the basic compact candidate;
`benchmark_composed_cache_maintenance` also instantiates the existing abstract
removal-idempotence law. The unchanged source still removes twice; its selected
database function removes once under a universal complete-action equality proof.

The fixture has 8/24/48 main-table rows, one Boolean-table row and absent cached
key 0. `erase` stages a deletion/emission then returns a domain error; `flag`
commits an unrelated-table write; `put` replaces an existing main-table value;
`zero` is a cached query control. Timings include `Session::invoke_json`, JSON
outputs, acknowledgement, resource/snapshot validation and atomic publication.
Admission, restore, compilation, explicit checkpoints and durable I/O are outside
timed regions. No peak-memory, constant-time, large-table or baseline-language
performance claim is made. The desktop was shared; background activity is not
controlled. Native transport still visits the complete logical state.

Correctness histories compare full results/events and exact portable snapshots
against the original source runtime through cache presence/absence, unrelated
writes, rollback, host/version exhaustion, restore and generic/direct migration.
Reference, native fused and three-call execution all pass. A fully hashed false
unchanged-root claim passes content authentication but fails mathematical checking.
Fourteen representation tests and six canonical-store tests pass. Both manual
performance harnesses also check correctness before measuring.

Frozen requests, proofs and migrations are in
[`knowledge/research/cache-maintenance`](../../knowledge/research/cache-maintenance/README.md).
They replay without a producer or live SQLite index. Correctness proofs and
performance observations remain separate; broader source correspondence,
key-level delta maintenance and durable logs are still open.

See [provenance.json](provenance.json) for exact identities and artifact hashes.
