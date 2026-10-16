# Compile longer frozen computations through typed helper composition

The knowledge producer can split a closed `foldl` into small pure helpers and
combine them in a balanced tree. Fixed opcodes disappear from serving work while
the original weights, input and live state stay dynamic. The supplied 32- and
128-operation cases retain learning actions, failed-update rollback, ordered
events and the original portable checkpoint namespace.

Helpers come from the already checked parameter/result types. Missing types,
owned carriers and unsupported capture shapes do not acquire a guessed numeric
representation. The ordinary source-extension checker checks their types,
bindings, purity, ownership and termination. This step adds definitions; it
does not authorize a replacement.

A separate rewrite step proves every complete action transition. Generic cons
equations describe the original fold; small lemmas describe the prefix consumed
by each helper, and parent lemmas compose those prefixes in order. Constructor
data and proof transitivity are also factored to retain bounded transport depth.
There is no opcode theorem whitelist, trusted producer result, reassociation or
change to NaN/rounding policy. Complete source-derived definitions are rebound
before the existing checker admits the plan.

The first linear helper-chain experiment passed proof checking but overflowed
the 128-operation execution test's stack. Balanced composition replaces that
chain, bounding helper depth logarithmically. The checker also tries a bounded
sequence of ordinary head reductions toward an existing continuation call. It
then compares every argument. This avoids unfolding an unchanged continuation
on both sides; it adds no equation and raises no checker work/depth allowance.

## Explicit compilation

```sh
ink build-model examples/frozen-program.ink \
    examples/frozen-program-long-training.json \
    --freeze-roots Structure --target javascript -o build/long-model
python3 knowledge/producers/frozen_composition.py \
    build/long-model/compiled.core.json --ink /absolute/path/to/ink \
    -o build/long-plan.json
ink check-plan build/long-model/compiled.core.json build/long-plan.json --core
ink compile build/long-model/compiled.core.json --core \
    --plan build/long-plan.json --target javascript -o build/long-program.mjs
```

The trace configures 128 operations and initializes separate weights. This
example does not learn the opcode sequence or demonstrate neural convergence.
The emitted module supports explicit restore of `long-model/deployment.snapshot`;
creating it without that restore uses ordinary declared initial live state.

This producer is currently an explicit composed-plan path. `build-model
--specialize-frozen` still uses the earlier single-selection producer; the new
composition is not yet carried through that artifact publication/verifier path.
That integration remains required work, alongside more general graph/tape
specialization, other traversals, automatic profitability selection and device
training. There is no new syntax in this milestone.

Construction is bounded by eight operations per leaf, a finite helper/depth/work
budget and the existing source/plan/checker limits. A failed proposal/check keeps
the previous requested output intact. Tests cover a wrapping-word fold as well
as floating-point operation sequences; the general F64 proof domain remains
unsupported.

Six paired fresh Node processes measured about 1.38× faster warm serving for
32 operations and 1.30× for 128. Updating weights every request measured 1.17×
and 1.23× respectively. The selected JavaScript is larger; import and first
binding/call are slower. These results support long-lived serving on this
fixture, not automatic selection or a cold-start improvement. The
[retained acquisition](../reports/frozen-composition-2026-10-16/README.md) includes
every sample, source image, startup observation and the initial short probe.
