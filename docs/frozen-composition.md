# Compile longer frozen computations through typed helper composition

The knowledge producer can split a closed `foldl` into small pure helpers and
combine them in a balanced call graph. Fixed opcodes disappear from serving work while
the original weights, input and live state stay dynamic. The supplied 32-, 128- and
512-operation cases retain learning actions, failed-update rollback, ordered
events and the original portable checkpoint namespace.

Helpers come from the already checked parameter/result types. Missing types,
owned carriers and unsupported capture shapes do not acquire a guessed numeric
representation. The ordinary source-extension checker checks their types,
bindings, purity, ownership and termination. This step adds definitions; it
does not authorize a replacement.

A separate rewrite step proves every complete action transition. Generic cons
equations describe the original fold; suffix-parametric lemmas describe the prefix consumed
by each helper, and parent lemmas compose those prefixes in order. The same
universal law works for every remaining tail; separate closed-data witnesses
bind it to the exact frozen list. Constructor
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

Prefix laws can abstract fixed, unused or reordered captures with matching
types. The accumulator remains a distinct parameter even when its initial
value equals a capture. Unsupported capture/initializer shapes still reject
as proposals. This is not a general whole-application compiler yet.

## Exact closed calculations

Prepared `keep` values can now expose immutable structure to the producer.
Known `Option`/`Result` callbacks select their source arm, retain dynamic
captures, and unwrap a known successful `?`. Changing state reads and strict
defaults remain ordinary work. Literal collection receivers retain their
original element types when a residual callback needs them; graph output
indices do not silently become a different integer width.

The explicit build producer can ask the independent reference evaluator for
closed pure-function results. These are untrusted literal proposals. Every
replacement still needs its complete action proof; a false evaluator answer
cannot authorize compilation. Evaluation uses the ordinary default evaluation
budget, at most 16 distinct calls and a 30-second timeout per call. Unsupported,
failed or exhausted evaluations retain ordinary source execution.

Helper limits count distinct definitions, allowing an existing helper to be
reused at the limit. Optional expansion is transactional per action: an
oversized training action retains its original implementation without discarding
already constructed serving helpers. The work, helper and checker limits are
unchanged; failed final admission leaves the previous output untouched.

The prepared Result/list example has complete plan replay and execution checks
with changing weights. The larger 232-node, 244-parameter network now produces
a source-checked 117-helper proposal, but complete proof construction still
exhausts its existing work budget. That network is **not yet an admitted
specialized executable**. No performance claim follows from this functionality.

When every argument is known, scalar operations and balanced helper invocations
can become constants. Binary32 proposals use integer arithmetic with explicit
rounding, signed-zero and NaN rules; ordinary kernel conversion checks the
answer independently. Dynamic operands retain their original operations and
rounding points. This does not authorize floating-point reassociation or
approximate replacement.

A long closed traversal can disappear from the selected action while its
balanced helpers remain as ordinary proof witnesses. An auxiliary pure-query
projection exposes those definitions for authoring; its queries never enter
the executable source. Universal prefix laws connect the original fold to the
helper, followed by checked conversion of that closed invocation. Evaluating
two expressions to the same proposed result does not supply a proof. Short
traversals retain the existing direct conversion attempt and checker limits.

The proposal expands original calls when an argument becomes newly known,
keeping already literal initializers behind their existing function boundaries.
Generated helper calls collapse only when all their arguments are closed.
Immutable literal maps can also be proposed as literal values; dynamic captures
or non-value results retain the original map. Complete action proofs continue
to decide whether any proposed change is admitted.

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
plan proofs. Expanded layout preserves the earlier selected source and runtime
code; the new prefix proof packaging changes its plan bytes.
This preserves an explicit alternative for different target/objective tradeoffs.

Six paired fresh Node processes per size measure about 1.46×/1.52× faster warm
serving than the unspecialized baseline. With weight updates every request, the
gains are 1.19×/1.34×. A separate six-pair comparison against the previous expanded
layout measures about 1.06×/1.17× for reads and 1.03×/1.09× for every-request
updates. Every result is consumed and ending checkpoints match; source/proof
construction and startup remain outside these warm samples.

At 128 operations, JavaScript falls from 312,961 to 241,773 bytes. The complete
plan originally fell from 3,631,618 to 3,292,182 bytes in the sharing study.
Suffix-parametric proofs now reduce it further to 836,086 bytes, with the same
selected source and JavaScript bytes.
The initialized WebGPU-host artifact inventory falls from 86,615,083 to
22,148,048 bytes, including generated sources and compiled CPU fallbacks. These
are file bytes, not download size or retained runtime memory. Import/first-binding
diagnostics improve over expanded layout, but still trail the unspecialized
baseline. Wider capture abstraction and lifecycle profitability remain open.

Browser checks additionally execute a 64-operation pure model prefix for eleven
raw F32 input/coefficient classes on the actual GPU, comparing against the
original evaluator. At that milestone the full 128-operation pure root exceeded
the graph stage budget; scalar grouping below removes that limit. Complete
stateful serving and learning still execute on the CPU. This
is finite backend evidence, not a GPU performance or training claim.

The earlier [expanded-layout acquisition](../reports/frozen-composition-2026-10-16/README.md)
retains its original measurements and limits. The [sharing study](../reports/shared-helper-code-2026-10-16/README.md) retains the
new paired measurements, complete plans, initialized artifacts and prefix history,
along with the 512-operation proof-budget failure and planning-corpus funnels.


## Suffix-parametric prefix proofs

The current proof proposal proves, for every tail, capture and initial value:

```text
fold(prefix(tail), captures, initial)
  = fold(tail, captures, helper(captures, initial))
```

Leaf prefixes use at most eight ordered operations. Parent prefixes compose
checked child equations. Separate bounded witnesses connect the closed opcode
list to these abstract prefixes. Thus repeated helpers share a law without
embedding a different long suffix in every proof. Every equation and witness
still passes the ordinary checker; no axiom, trusted cache or budget increase
is introduced. Identity steps consume the longest checked prefix, including a
short final chunk.

The 32/128/512-operation cases use 3/5/7 universal prefix laws. The previously
rejected 512-operation proposal now produces a 1,924,553-byte plan and passes
144 reference observations per target across JavaScript, Rust, Wasm and the
GPU host, including live updates, rollback and exact checkpoints. The initialized
512-operation JavaScript artifact also passes proof/training replay and those
histories. The initialized WebGPU package passes 432 browser comparisons, six
seeded-instance checks and three invalid-checkpoint rejections. Its model still
runs on the CPU; a separate numeric control confirms one actual GPU dispatch.
GPU-host execution here does not establish full device execution.

```sh
ink build-model examples/frozen-program.ink \
    examples/frozen-program-512-training.json \
    --freeze-roots Structure --specialize-frozen \
    --target javascript -o build/model-512
ink verify-model build/model-512 --replay
```

This trace explicitly configures the opcode sequence; it does not demonstrate
learning that sequence. The new strategy changes proof construction, not the
32/128-operation runtime images. Existing warm serving measurements therefore
remain the relevant evidence; no new serving speedup is claimed. Rehashed
same-typed false-tail claims reject, including fail-closed resource exhaustion.
General graph/tape specialization, capture abstraction, learned representation
selection and device training remain required work.


The [parametric-prefix acquisition](../reports/parametric-prefix-proofs-2026-10-16/README.md)
retains complete plans, negative controls, initialized artifacts, browser and
corpus histories, every authoring sample and a fresh committed-source image
check. Its audit replays proofs and browser execution when requested.


## Literal scalar stages on the GPU

The GPU backend now groups eligible pure scalar statements and helper calls in
one ordered shader stage. A bounded transitive scan excludes collection work;
existing argument/let binding, lexical scope and integer-lane binary32 emission
remain in use. This adds no arithmetic equality, reassociation or fast-math mode.
Unsupported larger statements retain the staged attempt or CPU fallback.

Complete 32/128/512-operation pure roots now execute on the actual GPU against
an independent evaluation of the original traversal, for eleven raw F32
input/weight classes at each size. The 64-operation helper falls from 64 stages
to one; 128/256/512-operation helpers previously exceeded the stage budget and
now each use one stage. Limits remain unchanged. State, serving actions and
learning still run on the CPU; this does not implement device training.

Six paired fresh browser processes measure 1.84× faster complete GPU calls for
the 64-operation helper, including upload, dispatch, readback, result decoding
and full-value checking. The 512-operation scalar request still strongly favors
CPU/JavaScript: roughly 499 microseconds on GPU versus 8/6 microseconds on
Wasm CPU/JavaScript at this asynchronous host boundary. These finite workstation
measurements do not establish upstream parity or automatic profitability.
Large batches/resident application pipelines require separate measurements.


The [scalar GPU stage acquisition](../reports/scalar-gpu-stages-2026-10-16/README.md)
retains both acquisitions (including the initial GPU-contended set), complete
artifacts/histories, exact source-image receipts and every raw timing sample.
The independent rebuild reproduces all 30 WGSL files and 140 host/descriptor
images; it is finite implementation assurance, not a backend correctness proof.
