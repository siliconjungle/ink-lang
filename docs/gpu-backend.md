# Word types and measured GPU execution

This page describes the preserved v1 word backend. For the newer numeric arrays,
vectors/records and resident pipelines, see [pure compute v2](gpu-compute.md).

Ink's pure frontend, reference evaluator, C/native backend and Wasm backend now
support `u32` alongside `u64`. Pure functions embedded in generated stateful Rust
use the same contextual word typing. `+`, `-`, `*` and `sum` wrap at the declared
width, including intermediate expressions. `count` in a pure function returns
`u64`; the existing stateful query language retains exact `Int` counts.

Unsuffixed pure numeric literals still default to `u64` without context. An
expected signature, word operand or map-result type can give a literal `u32`
context. Out-of-range literals are rejected. Typed `u32` and `u64` values never
implicitly convert. This extends the supported fragment of executable core v1;
existing accepted word programs keep their meaning and serialized type vocabulary.
Exact `Int` remains exact. This release does not add floating-point types,
automatic narrowing, new range-specialisation rules or new optimisation axioms.

## Build browser and native implementations

```sh
cargo build --release --bin ink
target/release/ink build examples/gpu.ink --target webgpu --zig /path/to/zig -o build/gpu
```

`--target gpu` is an alias. Both generate the same bundle:

- `cpu.c`, `cpu.wasm`: literal compiled CPU implementations of every function.
- WGSL compute shaders and `manifest.json`: supported GPU functions, rejected
  capability checks, exact core/source identities, shader hashes and trust boundary.
- `plan.json`: any externally checked replacement/implementation selection from the
  existing build path. No package is fetched automatically.
- `ink-gpu.mjs`: asynchronous browser runtime with compiled Wasm fallback.
- `native/`: a standalone Rust library/CLI using pinned `wgpu` and the same WGSL,
  with generated C linked as its CPU fallback. No Ink interpreter is included.

The compiler remains independent of `wgpu` and builds without the knowledge
submodule. Native GPU dependencies are compiled only when building that host
project. Native builds require Rust plus a platform C compiler. Browser bundles
require Zig for their freestanding CPU fallback.

### Browser

Serve `build/gpu` from localhost or HTTPS:

```js
import { loadInk } from './ink-gpu.mjs';
const ink = await loadInk(new URL('./', import.meta.url));
const outcome = await ink.run('total', [new Uint32Array([1, 2, 3]), 4]);
console.log(outcome.value, outcome.backend, outcome.profile);
await ink.close();
```

`backend: 'cpu' | 'gpu' | 'auto'` can be supplied to `loadInk`; default is `auto`.
A requested GPU still falls back on unavailable/unsupported/failed execution,
and reports that reason. Check `outcome.backend` to require actual GPU evidence.
`u32` results are Numbers, `u64` results are BigInts, Bool results are Booleans.
Supply large `u64` inputs as BigInts or decimal strings: unsafe Numbers are
rejected. Calls are serialized and input arrays copied at submission so host
mutation and concurrent requests cannot race on shared Wasm memory.

### Outside the browser

```sh
cargo build --release --locked --manifest-path build/gpu/native/Cargo.toml
printf '[[1,2,3],4]' > build/gpu/args.json
build/gpu/native/target/release/ink-gpu-program total build/gpu/args.json --backend auto --repeat 3
```

The library exposes `Engine::new()` and `Engine::call(name, &json_arguments,
Backend::Auto)`. The CLI also accepts `--script FILE.json`, an array of
`{ "call": "total", "args": [[1,2,3],4], "backend": "gpu" }` entries.
`INK_GPU_DISABLE=1` explicitly disables native GPU access. `wgpu` provides
platform GPU backends (including Metal, Vulkan and Direct3D 12); a compatible
adapter/driver is still required. Devices without a usable GPU execute compiled
CPU code. Cross-platform design does not constitute testing on every device.

## Initial GPU fragment

A GPU function has one `List<u32>` input, zero or more `u32`/Bool scalar inputs,
and returns `sum(...) -> u32` or `count(...) -> u64`. Its list expression is a
literal chain of maps and filters with `u32` at every checked intermediate stage.
A literal-only intermediate map can default to `u64`; that pipeline stays on CPU. Lambdas support wrapping scalar arithmetic,
comparisons, short-circuit Boolean expressions, lazy `choose` and acyclic scalar
helper calls. Other functions remain callable through compiled CPU code.

Every source map/filter stage is materialised separately on the GPU. No new
pipeline-fusion rule is installed in the compiler. Maps preserve length. A filter
uses per-block inclusive selection prefixes, block offsets and stable scatter.
The output slot for a selected element is its number of selected predecessors;
thus each slot is unique and source order is preserved. Future stages read the
new GPU length, not the original capacity. Sum uses a tree reduction with a
zero identity. Addition modulo 2^32 is associative, so its result matches the
source sum, including overflow and empty lists. Count reads the actual length.

These are semantic arguments for straightforward implementations of primitives,
not machine-checked proofs of WGSL, race freedom, the bridge or device code.
Buffer operations, primitive parallel implementations, backend/driver execution
and CPU lowering remain trusted. The manifest states that boundary. Existing
external proof packages are still required for language-level source replacements;
GPU eligibility and measurements do not authorise such replacements.

`u64` emulation, arbitrary precision, floating-point arithmetic, order-sensitive
folds, nested collections and transactions are outside this GPU fragment. A
transactional application can call a separately hosted pure kernel, but this
release does not offload transactions or change their commit/effect protocol.

## Selection and failure

The host retains CPU and GPU candidates. In auto mode it checks capabilities and
measures three alternating CPU/GPU samples on the actual pure inputs, comparing
all sampled results. Very short browser CPU calls are timed in bounded batches
to reduce clock quantisation. GPU times include allocation, packing/upload, every dispatch,
synchronisation and readback. Shared argument validation is outside both timings.
Shader/adapter setup is recorded separately and amortised over an explicit
expected-use horizon (default 32). The GPU is selected only with at least 10%
estimated savings after that setup charge.

Profiles are bounded to 32 entries. Keys include function identity, size bucket,
scalar parameters and a bounded coarse sample of input values. Each profile is
rechecked after 32 uses. The browser accepts `expectedCalls` and `recheckEvery`;
the native initial policy uses 32 for each. These are estimates, not promises of
future calls or global optimality. Profiling can cost more than a one-off call;
select `cpu` explicitly for that case. No timing or distribution observation
changes arithmetic, types, guards or permitted inputs.

Capability/dispatch/buffer limits are checked before use. Estimated working
buffers are bounded to 256 MiB. The deliberately simple block-prefix primitive
limits filtered GPU inputs to 1,048,576 elements; a hierarchical scan is future
backend work. Unsupported inputs, adapter absence, validation errors, device loss
and detected result mismatches fall back to CPU with diagnostics. Trials only
execute pure computations and cannot publish application events. Failed shader
or device decisions are cached; size/budget rejection can be retried for a smaller
input. The limits do not impose a whole-process memory ceiling.

## Reproduce validation

```sh
cargo test
cargo build --release --locked --manifest-path build/gpu/native/Cargo.toml
python3 bench/gpu/native.py build/gpu/native/target/release/ink-gpu-program build/gpu-validation
python3 bench/gpu/selection.py build/gpu/native/target/release/ink-gpu-program build/gpu-validation
python3 bench/gpu/fixtures.py build/gpu/fixtures.json
npm ci --prefix bench/gpu
python3 -m http.server 8765 --bind 127.0.0.1 --directory build/gpu
# In another terminal:
node bench/gpu/browser.mjs http://127.0.0.1:8765/ build/gpu/fixtures.json build/gpu-validation/browser.json /path/to/chrome
```

The independent Python oracle includes modular boundaries, empty inputs,
none/all/some filters, repeated filtering, constant maps, lexical shadowing,
conditional branches, intermediate u64 maps, and lengths around workgroup boundaries. Tests require the
GPU backend to report actual GPU execution for eligible cases. They also exercise
compiled CPU-only folds/u64, disabled/unavailable GPU fallback, invalid arguments,
borrowed input preservation and concurrent browser calls. The browser harness
records small/large adaptive decisions and full runtime timing diagnostics.
These checks are engineering evidence, not formal backend verification or a
cross-device performance ranking.
