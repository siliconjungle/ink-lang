# Core, backend packages and mixed execution

Ink's semantic/proof library is the `ink-core` crate in `ink-lang/core`.
It owns syntax/typing, reference semantics, fixed general proof rules and checked
program/candidate/machine/routing witnesses. It has no backend dependencies.
The `ink` distribution combines that core with independently pinned repositories:

| Repository | Owns |
| --- | --- |
| `siliconjungle/ink-lowering-c` | Pure C emitter and allocation primitives |
| `siliconjungle/ink-lowering-rust` | Stateful Rust emitter, pure Rust expressions, checked definition and machine emission, ordered storage primitives |
| `siliconjungle/ink-lowering-wasm` | Existing state Wasm ABI and browser/Node adapter |
| `siliconjungle/ink-lowering-gpu` | WGSL emission, shared WebGPU/wgpu runtime, compiled C fallback |
| `siliconjungle/ink-knowledge` | Algorithms, equivalent candidates, proof production, discovery and eventually routing/cost selection |

Rust/C and their existing toolchains produce native machine code or Wasm.
No separate ARM64/x86 assembly compiler is required. WebGPU and native wgpu share
shader lowering. The Wasm package is an adapter, not a direct code generator.
The distribution's submodule revisions and Cargo lock are explicit pins;
standalone backend packages pin their compatible core revision as well.

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
control and small tasks may execute in Wasm while a bulk pipeline executes in
WebGPU. On desktop, CPU parts use ordinary native toolchains and GPU parts use
wgpu. A placement should name operations, representations, execution domains and
explicit conversion/transport edges. A buffer can stay resident on the GPU across
several operations rather than returning to the CPU after each one.

Core must validate what the graph means. A backend provides its capability
checks, actual emission, runtime protocol and ABI. The external planner compares
admitted candidates; target names and measured speed never constitute proof.

The first implemented interface is `ink-pure-routing-v1` in `src/routing.rs`:

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
the independent GPU package: `ink build CORE.json --core --route ROUTE.json
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
