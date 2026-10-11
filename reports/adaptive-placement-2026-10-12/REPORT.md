# Completed GPU and adaptive pipeline placement

The compiled pure browser pipeline feature is implemented and integrated. Saved
profiles now drive bounded joint partition/target search over JavaScript, Wasm,
WebGPU and pure workers. GPU group interiors stay resident; dependency joins,
typed bridges, simultaneous feedback, captured inputs, owned outputs and CPU
fallback are implemented. This closes this feature's implementation gate. It
does not close broad competitive execution or stateful representation selection.

The planner owns cost search; runtime owns physical metadata, execution, workers,
profiling and fallback. No semantic-core, proof-kernel, knowledge or GPU-lowering
source was changed. Existing GPU/device code is consumed literally. Complete-call
profiling is explicitly offline; adaptive requests execute one chosen graph,
without speculative action execution or repeated trials. Generated code, target
ABIs, toolchains, codecs, host scheduling and devices remain trusted.

## Contract and integration

Read [the API and limits](../../docs/adaptive-execution.md). The independently
versioned package commits are:

- Runtime: `d25076e617d6a9cb51e3b077e6adb9e3853e6c6d`.
- Planner: `aecb175097c1f8533bbb454a351fe456a723041b`.

The distribution installs the pinned planner asset and exposes the normal build
path. Manifests bind runtime/device and planner source hashes in addition to
source/C/JavaScript/shader identities. Cost profiles bind exact graph topology,
outputs, feedback, iterations, types and measured feature domains. Unknown
capacities, missing comparable CPU evidence and unsupported targets keep CPU.
The host checks every physical proposal covers the original stages once in order.
Profiles are observations, never proof premises. The revisions above retain the
original measurement provenance. Current published package revisions and refreshed
integration checks are recorded in [the completed-work integration](../completed-main-integration-2026-10-12/README.md).

Worker pools are explicit, bounded to 16 workers and 64 pending jobs. Dead slots
change planning capacity; timeout/errors drain or reject jobs and retire a failed
worker. Engine close drains ongoing work. Same-device and main Wasm tasks preserve
exclusive ownership. Whole-GPU choices retain the existing resident feedback
batch path; mixed feedback bridges at pass boundaries.

## Validation

All required gates passed:

- 61 Node tests, including profile binding, no trial execution, graph/shape drift,
  unknown capacities, cold amortisation, GPU groups, captured inputs, owned outputs,
  feedback swaps/shrinkage, worker concurrency, timeouts, invalid proposals,
  transport failures, queue budgets and close/drain.
- 12 distribution Rust tests covering bundle installation/execution, unchanged
  checked-source routing, JavaScript and GPU emission. A generated saved-profile
  JS pipeline executes correctly without fetching Wasm; native embedded manifest
  metadata matches the installed planner.
- 6 standalone runtime Rust tests against its locked offline dependencies.
- Real Chrome 154.0.8037.98 on Apple Metal 3: 12 placement comparisons plus
  captured-input/lifetime checks, real U64 worker transport, GPU feedback,
  unavailable GPU/workers, invalid shaders and a failing real worker module.
  The instrumented real workers reached 2 outstanding tasks and drained
  completely. Successful device counters retain group transfer/dispatch evidence.

Raw gates: [Node](node-tests.txt), [distribution Rust](cargo-tests.txt),
[standalone runtime](runtime-rust-tests.txt), [browser](accepted/browser.json),
[manifest](manifest.json) and [feature receipt](feature.json).

## Frozen complete-request holdouts

Training uses four sizes (256, 1024, 4096, 16384) for the map-chain fixture and
three sizes (1024, 4096, 16384) for independent branches. Training values use
seeds 17/29; heldout values use seed 83 and independent in-domain sizes 512,
2048 and 8192, plus empty/out-of-domain checks. Profiling compares every result
with the CPU oracle and discards fallback timings. Cold setup uses fresh engines;
base module loading is outside the timed request, and process/driver caches
remain environment state. Expected lifetime is 256 calls. Warm complete-request
measurements use nine alternating samples, each averaging seven fully materialised
calls, after two warmup samples. Output verification is outside timed batches.

| Fixture / elements | Selected backend | CPU ms | Adaptive ms | Warm ratio | First request ms |
| --- | --- | ---: | ---: | ---: | ---: |
| heavy / 512 | cpu | 0.114 | 0.129 | 0.89x | 2.00 |
| heavy / 2048 | cpu | 0.457 | 0.457 | 1.00x | 0.60 |
| heavy / 8192 | mixed | 1.771 | 0.957 | 1.85x | 7.10 |
| heavy / 0 | cpu | 0.000 | 0.000 | unresolved | 0.10 |
| heavy / 32768 | cpu | 7.386 | 7.286 | 1.01x | 6.90 |
| branches / 2048 | mixed | 0.971 | 0.657 | 1.48x | 24.00 |
| branches / 8192 | mixed | 3.857 | 2.443 | 1.58x | 2.50 |

The 8192-element GPU group uploads 32,788 bytes and reads back 32,772 bytes,
with two dispatches and 196,648 live device-buffer bytes. The internal heavy-to-inc
edge is not read back. Device counters exclude CPU/JS heap allocation and do not
establish total application memory. Independent branches use a main-thread Wasm
partition alongside a Wasm worker and a CPU join. The identical branch bodies
exercise scheduling; a separately admitted shared-call optimisation could remove
that duplicate computation.

These are fixture-specific measurements. Small CPU-retained calls still pay
metadata/selection overhead; the 512-element case measured roughly 14 microseconds
more, at the browser timer's batch resolution. Empty-call timing is unresolved.
Cold GPU/worker requests are substantially slower than warm CPU. Across 256 calls,
the selected alternatives pass the 10% cold-amortised and warm saving gate. No
universal or first-call performance gain is claimed.

The accepted scoped profile has 7 models:
[placement-profile.json](accepted/placement-profile.json). It remains opt-in and
bound to this emitted program and measured target. The unfiltered fitted data
and all raw samples are in the browser receipt. Earlier calibration iterations
are retained in this directory; one selected worker tail failed the complete
warm/lifetime gate and caused an empty release in `release/`. The final training
selected the CPU tail and passed its independent holdouts. Profiles from earlier
runtime/planner hashes are historical, not active matching profiles. Other
concurrent workspace jobs make these local development measurements unsuitable
as an isolated hardware benchmark or broad unfamiliar-program guarantee.

## Reproduce

```sh
cargo build --locked --bin ink
target/debug/ink build examples/adaptive-pipeline.ink --target webgpu \
  --zig /path/to/zig -o build/adaptive-pipeline
node --test runtime/tests/*.mjs tests/browser/*.mjs
cargo test --locked --test adaptive_bundle --test gpu --test javascript \
  --test source_routing --test source_routing_tools
cargo test --manifest-path runtime/Cargo.toml --locked --offline
node bench/adaptive-placement/browser.mjs build/adaptive-pipeline \
  /path/to/new-results /path/to/playwright-core /path/to/Chrome
```

The browser harness records the fitted profile and removes every model for a
pipeline scope whose selected alternative fails either the 10% warm or declared
lifetime gate. Other independently passing scopes remain available. An entirely
failing profile becomes an empty baseline profile; losing data is preserved.
