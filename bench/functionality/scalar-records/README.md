# Exact scalar-record differentiation conformance

The JavaScript lowering keeps constructed records in scalar slots across bounded
private helper calls and shares identical IEEE computations within straight-line
immutable scopes. This reduces repeated wide-tangent work without assuming that
zero products vanish. See [the contract](../../../docs/scalar-record-differentiation.md).

A newly authored twelve-coordinate polynomial fixture checks 1,078 reference
cases and 5,390 ordinary/prepared executions across borrowed F32, captured F32,
bit-storage F32 and F64. It includes random raw bits, signed zero, subnormals,
finite extremes, infinities, signaling/quiet NaNs, strict unused work, changing
getters, lazy branches, loop swaps and nested recursive histories. A separate
oversized helper test verifies ordinary reconstruction fallback. These tests do
not prove the compiler correct.

The complete JavaScript suite passes 67 tests. Distribution learning,
differentiation, reverse differentiation and JavaScript suites pass 45 tests on
Node 22. Explicit native/JavaScript/Wasm runs pass 22 learning/differentiation
checks, including complete results, errors, events and checkpoints. The selected
Wasm lifecycle control also replays 204 exact outcomes/snapshots. Its historical
image and reference/native control come from the preceding stateful-F32 proof;
those core inputs and non-JavaScript lowerings are unchanged.

Chrome 155 passes all 5,390 derivative executions plus 612 state outcomes and
exact snapshots, runs actual workers, and executes an eligible hardware Metal
GPU dispatch (24 upload bytes, 16 readback bytes). This is conformance evidence,
not a derivative GPU speed claim or an application/frame-rate benchmark.

From the distribution root, using an already-built matching compiler:

```sh
python3 bench/functionality/scalar-records/reproduce.py \
  --out build/scalar-records-replay --compiler target/debug/ink --browser
```

The output must be a new direct child of `build`. The script checks artifact
hashes, regenerates byte-identical JavaScript for all five checked core inputs,
and replays exact typed results, histories and the retained Wasm image. Browser
replay requires the existing `bench/gpu/node_modules` Playwright runtime and
Chrome with hardware WebGPU. `--node PATH` selects a Node executable. Only the
selected device bundle is materialized; no knowledge store, dependencies or build
targets are copied. The oversized-body test is reproduced with the package's
`cargo test --test scalar_records`.

Application inputs and timing evidence stay in their private audit workspace.
Their final comparisons use equal 16,384-update warmups, changing weights and
outcomes, three fresh processes per engine/workload, alternating samples, and
additional changing-cue histories. Earlier short-warmup timings describe a
different JIT tier state and must not be substituted for fully warmed results.
