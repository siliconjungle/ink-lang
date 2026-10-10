# Transaction-plan prototype (measurement only)

**This is not compiler output, and it makes no performance claim for Ink.**
`make_proto.py` hand-edits the Rust that `ink emit-state --bounded-totals`
generated for `examples/state-benchmark.lang` (ink-lang 377e4c1, ink-lowering-rust
21e052c). The edits show what the plans proposed in
[docs/transaction-plans.md](../../docs/transaction-plans.md) would be worth.

- `outbox`: P2. Events go straight into the outbox with their final coordinates,
  and abort truncates the outbox. The journal is otherwise unchanged.
- `plan`: P1+P2.
  - `create`, `restock` and `remove` run unjournaled, after a `version < u64::MAX`
    guard, using `entry`/`get_mut` single-lookup updates and cache deltas.
  - `fail` keeps the journaled path, because it fails after writing.
- `baseline_literal_fail.rs`: the existing Rust baseline (`bench/state/baseline.rs`), except
  that op 3 really performs `restock(7)` and `restock(9)` and then rolls back, as
  Ink's `fail` does. The original baseline replaces the whole transaction with a
  presence check, which is exactly plan P3.

## Method

- **Setup.** Both are built with the common C driver (`bench/state/driver.c`):
  `-C target-cpu=native -C panic=abort`, static libraries, no LTO across the ABI.
- **Workloads.** 2,000,000 operations per run, with the driver's `restock` and `mixed`
  workloads.
- **Runs.** One discarded warmup, then 11 runs per variant, in a shuffled order
  per round (`run.py`).
- **Correctness.** Every variant's checksum, final total, version, event count,
  event hash and full state hash must be identical, and they were in every
  cell.
- **Machine.** A 2-vCPU Linux cloud VM; see `environment.txt`. rustc uses LLVM 22 and clang
  is 18. Treat differences under about 5% as noise.

## Results (ns per operation, median)

| Rows | Workload | Journaled today | P2 direct outbox | P1+P2 plan | Rust baseline | Rust with literal `fail` | Plan ÷ Rust baseline | Plan ÷ literal Rust |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 64 | restock | 57.2 | 56.2 | 44.4 | 44.5 | 44.6 | 1.00× | 1.00× |
| 64 | mixed | 79.8 | 77.0 | 65.5 | 53.9 | 63.6 | 1.22× | 1.03× |
| 4096 | restock | 144.4 | 139.0 | 76.7 | 81.5 | 81.8 | 0.94× | 0.94× |
| 4096 | mixed | 163.7 | 159.7 | 137.7 | 87.7 | 121.6 | 1.57× | 1.13× |
| 262144 | mixed | 339.4 | 315.9 | 294.9 | 217.1 | 281.4 | 1.36× | 1.05× |

## Findings

1. **P1+P2 closes the whole gap on read-modify-write.** restock: 1.00× and 0.94×
   of handwritten Rust.
2. **P2 alone is worth only 2–7%.** The undo journal and the second lookup are
   the main costs, not event staging.
3. **On the mixed workload, most of the remaining gap is the baseline's `fail`
   shortcut.** Against algorithm-matched Rust the plan is 1.03–1.13×. The rest
   is Ink's journaled `fail` (Undo records holding `Option<Row>` and the cache,
   plus re-insertion on rollback). Plan P3 (always-abort elimination) would
   replace it with the same presence check the baseline uses.

Reproduce (Linux):
`bench.sh <ink-lang checkout> <outdir>`, then
`make_proto.py <outdir>/language_bounded <dir> plan|outbox`, then build each with
`cargo build --release --offline --lib --features bounded-abi` and link with the
driver as in `bench.sh`. Then run
`REPS=11 run.py base=<outdir>,plan=<dir>,lit=<dir-with-literal-baseline>`.
