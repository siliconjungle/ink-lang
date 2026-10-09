# Database-defined reversible cache journals

An exact maintained total used to save its entire previous BigInt value before every write. That copies a large integer even when a row changes by one. Version-3 maintenance evidence now supplies the journal's saved value, forward expression and restore expression. The generic proof kernel and library loader are unchanged; the new source correspondence bridge checks these actual expressions before either reference execution or native emission.

This is an implemented cache refinement fragment. The table projection, table/list correspondence, reverse undo scheduling, event staging, transaction boundaries and Rust lowering remain trusted. It is not an end-to-end proof of the state machine or a completed language implementation.

## Two candidates under one compiler

The package in `knowledge/reversible-maintenance` supplies both a full snapshot and a reversible difference. These are data-selected expressions, rather than a compiler tag naming a preferred arithmetic algorithm.

| Operation | Saved value | Apply | Restore |
| --- | --- | --- | --- |
| Insert | `new` | `total + saved` | `total - saved` |
| Replace | `new - old` | `total + saved` | `total - saved` |
| Remove | `old` | `total - saved` | `total + saved` |

The alternate snapshot package saves `total`, applies the original update, and restores `saved`. It uses the same version-3 checker. Both packages have the same logical source updates: `total + new`, `total + (new - old)`, and `total - old`.

Each action in an evidence file has `save`, `apply`, `restore`, `forward` and `inverse` fields. Expressions use the ordinary syntax AST; proofs use the existing generic proof-term format. At present each entry saves one exact integer. This does not yet describe arbitrary database-defined table layouts or richer journal records.

The bridge checks two obligations for arbitrary signed integers, including totals that are not reachable in the application:

```text
apply(total, old?, new?, save(total, old?, new?))
    = original_update(total, old?, new?)

restore(apply(total, old?, new?, save(...)), save(...))
    = total
```

`save` may use only the operation's available inputs. `apply` may additionally use `saved`. `restore` may use only the current `total` and `saved`. Missing variables, unsupported expressions or proofs, changed definitions, mismatched semantics and altered objects fail closed. Rehashing a false candidate does not make it valid. Version 2 cannot carry journal evidence; version 3 requires it.

The original insert/replace/remove source-to-list-sum proofs are still mandatory. The inverse proof is an additional obligation, not a substitute for showing that the forward update maintains the right total. Saved expressions are evaluated before the current total changes and evaluated only once. The native backend applies the checked expression using that saved result, then stores it in the typed undo entry. Rollback evaluates the supplied restore expression in reverse write order. An absent-to-absent removal leaves the cache unchanged and stores no cache value.

Multiple maintained queries receive independent journal values. Logical portable snapshots still omit caches and journals; they rebuild totals from table rows when restored. Selection requires a transaction boundary and validates the complete certificate before changing the active caches.

Bounded u128 caches keep full snapshots. The new evidence lives in exact integer semantics and does not authorise interpreting a negative difference as an unsigned value. A proved modular journal representation remains future work.

## Proof production

`tools/reversible_maintenance_proofs.py` is an untrusted external producer. It extends the 37-object delta package with two universal theorems: `subtraction_self` and `undo_subtraction`. The preserved pre-change compiler checks these theorem objects using the unchanged generic kernel. The new compiler then checks the two actual journal candidates through the version-3 source bridge. No ring axiom, built-in cancellation law or solver was introduced.

```sh
python3 dev.py build --release
python3 tools/reversible_maintenance_proofs.py build/journal-package \
  --compiler target/release/ink --kernel build/reversible-original/lang
target/release/ink emit-state bench/wide-cache/program.ink \
  --maintenance knowledge/reversible-maintenance/reversible.json \
  -o build/reversible-program
```

`--kernel` can also point to the current compiler on a fresh checkout. The original binary is an ignored local audit artifact; it is not shipped in Git. Its identity and unchanged kernel source hashes are recorded in the reports. Reconstructing that original binary requires the recorded parent commit and toolchain.

The reversible certificate is `3e04eec46e7766ec5636424f188c31690d4e06997ea123a57cccd2b0beed542e`. The snapshot certificate is `f38b574207c03be62b99bd2020dd4a8513505fc48960c64bd80273f52283d495`.

## Measured results and limits

The full suite passes 65 tests. The expanded stateful integration tests execute both database journal choices alongside canonical, commuted and delta maintenance. They cover multiple tables, multiple cached queries, wide signed values, tentative reads, repeated writes and removals during abort, staged events, checkpoint continuation and exhausted commit counters in both reference and compiled native execution. Native tests also exercise bounded-cache fallback.

[The wide-Int experiment](../reports/reversible-cache-phase1/REPORT.md) contains 448 samples over 16 cells and 4,096 independent native comparisons. Its four variants are legacy full snapshots, database-defined full snapshots, database-defined reversible differences and handwritten Rust BigInt. The same compiler emits all three Ink choices. Their source arithmetic is identical. The smaller journal improves by 1.31× on the small-changing-row profile, with essentially no gain on the wide-changing-row profile. Across all cells it improves by 1.14× over legacy snapshots and 1.13× over database snapshots, but still takes 2.54× handwritten Rust time. These are geometric means of cell medians on an interactive shared host, not universal speed claims.

Separate allocation instrumentation for an 8192-exponent anchor and small changing row counts 2.492 calls/update with either snapshot choice and 1.492 with the reversible journal. Requested allocation bytes fall from 3064.125 to 2036.0625 per update. Rust performs zero allocations in this case by reusing capacity. For the wide changing row, the reversible journal requests more allocations and bytes than the snapshot. Allocation counters are separate builds; they are neither timings nor peak/live memory measurements.

[The inventory experiment](../reports/reversible-inventory-phase1/REPORT.md) contains 756 samples, 12,030 independent native comparisons and 4,010 reference outcomes against C, C++ and Rust. It includes failures, ordered events and different update/query mixes. Bounded Ink still takes 1.77× Rust u128 time; its cache representation is unchanged. These results identify useful costs to remove, rather than establishing the fastest language.

```sh
python3 bench/reversible-cache.py
python3 bench/state/run.py \
  --maintenance knowledge/reversible-maintenance/reversible.json \
  --output reports/reversible-inventory-phase1 \
  --build-directory build/reversible-inventory-bench
python3 tools/cache_allocations.py \
  --report reports/reversible-cache-phase1 \
  --benchmark bench/reversible-cache.py \
  --build-directory build/reversible-allocation-audit
python3 tools/audit_reversible_reports.py --execute
```

The executed audit validates archived sources, actual emitted code/plans, the complete sample matrices, summaries and allocation counters. It replays original measured native binaries without rebuilding them, and regenerates both journal candidates and the new theorem objects. The measurement sources and pinned toolchains are archived; local native binary and original-compiler identities are retained for replay.

Next steps are checked reuse of mutable integer capacity, general transaction/table refinement, database-defined representations and measured selection with safe migration. Durability, broader language coverage and the complete benchmark acceptance criteria in `PLAN.md` remain open.
