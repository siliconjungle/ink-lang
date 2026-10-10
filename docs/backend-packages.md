# Core, backend packages and mixed execution

Ink's semantic/proof library is the `ink-core` crate in `ink-lang/core`.
It owns syntax/typing, reference semantics, fixed general proof rules and checked
program/candidate/machine/routing witnesses. It has no backend dependencies.
The `ink` distribution combines that core with independently pinned repositories:

| Repository | Owns |
| --- | --- |
| [ink-knowledge](https://github.com/siliconjungle/ink-knowledge) | Canonical entries, snapshots, typed SQLite discovery and separate performance observations |
| [ink-planner](https://github.com/siliconjungle/ink-planner) | Search, applicability proof production and checked-plan selection |
| [ink-runtime](https://github.com/siliconjungle/ink-runtime) | Backend-neutral graph execution, bundle assembly, host ABIs, scheduling, profiling and pure fallback |
| [ink-lowering-c](https://github.com/siliconjungle/ink-lowering-c) | Portable C emission and allocation primitives |
| [ink-lowering-rust](https://github.com/siliconjungle/ink-lowering-rust) | Stateful/inductive Rust emission and native storage primitives |
| [ink-lowering-wasm](https://github.com/siliconjungle/ink-lowering-wasm) | Checked C-to-Wasm target configuration and exports |
| [ink-lowering-js](https://github.com/siliconjungle/ink-lowering-js) | Literal ES module emission preserving Ink word/f32 semantics |
| [ink-lowering-gpu](https://github.com/siliconjungle/ink-lowering-gpu) | WGSL emission and WebGPU/wgpu device adapters |

JavaScript emits portable ES modules; see [its value and selection contract](javascript-backend.md).
C/Rust toolchains produce native machine code or Wasm. WebGPU and native wgpu
share shader lowering. Runtime assembles GPU artifacts with compiled C/Wasm
fallback; the GPU lowerer has no C or runtime dependency. Wasm state host support
also belongs to runtime. Core source lives entirely in `core/src`.

The distribution pins repositories and its Cargo lock; standalone packages pin
compatible core/backend revisions. See [the storage and execution contract](repository-architecture.md).

A core-only build needs neither knowledge nor backend checkouts:

```sh
cargo build --manifest-path core/Cargo.toml --offline
```

The full CLI needs its backend submodules. Integration tests additionally need
knowledge. New code-generation primitives belong in the relevant backend; new
optimisation laws and representation choices belong in knowledge.
The existing aggregate/bounded/layout authority remains migration debt. Moving
its emitter does not prove that authority has been removed or its implementation
has been formally verified.

## A program can use several targets

Placement is a graph, not one target attached to an entire program. In a browser,
control and small tasks may execute in JavaScript or Wasm while a bulk pipeline executes in
WebGPU. On desktop, CPU parts use ordinary native toolchains and GPU parts use
wgpu. A placement should name operations, representations, execution domains and
explicit conversion/transport edges. A buffer can stay resident on the GPU across
several operations rather than returning to the CPU after each one.

Core must validate what the graph means. A backend provides its capability
checks, actual emission, runtime protocol and ABI. The external planner compares
admitted candidates; target names and measured speed never constitute proof.

The first implemented interface is `ink-pure-routing-v1` in `core/src/routing.rs`:

- An original public function and an acyclic ordered list of public stage functions.
- Each stage names an opaque backend/domain and takes inputs or earlier results.
- Exact typed edges. Changing the mathematical representation needs an explicit
  conversion stage; mismatched sorts are rejected.
- Every stage contributes to the result. Duplicate, forward, missing and unused
  nodes reject, and expansion/size/arity/library/kernel budgets apply.
- A general-kernel proof under no assumptions equates the original function with
  the actual composed calls. Repinning changed stage bodies does not supply that proof.
- An immutable checked witness can be passed to an external executor/backend.

`ink check-route LOCK.json ROUTING.json` checks that mathematical plan and reports
its stages and result sorts. Opaque placement labels do not establish that a
backend is installed, the physical transport is faithful or the graph is faster.
This initial proof domain uses the existing first-order Bool/U64/datatype dialect;
it does not yet admit GPU u32 source pipelines through the same proof language.

The v2 GPU runtime supports explicit typed host pipelines whose intermediate
arrays stay resident across steps and iterations. Those host plans are not
admitted as source replacements by the mathematical or literal source router.
See [compute pipelines](gpu-compute.md).

The v1 literal pure call router now executes checked source compositions through
the shared runtime and independent lowerers: `ink build CORE.json --core --route ROUTE.json
--target webgpu ...` produces Wasm/WebGPU and native C/wgpu hosts. Stages return
scalar word/Bool results on the host. Repeated pure calls can share one stage,
with exact source reconstruction checked by core; external production owns
sharing, placement and complete-cost selection. See [source routing](source-routing.md)
and `reports/source-routing-phase1`.

General proof-admitted residency, arbitrary source subexpressions and stateful
placement are not yet implemented. Transactions,
concurrent effects, async cancellation and persistent state need observation and
protocol contracts beyond this pure composition interface. A logical identity
stage alone is not a proof of DMA, buffer ownership, layout bytes or barriers.

## Optimise the connections too

The external planner needs complete execution costs, not just kernel timings:

`setup + input conversion + upload + dispatch + computation + waits + readback + output conversion`

For a graph, account for dependencies, overlapping work and its critical path
rather than blindly summing all stage times. Candidate plans should vary kernel
fusion, batch sizes, persistent residency, CPU/GPU placement and representation.
The cheapest graph may keep a small task on CPU or deliberately combine several
operations to avoid transfers.

Measurements are separate from proof objects and keyed by hardware, drivers,
toolchains, backend/bridge identities, data shape/size, allocation/residency state
and concurrency. Bounded profiling may rank valid candidates; it must not invent
semantic assumptions. Search exhaustion keeps an admitted baseline. Runtime
switching needs checked applicability, state migration and fallback protocols.

Next: unify source/definition proof dialects, extend explicit physical ABI,
ownership and async bridge contracts, and retain buffers across GPU functions.
The literal mixed executor is an initial pure scalar-result boundary; it does
not establish effects/state refinement or complete the production roadmap.
