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

The semantic core builds without `knowledge` or any lowering package. The
distribution compiler uses the pinned C, Rust, Wasm-adapter and GPU packages,
and builds without `knowledge` or a wgpu runtime dependency. C owns the compiled
CPU fallback; GPU owns WGSL and the browser/native hosts. A GPU bundle contains
a standalone pinned wgpu project; compatible adapters and drivers are required
for GPU execution. The browser uses Wasm CPU fallback; the native host links
generated C. Neither host links an Ink interpreter.

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
  recursive records or u64 record fields are supported by this ABI. All record
  declarations in a compute bundle must satisfy these layout restrictions.
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
  integer values ascending. They currently execute on CPU. Float `sum` evaluates
  from left to right; `foldr` retains right-to-left evaluation. Ordered reductions
  execute on CPU in the general compute bundle.

GPU array functions currently directly map, zip or map_indexed input arrays.
Their scalar bodies can read other input arrays, call acyclic helpers, construct
vectors/records, branch and use bounded loops. Literal lowering emits one kernel
per function, with distinct buffers for inputs and outputs. Nested collection
stages within a function remain CPU-only; put stages in separate pipeline steps
for residency. Deep helper expansion can also exceed the shader lowering budget
and select CPU; compiled CPU helpers use ordinary function calls. There is no
automatic collection fusion, scatter, GPU scan/sort,
parallel float reduction, general graphics renderer or stateful GPU execution.

`matrix4` in the particle example demonstrates indexed reads and a bounded
inner loop for a small matrix product. It is literal lowering, not a tiled BLAS
implementation. `gather`, `indexed` and `iterate` exercise signed words and safe
array access. Particle rendering remains the application's responsibility.

## Floating-point contract

Executable core v2 explicitly introduces portable f32 computation. Its GPU
arithmetic follows [WGSL floating-point evaluation](https://www.w3.org/TR/WGSL/#floating-point-evaluation),
including permitted rounding, reassociation, fusion, subnormal flushing and
finite-math assumptions. Lowering emits the source operation structure; it does
not introduce a float reduction tree or collection fusion. Hardware may still
apply transformations allowed by WGSL. A GPU result is not promised to be
bit-identical to a CPU result, and float-dependent branches can consequently
differ. This contract is unsuitable for exact accounting or reproducible IEEE
exception handling. Select CPU when those stronger behaviours are required.

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
Buffers are scoped to one pipeline invocation and released afterwards. This is
residency across steps/iterations, not persistent GPU handles across separate
host calls, durable storage, snapshots or rewinding.

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
for profiling. `INK_GPU_DISABLE=1` exercises compiled native CPU fallback.

## Ownership, limits and selection

The packed ABI is little-endian 32-bit lanes, with record fields in declaration
order and vectors unpadded. Each generated C type has a layout size assertion.
The C boundary copies inputs into aligned call storage, preserving borrowed
inputs. Results are owned by the call arena until `ink_compute_reset`; native
and Wasm hosts copy results before resetting. Direct C callers must reset their
thread-local arena after consuming returned values. Nested/recursive layouts
are rejected before lowering.

Pipelines are limited to 64 steps, 10,000 iterations, 65,536 total dispatches and
a 256 MiB GPU live-buffer budget including uploads, both banks, metadata and
readbacks. Individual input/output arrays are bounded to 256 MiB at the host
boundary. Adapter binding, buffer and dispatch limits are checked separately.
These are execution limits, not optimization theorems. GPU unavailability,
device loss, allocation/validation/shader failures and capability/size limits
replay the original pipeline on compiled CPU and report the reason. Unsupported
CPU ABI features fail compilation; malformed arguments/plans fail validation.
There is no native evaluation fuel or universal hardware guarantee.

Auto selection takes three alternating CPU/GPU timings for the complete
pipeline, including host allocation, copies, upload, dispatch, synchronization,
readback and JSON result construction. It amortizes initial GPU setup over 32
uses and requires a measured saving of at least 10%. At most 32 profiles are
cached, keyed by topology, types/shapes, iterations, feedback and sampled input
words; profiles refresh after 32 uses. Sampling can miss data-dependent cost
changes; it cannot authorize a semantic rewrite. CPU/GPU trials always start
from the same immutable inputs. No intermediate GPU state is authoritative.

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

Independent Python oracles cover wrapping integers and binary32 values; native C
array tests also run under address/undefined-behaviour sanitizers. Browser/native
receipts include actual backend selections and transfer counts. Float comparison
tolerances are validation diagnostics, not a portable error bound for arbitrary
programs. See [phase 2 evidence](../reports/gpu-phase2/REPORT.md).
