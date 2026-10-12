# Proved properties and observed usage

Ink now separates three jobs: database producers author facts and strategies;
generic compiler checkers admit them against the real source and graph; offline
planning uses observed usage and comparable measurements to select an implementation.
Usage frequencies, sampled sizes and target metadata never discharge a proof.

## Erased refinements

`core/src/laws.rs` accepts `Linear { premises: [[index, weight], ...] }` certificates.
The referenced hypotheses must assert exact `Int` comparisons. Weights are
nonnegative integers. Admission normalises the propositions, checks their
polynomial identities, and requires the conclusion minus the weighted hypotheses
to leave only a nonnegative constant. Strict integer comparisons account for one
integer step. Wrapped words and floating-point comparisons cannot use this rule.
The checker neither chooses a theorem nor recognises a collection algorithm.

`knowledge/producers/refinement_laws.py` publishes 35 ordinary, independently
checked laws: exact counts are nonnegative; filtering bounds exact output count;
mapping preserves exact count across all 25 admitted scalar input/output pairs.
Machine `length` and wrapped `count` are deliberately not mathematical allocation
bounds. All statements use the existing finite-list induction and equality kernel.

`contextual-properties` discovers observation contexts from published typed laws,
including relations to actual function parameters. It searches beyond the old
value/length/count probes. Binder-safe matching and ordinary proofs remain the
admission boundary. New invariants, projections and summaries can arrive as
knowledge without adding a compiler property recogniser. Discovering a property
does not automatically authorise an arbitrary bounds-check removal.

## Physical capacity and graph resources

`proved-capacities` proposes a physical reservation only after a source-bound
certificate proves that a function's exact result count is bounded by an input's
exact count, including typed record-field projections. Core checks that precise proposition against the actual body and
parameter. The literal Rust/Rust-Wasm collector can reserve that input's native
length before ownership moves. Unsupported collector sites fail capability
checking. Reservations retain normal safe collection operations and source
callback order; measured selection decides whether a reservation is profitable.

The `resources` planning step binds `ink-graph-resources-v1` to an exact checked
routing package. Producers choose release points and admission credits. Core
checks definitions, all consumers, output references, release uniqueness and
limits. Replacing a route or source invalidates its resource choice. Stage order
is retained, including failure order. Native and browser hosts emit the selected
release points for captured inputs and stage values.

Browser admission reserves request and captured ABI payload-byte credits, captures
accepted inputs synchronously, and executes accepted requests in order. Exhaustion
rejects with `INK_BACKPRESSURE`; it never drops an accepted operation. Failure and
completion return credits. The native synchronous host enforces the corresponding
single-call byte limit. These limits bound retained captured inputs, **not** total
process memory, device memory, or allocator peaks. Future demand still requires a
runtime admission check; sampled usage cannot prove it away.

## Learning usage

The emitted `usage-profile.mjs` exports `createUsageRecorder` and `recordCall`.
Recording stores bounded frequencies, shape histograms, successful/failed phases
and peak pending captures, without storing input values or running comparative
probes. Without a supplied workload cohort, its shape/distribution/concurrency
are derived from the recordings. Target provenance uses the same complete fields
as comparable cost observations: hardware, driver, toolchain, backend and bridge.
`recordCall` also wraps construction, compilation, migration, updates, queries,
checkpoint/restore and disposal in synchronous or asynchronous literal adapters.
Instrumentation errors cannot change the wrapped call's result or exception.

Routes accept `onUsage: recorder.observe`; construction and disposal are recorded
as lifecycle phases. Emitted manifests bind these recordings to the original
source identity even after a checked source rewrite. Recording is opt-in; runtime
execution performs no profitability experiments.

Publish an observed snapshot offline:

```sh
python3 -m ink_knowledge.usage_profiles --knowledge-root knowledge --recording usage.json
ink compile program.ink --optimise knowledge --target rust -o program.rs
```

Compilation automatically pages through compatible immutable recordings.
Independent recording IDs distinguish real usage windows; newer cumulative
snapshots supersede older snapshots rather than double-counting them. It keeps
source, target and distribution cohorts separate, weights exploration by recorded
call frequencies, and proposes profile-derived admission alternatives. Physical
selection sums comparable lifecycle measurements across **every** observed cohort;
a missing baseline, missing phase, incompatible target or absent improvement keeps
the baseline. Failed requests have their own `failed:<phase>` costs. Existing
manual-profile flags remain compatibility interfaces; new usage discovery needs
no caller-authored phase weights.

## Validation and limits

The standalone kernel checks the complete law set and rejects false inequalities,
wrapped-word forgeries, stale graphs, premature/duplicate releases and unrelated
capacity certificates. The new source-bound refinement erases an entire checked
cardinality calculation and preserves values and checkpoints on Rust, C,
JavaScript, Rust-Wasm and C-Wasm. Capacity collectors execute on Rust and Rust-Wasm.
Actual wgpu and browser WebGPU execute a mixed checked graph with input release,
admission rejection and subsequent successful calls. Queue tests cover caller
mutation, count/byte exhaustion, failure recovery and closure.

This is a small, erased refinement/certificate facility, not a new dependent-type
language. Broader sortedness, uniqueness or algorithm-specific invariant laws
still need actual database proofs. Unknown future demand and foreign adapter
memory costs are not universal facts. No general speedup is claimed from these
changes: proofs can erase work, but physical alternatives require comparable
measurements and can be slower for a particular workload.

This integration includes the bulk-buffer/final-use compiler foundation
(`0022139c`) and is combined with current main. The foundation adds general
owned-buffer range semantics, lexical last-use analysis and source-bound access
checking; its workload evidence is documented separately.
