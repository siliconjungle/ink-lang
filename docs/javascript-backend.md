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

Stateful modules can keep adjacent F32 arithmetic and fresh immutable arithmetic
locals as rounded Number intermediates. Each source operation still rounds in
its original grouping; calls, negation, containers, bit observations, worker
captures and state/result boundaries encode the ordinary exact bits. Mutable
slots and arbitrary field reads do not acquire Number facts. This removes
intermediate conversions without enabling reassociation or FMA. Repeated local
measurements show 1.13–1.24× throughput on two complete neural training examples,
while prediction is mostly unchanged. Small cases can regress. See the
[source-bound measurements and complete limits](../reports/rounded-f32-carriers-2026-10-17/README.md);
these observations do not authorize automatic planner selection or claim GPU
training or Handwired performance parity.

Working records with affine Buffer/Map fields can remain in local slots across
bounded helpers, repeats and ordered folds. Owners keep their checked handles,
moves and readonly loans; expanded List parameters remain shared. This removes
wrapper allocations without changing public temporary-storage admission or
snapshot formats. Arbitrary borrowed host-record fold initializers keep their
ordinary read/failure positions. See [local record storage](local-record-helpers.md)
and the [repeated graph/training study](../reports/affine-record-carriers-2026-10-17/README.md)
for bounds, exact controls and adverse samples.

Bool, vectors, records and nested lists retain their declared types. Functions,
lexical bindings, map/filter, indexed map, truncating zip, ordered sums, right
folds, scans, numeric sort, bounded repeat and lazy branches/fallbacks are
supported. Collection operations preserve input values; direct pure entries
require stable caller-owned arguments. Runtime asynchronous submissions capture
inputs at their documented boundary.
Exact Int, strings, IDs, enums, Unit and Option/Result are supported, together with tables, queries, changes, keeps, ordered events and rollback. `createState()` exposes action invocation and asynchronous portable checkpoint/restore. See the [complete parity contract](lowering-parity.md) for the host API and wire forms.

An `Int` comparison may consume direct collection counts and nonnegative integer
literals through exact Number carriers when both operands fit that carrier. Array
lengths are exact integers bounded by JavaScript's array representation; admitted
literals are at most `9007199254740991`. The lowerer evaluates both collections in
source order and retains the normal expression depth/work bounds. Public counts,
Int arguments, arithmetic, negative/large literals and `u64` counts retain their
existing carriers. State queries use the same rule without changing collection
enumeration, state reads, transactions or snapshots. This is a finite target
carrier choice for fixed primitive semantics; it supplies no collection rewrite,
range assumption from a profile or new proof authority.

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

## Sealed partial calls

`prepareCompiled(name, [[parameterIndex, handle], ...])` binds existing immutable
`compiledValues` handles. `callPreparedCompiled(token, remainingHandles)` supplies
unbound parameters in declaration order and returns a normal private result handle.
Capture and materialisation retain the existing checked type and ownership boundary.
Tokens belong to their emitted module and have no mutable payload surface.

The lowerer emits bounded residual functions for lexical `let` bindings and lazy
branches. A binding is retained only when its transitive parameter dependencies
are bound. Temporary owners additionally need the core's existing readonly-loan
analysis for their remaining scope. Each residual cut treats earlier values as
shared inputs, preventing in-place operations from mutating retained lists.
Branches stay lazy; preconditions run before cached computation; thrown errors
are retried. There is no global result cache. Dropping the token releases its
retained inputs and computations when garbage collection permits.

This implementation reuses the exact already-selected source, including any
ordinary database equality proofs that introduced an index. It adds no syntax,
algorithm matcher or kernel rule. Ordinary calls keep their function bodies and
do not use these caches. Recursive or oversized residuals and unsupported residual
shapes fall back to ordinary compiled calls; capability metadata records the
bounded optional lane. This first host implementation is JavaScript. It is not a
persistent replacement for arbitrary public Set values or automatic prepared-call
selection. Prepared capture, first call, updates, memory, module load and teardown
need lifecycle evidence before a planner may select this execution boundary.


[Pure helper preparation](prepared-helpers.md) now carries bound parameter masks
through lazily created, call-site-specific residual helpers and retains successful
stable conditions. Sixteen helper levels, existing body/source limits and ordinary
fallback bound the optional lane. Changing neural weights/context still compute
fresh primal and reverse values; malformed graph records retain validation.
