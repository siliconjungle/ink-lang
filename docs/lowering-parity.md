# Lowering parity

The complete C, Rust, JavaScript and Wasm paths implement the currently executable
Ink language. The design draft also describes features that the checker does not
yet admit; this is not a claim that those features are implemented.

| Executable feature | C | Rust | JavaScript | Wasm | WebGPU / wgpu |
| --- | --- | --- | --- | --- | --- |
| Wrapping u32/i32, f32, numeric vectors and flat records | Yes | Yes | Yes | Yes | Eligible kernels; exact binary32 arithmetic |
| Full-width u64 | Yes | Yes | Yes | Yes | Exact two-lane arithmetic in eligible kernels |
| Exact Int, strings, IDs, enums, Unit, Option/Result | Yes | Yes | Yes | Yes | CPU host, except eligible optional scalar reads |
| Lists, nested/recursive record values, lexical bindings and acyclic calls | Yes | Yes | Yes | Yes | Flat numeric/Bool arrays and acyclic helpers |
| Map, filter, indexed map, truncating zip, safe indexed reads | Yes | Yes | Yes | Yes | Eligible array compositions |
| Ordered reductions, integer scan/sort, bounded repeat, lazy branches | Yes | Yes | Yes | Yes | Eligible array kernels; resource limits can select CPU |
| Owned buffers/maps, consuming split/append and stopping loops | Yes | Yes | Yes | Yes | Bounded scalar private buffers; dynamic/unsupported cases use CPU |
| Ordered parallel map and buffer map | Native threads | Native threads | Workers | Host workers for both emitters | Eligible output kernels; private-buffer map is sequential per invocation |
| Guarded self recursion and list drop/take | Yes | Yes | Yes | Yes | CPU host |
| Tables, queries, changes, checked arithmetic and Result propagation | Yes | Yes | Yes | Yes | CPU host |
| Keeps, rollback, ordered events and counter exhaustion | Yes | Yes | Yes | Yes | CPU host |
| Portable checkpoint/restore, outbox acknowledgement | Yes | Yes | Yes | Yes | CPU host |

The same Ink syntax and observable values apply to every complete backend.
Scheduling uses bounded native threads for complete C/Rust and module workers for
JavaScript, C-Wasm and Rust-Wasm. A regression check requires distinct worker IDs;
matching values alone cannot demonstrate parallel execution. Grain, small inputs
and nested work can select sequential execution. Packed pure C objects retain
their smaller sequential ABI. Split/append preserve ownership and partition-local
indices; allocation strategies differ. Browser hosts need cross-origin isolation
and asynchronous entry points. See [ordered work and target limits](bend-inspired.md).

GPU-compatible functions can coexist with stateful declarations and unsupported
value types in one module. The runtime extracts each eligible pure dependency
closure; unrelated declarations no longer prevent GPU execution. Transactions
execute once on the host, without speculative profiling or replay.

Existing numerical types also cross state, action, keep and event boundaries.
See [numerical state](numerical-state.md) for signed keys, float data identity,
wire encoding and the exact binary32 contract.

## Build and host interfaces

```sh
ink build program.ink -o build/program
ink build program.ink --target c -o build/c-project
ink build program.ink --target rust -o build/rust-project
ink build program.ink --target javascript -o build/program.mjs
ink build program.ink --target wasm32 --zig /path/to/zig -o build/program.wasm
ink build program.ink --target webgpu --zig /path/to/zig -o build/web
```

Native builds produce an executable accepting a JSON array of requests:
`[{"pure":"name","args":[...]},{"call":"action","args":[...]}]`.
The complete C project contains literal C function/action code and a shared Rust
primitive runtime for values, exact integers, transactions and snapshot codecs.
It is not a freestanding C-only implementation or an AST interpreter. Rust
projects contain literal typed Rust; JavaScript modules contain literal ES code.
`--target object` retains the small packed pure C object interface explicitly.

The runtime emits the same handle/buffer lifecycle ABI for native libraries and
Wasm (`state-abi.h`, `state-wasm.mjs`). The Wasm host exposes `pure`/`pureAsync`, `invoke`/`invokeAsync`, action
invocation, snapshot/restore, events, acknowledgement and disposal. Rust-emitted
projects can also compile to `wasm32-unknown-unknown` with this ABI.

JavaScript exports `functions`, `call`, `metadata` and `createState`. The state
object provides `invoke`, `invokeAsync`, `invoke_json`, `version`, `outbox`,
`acknowledge_through`, and asynchronous `checkpoint`/`restore`. WebCrypto hashes
snapshots in browsers and Node. Snapshots preserve the reference binary format
and are interchangeable between these targets for the exact same checked program.
State schemas rejected by the reference portable codec remain rejected here.
A host supplies persistence, external I/O and event delivery.

## Semantic and resource boundaries

CPU integer arithmetic and evaluation order match Ink. `u64` must not pass through
an unsafe JavaScript Number; use BigInt or exact decimal input. `Int` has the
explicit `{Int:"decimal"}` wire form. Exceptional floats use `{F32Bits:bits}`.
Each f32 arithmetic operation rounds separately and canonicalises arithmetic
NaNs to `0x7fc00000`; transport and negation preserve payload bits. The packed GPU
emitter implements binary32 using integer lanes. F32 programs bind executable-core
V7, with cross-target tests including NaN arithmetic and payload transport.

Graph stages run integer scan, sort and sum and any-type filter and concat as
parallel multi-pass schedules (block scan, stable radix sort, partial sums,
flag-scan-scatter), with exact integer semantics; see
[GPU compute](gpu-compute.md). Collection work nested inside a per-element
lambda stays literal in a direct shader, bounded at 1,024 elements (128 when a
sort runs per element); list-valued repeat is unrolled only up to 16
iterations. Larger workloads retain the complete CPU path. Eligibility is
separate from measured profitability. Shader expansion, device limits, missing
adapters and device failure select CPU in `auto`/`gpu` modes with an explicit reason.
Use `gpu-required` to reject every such fallback. Full GPU language coverage is
still incomplete: exact Int, strings, general maps, recursion and state/action
execution are not GPU implementations. Hardware resources cannot equal CPU limits.

Collection device buffers carry their actual length, so filtering and unequal
zip lengths remain correct through resident pipelines. CPU host resource limits
are explicit implementation policies; they do not reproduce the interpreter's
exact fuel accounting. Explicit checked representation bundles execute literal definitions on all five
CPU paths. The JavaScript representation host maintains admitted fixed-key keeps
using the sealed database definitions, including guarded overwrite and removal.
Ordinary baseline emission still recomputes keeps. The new point-query fixtures
supply no incremental Int aggregate candidate. No unproved recognizer bypasses
that admission boundary. See [checked representations](database-representations.md).

## Validation and trust

`tests/lowering_parity.rs` compares complete native C, native Rust, JavaScript,
C/Wasm and Rust/Wasm with the reference evaluator. It covers 68 mixed-module
requests plus 10 query/Result-keep boundary requests, including snapshots after
every result, rollback, near-u64-max versions, events, full-width values, Unicode
and recursive records. A compiled C host checks the native ABI lifecycle.

```sh
cargo test --test lowering_parity
INK_TEST_ZIG=/path/to/zig cargo test --test lowering_parity -- --nocapture
INK_TEST_WGPU=1 cargo test --test lowering_parity -- --nocapture
```

The checker, source correspondence, literal emission, codecs, host adapters and
toolchains remain trusted. Differential tests and identical snapshots provide
regression evidence; they are not formal proofs of emitted machine code.

## Generated conformance gate

`tests/generated_parity.rs` generates bounded typed scalar expressions, composed
integer array kernels and update/query/abort/delete histories from recorded
seeds. It compares replies and exact checkpoints with the reference after every
request, with restoration continuations. The default four seeds yield 432
requests; `INK_PARITY_SEEDS=1,7,...` supplies replayable decimal u64 seeds.
The source, seeds, script and expected results remain under
`build/generated-parity/`, including after failures. This supplements the fixed
feature inventory; it is not exhaustive enumeration of the language.

The `Executable conformance` GitHub workflow runs C, Rust, JavaScript and both
Wasm lowerings, durable-host failure tests, and a separate actual wgpu dispatch
job on Vulkan's software adapter, including resident feedback. It adds a seed
from the commit identity and retains reproduction artifacts. Hardware/browser
WebGPU and IndexedDB acceptance still have explicit browser fixtures; software
Vulkan conformance provides no hardware performance evidence. Branch protection
must require these checks if they are to block merges automatically.

[Durable host adapters](durable-host.md) now supply filesystem/IndexedDB
persistence and ordered outbox delivery for compiled JavaScript/Wasm state.

Checked optimisation plans preserve the original application checkpoint namespace
through the [selected emission APIs](selected-checkpoints.md). Cross-backend
continuation and durable receipt replay are tested separately from raw-program
emission, which keeps the changed program’s own namespace.

## Required feature audit

`tests/feature-parity.json` records each target, source variant and required test
suite. `tools/check_feature_parity.py` rejects omitted targets, missing tests,
uncovered types and source variants added without a coverage update. This is a
coverage contract, not proof that a status label implements a capability.

```sh
# Full audit defaults to ALL targets and currently exits nonzero on GPU gaps.
python3 tools/check_feature_parity.py --receipt build/enforced-parity/all-audit.json
# Complete CPU conformance; Wasm must be configured and cannot silently skip.
INK_TEST_ZIG=/path/to/zig python3 tools/check_feature_parity.py --scope cpu --run
```

CPU CI uses the second command. GPU CI requires actual dispatch for the eligible
fixtures, including exact u64 and f32 bit patterns. The full audit explicitly
fails today; a passing CPU or eligible-GPU job is not a full GPU parity claim.
`tests/feature_parity.rs` fault-injects omitted/unsupported JavaScript capabilities
and missing coverage, and exercises ordinary standalone physical programs, guarded cache
maintenance, async transaction rollback and required-GPU numerical execution.

The `declared-feature-parity` CI job checks complete CPU feature coverage and the
`eligible-pure-exact-v1` GPU contract: exact eligible u64/binary32 kernels, actual
dispatch and explicit `gpu-required` errors without fallback. Stateful transactions,
arbitrary-size Int, general dynamic maps and recursive physical state execute on
CPU hosts. The unrestricted all-GPU audit remains available with the default
`tools/check_feature_parity.py` command and fails on its disclosed coverage gaps.
Run `--scope contract --run` with Zig and Chrome to enforce the supported contract
through compiled CPU, native GPU and browser GPU execution.

## Standalone physical representations

Proof-selected physical representations now use standalone compiled code on
all targets, including C/Rust Wasm and native/browser GPU host lanes. Proofs,
source ASTs and checker packages remain at compile time. All targets use the
same checked snapshot namespace and transaction contract. GPU device eligibility
is unchanged; recursive state executes on the host. The narrower fixed source
representation model is described in [database representations](database-representations.md).

`tests/representation_parity.rs` supplies the shared replies/errors/events/exact
snapshot gate. It runs both Wasm lanes when INK_TEST_ZIG is set, including in CI.
No backend emitter is mechanically verified by that differential gate.

Resident stage-graph feedback now captures source buffers before simultaneous
input updates and observes final outputs before another update. Identity output
aliases, one/two/three-iteration swaps and shrinking/empty filter/scan/sort loops
are covered by actual wgpu tests. The browser device command builder uses the
same ordering and has an independent buffer/command-model test. Literal per-element
collection work retains its device admission bound (1,024, or 128 with a sort); shapes that cannot
retain their declared capacity use the complete host path.


## Generated arguments and checked state transport

Raw generated pure functions and standalone representation calls require arguments
with their declared arity, types, tags, shapes and ranges. Their native pointer
interfaces additionally require the documented ownership/capacity contract.
Applications validate external data before using those caller-trusted interfaces.

JSON syntax parsing, explicit checkpoint integrity/size checks, hardware resource
limits, device eligibility and transaction/version rules remain. GPU eligibility checks the kernel and resource domain; exact binary32
kernels also preserve exceptional values and raw bits. It is not an input type
validation contract. Generated state queries avoid transaction table backups. Standalone
representation calls also avoid whole-state transport and checkpoint validation,
and statically simplified read-only queries compute the reply directly.
See `reports/leaner-generated-code-2026-10-11` for executable and Lean evidence.
