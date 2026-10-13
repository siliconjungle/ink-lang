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

`f32` uses native Numbers with exact exceptional tags in pure modules; state
modules retain the bit representation. Every arithmetic operation rounds separately
to binary32. Pure field-only record consumers borrow stable inputs and normalize
scalar reads without recursively packing their containers. Whole-value escape and
equality retain eager invocation-local capture. Negation preserves payloads and flips the sign bit. Host values use
finite Numbers or `{F32Bits: bits}`; exceptional output is never silently turned
into JSON null. The emitter preserves operation order, signed zero and
subnormals. Arithmetic-produced NaNs use the canonical quiet payload `0x7fc00000`;
transport and sign-bit negation retain the original payload.

Bool, vectors, records and nested lists retain their declared types. Functions,
lexical bindings, map/filter, indexed map, truncating zip, ordered sums, right
folds, scans, numeric sort, bounded repeat and lazy branches/fallbacks are
supported. Collection operations preserve input values; direct pure entries
require stable caller-owned arguments. Runtime asynchronous submissions capture
inputs at their documented boundary.
Exact Int, strings, IDs, enums, Unit and Option/Result are supported, together with tables, queries, changes, keeps, ordered events and rollback. `createState()` exposes action invocation and asynchronous portable checkpoint/restore. See the [complete parity contract](lowering-parity.md) for the host API and wire forms.

Generated pure functions use a caller-trusted ABI without a fuel or cell budget.
State invocation retains typed ingress with a one-million-cell bound and its
separate bounded host execution policy. These limits do not reproduce the
reference interpreter's exact fuel accounting.

## Browser backend selection

WebGPU bundles include `program.mjs`, `cpu.wasm` and shaders. Explicit JavaScript,
CPU or GPU selection remains available. Automatic selection applies `ink-abi`'s
Rust decision implementation through Wasm to already eligible candidates and
saved, target-bound profiles. Missing comparable evidence retains the compiled
CPU baseline. Runtime enforces resources and handles device failure; it performs
no profitability probes. Knowledge owns observations and models, and planner
owns offline fitting. See [the common contract](adaptive-execution.md).

Saved placement profiles jointly select contiguous stage groups and targets,
including parallel pure JavaScript/Wasm worker branches. GPU group interiors stay
resident; typed bridges and complete output materialisation are included in
training. Measured startup is amortised over expected calls. Missing comparable
CPU evidence or workload domains retain CPU. See
[execution policies and mixed placement](adaptive-execution.md) for limits,
profiling and frozen holdout evidence. Native wgpu bundles use their C CPU fallback.
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

Pure buffer elements are immutable logical values and may share nested records
with inputs and outputs. Slot arrays remain privately owned; split-range growth
detaches. Structural equality uses declared fields and an aggregate identity
fast path, retaining stored float bits. Host state replies detach their reachable
values. See [snapshot updates](internal-snapshots.md) for the ownership and private-delta contract.
