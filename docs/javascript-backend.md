# JavaScript target

`ink-lowering-js` is an independent, pinned target package. It emits ES modules
from the same checked program and selected transformations as the other lowerers.
Ink's core types and semantics are unchanged.

```sh
ink build examples/particles.ink --target javascript -o build/particles.mjs
```

```js
import { functions } from './particles.mjs';
const velocities = functions.kick([[1, 2, 3]], 0.5, [0, -2, 0]);
// [[1, 1, 3]]
```

The generated module runs in browsers or Node without Wasm, a GPU or a native
compiler. GitHub Pages can serve it as a static asset. This is literal JavaScript
code generation, not an AST interpreter. Editing source in a live browser still
requires a browser-facing parser/checker/lowerer wrapper.

## JavaScript implements Ink's values

`u32`/`i32` operations explicitly wrap, with `Math.imul` for multiplication.
`u64` uses `BigInt` with wrapping at every arithmetic operation. Inputs accept
BigInt, safe integer Numbers or canonical decimal strings. Unsafe Numbers and
implicit coercions reject; outputs remain BigInt, so JSON hosts must encode
those explicitly (for example as decimal strings).

`f32` uses a bit representation internally and rounds after each arithmetic
operation. Negation preserves payloads and flips the sign bit. Host values use
finite Numbers or `{F32Bits: bits}`; exceptional output is never silently turned
into JSON null. The emitter preserves operation order, signed zero and
subnormals. Arithmetic-produced NaN payloads are engine-dependent, as on native
CPU; exact cross-engine NaN payload reproducibility is not promised.

Bool, vectors, records and nested lists retain their declared types. Functions,
lexical bindings, map/filter, indexed map, truncating zip, ordered sums, right
folds, scans, numeric sort, bounded repeat and lazy branches/fallbacks are
supported. Inputs are captured and collection operations preserve them.
Exact Int, strings, IDs, enums, Unit and Option/Result are supported, together with tables, queries, changes, keeps, ordered events and rollback. `createState()` exposes action invocation and asynchronous portable checkpoint/restore. See the [complete parity contract](lowering-parity.md) for the host API and wire forms.

Host ingress/output have a one-million-cell budget. Pure function calls and collection
iterations share a one-million-step budget per invocation; state invocation uses a 100-million-step budget. These host limits are
not the reference interpreter's exact fuel accounting.

## Browser backend selection

WebGPU bundles now include `program.mjs` as well as `cpu.wasm` and shaders.
`ink-runtime` owns selection; the lowerer contains no timings or target policy.
Scalar `run(name,args,'javascript')` and compute
`call(name,args,{backend:'javascript'})` explicitly choose JavaScript.
`auto` uses saved complete-call cost profiles without online trials. Explicit
`policy:'profile'` retains bounded alternating pure-call timing for training;
`policy:'static'` fixes a backend. Packed JavaScript groups pass native values
between stages. CPU/GPU input transport remains captured and owned.

Saved placement profiles jointly select contiguous stage groups and targets,
including parallel pure JavaScript/Wasm worker branches. GPU group interiors stay
resident; typed bridges and complete output materialisation are included in
training. Measured startup is amortised over expected calls. Missing comparable
CPU evidence or workload domains retain CPU. See
[execution policies and mixed placement](adaptive-execution.md) for limits,
profiling and frozen holdout evidence. Native wgpu bundles retain the C CPU path.
Browser source editing remains separate work. Stateful calls never enter
speculative selection.

## Evidence and trust

Emission manifests bind the checked core identity, semantics version, typed
interface and JavaScript source hash. CLI plan files retain transformation
selection evidence. Optimisation laws remain in knowledge; profitability remains
separate from correctness. The checker, lowerer, codecs, runtime and JavaScript
engine remain trusted. Differential tests do not constitute a formal target proof.

The standalone lowerer runs 946 reference comparisons in Node, including overflow,
full-width integers, float rounding, particles, nested collections, lazy
fallbacks and invalid inputs. Integrated Node/browser bundle evidence is recorded
in [reports/javascript-phase1](../reports/javascript-phase1/REPORT.md).
