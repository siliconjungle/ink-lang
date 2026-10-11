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
The initial adaptive host covers complete captured-input requests; prepared GPU
sessions are an explicit separate residency capability, not an adaptive resident
CPU/GPU chooser.

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
