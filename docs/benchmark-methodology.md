# Benchmark methodology

This applies to the active harnesses. Archived reports keep the method they were
produced with, and their inputs and results are never modified.

## Protocol

1. **Correctness before timing.** Every harness first validates each variant
   against an independent oracle (a Python model and/or the reference
   interpreter). Then, in every timed cell, it requires identical observations
   across variants: checksums, totals, versions, event digests and state
   hashes. A cell whose observations differ is an error, not a data point.
2. **Common driver, no cross-boundary LTO.** All variants link the same
   separately compiled C driver object, so every implementation pays the same
   ABI and call overhead.
3. **Warmup and interleaving.** `--warmup N` (default 1) discards N runs per
   variant and cell. Then `--repeats R` rounds (default 11 for the state
   harness) run every variant once per round, in a freshly shuffled order. A
   fixed seed makes the order reproducible.
4. **Statistics.**
   - Report medians.
   - Report ratios as the median ratio with a 95% *paired* bootstrap interval
     (`bench/methodology.py: ratio_ci`). Rounds are resampled jointly, so a
     slow round affects both sides.
   - Use geometric means only for summaries across cells.
   - On a shared machine, an interval that crosses 1.0 means "no measured
     difference".
5. **Environment capture.** `methodology.environment()` records:
   - CPU model, core count, OS and governor/turbo state (Linux)
   - rustc and clang versions with their LLVM majors
   - the commits and dirty state of ink-lang, knowledge and every lowering
     checkout

   Reports print a warning when rustc and clang use different LLVM majors,
   because C/C++ and Rust then differ in backend version, not just language.
   They also warn when a measured checkout is dirty.
6. **Portability.** The harnesses select `.so`/`-shared` on Linux and
   `.dylib`/`-dynamiclib` on macOS, and link Rust static libraries with the
   platform's system libraries (`methodology.static_rust_link_libs`). The state
   harness (`bench/state/run.py`) and the pure harness (`bench/run.py`) run on
   both. Other harnesses still assume macOS; they are listed below.

## Fairness rules

- **Same observations.** A baseline must produce the same results, events and
  state. It may use any algorithm. That includes skipping work it can prove is
  unobservable, as long as the report *says so*.
- **Algorithm-matched variants.** When a handwritten baseline uses a shortcut
  that Ink does not yet have, add an algorithm-matched variant beside it and
  report both. Example: `bench/state/baseline.rs` op 3 replaces the
  always-aborting change with a presence check. `bench/state/baseline_literal_fail.rs`
  (`--with-literal-fail`) actually performs both restocks and rolls them back.
  The gap between the two variants is the value of the shortcut, and a
  checked database entry could supply that shortcut to Ink
  (docs/transaction-plans.md, P3).
- **Matching layouts.** Compare tree to tree and flat to flat where possible.
  When layouts differ (for example `c_flat`), the report must name the
  difference.
- **Same LLVM major where feasible.** Pin `rustc` and `clang` to the same LLVM
  major for headline claims, or state the mismatch, which the harness detects.
- **Setup and teardown.** Execution-only harnesses exclude setup. Lifecycle
  harnesses (`bench/state/lifecycle.py`) include construction, growth, clearing
  and destruction, and report allocation profiles. Headline "faster than X"
  claims need both kinds of evidence.

## Validation run

`reports/bench-method-linux/` comes from a 2-vCPU Linux cloud VM: rustc LLVM 22,
clang 18, `--quick --repeats 11 --warmup 1 --steps 300000 --with-literal-fail`.
It shows that the protocol, portability and intervals work. **It is not a
headline result.** Headline numbers belong on a quiet, pinned machine.

## Missing workloads that test Ink's thesis

The current suites measure kernels and one maintained sum. Ink's claim is that
checked knowledge lets one source program select representations and skip work
that a hand-written program would not bother to. These workloads would test that
claim directly. Each needs an oracle, matching baselines, and a sweep rather than a
single point.

1. **Update/query ratio sweep with non-trivial views.**
   - **Views:** a filtered count, a grouped sum (`group_by` key → sum), a top-k,
     and a two-table join count.
   - **Sweep:** queries-per-update ∈ {0, 0.01, 0.1, 1, 10, 100}, rows ∈ {64,
     4k, 256k}.
   - **Baselines:** recompute-on-read; hand-maintained incremental Rust with a
     dirty flag; and hand-maintained incremental Rust with exact deltas.
   - **Metrics:** ns per operation, and the cross-over point at which
     maintenance wins.
2. **Incremental join.**
   - **Data:** two tables (orders ⨝ customers) and a maintained join
     aggregate, under insert/update/delete streams with a churn rate of
     1–50%.
   - **Baselines:** a differential-dataflow-style Rust implementation
     (`differential-dataflow` crate or a hand-written equivalent), and
     recompute.
   - **Metrics:** throughput, p99 per-update latency, and memory.
3. **Phase-shifting key distribution** (adaptive layout).
   - **Phases:** uniform keys → zipfian 0.99 → sequential appends →
     range-scan heavy. Phase lengths are 10^5–10^7 operations.
   - **Baselines:** BTreeMap; HashMap; sorted Vec; and an oracle-chosen best
     layout per phase.
   - **Metrics:** total time including migration, with guard/fallback
     overhead reported separately. Must be run with and without profile
     guidance.
4. **Wide-record projection** (row ↔ column).
   - **Data:** records with 4–64 fields. Queries touch 1–4 fields; updates
     touch 1–2.
   - **Baselines:** array-of-structs; struct-of-arrays; and the hand-chosen best.
   - **Metrics:** ns per operation and bytes touched (from hardware counters
     where available).
5. **Dependency cut-off** (work skipping).
   - **Data:** a DAG of derived values (depth 3–10, fan-out 1–8), with updates
     that change inputs without changing some intermediate results.
   - **Baselines:** dirty-flag propagation; a Salsa- or Adapton-style memoised
     baseline with early cut-off; and full recomputation.
   - **Metrics:** recomputations avoided, and time.

Each should land as its own `bench/<name>.py`, with archived reports under
`reports/<name>-phaseN/`. Each must state which parts of Ink's selection were
database-supplied and checked, and which were not.

## Harnesses not yet ported to Linux

These still use `.dylib` or `sysctl` directly. Port them with `bench/methodology.py`
when they are next touched:

- `bench/bitvector-proof.py`
- `bench/cache-lowering.py`
- `bench/collection-proof.py`
- `bench/core-replacement.py`
- `bench/filter-proof.py`
- `bench/reversible-cache.py`
- `bench/storage-reuse.py`
- `bench/wide-cache.py`
- `bench/state/event_compare.py`
- `bench/state/lifecycle.py`
- `bench/state/storage_compare.py`
