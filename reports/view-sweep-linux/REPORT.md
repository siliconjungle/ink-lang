# Maintained views: update/query sweep (Linux cloud VM)

**This tests Ink's central incremental-view claim on one workload.** Maintaining a view costs a little on every update. In exchange, queries no longer pay a scan, and the decomposition that makes this correct is now *checked* (`--prove-views`; see docs/view-decomposition.md and docs/general-laws.md).

**These are indicative numbers, not a headline result.** The machine is a 2-core cloud VM (Xeon @ 2.10GHz) with no frequency control. rustc uses LLVM 22 while clang uses LLVM 18, but only the C driver is built with clang. Some intervals are wide. Use the crossover points and orders of magnitude, not the second digit.

## Workload

`bench/views/view_sweep.ink` has the following parts:

- **The table:** `Rows: Table<u64, Row{ b: u32, flag: Bool }>`.
- **The views:** `active_units = sum(filter(flag).map(Int(b)))` and `active_rows = count(filter(flag))`.
- **The operations:** upserting and deleting a row, plus one query per view.

The C driver (`bench/views/driver.c`) runs the steps:

- **Initial table:** it builds `n` rows (key k, b = k mod 1000, flag = k mod 3 ≠ 0). This setup is not timed.
- **Each step:** it uses an xorshift stream. A step is a query with probability *q*, alternating between the two views. Otherwise it is an update over 2n keys: 10% deletes and 90% upserts with a random `b` and `flag`.

All variants share the driver and its ABI. Every variant must report identical checksums, final totals, counts, query counts and update counts for each configuration. They do, and the run aborts otherwise.

| Variant | What it is |
|---|---|
| Ink maintained | `emit-state --maintenance table.json --prove-views --require-views`. Both views carry checked decompositions (`plan.json` → `view_decompositions`, no fallback). |
| Ink scan | `emit-state` without maintenance: recomputes the view on every query |
| Rust incr. i64 | handwritten `BTreeMap`, totals maintained by deltas in `i64` |
| Rust incr. bigint | same, with `num-bigint` totals (Ink's `Int` semantics) |
| Rust scan | handwritten `BTreeMap`, recompute per query |

## Method

- **Build:** release; Rust with `-C target-cpu=native -C panic=abort`; no LTO across the C/Rust boundary.
- **Runs:** one warmup and agreement run, then 5 interleaved rounds per configuration.
- **Reported value:** median ns per operation (query or update), with paired bootstrap 95% intervals for ratios (`bench/methodology.py`).
- **Steps:** `min(200000, max(400, 1e7 / (n·q + 1)))`, which keeps the scan work per run roughly constant.
- **Sources:** ink-lang 999a6b7 and knowledge a6cdd58, with clean checkouts. Environment, plans and all commands are in `results.json`. Reproduce with `python3 bench/views/run.py` and `python3 bench/views/report.py reports/view-sweep-linux/results.json`.

## Results (ns per operation, median of 5)

### 1024 rows

| queries | Ink maintained | Ink scan | Rust incr. i64 | Rust incr. bigint | Rust scan | Ink scan ÷ maintained | maintained ÷ Rust bigint | maintained ÷ Rust i64 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0% | 159 | 96.5 | 66.8 | 89.2 | 61.8 | 0.61× [0.57, 1.14] | 1.78× [0.91, 2.07] | 2.37× [1.83, 2.71] |
| 0.1% | 156 | 140 | 66.2 | 97.8 | 70.3 | 0.90× [0.79, 1.03] | 1.59× [1.28, 1.76] | 2.35× [2.24, 2.60] |
| 1% | 170 | 378 | 71.0 | 105 | 140 | 2.23× [1.87, 2.73] | 1.61× [1.56, 1.61] | 2.39× [1.99, 2.81] |
| 10% | 155 | 2,147 | 64.1 | 98.4 | 543 | 14× [11, 16] | 1.58× [1.29, 2.23] | 2.42× [2.30, 3.13] |
| 50% | 97.5 | 8,284 | 44.8 | 68.2 | 1,556 | 85× [83, 90] | 1.43× [1.38, 1.49] | 2.18× [2.10, 2.23] |
| 90% | 38.1 | 11,216 | 15.6 | 31.1 | 1,918 | 294× [48, 396] | 1.23× [0.91, 7.34] | 2.45× [1.92, 14.18] |
| 99% | 22.2 | 10,906 | 7.4 | 20.5 | 1,784 | 492× [419, 537] | 1.08× [1.00, 1.12] | 3.01× [2.92, 3.25] |

### 65536 rows

| queries | Ink maintained | Ink scan | Rust incr. i64 | Rust incr. bigint | Rust scan | Ink scan ÷ maintained | maintained ÷ Rust bigint | maintained ÷ Rust i64 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0% | 271 | 255 | 156 | 192 | 151 | 0.94× [0.81, 1.11] | 1.41× [1.29, 1.66] | 1.73× [1.63, 1.91] |
| 0.1% | 268 | 1,317 | 135 | 172 | 558 | 4.92× [4.92, 5.35] | 1.55× [1.24, 1.57] | 1.99× [1.68, 2.00] |
| 1% | 233 | 7,518 | 126 | 149 | 2,249 | 32× [31, 34] | 1.56× [1.50, 1.65] | 1.85× [1.75, 2.00] |
| 10% | 248 | 80,705 | 127 | 157 | 22,546 | 325× [260, 339] | 1.58× [1.03, 1.94] | 1.96× [1.52, 2.44] |
| 50% | 198 | 374,534 | 108 | 134 | 96,768 | 1,891× [710, 2,048] | 1.48× [1.30, 3.70] | 1.84× [1.60, 5.25] |
| 90% | 60.5 | 792,539 | 40.4 | 45.1 | 228,473 | 13,101× [10,941, 14,117] | 1.34× [1.15, 1.67] | 1.50× [0.62, 1.85] |
| 99% | 28.1 | 819,607 | 19.3 | 25.9 | 188,625 | 29,173× [22,254, 30,029] | 1.09× [1.05, 1.85] | 1.46× [1.37, 1.76] |


## Findings

1. **Maintenance costs little on updates.**
   - With no queries, the maintained build is 0.94× (65,536 rows) to 0.61× (1,024 rows) the speed of the scanning build per update, because each update also adjusts two exact totals.
   - At 1,024 rows the interval is wide ([0.57, 1.14]).
2. **The crossover comes early.**
   - At 65,536 rows, maintenance is already 4.9× faster at 0.1% queries.
   - At 1,024 rows it wins from 1% queries (2.2×).
   - With 99% queries on 65,536 rows it is about 29,000× faster than recomputing.
   - Even against hand-written Rust that recomputes (Rust scan), the maintained Ink build wins from 0.1% queries at 65,536 rows.
3. **Ink is close to hand-written incremental Rust with the same exact integers.**
   - Against bigint totals, Ink maintained is 1.1–1.8× slower; the gap narrows as queries dominate (1.08–1.09× at 99%).
   - Against machine-word `i64` totals it is 1.5–3.0× slower. That gap is the price of exact `Int` plus generated transaction and cache code.
4. **The checked decomposition adds no runtime cost.** Proofs are checked at build time, and the generated maintenance code is the same as under the historical assumed decomposition.

## Limits

- One workload shape: a single table, one filter and one cast. Joins and grouped views are not in the source language yet.
- A small 2-core VM. Several intervals are wide, for example 1,024 rows at 90%. Macs and dedicated hosts were not measured here.
- `Rust scan` is a reasonable hand-written baseline, not a tuned columnar engine. A database with its own incremental views was not compared.
- Times exclude the initial table build and process start-up.
