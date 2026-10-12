# Pure compute and resident WebGPU/wgpu pipelines

The second GPU milestone adds logical `i32`, `f32`, `Vec2<T>`, `Vec3<T>` and
`Vec4<T>` values, numeric records, multiple array inputs and array results. These
are ordinary Ink values. GPU storage is a backend decision, not part of their
source types. Build `examples/particles.ink` to produce browser WebGPU, native
wgpu and compiled CPU implementations of the same program.

```sh
cargo run -- build examples/particles.ink --target webgpu --zig /path/to/zig -o build/particles
cargo build --release --locked --manifest-path build/particles/native/Cargo.toml
build/particles/native/target/release/ink-gpu-program --pipeline examples/particles.pipeline.json --backend auto
```

The semantic core builds without knowledge or lowering packages. The distribution
assembles pinned planner, runtime and lowerers. C emits compiled CPU fallback;
GPU emits WGSL and owns device adapters; `ink-runtime` owns bundle assembly,
browser/native host assembly, shared saved-model decisions, scheduling and fallback.
GPU shader emission is independent; general recursive host lanes reuse literal
C and JavaScript representation emission. `ink-abi` owns packed layouts and the
common decision implementation.

A GPU bundle contains a standalone pinned wgpu project. Compatible adapters and
drivers are required for GPU execution. The browser uses Wasm CPU fallback; the
native host links generated C. Neither host links an Ink interpreter.

## Source operations

- `i32` addition, subtraction, multiplication, negation, sum and scan wrap at
  32 bits. `u32`/`u64` retain their existing meanings. Values never implicitly
  convert between typed numeric types.
- Decimal/exponent literals are rounded to binary32 `f32`; finite literals are
  required. Contextual integer literals must be exactly representable in f32.
  Unconstrained positive integer literals retain the historical u64 default.
- Vectors have 2–4 components of `u32`, `i32` or `f32`. Construct with
  `vec2(...)`, `vec3(...)`, `vec4(...)`; read `.x`, `.y`, `.z`, `.w`.
- Records retain named fields. The compute ABI supports records containing
  32-bit numeric/Bool values, vectors and other such records. No nested arrays,
  recursive records are supported by this ABI. U64 values use two 32-bit lanes. Only declarations in the selected pure closure must satisfy these layout restrictions. Unrelated state declarations execute on the complete CPU host.
- Pure function bodies accept sequential `let name[: Type] = expression;`
  bindings followed by a return expression. `choose(condition, a, b)` evaluates
  only the selected branch. Functions remain acyclic and free of effects.
- `xs.map(fn(x) => ...)`, `xs.map_indexed(fn(i) => fn(x) => ...)`, and
  `xs.zip(ys, fn(x) => fn(y) => ...)` produce arrays. Indexes are u32. Zip stops
  at the shorter array, including when either input is empty.
- `xs.at_or(index, fallback)` reads an element or lazily evaluates its fallback
  when the index is outside the array. No unchecked indexed access is added.
- `repeat(BOUND, initial, fn(i) => fn(acc) => ...)` carries an accumulator through
  exactly BOUND iterations, with u32 indexes starting at zero. BOUND must be a
  literal at most 65,536. Zero iterations return the initial value. Accumulator
  types accepted by the checker can exceed a particular backend's capabilities.
- `quot_or(a,b,fallback)` and `rem_or(a,b,fallback)` are total integer operations:
  zero divisors and i32 minimum / -1 select the lazy fallback. Other signed
  quotients truncate toward zero.
- `xs.scan()` is an inclusive wrapping integer prefix sum; `xs.sort()` orders
  integer values ascending. Eligible 32-bit array computations emit WGSL for both,
  including compositions with map, filter, zip and acyclic helpers. Ordered sums
  and right folds preserve their source traversal when used inside eligible kernels.

Array kernels can compose collection expressions and lazy list branches. Bounded
list-valued repeat unrolls up to 16 iterations; larger expansions select CPU.
Actual length headers preserve filtering and truncation through resident
pipelines. Eligibility does not establish that GPU execution is faster.

Graph stages run these collection operations as parallel multi-pass schedules
(256-wide workgroups, up to 256³ elements per stage):

| Operation | Element types | Schedule |
|---|---|---|
| `scan` | u32, i32, u64 | three-level block scan (5 passes) |
| `sort` | u32, i32, u64 | stable LSD radix sort, 8-bit digits (4 per 32-bit lane), each digit a histogram, a scan and a stable placement |
| `sum` | u32, i32, u64 | grid-stride partial sums, then one combining group |
| `filter` | any packed type, including records | predicate flags, in-place scan, scatter; the header carries the kept count |
| `concat` | any packed type | one copy pass per element |

Integer results are exact (wrapping where the source wraps), so they equal the
compiled CPU bit for bit. f32 `sum`, `foldr` and `count` keep their sequential
source order: the floating-point contract below does not admit a reduction
tree. Each schedule is data in the manifest (`schedule.passes`, `scratch`); a
host only binds buffers and dispatches. Collection work nested inside a
per-element lambda stays in a direct shader with an element bound: 1,024 for
filter/scan per element, 128 when a sort runs per element.

Stateful programs, exact Int arrays, opaque values and nested heap structures
use the complete CPU host. See [lowering parity](lowering-parity.md) for mixed
module assembly, host APIs and resource boundaries. There is no source-level
scatter, f32 reduction tree, graphics renderer or stateful GPU execution, and
feedback that grows a list (for example `xs.concat(ys)` fed back to `xs`) runs
on the CPU.

`matrix4` in the particle example demonstrates indexed reads and a bounded
inner loop for a small matrix product. It is literal lowering, not a tiled BLAS
implementation. `gather`, `indexed` and `iterate` exercise signed words and safe
array access. Particle rendering remains the application's responsibility.

## Floating-point contract

Source f32 operations use integer-lane binary32 helpers in WGSL: rounding to
nearest with ties to even, gradual underflow, signed zero and canonical
arithmetic NaN. Pass-through and negation retain payload bits. Source sums and
scans retain their operation order; the parallel integer schedules do not
reassociate floating-point source computations. Target emission and device
execution remain trusted implementations of this contract.

Session `read` reductions are separate host operations. Their f32 kernels use
[WGSL floating-point evaluation](https://www.w3.org/TR/WGSL/#floating-point-evaluation)
and tree order, so their summaries can differ from CPU reductions. They do not
change the stored source values or grant source rewrite authority.

The reference evaluator and generated CPU code use binary32 arithmetic without
fast-math; C contraction is disabled. Hosts round finite JSON numbers to f32 at
input. Explicit `{"F32Bits": unsigned_32_bit_value}` preserves exceptional CPU
values; a non-finite input forces the entire pipeline to CPU. A finite input does
not prove that every intermediate stays finite. Programs relying on overflow,
NaN, infinity or subnormal details must select CPU. Exceptional CPU results use
F32Bits objects in JSON rather than being silently converted to null.

New syntax/types and pure record construction/access serialize with
`ink-executable-core-v2`. Legacy accepted programs retain their v1 identities.
The existing external replacement-proof translators do not admit these new
compute operations. Structural/type checks, literal lowering, the ABI, hosts,
C/LLVM, WebGPU/wgpu and drivers remain trusted. Profiles establish profitability
only, not arithmetic equivalence, proof authority or application conditions.

## Host pipeline

```js
import { loadInk } from './ink-gpu.mjs';
const ink = await loadInk(new URL('./', import.meta.url));
const plan = {
  inputs: {
    positions: [[0, 0, 0], [1, 0, 0]],
    velocities: [[1, 2, 0], [-1, 2, 0]]
  },
  steps: [
    { id: 'velocity', call: 'kick',
      args: [{ input: 'velocities' }, 1 / 64, [0, -9.75, 0]] },
    { id: 'position', call: 'drift',
      args: [{ input: 'positions' }, { step: 'velocity' }, 1 / 64] }
  ],
  iterations: 120,
  feedback: { positions: 'position', velocities: 'velocity' },
  outputs: ['position', 'velocity']
};
const outcome = await ink.pipeline(plan, { backend: 'auto' });
console.log(outcome.values.position, outcome.backend, outcome.counters);
await ink.close();
```

`{ input: name }` references a named initial input, whose type is inferred from
its uses. `{ step: id }` references an earlier step's output in the current
iteration. Feedback installs final step outputs as named inputs for the next
iteration. Outputs name steps to read back after the final iteration. Types,
unique IDs, reference order, argument values and feedback are validated before
execution. GPU feedback must retain each input's array shape; a shape-changing
pipeline runs on CPU. Steps are pure; replay after GPU failure has no external
effects.

The GPU host uploads each initial constant/input once, allocates two banks of
step buffers, and alternates them between iterations. Intermediate results stay
on device, with no per-step readbacks. Only named final outputs are copied back.
A `pipeline` call's buffers are released afterwards; a session (below) keeps
them across host calls. Neither is durable storage, a snapshot or rewinding.

## Resident sessions

A session uploads its inputs once and keeps every value on the device across
host calls. Nothing runs until `step`, and nothing is read back until `read`:

```js
const ink = await loadInk(new URL('./', import.meta.url));
const sim = await ink.open(plan);              // backend: 'auto' (default), 'gpu', 'gpu-required', 'cpu'
await sim.step(10_000);                        // no readback
const {value: alive} = await sim.read({step: 'next', reduce: 'sum'});   // a few words
const {value: corner} = await sim.read({step: 'next', slice: [0, 64]});
await sim.write('cells', seed);                // replace an input for the next step
await sim.step(500);
const {values} = await sim.read({outputs: ['next']});                   // whole values
await sim.close();
```

`plan` is the pipeline plan without `iterations`. `open(plan)` followed by
`step(a)`, `step(b)` and `read({outputs})` gives exactly the result of
`pipeline({...plan, iterations: a + b})`, on the GPU and on the CPU. `auto`
opens on the GPU whenever the plan is eligible and the device starts; otherwise
the session runs on the compiled CPU with identical semantics and reports the
reason (`session.backend`, `session.reason`). `gpu-required` fails instead.

Reads:

- `{outputs: [ids]}`: whole step values, as `pipeline` returns them.
- `{step, length: true}`: a list's logical length (4 bytes read back).
- `{step, slice: [start, count]}`: part of a list, clamped to its length.
- `{step, reduce: 'sum' | 'min' | 'max' | 'bounds', field: 'a.b'}`: a device
  reduction over a list (or scalar) of u32, i32, f32, u64, Bool or u32/i32/f32
  vectors, optionally of a dotted record field. Two passes, a few words back.
  Integer sums wrap exactly. f32 device sums use tree order, so they can differ
  from the CPU's element order, including cancellation and overflow differences.
  Float read reductions follow WGSL hardware arithmetic; integer min and max are exact. Empty
  lists give `null` for min and max and zero for sums.

`write(input, value)` replaces a named input for the next step. When feedback
carries that input, the carried value (its step's last output) is replaced.
Element-wise sessions keep every input's length; graph sessions accept list
lengths up to the capacity they were opened with.

`session.buffer(stepId)` returns `{buffer, offset, header, type, capacity}`:
the `GPUBuffer` holding a step's current value. Element 0 starts at `offset`;
when `header` is set, word 0 is the logical length. Pass your renderer's device
as `loadInk(url, {device})` and bind the buffer directly (it has STORAGE,
VERTEX, COPY_SRC and COPY_DST usage), with no readback. A view is valid until
the session's next `step`, `write` or `close`. `ink.gpuDevice()` returns the
device in use. `session.finish()` waits for submitted work (measurement only;
reads wait anyway).

Native hosts offer the same operations: `Engine::open(&plan, backend)`,
`step(id, n)`, `read(id, &request)`, `write(id, input, &value)`,
`view(id, step) -> View` (a `wgpu::Buffer`), `finish(id)` and `close(id)`, and
`Engine::with_device(device, queue)` for an application's own wgpu device.
`--script` accepts `{"open": PLAN, "as": NAME, "backend": ...}`,
`{"session": NAME, "step": N}`, `{"session": NAME, "read": REQUEST}`,
`{"session": NAME, "write": {"input": ..., "value": ...}}`,
`{"session": NAME, "close": true}` and `{"session": NAME}` (finish); any
session entry accepts `"wait": true`, and every output line carries `seconds`.

Long steps are encoded in bounded command buffers (2,048 dispatches each, many
dispatches per compute pass), so a million iterations never build one giant
submission. One iteration's stages must fit in a command buffer.

For a single function, use `ink.call(name, args, { backend })`; `run` is an alias.
`loadInk` also accepts a default backend. Scalar lists accept JavaScript arrays
or typed arrays, while vectors are represented as component arrays and records
as objects. Calls snapshot inputs at submission and serialize shared Wasm/GPU
access. `close`/`dispose` release GPU resources; later requests can still use CPU
fallback. General-bundle u64 values above JavaScript's safe integer range use
decimal strings at input/output. This JSON ABI differs from the original v1
word-only host's BigInt return values; manifest.schema selects the host version.

Native `Engine::pipeline(&plan, Backend::Auto)` uses the same plan format.
`--pipeline FILE.json` executes a plan; `--script FILE.json` accepts call entries
or `{"pipeline": PLAN, "backend": "gpu"}` entries. `--repeat N` reuses one host
for offline measurement. `INK_GPU_DISABLE=1` exercises compiled native CPU fallback.

## Ownership, limits and selection

The packed ABI is little-endian 32-bit lanes, with record fields in declaration
order and vectors unpadded. Each generated C type has a layout size assertion.
The C boundary copies inputs into aligned call storage, preserving borrowed
inputs. Results are owned by the call arena until `ink_compute_reset`; native
and Wasm hosts copy results before resetting. Direct C callers must reset their
thread-local arena after consuming returned values. Nested/recursive layouts
are rejected before lowering.

Pipelines are limited to 64 steps, 1,000,000 iterations (per `pipeline` call or
per session `step`), 64Mi total dispatches and a 256 MiB GPU live-buffer budget
including uploads, both banks, metadata, schedule scratch and readbacks. Individual input/output arrays are bounded to 256 MiB at the host
boundary. Adapter binding, buffer and dispatch limits are checked separately.
These are execution limits, not optimization theorems. GPU unavailability,
device loss, allocation/validation/shader failures and capability/size limits
replay the original pipeline on compiled CPU and report the reason. Unsupported
CPU ABI features fail compilation; malformed arguments/plans fail validation.
There is no native evaluation fuel or universal hardware guarantee.

Automatic selection uses the common `ink-abi` decision contract over saved,
exact-target profiles and bounded workload domains. The browser runs the same
Rust implementation through Wasm. Alternatives require more than 10% predicted
savings over comparable CPU evidence; missing evidence retains CPU. Knowledge
owns observations and models; planner performs offline fitting. Runtime performs
no profitability trials or periodic remeasurement. Resources and device failure
remain host responsibilities. Costs cannot authorise a semantic rewrite.

## Reproduce validation

```sh
cargo test --locked
python3 bench/gpu/compute-fixtures.py build/particles/fixtures.json
python3 bench/gpu/compute-native.py build/particles/native/target/release/ink-gpu-program build/particles/fixtures.json reports/gpu-phase2/native.json
# Serve the bundle on localhost before running the browser validation.
node bench/gpu/compute-browser.mjs http://127.0.0.1:8765/ build/particles/fixtures.json reports/gpu-phase2/browser.json /path/to/chrome
node bench/gpu/compute-browser-selection.mjs http://127.0.0.1:8765/ reports/gpu-phase2/browser-selection.json /path/to/chrome
python3 bench/gpu/compute-selection.py build/particles/native/target/release/ink-gpu-program build/particles reports/gpu-phase2/native-selection.json
```

Sessions and parallel schedules have differential checks of their own, run
against a software Vulkan device (lavapipe) in development:

```sh
# Native wgpu host: each program is a bundle's native/target/release/ink-gpu-program.
python3 bench/gpu/parallel-check.py GPU_PARALLEL_PROGRAM --large 300000
python3 bench/gpu/session-check.py GPU_SESSION_PROGRAM PARTICLES_PROGRAM GPU_PARALLEL_PROGRAM
# Browser host under Node with Dawn (npm install webgpu; INK_NODE_WEBGPU=path/to/webgpu/index.js).
node bench/gpu/parallel-check.mjs build/gpu-parallel --large 300000
node bench/gpu/session-check.mjs build/gpu-session build/particles build/gpu-parallel
# Steady-state cost per iteration, one-off transfer and break-even iterations.
python3 bench/gpu/residency.py --session GPU_SESSION_PROGRAM --particles PARTICLES_PROGRAM --out residency.json
node bench/gpu/residency.mjs build/gpu-session build/particles --out residency-browser.json
```

`examples/gpu-parallel.ink` and `examples/gpu-session.ink` build these bundles.
The parallel checks compare every schedule against the compiled CPU at the
block boundaries (0, 1, 255–257, 65,535–65,537 and larger); the session checks
compare GPU sessions with CPU sessions and one-shot pipelines through split
steps, small reads, writes and buffer views. The residency benchmark reports
GPU and CPU steady-state time per iteration, the one-off upload and readback,
a one-shot pipeline per iteration (the pre-session behaviour) and the
break-even iteration count. On a software adapter it measures the mechanism,
not GPU performance.

Independent Python oracles cover wrapping integers and binary32 values; native C
array tests also run under address/undefined-behaviour sanitizers. Browser/native
receipts include actual backend selections and transfer counts. Float comparison
tolerances are validation diagnostics, not a portable error bound for arbitrary
programs. See [phase 2 evidence](../reports/gpu-phase2/REPORT.md).

## JavaScript CPU alternative

Browser bundles now also carry literal `program.mjs` emission. Runtime accepts
`backend: "javascript"` and includes eligible JavaScript in `auto` saved-model
selection alongside Wasm and WebGPU. Missing comparable evidence retains CPU. The JavaScript path preserves Ink word/f32 types and
uses the host value codec at each stage. Native wgpu fallback remains compiled C.
See [JavaScript target and selection](javascript-backend.md).
