# Conditional word-fact experiment

This measures a designed scalar mechanism corpus, not broad application speed.
The source is [conditional-facts.ink](../../examples/conditional-facts.ink).
Discovery uses excluded points and relational ranges to propose whole-function
equalities. Ink reconstructs the fixed-word circuits and checks each RUP proof.
The collision control has no valid constant replacement and stays unchanged.

```sh
PYTHONPATH=knowledge:planner python3 -m producers.conditional_facts \
  examples/conditional-facts.ink --compiler target/debug/ink \
  -o build/conditional-fact-acquisition
ink build examples/conditional-facts.ink --target javascript \
  -o build/conditional-fact-benchmark/baseline.mjs
ink build examples/conditional-facts.ink --target javascript \
  --selection build/conditional-fact-acquisition/selection.json \
  -o build/conditional-fact-benchmark/selected.mjs
node bench/conditional-facts/run.mjs \
  "$PWD/build/conditional-fact-benchmark/baseline.mjs" \
  "$PWD/build/conditional-fact-benchmark/selected.mjs" 18421
```

Repeat in three fresh Node processes and repeat with held-out seed 99273.
Every returned value is checked before and after each sample and consumed during
timing. Paired lane order is randomized. Retain all sizes/distributions, including
the unchanged collision control. Timings include the harness's shared dispatch
and consumption loops, which can dominate cheap scalar calls. No automatic
profitability selection, first-call or native/GPU speedup follows from these
JavaScript measurements. Compilation, proof search and checking are outside the
timed execution batches.

The optional acquisition flags `--output-store` and `--frozen` publish admitted
laws into a canonical store and an existing frozen discovery catalogue. Use a
private store for experiments. Publication is separate from choosing an
implementation; ordinary compilation retains its lifecycle evidence gate.
