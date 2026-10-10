# Lowering parity

The complete C, Rust, JavaScript and Wasm paths implement the currently executable
Ink language. The design draft also describes features that the checker does not
yet admit; this is not a claim that those features are implemented.

| Executable feature | C | Rust | JavaScript | Wasm | WebGPU / wgpu |
| --- | --- | --- | --- | --- | --- |
| Wrapping u32/i32, f32, numeric vectors and flat records | Yes | Yes | Yes | Yes | Eligible 32-bit computations |
| Full-width u64, exact Int, strings, IDs, enums, Unit, Option/Result | Yes | Yes | Yes | Yes | CPU host |
| Lists, nested/recursive record values, lexical bindings and acyclic calls | Yes | Yes | Yes | Yes | Flat numeric/Bool arrays and acyclic helpers |
| Map, filter, indexed map, truncating zip, safe indexed reads | Yes | Yes | Yes | Yes | Eligible array compositions |
| Ordered reductions, integer scan/sort, bounded repeat, lazy branches | Yes | Yes | Yes | Yes | Eligible array kernels; resource limits can select CPU |
| Tables, queries, changes, checked arithmetic and Result propagation | Yes | Yes | Yes | Yes | CPU host |
| Keeps, rollback, ordered events and counter exhaustion | Yes | Yes | Yes | Yes | CPU host |
| Portable checkpoint/restore, outbox acknowledgement | Yes | Yes | Yes | Yes | CPU host |

GPU-compatible functions can coexist with stateful declarations and unsupported
value types in one module. The runtime extracts each eligible pure dependency
closure; unrelated declarations no longer prevent GPU execution. Transactions
execute once on the host, without speculative profiling or replay.

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
Wasm (`state-abi.h`, `state-wasm.mjs`). The Wasm host exposes pure calls, action
invocation, snapshot/restore, events, acknowledgement and disposal. Rust-emitted
projects can also compile to `wasm32-unknown-unknown` with this ABI.

JavaScript exports `functions`, `call`, `metadata` and `createState`. The state
object provides `invoke`, `invoke_json`, `version`, `outbox`,
`acknowledge_through`, and asynchronous `checkpoint`/`restore`. WebCrypto hashes
snapshots in browsers and Node. Snapshots preserve the reference binary format
and are interchangeable between these targets for the exact same checked program.
State schemas rejected by the reference portable codec remain rejected here.
A host supplies persistence, external I/O and event delivery.

## Semantic and resource boundaries

CPU integer arithmetic and evaluation order match Ink. `u64` must not pass through
an unsafe JavaScript Number; use BigInt or exact decimal input. `Int` has the
explicit `{Int:"decimal"}` wire form. Exceptional floats use `{F32Bits:bits}`.
JS rounds each f32 operation separately and preserves negation payloads; arithmetic
NaN payloads can differ between engines. GPU floats follow the portable WGSL
contract and are not promised to match CPU bits.

The GPU collection implementation is literal: filter, inclusive scan and stable
rank sorting preserve integer semantics, but scans and rank sorts repeat work.
They are not parallel prefix or efficient sorting algorithms. Heavy compositions
have a 128-element GPU admission limit; list-valued repeat is unrolled only up to
16 iterations. Larger workloads retain the complete CPU path. Eligibility is
separate from measured profitability. Shader expansion, device limits, missing
adapters and device failure also select CPU with an explicit reason.

Collection device buffers carry their actual length, so filtering and unequal
zip lengths remain correct through resident pipelines. CPU host resource limits
are explicit implementation policies; they do not reproduce the interpreter's
exact fuel accounting. JavaScript keeps are recomputed rather than maintained
incrementally. That affects cost, not their observed value.

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
