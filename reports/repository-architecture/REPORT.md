# Repository architecture validation

The distribution assembles independently pinned knowledge, planner, runtime and
lowering packages. The semantic core now owns its complete `core/src` tree and
builds without those repositories. Planner search is separate from immutable data;
shared scheduling, bundle assembly, host ABIs and pure fallback are separate from
WGSL generation and GPU device operations.

Canonical entries have content identities, explicit kinds/semantics, typed
interfaces and dependencies. Authenticated Merkle snapshots and bounded exported
views supply one storage/admission boundary for scalar/inductive mathematics and
executable laws. Selection and routing carry checked evidence and pinned views.
SQLite is a rebuildable index with typed discovery, dependency and membership
witness tables. Performance observations are separate immutable objects matched by
program/plan, hardware, driver, toolchain, backend, bridge and workload provenance.

The initial store has 575 entries (533 mathematical entries and 42 executable
laws). Rebuilding it reproduces snapshot
`0f8efca3b77fd8135b072d5a16927f027f1a628ec3674fd1d3d29ab7d4c4282f`.
The old executable catalogue selection wire is rejected. Historical research
fixtures remain outside production discovery; specialised maintenance/machine
proof obligations are still explicit mathematical domains.

## Validation

- All 176 distribution tests pass, including source rewrites, applicability,
  database removal/replay, native ownership, snapshots and independent bitproof replay.
- All 17 independent core tests, 1 standalone runtime test, 6 knowledge store tests
  and 3 planner research-query tests pass. Every lowerer builds standalone against
  its published dependencies.
- All 533 canonical mathematical entries check individually through the registry;
  executable-law integration checks cover the 42 semantic laws.
- Canonical rebuild, Python wheel builds and installed planner execution pass.
  A focused four-test database query rerun includes active-pointer and immutable
  snapshot equivalence after the final planner fix.
- Benchmark/tool scripts parse and their active literal source paths exist.
  Generated Rust projects retain `src/lib.rs`; historical archive paths remain
  those recorded in the archives. This validation does not rerun historical
  performance benchmark matrices or claim new performance improvements.

The generated GPU bundles pass real browser WebGPU (Chrome 154.0.8037.98) and native
wgpu checks on Darwin/aarch64. Compute validation compares 298 results per host;
scalar validation compares 1,332 per host, plus 1,332 native GPU-disabled fallback
results. Particle execution retains arrays across 120 iterations / 240 dispatches
with final readback. Unavailable/disposed devices, invalid inputs, shader failures,
limits, fallback/retry and measured CPU/GPU decisions are exercised. Float
comparisons use the recorded tolerance; they do not establish bit equality or
backend correctness proofs.

[Machine-readable pins and results](validation.json),
[native compute](native-compute.json), [native scalar](native-scalar.json),
[browser compute](browser-compute.json), [browser scalar](browser-scalar.json).

## Reproduction

```sh
cargo test --locked
cargo test --manifest-path core/Cargo.toml
cargo test --manifest-path runtime/Cargo.toml
(cd knowledge && PYTHONPATH=. python3 -m unittest discover -s tests -v)
(cd planner && python3 -m unittest discover -s tests -v)
python3 knowledge/producers/build_store.py --output /tmp/ink-store
```

GPU validation uses the existing `bench/gpu/{compute-native.py,native.py,
compute-browser.mjs,browser.mjs}` tools against generated particle/scalar bundles.
The captured observations demonstrate this tested host; they do not guarantee
all device/driver combinations. Physical adapters, source correspondence and
literal target lowering remain trusted implementations.
