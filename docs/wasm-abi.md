# WebAssembly ABIs

The current `wasm32` target compiles the same pure collection programs as the native target. Stateful programs use the separate typed Rust path described below.

```sh
lang build examples/kernels.lang --target wasm32 --zig /path/to/zig -o build/kernels.wasm
```

The compiler emits portable C and invokes Zig's Clang/LLD toolchain for a freestanding wasm32 module with SIMD enabled. It requires no WASI or JavaScript imports. JavaScript hosts instantiate it using the standard WebAssembly API.

Each exported source function is named `lang_fn_NAME`. Scalar `u64` parameters and results use Wasm `i64`, exposed as JavaScript BigInt. Interpret the result with `BigInt.asUintN(64, result)` for unsigned semantics. Boolean values use Wasm `i32` with 0/1 values.

The latest [filtered pure validation](../reports/filter-proof-wasm-phase1/REPORT.md) passes 4,476 shared checks over three import-free modules in each of Node/V8 and an actual Chromium browser. It covers checked filter implementations, scalar calls, lazy branches, conditional right folds, nested temporary collections, borrowed-input preservation and memory growth. Run `python3 bench/filter-wasm.py`, then `python3 bench/filtered/serve.py` and open the printed URL for browser reproduction. The archived results are correctness observations, not a Wasm execution-speed ranking.

A `List<u64>` parameter becomes two `i32` parameters: a byte offset into exported linear memory and an element count. Elements are little-endian 64-bit unsigned integers, eight-byte aligned. The host must supply a valid, non-overflowing range inside memory. A list is read-only for the duration of the call. The module does not retain the pointer.

The host can use exported `__heap_base` as the start of host-owned input buffers and grow exported `memory` as needed. Recreate JavaScript typed-array views after memory growth. Do not place inputs inside the stack or static-data region below `__heap_base`. Literal collection stages now use an internal frame-based bump allocator that grows memory and protects the ranges of every borrowed input. It reclaims released trailing blocks and resets temporary storage at function return; input pointers are never retained. Freed holes can remain until the frame exits. Allocation/overflow failures trap. There is no host allocation API or concurrent access protocol in this pure ABI.

The pure-module tests run in Node/V8. The stateful path below has also been exercised in an actual browser. Neither path currently imports host capabilities.

`python3 bench/wasm.py` builds both the baseline and imported-knowledge variants, validates their binary format and checks them against independent BigInt arithmetic, including overflow and empty arrays. This correctness test is not a browser performance benchmark. `python3 bench/collection-wasm.py` additionally checks database-selected folds, right-fold ordering, shadowing, temporary list arguments, multiple borrowed inputs and memory growth; its 4,416 Node/V8 checks are archived under `reports/collection-proof-wasm-phase1`.


## Stateful modules: ABI version 1

`emit-state --wasm-abi` appends a small host interface to the same generated typed Rust state machine used by native applications. There is no AST interpreter inside the Wasm module. Compile the generated library for `wasm32-unknown-unknown`:

```sh
rustup target add wasm32-unknown-unknown
python3 dev.py build --bin lang
target/debug/lang emit-state examples/inventory.lang --wasm-abi -o build/inventory-wasm
python3 dev.py build --release --lib --target wasm32-unknown-unknown --manifest-path build/inventory-wasm/Cargo.toml
```

The result is `build/inventory-wasm/target/wasm32-unknown-unknown/release/compiled_state.wasm`. `--maintenance PACKAGE.json` and `--bounded-totals` select the same existing certificate and range-checked cache choices as native execution. These choices still use the transitional domain-specific checkers; this ABI does not move optimisation laws into the general proof database.

The module exports memory and the following functions, with no WASI or JavaScript imports. It is single-threaded. State and buffer handles occupy one monotonic, nonzero u32 identity space and are never reused. Passing the wrong kind of handle is rejected. This is a trusted-host interface: a host can directly overwrite linear memory, so it must access only its allocated buffers.

| Export | Arguments | Result |
| --- | --- | --- |
| `lang_abi_version` | none | u32, currently 1 |
| `lang_buffer_alloc` | byte length u32 | buffer handle, or 0 |
| `lang_buffer_ptr` | buffer handle | memory byte offset, or 0 |
| `lang_buffer_len` | buffer handle | byte length, or 0 |
| `lang_buffer_free` | buffer handle | 1 on success, 0 on failure |
| `lang_error` | none | buffer handle containing the last error as UTF-8, or 0 |
| `lang_init` | none | new state handle, or 0 |
| `lang_state_drop` | state handle | 1 on success, 0 on failure |
| `lang_restore` | buffer handle containing a portable snapshot | new state handle, or 0 |
| `lang_checkpoint` | state handle | buffer handle containing a portable snapshot, or 0 |
| `lang_invoke` | state handle, request buffer handle | response buffer handle, or 0 |
| `lang_events` | state handle | response buffer handle, or 0; reading does not remove events |
| `lang_acknowledge` | state handle, commit u64, event position u64 | 1 on success, 0 on failure |
| `lang_version` | state handle | u64; invalid handles return 0 and set the last error |

Buffer offsets and handles have different meanings. Inputs remain owned by the host until freed; outputs are new buffers that the host must free. A zero-length buffer is valid. Every export can allocate and grow memory, invalidating existing JavaScript views; recreate views after calls and copy outputs before freeing them. Read `lang_error` only after a failed export because successful calls do not clear the stored error.

`lang_invoke` accepts UTF-8 JSON `{"call":"restock","args":[KEY,AMOUNT]}`. JSON integers must remain exact. Fixed integer keys/arguments use numeric tokens; nominal IDs use their existing hexadecimal strings. Exact `Int` outcomes keep the native wire encoding `{"Int":"DECIMAL"}`. The success response is `{"ok":OUTCOME}`; an ABI/argument/execution error is `{"error":{"message":"TEXT","committed":false}}`. A source-level `Err` is an ordinary outcome with `committed:false`, not a host exception. Successful changes return their new version and ordered events. Queries return the current version without committing.

`lowerings/wasm/runtime/state-wasm.mjs` is a browser/Node adapter using standard WebAssembly APIs. Its exact JSON codec encodes BigInt as numeric tokens and decodes integer tokens to BigInt. It rejects unsafe Number inputs; pass integers as BigInt. It preserves strings, including Unicode and escaped characters. For example:

```js
import {StatefulModule} from './lowerings/wasm/runtime/state-wasm.mjs';
const module = await StatefulModule.instantiate(await (await fetch('/inventory.wasm')).arrayBuffer());
let state = module.create();
state.invoke('create', ['00000000000000000000000000000001', 'Part', 12n]);
state.invoke('restock', ['00000000000000000000000000000001', 8n]);
const checkpoint = state.snapshot();
state.dispose();
state = module.restore(checkpoint);
console.log(state.invoke('total', [])); // result: {Int: "20"}
state.acknowledge(state.version(), 0xffffffffffffffffn);
state.dispose();
```

### Bounds and failure semantics

An invocation request is limited to 4 MiB. Each buffer is limited to 64 MiB, live buffer bytes to 128 MiB, buffers to 256 and states to 128. Portable snapshots keep their existing 64 MiB / one-million-value / depth-128 limits and add a fixed 4,096-byte magnitude cap per exact integer. Layout generation has a shared 100,000-node expansion budget. These are interface accounting limits, not a bound on all state allocations or process memory. Native/Wasm execution still has no fuel limit. The host adapter rejects deeply nested JSON and integer values supplied as inexact Numbers.

The ABI reserves an output slot and enough byte accounting capacity before invoking a change. Failure to reserve returns 0 before execution. With no host imports or re-entrancy, the reservation survives until the response is installed. If a response exceeds 64 MiB, it is replaced by a small error carrying the actual `committed` flag; a successful change can therefore report a response-size error after commit. Allocation failure or a Wasm trap can interrupt execution. The adapter then refuses further calls to that instance; recovery requires a fresh instance and a saved checkpoint. It does not claim a trap preserves the interrupted in-memory state or provides durable exactly-once recovery.

Portable snapshots have identical bytes across the reference interpreter, native executables and Wasm implementations of the same program. Physical caches are rebuilt on restore. The format preserves commit version and pending outbox entries. It is a checkpoint protocol, not a storage adapter, write-ahead log or schema migration mechanism.

### Reproduction and evidence

`python3 bench/state-wasm.py` builds five implementations: inventory scanning/maintenance and u64-key scanning/maintenance/bounded u128 maintenance. It produces independent reference fixtures, runs native continuation, restores those checkpoints in a different Wasm implementation of the same program, compares every subsequent outcome and full snapshot bytes, acknowledges pending events, and returns a Wasm checkpoint to another native implementation for more future calls. The generated fixtures require nontrivial pending outboxes and acknowledgement that retains the newest event; operation and key selection use distinct bits of the deterministic generator.

`reports/state-wasm-phase1` archives generated sources, Cargo locks, binaries, fixtures, commands, hashes, toolchains and observations. Node/V8 checks 23,794 call outcomes across the five Wasm modules; the native transfer steps check 2,526 outcomes. The shared verifier also exercises malformed requests, wrong-program and corrupt snapshots, disposed/stale handles, count/byte limits, memory growth, exact u64 keys, commit counters above 2^53 and 2^63, u64 commit exhaustion with rollback, and refusal to reuse a trapped instance. The 34 JSON-codec checks are additional.

Serve this repository on localhost and open `bench/state-wasm.html` to run the same Wasm checks in a browser. `browser-validation.json` and `browser.png` record an actual Chromium 155 run with all five implementations passing. A browser result is observed through the browser UI, not inferred from Node. These are functional checks; this phase makes no Wasm performance ranking or formal machine-code correctness claim. The synchronous JSON interface is a bootstrap interface and its encoding cost matters for future benchmarks.
