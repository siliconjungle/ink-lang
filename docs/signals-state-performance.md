# Dependency-tracked state execution

The JavaScript target now retains deterministic scalar keeps, binds typed action
entrypoints, compiles owned result copies from their declared schemas, and uses
ordinary calls for shallow pure definition evaluation. Algebraic replacements and
maintained state representations still require the existing database proof path.

## Scalar keeps and invalidation

`CheckedEffects` derives each keep's transitive source-table reads. Emission builds
reverse edges from a table to its dependent scalar keeps. Successful computations
retain their internal scalar carrier. Actual writes invalidate only those keeps;
absent removal and an identical scalar replacement leave their values valid.
Changes still commit versions and events even when their table value is unchanged.

Each action journals the original cached values it invalidates. An abort or host
failure restores them, including when the action read the keep after its writes.
Host rollback and successful checkpoint restore clear auxiliary caches. Cache
values and edges are never part of portable logical snapshots. Failed restore
retains the original state and caches. Composite results are not retained: their
existing ownership semantics stay in place. No thrown computation is cached.

The current edges are conservative table dependencies, not dynamic per-key or
per-field subscriptions. A relevant row change can still require a full scan.
This is trusted implementation machinery for deterministic evaluation of the
same checked source, requested independently of database algorithm selection.
It does not certify an arbitrary update algorithm or a generated backend.
Execution-budget consumption is operational and can decrease with retained work.

## Bound calls and owned results

```js
const state = createState();
const put = state.bind('put');
const total = state.bind('total_query', { resultOnly: true });
put(7n, 11n, true, false);
console.log(total());
```

`bind` resolves the action and its codecs once. Scalar arguments use declared
native carriers (including BigInt for u64); the caller supplies valid values.
Composite inputs still capture owned data. Normal calls retain their validation
and complete observation envelopes. `resultOnly` omits the returned envelope,
while the action still rolls back errors, advances versions and retains every
committed event in its outbox. Public mutable result containers remain detached;
schema-directed copies preserve sharing within one result and never share mutable
containers with stored state or with a later call. Scalar outputs avoid generic
structured cloning. Zero-argument read-only bound calls omit mutation bookkeeping.

Checked representation bundles expose the same `bind` surface synchronously.
Their existing `invoke`/`invoke_json` interfaces remain asynchronous. This is an
explicit API boundary, not an implicit profitability policy or a change to source
transactions. State subscriptions, batching and explicit host transactions are
now available on both implementations; see [maintained folds](maintained-folds.md).
These APIs publish state observations without introducing UI or DOM semantics.

## Pure definition call machinery

The emitter uses the core's term visitor to identify actual self calls, then
propagates call-graph dependence. A recursion annotation without a self call no
longer forces a generator lane. Pure shallow calls use ordinary JavaScript with
a private depth guard; that sentinel alone unwinds and replays on the existing
explicit stack. Other errors propagate. Deep encoders are covered by a replay
regression. The optional lane falls back to stack-only emission if it would exceed
the existing output-size limit.

Private constructor carriers remain immutable by construction; code only creates
and reads them. Upstream already removed repeated freezes and unused-recursion
suspension. This pass shares nullary carriers and adds the bounded direct lane to
reduce path-copy and call costs further. Input/output codecs prevent these private carriers
from escaping into mutable public values. This is physical execution support,
not a source-pattern matcher or a new proof rule.

## Database dependency laws

`knowledge/producers/reactive_dependencies.py` supplies three parametric laws and
their nineteen-entry closure:

- Equal dependency snapshots permit observation reuse only when the concrete
  observation is proved to factor through those dependencies.
- Equal upstream values permit reuse of a pure downstream projection.
- Branch-sensitive reuse requires equal branch selectors and equal active
  dependency snapshots.

The canonical snapshot is recorded in `evidence/signals-state/reactive-laws.json`.
Concrete interpretations must discharge assumptions and exact site premises;
tests reject missing factorisation, an incorrect computation mapping and missing
dependency equality. These are mathematical building blocks for concrete plans,
not an automatically enabled dynamic reactive graph. Recorded reads, names,
profiles and frequently unchanged inputs confer no proof authority.

## Sources, evidence and scope

Sources inspected: [Svelte derived propagation](https://svelte.dev/docs/svelte/$derived),
[Svelte state proxies](https://svelte.dev/docs/svelte/$state),
[SvelteMap](https://svelte.dev/docs/svelte/svelte-reactivity), and
[Preact Signals](https://preactjs.com/guide/v10/signals/), including the installed
Svelte 5.57.2 and Preact Signals Core 1.14.4 runtime sources. The graph, lazy read,
equal-output cutoff and per-row/chunked controls motivated the changes above.

`bench/signals-state` contains exact package pins and production Svelte module
compilation. Its state-only Node comparison measures point calls, writes, changed
aggregate reads, unchanged reads, 32-write bursts and connected consumers at 256,
4096 and 16384 rows. Controls include fine-grained signals, chunked computed graphs
and manually maintained deltas. Timings retain adverse cases and measured ranges.
The before and current checked trees use the same source, proof request and core;
the baseline emitter is pinned separately. Compiler/admission/setup, DOM rendering,
durability, peak allocation and native/GPU speed are outside these timings.
Reactive controls do not implement Ink's complete transaction/event contract.

Validation covers source-oracle observations, u64 wraparound, scalar no-ops,
abort and host rollback, checkpoint/restore, input capture, owned/shared results,
false/zero/Unit/empty-string presence, deep definition replay and events. Existing
generated, numerical, ownership and language-foundation suites compare native C,
Rust, JavaScript and both Wasm paths with `INK_PARITY_REQUIRE_ALL=1` and Zig.
The measured report and retained raw samples live under
`reports/signals-state-2026-10-12`; they do not establish universal superiority.

## Dense GPU compute comparison

The separate [hardware WebGPU report](../reports/gpu-signals-2026-10-12/README.md)
compares complete changed-input requests against production Svelte derived values,
Preact computed values and plain JavaScript at 4,096, 65,536 and 1,048,576 elements.
It measures cheap transforms and reductions, data-dependent arithmetic and coupled
feedback with GPU-resident intermediate arrays. Upload, dispatch, synchronization
and full CPU-visible output acquisition are included; fresh-page first-use results
are reported separately. Controls use efficient array kernels and reusable feedback
buffers, with one reactive update per request.

Actual GPU receipts, exact output checks, all samples and the emitted bundle are
retained. This measures explicit GPU execution of eligible pure functions. It does
not establish automatic routing profitability, rendering speed or state/delta
performance. The current emitted cheap reduction is sequential on the GPU; its
results should not be interpreted as a measurement of parallel reduction machinery.

## What signals can express that current Ink cannot safely optimize

Pure dynamic dependencies are representable in Ink: a selector plus the selected
values determines a pure result. Per-key, per-field and active-branch tracking are
missing machinery, not a mathematical impossibility. The new branch law is a
conditional proof building block; it does not itself create those runtime edges.

Arbitrary JavaScript getters, mutable object/proxy identity, externally captured
variables and effects do not currently have source semantics in Ink. A getter can
read a clock, publish a message or mutate another value. Skipping it can change
observable behavior even when its returned value stays equal. A host contract must
specify reads, effects, identity and scheduling before a transformation can preserve
them. UI mounting, subscription disposal, effect ordering and async timing similarly
need lifecycle semantics beyond the current state/action observation contract.

There is no general algorithm that derives the best incremental implementation of
arbitrary programs. Dynamic execution traces establish which reads occurred during
one run, not a universal algebraic maintenance rule. Exact reuse needs checked
instrumentation, a conservative dependency bound, or an applicable proof. Ink can
prove stronger replacements for structured workloads, but cannot legitimately infer
them from purity, a benchmark win or a familiar function name alone.

Nor can every transactional call universally beat a raw signal assignment. Ink
captures owned data, records rollback state, advances versions and retains events.
A signal without those obligations can do less work. Meaningful targets are
comparable contracts and workload families; the benchmark retains minimal controls
to show that overhead rather than hiding it.

## Integration prerequisite

The final JavaScript baseline is upstream `e9a45c390c3a6a9ffbfe756e2423d280f7a9f430`.
Its independently published lowering requires source/schema support from existing
core commit `04f1b73286bf1ccae959018e48ec32e84946dc0d`. The distribution carries that
prerequisite separately and pins the corresponding published C/Rust/Wasm/GPU
lowerings. These prerequisites are existing work, not gains from dependency tracking. Integration also
preserves the existing invocation journal boundary in the newly published Rust
lowering: a failed later action must not erase an earlier successful host action.
