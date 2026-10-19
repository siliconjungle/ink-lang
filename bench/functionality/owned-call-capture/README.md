# Owned call capture

The packed compute host separates the typed ownership snapshot from transport.
JavaScript can execute captured native values without a pack/decode round trip;
CPU/GPU selections materialize exact words on demand. Profile-free default
engines bind the shared contract's CPU choice once, then use the direct CPU call
path. `prepareCall` owns fixed inputs, retains selected transport and shape
features, evaluates fresh primals, and detaches complete results on every run.
Prepared and ordinary call prices use distinct scopes, both binding host source.

This public proof uses a separate four-field sample/parameter program. Private
Nocturne source, generated learning code and raw application results remain in
the private audit. Numerical summaries in the distribution document describe
that private workload without publishing its inputs.

`bundles.tar.gz` retains only runnable generic JS/Wasm/shaders and host assets.
Both versions share the same generated program, Wasm and shaders; only the
compute host, shared ABI codec and profile scope version differ. No build target,
knowledge store or dependency checkout is copied. `artifacts.json` binds every
selected asset; `provenance.json` records source packages and the compiler image.
The pre-change host is runtime 188da68187621545baae37656ff35abe23dee8c3 with
ABI 6356464654b39341d1e442d61c64be1e3a720489.

Run from Ink's root:

```sh
python3 bench/functionality/owned-call-capture/reproduce.py --node /path/to/node
python3 bench/functionality/owned-call-capture/reproduce.py --measure --browser
```

Browser replay requires the repository's existing Playwright dependency and a
hardware Chrome WebGPU adapter. `--compiler /path/to/ink` additionally regenerates
and checks the candidate at the recorded compiler/toolchain epoch. Reference
outputs cover empty, singleton, 100 and 1024-element held-out values. Native ABI
fixtures cover exact float/U64 transport; runtime checks add eager capture,
mutation, poisoned U32 iterators, field getters, CPU/GPU failure fallback,
preparation lifetime, close/drain and detached repeated results. Ordinary calls
accept literal typed records even when a field is named `step`.

Measurements are warm complete result calls with paired alternating mode order,
17 batches per mode, equality outside the interval and separate setup timing.
Test-only constant profiles force JavaScript for path timing and held-out value
checks. They are not fitted deployment evidence and are never installed in
knowledge or an application. Prepared calls use fixed inputs: setup and engine
load must be counted in finite-workload comparisons; changing inputs require new
preparation. These conformance checks are not a proof of compiler correctness or
a game-frame-rate measurement.
