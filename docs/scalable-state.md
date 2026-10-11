# Scalable typed state

Ink now has explicit table operations for batches, direct reductions and shared
keys. These apply to keyed application data as well as entity/component tables.
The language still owns values, transaction boundaries and observable key order.
The database owns proved maintenance strategies and alternative mathematical
representations. Generated storage primitives remain part of backend trust.

```ink
record Position { x: f32, y: f32, }
state Positions: Table<u64, Position> = Table.empty();
state Moving: Table<u64, Unit> = Table.empty();

// Sorted shared keys; the implementation can probe the smaller table.
query active() -> List<u64> reads(Positions, Moving) {
    return Positions.shared_keys(Moving);
}
query total_x() -> f32 reads(Positions) {
    return Positions.sum_by(fn(position) => position.x);
}
change batch(keys: List<u64>, positions: List<Position>)
    -> Result<Unit, String> writes(Positions) {
    return Positions.put_many(keys, positions);
}
```

## Fixed source operations

| Operation | Result and order |
|---|---|
| `keys()` | Distinct keys in source key order |
| `shared_keys(OtherRoot)` | Sorted keys present in both tables; identical key types, separate row types; requires both read capabilities |
| `intersect_keys(keys)` | Sorted matching table keys; input duplicates have no effect |
| `put(key, value)` | Total insert or replacement, returning Unit |
| `put_many(keys, values)` | Result<Unit,String>; evaluate both inputs before writing; mismatched lengths return `Err("table bulk length mismatch")` with no writes; matched writes run in input order, with the last duplicate winning |
| `remove_many(keys)` | Unit; missing or repeated keys are harmless |
| `sum_by(fn(row) => contribution)` | u32/u64/i32/Int/f32 contribution type; forward accumulation in key order from typed zero |
| `count_where(fn(row) => predicate)` | Exact Int count |

Callbacks can capture values and read authorised state. They cannot write tables.
Integer sums preserve fixed-width wrapping or exact Int arithmetic. Floating sums
round each addition to binary32 in key order. A scan does not permit reassociation.
`shared_keys` is an explicit two-table primitive: lowerings do not recognise and
rewrite an arbitrary list pipeline to obtain its authority.

All writes use the existing outer transaction. Nested errors, explicit aborts,
resource failure and commit-sequence exhaustion discard tentative writes/events.
Bulk operations do not produce a stream of observable intermediate commits.

## Execution and storage

Rust and JavaScript direct scans avoid the intermediate values/map arrays. The
C lowering retains an ordered key carrier, fetches one row per iteration and
reclaims callback scratch while retaining its numerical accumulator.
Callbacks which require Rust's mutable state receiver use a conservative owned
row fallback. These storage choices preserve values and order.

C and JavaScript now journal previous optional payloads for affected writes,
rather than clone every table at change entry. Journals are replayed backwards.
Repeated writes cost repeated frames; checkpoint/restore remains an explicit
whole logical-state codec boundary. Journal frames and storage slots do not
appear in portable snapshots. JavaScript reuses its ordered key view until
membership changes; replacement reads live payloads.

The Rust default remains an ordered BTreeMap. An explicit compiler alternative
uses a contiguous row vector plus an ordered key-to-slot index. Removal swaps the
last row into the vacated slot and repairs its index. No row pointers escape.
Rows remain structured values; this does not inline String/List/Int allocations.
The index contains a key copy, so slots are not universally smaller.

```sh
ink emit-state app.ink --table-storage indexed-slots -o build/app
# The same option is available for Rust emission/build.
```

`ink_lowering_rust::state_native::emit_with_table_storage` also exposes this
choice to compiler clients. This is an implementation of the fixed finite-map
primitive, not the retired typed storage-policy admission path. No automatic
layout choice is made from the timings below. The ordered baseline is retained.

## Checked database strategies

`knowledge/producers/bulk_aggregate.py` extends the existing aggregate tactic
with total upsert, ordered batch upserts and batch removals. Its theorems maintain
word totals from the old result and per-write contributions. Generalised induction
instantiates the next step at the evolving rows and values. Duplicate keys,
wrapping contributions and arbitrary raw row spines are included. Every proposed
law, action observation and future-state obligation is checked locally.

`knowledge/producers/membership_cache.py` proves that key-only traversal helpers
ignore payload replacement. A cached intersection can survive payload changes
and unrelated-table changes. Membership changes refresh its exact result.
Both frozen fixtures use ordinary standalone representations and preserve their
portable checkpoints; there is no runtime source evaluator or per-call logical
snapshot validation.

The mathematical table domain still includes arbitrary unordered/duplicate raw
row spines. A sorted unique native map cannot silently replace that domain.
The batch aggregate candidate uses inductive row traversals for old contributions;
it does not establish native indexed O(log n) lookup for those candidate programs.
New automatic canonical-map refinements would require a checked invariant domain.
These strategies also do not establish arbitrary multiway incremental joins or
floating-point delta subtraction. Those are separate proof obligations.

## Selection and evidence

The existing planner accepts bounded lifecycle phase counts, exact target/workload
cohorts, migration costs and measured-memory constraints. Include construction,
batch mutation, churn, scans/intersections, failed transactions, checkpoints,
restore, proof checking and compilation in the profile as applicable. Missing
comparable evidence retains the baseline. A small-query benchmark cannot pay for
an expensive layout conversion or omitted checkpoint work.

See [the measurement report](../reports/scalable-state/REPORT.md). Tests compare
values, errors, commit status, events and exact snapshots with the independent
reference across C, Rust, JavaScript and both Wasm lanes, including the optional
Rust slot storage. Closed mathematical histories independently check the source
projection. Authenticated, re-signed false maintenance laws fail admission.
Tables and these actions execute on the host; no device table kernel is claimed.
Word-to-Int casts remain outside the current mathematical action projection;
existing Int-valued rows and direct Int scans are covered.

Reproduce the frozen proofs with an environment containing the existing proof
producer dependencies:

```sh
PATH="$PWD/build/proof-venv/bin:$PATH" python3 tools/reproduce_scalable_knowledge.py
```
