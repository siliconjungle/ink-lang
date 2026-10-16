# Projecting adaptive computation state

An application's working representation need not be its final implementation.
The knowledge recipe `fold-state-projection` proposes smaller loop carriers and
checks a universal step simulation before replacing the shared source function.
This works while ordinary model parameters remain mutable. It adds no language
keyword, special neural instruction or trusted field-liveness rule.

For example, a graph evaluator may accumulate both an owned sequence of node
values and a running total:

```ink
record Work { values: Buffer<u32>, total: u32, }

fn step(item: u32, weight: u32, work: Work) -> Work {
    let value = work.values.at_or(item, 0) + weight;
    return Work {
        values: work.values.push(value),
        total: work.total + value,
    };
}

fn evaluate(code: List<u32>, weight: u32, input: List<u32>) -> List<u32> {
    let work = foldl(code, Work { values: buffer(input), total: 0 },
        fn(item) => fn(work) => step(item, weight, work));
    return work.values.freeze();
}
```

If `total` never influences the retained computation, an alternative can carry
just `Buffer<u32>`, removing the record and total arithmetic at each step. The
actual proposed source helper must satisfy
`project(step(item, state)) == reduced(item, project(state))` for every item and
state. A trace showing that `total` happened to be unused is insufficient.

The existing generic [fold projection law](../knowledge/libraries/fold-projection-laws.ink)
proves the complete ordered-fold relation by induction. Its checked database
entry is in `knowledge/libraries/proofs/fold-projection`. A concrete instance
imports its exact instantiated endpoints and proves the simulation against the
source definitions. The final source-bound equality replaces the shared pure
body once, so both ordinary callers and stateful actions use it.

The [runnable example](../examples/adaptive/fold-state-projection.ink) exposes a
mutable weight, a query and a transaction that can emit or roll back. It uses
ordinary runtime updates; this example does not fit a model or select its own
goals. Authored learning logic can call the same update interface. Neither the
proof nor a training score authorizes changing the application's objective.

## Proposal and measurement

The recipe participates in extension-stage discovery through the pinned
knowledge registry. It emits a conservative source extension and a checked
semantic rewrite. Discovery bounds proposals to one directly observed record
fold, with a supported source step returning the record. It retains source let
initializers in order, rejects shadowed accumulator bindings and declines when
the retained step reads another accumulator field. Unsupported forms retain the
baseline; source admission and proof replay decide every generated helper.

An explicit proposal is reproducible with the report's
[authoring script](../reports/owned-graph-projection-2026-10-17/propose.py).
Automatic selection still needs comparable lifecycle measurements or an admitted
validated model. Proof checking does not establish faster execution.

On the retained 32-step F32 graph, projecting the state without unrolling has
median paired JavaScript speedups of 1.14× for reads, 1.15× with a weight update
every eight reads, and 1.20× with an update every read. Six fresh process pairs
alternate order and consume every output. One pair has substantial timing noise;
all raw samples are retained. These are workload-specific Node measurements,
with no Handwired parity or automatic-selection claim.

The earlier unrolled owned-record layout was slower in its two-process pilot;
its original projected/unrolled proposals also exhausted proof resources. Those
[historical results](../reports/owned-graph-projection-2026-10-17/README.md) remain
unchanged. Source-wrapper exposure and checked forwarding-helper prefix equations
now let the complete four-step composition replay within the same core limits.
The combined F32 graph passes 88 reference/native Rust/JavaScript/Wasm calls and
five restores. In six new process triples, however, its JavaScript throughput is
only 0.876–0.907× baseline, while projection alone reaches 1.144–1.159×. Smaller
state and graph unrolling remain separate measured choices. On native Rust the
same combined graph instead reaches 1.744–1.811× baseline throughput, while
projection alone shows no clear gain. Every native checksum/checkpoint matches
its JavaScript counterpart. The preferred variant therefore depends on the
backend and workload; neither proof success nor a single target decides it. See the
[composition report](../reports/composed-frozen-graph-2026-10-17/README.md) for
every sample, complete proof, command and limitation.

## Guarantees and remaining work

The U32 source example has 111 reference/native Rust/JavaScript/Wasm comparisons,
including changing weights, wrapping values, errors, ordered events, rollback
and exact portable snapshots. The F32 projection matches 175 independent
reference histories, including signed zero, exceptional values and changed
weights. Rehashed false conclusions and well-typed false step simulations
reject. These are finite backend checks alongside the universal mathematical
step proof; the source translation, checker, emitted implementations, ABI and
toolchain remain trusted code.

Owned frozen-graph composition separately proves complete actions for a 32-node
instruction graph while weights remain live. Bounded one-sided conversion lets
the existing reducer expose a wrapper without forcing the retained continuation.
The checker keeps its existing depth and work limits. This is ordinary reduction
and structural case reasoning, with no cached proof verdict or graph whitelist.

General learned representation selection, broad neural/tape compilation,
whole-application differentiation, device training, and the remaining
Handwired/Pretext/Freerange workload programme remain open.
