# Literal source routing

`ink-literal-source-routing-v1` is a placement interface for the actual checked
deterministic executable-core-v1 pure Ink source module, including u32. It complements the first-order proved
routing interface; it does not add u32 axioms to that proof calculus.

Executable core v2 is rejected by this routing contract, even for a valid typed
graph. Portable WGSL floating outcomes require an appropriate observation
relation before any exact-equivalence or call-sharing claim. Explicit resident
v2 host pipelines remain available through their separate API.

An external producer supplies an entry function, ordered acyclic stages, opaque
backend/domain labels and typed input/stage/literal edges. The core reconstructs
the calls and requires exact equality to the entry body or the unchanged entry
call. Each stage must contribute to the result. This is reflexivity or one
unfolding of the entry definition, not arbitrary algebraic equivalence. Apply a
generally proof-checked replacement first, then route that selected module.

The entire module identity is pinned, every edge has the exact declared type,
and unknown functions, forward references, mismatched arguments, unused stages
and incompatible schemas reject. There are at most 32 stages and a 1 MB expanded
composition budget, checked before shared expressions are cloned. u64 literals
use canonical decimal strings to avoid JavaScript precision loss. Checked
witnesses have private fields and cannot be deserialised.

```sh
ink emit-core program.ink -o core.json
ink check-source-route core.json route.json
```

The observation domain is pure total result values. Literal placement may share
or schedule pure computations differently; allocation failure, stack exhaustion,
host traps, wall-clock timing and other host failures are not proved equivalent.
Conditional/short-circuit bodies cannot be flattened speculatively through this
interface: unsupported structures remain an unchanged whole-entry stage.
Transactions, application events, async cancellation and persistent state need
additional observation and protocol contracts.

The core does not know whether a backend exists or a placement is profitable.
Physical ABI, ownership/copying, transfer, synchronisation, C/WGSL generation and
existing native/Wasm/shader toolchains remain trusted. Hashes identify compiled
assets and modules; they do not prove transport or code-generation correctness.
The distribution now connects this witness to the independent GPU backend:

```sh
python3 knowledge/tools/source_routing.py --core core.json --entry entry \
  --placements placements.json --compiler ./ink -o route.json
ink build core.json --core --route route.json --target webgpu --zig /path/to/zig -o bundle
```

Placements are externally supplied `{"bulk":"gpu","finish":"cpu"}`. In this
backend, `gpu/gpu` maps to WebGPU or native wgpu; `c/cpu` maps to Wasm or native
compiled C. The core neither recognises nor ranks these labels. The backend
rejects unsupported placements before emission. The route is embedded into
browser code and native assets from the checked witness; arbitrary runtime JSON
is not accepted as a correctness certificate.

Browser hosts import `loadRoute` from `bundle/ink-route.mjs`, then
`await runtime.run(arguments)` and `await runtime.close()`. Original inputs are
validated/captured synchronously, graphs serialize per runtime, and closing
rejects new calls while completing queued work. Each stage reports requested and
actual execution plus full call, capture, queue, bridge and execution costs.
GPU-unavailable/device/shader/limit failures repeat pure stages on compiled CPU.

Native hosts use `Engine::call_route`, or the generated CLI `--route ARGS.json`
and `--route-script INPUT_ARRAYS.json`. Validated word arrays are owned once and
shared immutably across stages; scalar results return through host values. The
same WGSL/C functions are used by both hosts. In the literal v1 executor, intermediate GPU buffers stay resident within one
function; scalar results materialise between functions. The separate v2 compute
API already retains arrays across explicit host-pipeline steps. Connecting those
resident pipelines to checked source replacement/routing and general async /
physical bridge proofs remains unfinished.

External partitioning also shares identical pure calls: the core reconstructs
the shared graph back into the exact original expression, so no new optimisation
law is trusted. In this total-value scope, evaluating the same pure computation
once rather than twice preserves results. Host failure/allocation traces remain
outside that claim.

`knowledge/tools/route_selection.py` checks the unchanged whole-entry CPU baseline
and each bounded candidate independently, then ranks comparable complete-call
measurements. It has candidate/input/sample and per-check time budgets. No
measurements, missing baseline measurements or exhausted search retain baseline;
invalid optional candidates are rejected. Measurements do not establish input
invariants or discharge proof obligations. This is compile-time candidate
selection, not general runtime adaptation.

Reproduction and execution evidence: `reports/source-routing-phase1`. This
milestone does not complete stateful placement/refinement, durability, general
ownership or removal of the remaining aggregate/bounded/layout authority.

General equivalence proofs can also admit a different pure composition. A route
with `ink-proved-source-routing-v1` supplies `--route-proof evidence.json`, whose
`catalogue` and `proof` use the shared conditional semantic checker. It proves the
entry body equal to the reconstructed graph in the exact checked source context;
branch conditions and dependencies remain proof obligations. The external
`knowledge/tools/source_routing.py --proof evidence.json` producer supports this
contract. The legacy physical mixed-route executor still rejects compute-v2
records, vectors and resident array outputs before emission; admitting an
equivalent graph does not create a physical transport implementation.

The measured `route_selection.py` index accepts existing route filenames and
`{"route":"candidate.json","proof":"evidence.json"}` entries. It checks each
proved candidate through the same compiler boundary before considering costs.
A selected proved route writes its evidence alongside the output as
`OUTPUT.proof.json`; pass that file as `--route-proof` when building. Without
comparable measured costs the unchanged whole-entry CPU baseline remains selected.
