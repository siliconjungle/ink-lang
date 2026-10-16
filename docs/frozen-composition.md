# Compile longer frozen computations through typed helper composition

The knowledge producer can split a closed `foldl` into small pure helpers and
combine them in a balanced call graph. Fixed opcodes disappear from serving work while
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

## Build an initialized model artifact

```sh
ink build-model examples/frozen-program.ink \
    examples/frozen-program-long-training.json \
    --freeze-roots Structure --specialize-frozen \
    --target javascript -o build/long-model
ink verify-model build/long-model --replay
```

`--specialize-frozen` now carries both direct action selection and composed
helper plans through ordinary artifact publication. The untrusted knowledge
build driver uses composition when its bounded typed traversal proposal produces
helpers, and the existing direct producer otherwise. This chooses how to author
an explicitly requested proof; it is not automatic profitability selection.
A failed chosen proposal or proof rejects publication instead of silently
changing strategy. There is no new source syntax.

The artifact retains `selection.json`, whose semantics identifies either the
direct selection or complete compiled plan, plus `selected.core.json`, the
restricted input core, complete training/deployment checkpoints and target code.
Verification always replays every extension and rewrite, including all complete
action equalities, even without `--replay`. It checks the selected source,
compiled plan binding and initialized checkpoint. Rehashing altered proof bytes
cannot supply that authority. This initialized adapter supports source extensions
and rewrites; other physical/routing plan steps reject rather than disappear.

JavaScript, native, Rust, Wasm and WebGPU-host artifacts use the original
restricted checkpoint namespace. Their factories start from the trained live
state, while retained learning actions remain available. Composed WebGPU
artifacts compile and inventory their CPU Wasm fallbacks before publication;
GPU-host state/learning still runs on the CPU. This is not GPU training.

The trace configures 128 operations and initializes separate weights. This
example does not learn the opcode sequence or demonstrate neural convergence.
More general graph/tape specialization, other traversals, automatic profitability
selection and device training remain required work.

## Separate authoring

The lower-level plan interface remains available:

```sh
python3 knowledge/producers/frozen_composition.py \
    build/long-model/compiled.core.json --ink /absolute/path/to/ink \
    -o build/long-plan.json
ink check-plan build/long-model/compiled.core.json build/long-plan.json --core
ink build build/long-model/compiled.core.json --core --plan build/long-plan.json \
    --initial-state build/long-model/deployment.snapshot \
    --target javascript -o build/long-program.mjs
```

`build --plan` requires an initial checkpoint and emits an initialized artifact.
`compile --plan` retains the plain-module interface, requiring explicit restore
to start from the trained live state.

Construction is bounded by eight operations per leaf, a finite helper/depth/work
budget and the existing source/plan/checker limits. A failed proposal/check keeps
the previous requested output intact. Tests cover a wrapping-word fold as well
as floating-point operation sequences; the general F64 proof domain remains
unsupported.

The current producer requires the same ordered dynamic argument correspondence
between a projected traversal and its helpers. Reordered scalar captures,
partially fixed captures and additional initializer forms need more general
parameter abstraction; valid source outside this opportunity domain can be
rejected as a proposal. It is not a general whole-application compiler yet.

## Shared and expanded code layouts

The default proposal now shares exact typed helper bodies modulo parameter and
lexical binder spelling. Free/callee names, types, literal bits, operand order
and lexical scope remain in its key. Sharing reuses declarations; it does not
cache a result, skip an argument or remove a call. The source-extension checker
and complete action proofs still decide admission independently of that key.

Repeated eight-operation blocks in the 32/128-operation examples now need 3/5
helper definitions rather than 7/31. Distinct word chunks retain separate
helpers. The same operation sequence executes in the same order. The standalone
producer also accepts `--helper-layout expanded`; both layouts require the full
plan proofs. Expanded layout exactly reproduces the earlier 128-operation plan.
This preserves an explicit alternative for different target/objective tradeoffs.

Six paired fresh Node processes per size measure about 1.46×/1.52× faster warm
serving than the unspecialized baseline. With weight updates every request, the
gains are 1.19×/1.34×. A separate six-pair comparison against the previous expanded
layout measures about 1.06×/1.17× for reads and 1.03×/1.09× for every-request
updates. Every result is consumed and ending checkpoints match; source/proof
construction and startup remain outside these warm samples.

At 128 operations, JavaScript falls from 312,961 to 241,773 bytes. The complete
plan falls from 3,631,618 to 3,292,182 bytes; its 34 prefix/action theorems remain.
The initialized WebGPU-host artifact inventory falls from 86,615,083 to
22,148,048 bytes, including generated sources and compiled CPU fallbacks. These
are file bytes, not download size or retained runtime memory. Import/first-binding
diagnostics improve over expanded layout, but still trail the unspecialized
baseline. Universal prefix-proof sharing, wider capture abstraction and lifecycle
profitability remain open.

Browser checks additionally execute a 64-operation pure model prefix for eleven
raw F32 input/coefficient classes on the actual GPU, comparing against the
original evaluator. The full 128-operation pure root remains outside the graph
stage budget; complete stateful serving and learning execute on the CPU. This
is finite backend evidence, not a GPU performance or training claim.

The earlier [expanded-layout acquisition](../reports/frozen-composition-2026-10-16/README.md)
retains its original measurements and limits. The [sharing study](../reports/shared-helper-code-2026-10-16/README.md) retains the
new paired measurements, complete plans, initialized artifacts and prefix history,
along with the 512-operation proof-budget failure and planning-corpus funnels.
