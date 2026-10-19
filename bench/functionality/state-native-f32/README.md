# Stateful native F32 lifecycle proof

Typed bridges let eligible pure helpers compute with native F32 carriers while
actions, keeps, stored rows, events and portable snapshots retain exact bits.
See [the implementation contract](../../../docs/stateful-native-f32.md).

This newly authored generic fixture checks mixed F32/F64 records, lists, vectors,
options/results, cached values, events, rollback and owned results. It includes
negative zero, subnormals, infinities, signaling/quiet NaN payloads and random raw
bits. Three 204-step histories exercise ordinary, prepared and bound JavaScript
calls. Additional checks cover normalization of host doubles, one-time NaN-tag
capture, explicit host transactions, restoration and worker state invocation.
Unsupported recursive float bridge shapes retain the original bit lane.

Independent native and Wasm execution match all 204 reference outcomes and exact
snapshots. Real Chrome 155 matches 612 outcomes and executes actual workers. An
eligible numeric function performs a hardware Metal GPU dispatch with 24 upload
bytes, 16 readback bytes and one dispatch. These are conformance results and do
not establish execution speed, frame rate, hosted capacity or profitability.

The JavaScript package's full suite passes 65 tests. Focused Node 22 validation
also exercises the new lane and checked result-spine layouts whose actions call
float-bearing helpers. The first distribution test attempt lacked PySAT in the
system Python; the existing proof virtual environment supplies it for the
successful retry. Both logs are retained so that validation boundaries remain
visible. Checked source, proof checking and backend execution remain distinct;
these tests do not prove the JavaScript compiler correct.

## Reproduction

From the distribution root, with the matching compiler already built:

```sh
python3 bench/functionality/state-native-f32/reproduce.py \
  --out build/state-native-f32-replay \
  --compiler target/debug/ink
```

The destination must be a new direct child of `build/`. The command verifies
compressed artifact hashes, checks byte-identical current compiler output, then
replays the exact reference JavaScript histories and selected Wasm image. Add
`--browser` for real Chrome workers and required hardware WebGPU using the
existing `bench/gpu/node_modules` Playwright runtime. Add `--cross-target` to
rebuild the native/Wasm project through the local Cargo entry point; its debug
and incremental output is disabled. The Wasm Rust target must be installed.

No knowledge store, dependency tree or complete build target is copied. Selected
Wasm bytes and generated CPU/device inputs remain exact; the Wasm loader path is
redirected to the retained image. `artifacts.json` binds each uncompressed input,
and `provenance.json` records the independent package pins. Completed validation
targets are declared separately for retirement.
