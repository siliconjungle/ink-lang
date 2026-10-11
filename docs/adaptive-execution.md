# Execution policy and saved target profiles

Ink retains one semantic contract. `policy` changes which already eligible pure
implementation executes; it cannot validate a theorem, input type or range.
No caller validation wrapper was introduced. Compiled numeric and destination
ABIs keep their declared trusted caller obligations. Stateful actions and keeps
never enter speculative profiling.

```js
const engine = await loadInk(bundle, {
  policy: 'adaptive', // default; no online probes
  costProfile, targetKey: 'measured-device-and-engine',
});
const fixed = await loadInk(bundle, {
  policy: 'static', staticBackend: 'javascript',
});
```

Profiles have schema1, target_key, and models indexed by
`profileScope(manifest, entry)`: source core identity, generated CPU C hash,
generated JavaScript hash and entry/stage names. Each model declares a result
boundary, bounded feature domains and per-backend intercept/linear terms.
Features are input_elements, input_bytes, output_capacity_elements, dispatches and
iterations. Output capacity is the emitted physical upper bound, not a realized filter length; unknown CPU-only shapes contribute zero. Dispatch estimates follow the active graph route for mixed pipelines. These are cost estimates, never semantic facts. Separate recorded
residency boundaries cannot be mixed by profile lookup. Missing models, domain
misses or absent comparable CPU prices retain CPU. GPU failure falls back to CPU.
Whole-request cost profiles cover complete captured-input requests. Prepared GPU
sessions keep a separate residency boundary; the placement profiles below price
captured segments, including their resident GPU interiors.

Selection uses a 10% minimum predicted saving, with at most 32 cached decisions.
Input sizes/residency metadata guide choice; no value scanning, repeated execution
or per-call timer is needed in adaptive policy. This does not imply zero overhead:
metadata construction, lookup, promise scheduling and transport remain measured
parts of full execution. Explicit backends remain available. Static JavaScript
bypasses packing and Wasm initialization.

The opt-in `policy:'profile'` retains historical pure-call alternating profiling
for evidence collection. Such trials are intentionally expensive and execute
more than once. `expectedCalls` and `recheckEvery` apply to that profiling policy.
Training instrumentation is separate from uninstrumented performance evidence.
Saved profiles must come from representative measurements; source/target hashes
only associate data and do not prove host or device execution.

## Prepared GPU inputs

`await engine.prepareGpuPipeline(plan)` captures a fixed pure packed computation
without feedback, uploads once and reuses storage/bindings. Each `run()` returns
`{values,value,backend:'gpu',counters}` with fresh owned full readback. `setup`
contains capture upload/live-buffer counters. Repeated runs report zero upload;
dynamic filter lengths are read from logical headers. The boundary is explicitly
resident GPU inputs with owned readback, including command submission and output
acquisition. It must not be pooled with a GPU-only kernel or an ordinary complete
captured-input request. Setup and device/shader initialization are separate.
The host serializes runs; close releases storage and engine/device loss rejects
future use. The literal selected route remains the computation authority.

## Mixed pipeline placement

Packed browser bundles now ship the independent planner's bounded partition search.
The runtime executes its choices over the same compiled, typed, pure graph:

```js
const engine = await loadInk(bundle, {
  placementProfile, targetKey,
  parallelism: 2,       // explicit worker budget, 0..16; default 0
  expectedCalls: 256,   // amortisation horizon for measured cold setup
});
const result = await engine.pipeline(plan); // one selected execution
// result.placement: selected partitions, estimated cost and CPU comparison
// result.stages: requested/actual targets and fallback receipts for mixed work
// result.counters: actual device transfers, dispatches and live storage
```

`placementProfile` is distinct from the whole-request `costProfile`. It has
schema 1, `target_key`, optional measured `setup_ns` by backend, and at most 256
models indexed by `segmentScope(pipelineScope(manifest, plan), start, end)`.
Use `await engine.describePipeline(plan)` to obtain those exact scope strings and
physical feature bounds. The scope binds the source, generated C/JavaScript/shader
and runtime/device/planner source identities, constant types, complete dependency topology, requested results,
feedback and iteration count. Models use the `captured-segment` boundary and
bounded domains for all measured features. Intercepts/terms are nonnegative.
The profile is privately copied and frozen at load; public manifest metadata is
also immutable. Target keys describe measured hardware/browser/workload context;
they are caller-supplied provenance, not hardware attestation or proof.

Search considers only saved intervals, with beam width 32, at most 40,960
candidate expansions and a 32-decision cache. It compares estimated dependency
critical paths, including the shared main-thread lane, exclusive device lane and
bounded worker slots. Contiguous GPU stages retain their intermediate buffers;
host bridges materialise only results needed beyond the group, requested outputs
and feedback. A whole-GPU choice retains the existing resident batch/feedback
executor. JavaScript groups pass native values. Workers own independent Wasm/JS
engines and receive structured-cloned inputs; caller buffers are never transferred
or detached. Independent pure branches overlap and joins await their dependencies.

Cold alternative targets require measured setup costs until ready. Startup is
charged once per selected backend and amortised over `expectedCalls`, including
iteration accounting. Dead worker capacity and device loss invalidate decisions.
Worker setup remains conservatively charged until all surviving slots have loaded
that backend. Missing comparable full-CPU prices, unknown intermediate capacities,
domain misses, unavailable targets or less than 10% predicted saving retain CPU.
These are bounded heuristic predictions, not a globally optimal schedule or a
promise of future speed. First-use latency can still exceed CPU substantially.

For feedback, each pass observes its own captured input snapshot; replacements
occur simultaneously only after all partitions finish, and final-pass outputs
are retained. A failed GPU/worker partition repeats that same pure partition on
CPU. Outstanding tasks drain before another request reuses arenas or close releases
resources. Worker queues are bounded to 64 pending requests; timeout defaults to
30 seconds and retires the failed worker. This scheduling API does not contain
stateful actions, transaction publication, events or speculative effect execution.
GPU floats retain the existing WGSL observation contract.

Explicit, reproducible placement is available for training or diagnostics:

```js
await engine.pipeline(plan, {placements: [
  {end: 2, backend: 'gpu'},
  {end: 3, backend: 'javascript'},
]});
```

Ends are exclusive and must form a complete increasing partition. Supported
labels are `cpu`, `javascript`, `gpu`, `cpu-worker` and `javascript-worker`.
Explicit placements require automatic backend mode; explicit `backend` and
`placement:'whole'` retain whole-request policies. A static policy selects its
fixed backend and bypasses adaptive partition search.

## Offline training and release gate

`pipeline-profile.mjs` exports `collectPlacementObservations(engine, plans,
options)` and `collectPlacementStartup(loadFreshEngine, plan, options)`.
Collection is explicitly requested, bounded and pure. It captures training plans,
materialises external intermediate ports through a CPU oracle, times complete
segment calls in alternating backend order, verifies every output exactly and
excludes fallback timings. Cold collection uses fresh engines and separates lazy
setup from warm requests. Driver/process caches remain environment state.
The planner's `fitPlacementProfile(observations, {targetKey, setupNs})` fits a
nonnegative affine upper envelope of training medians with a 15% margin, retaining
all training feature bounds. It never expands measured domains automatically.

Use disjoint sizes/values for heldout complete requests. Check every output and
record cold latency, warm distributions and the declared lifetime total; isolated
segment estimates cannot establish profitable overlap. The reproducible
`bench/adaptive-placement/browser.mjs` harness releases its fitted profile only if
all selected alternative holdouts for that pipeline scope beat CPU by 10% in both
warm and cold-amortised measurements. Failing scopes are removed, retaining CPU
there; the unfiltered losing model remains in evidence. An entirely failing
profile becomes an empty safe profile. No broad model is enabled by default. Evidence and reproduction are
in [adaptive placement](../reports/adaptive-placement-2026-10-12/REPORT.md).
