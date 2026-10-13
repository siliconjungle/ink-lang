# Structure-law instances: runtime

`run.py` compiles `probe.ink`, lets ordinary semantic search (with the installed
knowledge) find each function's structure-law instance, checks every selection
with `ink check-selection`, emits JavaScript for the baseline and each
selection, verifies equal outputs on every case, and times both with paired,
interleaved samples (`bench.mjs`; ~2 ms per sample, 60 samples, alternating
order, 95% bootstrap interval of the median ratio).

```sh
python3 bench/structure-laws/run.py --compiler target/release/ink -o build/structure-laws
```

Results on 13 October 2026: Node v22.22.0, 2-vCPU Intel Xeon 2.8 GHz Linux
sandbox, release compiler. A ratio above 1 means the instance is faster.

| Function | Case | Speedup | 95% interval |
|---|---|---:|---:|
| all_below (`&&`, early exit) | n=64, never false | 0.99× | 0.97–1.01 |
| | n=64, false at 10% | 3.28× | 3.25–3.34 |
| | n=64, false at 90% | 1.14× | 1.13–1.16 |
| | n=4096, never false | 1.00× | 0.99–1.01 |
| | n=4096, false at 10% | 7.74× | 7.62–7.92 |
| | n=4096, false at 90% | 1.13× | 1.09–1.17 |
| product (u64, early exit at 0) | n=64, never zero (odd factors) | 0.99× | 0.98–1.00 |
| | n=64, random factors | 1.03× | 1.01–1.04 |
| | n=64, zero at 10% | 4.85× | 4.41–4.96 |
| | n=64, zero at 90% | 0.98× | 0.97–0.99 |
| | n=4096, never zero (odd factors) | 0.95× | 0.94–0.97 |
| | n=4096, random factors | 41.2× | 40.8–41.3 |
| | n=4096, zero at 10% | 5.18× | 4.94–5.64 |
| | n=4096, zero at 90% | 0.98× | 0.97–1.00 |
| total_sorted (sort erased before `+`) | n=64 | 68× | 63–71 |
| | n=4096 | 321× | 318–323 |
| count_big (sort erased before a count) | n=64 | 20× | 18–24 |
| | n=4096 | 32× | 30–33 |

Reading these:

- **Sort erasure removes real work** whenever it applies: the baseline sorts a
  list that a commutative fold then ignores the order of.
- **Early exit is input-dependent.** It wins in proportion to how early the
  accumulator becomes absorbing and costs up to about 5% when it never does. A
  product of 4,096 random factors reaches zero mod 2⁶⁴ through accumulated
  powers of two, so the exit fires early there without any zero input.
- **Run-to-run variation exceeds these within-run intervals.** In an earlier run,
  the n=64 never-false `all_below` case measured 0.79×.

These are probe programs written to exercise the laws, not held-out software. On
the held-out corpus the same producer admits instances in 5 of 10 programs (see
`bench/planning-corpus/`), and defaults still select them only with comparable
measurements.
