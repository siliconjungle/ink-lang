# Matched reverse model execution

The authored `std:neural` constructor builds a model with ten dynamic context
features, two ReGLU hidden layers of six units, four outputs and 244 parameters.
It prepares 232 operations, including explicit affine/ReGLU nodes and direct
binary products. A new forward pass binds every ordered reverse pass. Arithmetic
and accumulation order belong to this graph algorithm; source `gradient` is a
separate interface and is not silently replaced.

This comparison builds the equivalent graph using Handwired's own `Circuit`,
`roundAffine`, `multiply`, `reglu`, `evaluateReference` and
`backpropagateReference` from pinned commit
`09f23d276d3b9284cea4eec61ffd934950cc979e`. Unknown ranges produce 664 upstream
operations. A stronger Handwired control declares every source range `[0,1]`
before building operations, checks those ranges at runtime and produces only
232 operations. All timed source values satisfy those bounds. Ink uses the same
positive domain here but does not yet specialize its arithmetic from those facts.
The direct control is an independently authored typed-array graph interpreter,
not a highly tuned dense neural kernel.

Every lane returns the complete four outputs, F32 mean squared error and all 244
parameter gradients. Finite positive weights/features and signed targets exercise
this comparison; zero/nonfinite/singular policies have separate conformance tests.
Every result is checked exactly against the direct interpreter before and after
each sample. The 244 mathematical derivatives also have an independent dense
binary64 finite-difference oracle in `tests/reverse_learning.rs`.

Run after tests and compilation have finished:

```sh
ink build examples/neural-model.ink --target javascript -o program.mjs
node --experimental-strip-types bench/reverse-learning/run.mjs \
    /ABSOLUTE/PATH/program.mjs /ABSOLUTE/PATH/handwired/src/runtime/numeric-ui-core.ts 72131
```

Use three fresh processes each for development seed 72131 and holdout seed 99173.
Each process retains eleven samples per lane, with randomized interleaving and
128 complete calls per sample. Calls allocate their own arrays and consume the
full result. Module import, compilation and input generation are outside timing.
Each process records a separate single cold graph-setup observation; these are
not a statistically established startup ranking. The report includes exact
source/artifact hashes, upstream file identity, raw samples, complete-target logs,
actual GPU receipts and full CLI training/resume checkpoints.

| Complete forward + reverse call | Development (µs) | Holdout (µs) |
| --- | ---: | ---: |
| Ink, prepared graph | 39.32 | 40.36 |
| Handwired, unknown ranges | 29.36 | 29.48 |
| Handwired, checked source ranges | 23.58 | 23.83 |
| Direct typed-array interpreter | 10.08 | 9.72 |

Median of three fresh-process medians per cohort; eleven interleaved samples per process. Ink takes 1.69× the ranged Handwired latency on the holdout cohort.

The matched Handwired speed target remains open. Preliminary profiling showed
validation allocating dependency lists and carrying nested temporary records;
the library now checks edges directly and high-level VJP validates the graph once.
Fused authored affine/ReGLU nodes further reduce interpretation work. Remaining
work includes generic dispatch/temporary-storage overhead, checked range consumers,
frozen specialization, optimized native controls and device reverse execution.
These are not grounds for an automatic profitability choice.

This task has changing context features. Handwired's learned gallery can prepare
fixed positional features, so this is not its complete twenty-slot gallery or
its UI/optimizer performance. Ink's explicit F32 Adam moments also differ from
upstream's binary64 optimizer. Peak memory, import/compile time, GPU training,
source-wide reverse AD and general learning convergence are outside this result.

Raw evidence is under `reports/reverse-learning-2026-10-15`. Audit it with:

```sh
python3 bench/reverse-learning/analyse.py reports/reverse-learning-2026-10-15
```
