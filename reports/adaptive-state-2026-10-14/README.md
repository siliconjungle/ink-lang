# Adaptive state execution — 14 October 2026

This is a bounded host-policy study, not evidence of universal state-app gains.
Five fresh aggregate processes and three point-query processes rotate mode order.
Acquisition uses separate repeated development calls; evaluation uses frozen longer
histories, phase changes and unmeasured shapes. Shared Apple ARM development host;
JIT, GC and concurrent work remain sources of noise. Medians below are milliseconds.

All source replies and final portable snapshots are checked against the literal
baseline. A separate forced-migration cohort compares replies/errors/events and
the final exact snapshot with the independent Ink reference evaluator. Artificial
prices belong only to that conformance cohort, never the performance profiles.

## Aggregate

| Trace | Raw direct | Fixed direct host | Fixed cached host | Initial-profile fixed | Adaptive |
|---|---:|---:|---:|---:|---:|
| oscillating | 4.05 | 7.46 | 40.01 | 7.69 | 7.91 |
| phase_change | 54.72 | 83.10 | 173.78 | 83.06 | 52.79 |
| read_heavy | 28.56 | 39.96 | 15.64 | 14.45 | 19.83 |
| read_then_write | 32.23 | 56.14 | 310.93 | 316.42 | 70.64 |
| unknown | 14.00 | 19.61 | 6.70 | 19.29 | 20.22 |
| write_heavy | 5.95 | 21.98 | 303.96 | 20.82 | 22.16 |

## Point

| Trace | Raw direct | Fixed direct host | Fixed cached host | Initial-profile fixed | Adaptive |
|---|---:|---:|---:|---:|---:|
| oscillating | 1.13 | 4.15 | 34.29 | 4.31 | 4.82 |
| phase_change | 7.82 | 34.41 | 153.33 | 33.05 | 37.22 |
| read_heavy | 3.04 | 16.74 | 16.13 | 13.71 | 14.87 |
| read_then_write | 5.84 | 30.38 | 266.38 | 31.06 | 32.81 |
| unknown | 1.64 | 6.63 | 7.14 | 6.76 | 7.26 |
| write_heavy | 5.26 | 20.65 | 278.09 | 19.85 | 21.09 |

## Interpretation

- Aggregate read-heavy sessions improve versus raw direct calls as well as the fixed direct host. The frozen read-optimised choice remains faster than learning and switching during that same stationary workload.
- Write-to-read sessions improve versus the fixed direct **host**. Their final median is close to raw direct calls at this small size; the roughly 4% difference is not a robust end-to-end gain claim on this shared host.
- Read-to-write reversal causes two switches and loses to fixed direct on these histories. Detection delay, expensive cached writes and migration are real costs.
- The point-query variant never wins the cost guard; all adaptive runs retain direct. Recording and serialization still add overhead.
- Alternating and unknown workloads do not switch. No compiled-source semantics, proof kernel, or language syntax changes were needed.

The initial-profile fixed control is a profile-guided choice frozen from the first
phase and acquired costs. It is **not** an online recompilation implementation;
compiler/proof setup is outside these execution timings. Both variants are already
compiled. Timings include host construction/initial snapshot restore, calls and any
in-session migrations; final verification/disposal are outside the timed boundary.
Raw direct bypasses capture, recording and the host queue but keeps asynchronous
call consumption. This makes host overhead visible rather than charging it to every
control and hiding it. RSS samples are process-wide diagnostics, not per-variant
allocation or statistical memory bounds.

## Reproduction

```sh
python3 bench/adaptive-state/prepare.py --compiler target/release/ink \
  --target-key DEVICE_AND_TOOLCHAIN_KEY -o build/adaptive-aggregate
BENCH_SOURCE="$PWD/bench/adaptive-state/aggregate.ink" BENCH_ROTATION=0 \
  node bench/adaptive-state/run.mjs build/adaptive-aggregate/bundle \
  target/release/ink "$PWD" build/aggregate-0.json
# Repeat in fresh processes with BENCH_ROTATION=1..4.
# Point control: prepare.py --point, omit BENCH_SOURCE, repeat rotations 0..2.
```

Each `.json` records execution timings; `.observations.json` retains all development
timing samples and memory observations; `.fitted.json` retains the exact profile.
Calls and oracle snapshots accompany each process. Source/artifact/compiler hashes
bind these records. `provenance.json` records the acquisition checkout and code hashes.
The policy forecast (32768 calls) is a declared benchmark assumption; it is not
inferred from future evaluation inputs. There is no claim of backend correctness,
GPU acceleration, general memory superiority, or an unseen-app population estimate.
