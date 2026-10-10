# Ink

Ink is a programming language with a small semantic core and proof-backed, data-driven optimisation. Pure functions support word and signed arithmetic, binary32, records/vectors, collections, bounded loops and typed higher-order collection operations. Stateful programs add tables, transactions, events, invariants and portable snapshots.

Read the [practical guide](https://siliconjungle.github.io/ink-spec-site/) or the [language reference](https://siliconjungle.github.io/ink-spec-site/reference.html).

The core checks what programs mean and whether proposed changes preserve that meaning. The knowledge store supplies immutable definitions, laws and proofs; the planner searches and selects candidates; the runtime orchestrates physical execution; target packages emit code and operate devices.

## Repositories

| Repository | Responsibility |
| --- | --- |
| [`ink-lang`](https://github.com/siliconjungle/ink-lang), `core/` | Fixed language semantics, typed executable representation and general proof checking; independently buildable source tree |
| [`ink-lang`](https://github.com/siliconjungle/ink-lang), distribution | CLI, pinned dependency assembly and integration tests |
| [`ink-knowledge`](https://github.com/siliconjungle/ink-knowledge) | Canonical immutable entries, authenticated snapshots, typed discovery API, rebuildable SQLite index and separate performance observations |
| [`ink-planner`](https://github.com/siliconjungle/ink-planner) | Bounded rewrite search, applicability proof production, cost selection and checked graph proposals |
| [`ink-runtime`](https://github.com/siliconjungle/ink-runtime) | Backend-neutral graph execution, host ABIs, scheduling, profiling, toolchain invocation and pure fallback |
| [`ink-lowering-c`](https://github.com/siliconjungle/ink-lowering-c) | Literal portable C and packed value ABI emission |
| [`ink-lowering-rust`](https://github.com/siliconjungle/ink-lowering-rust) | Stateful/inductive Rust emission and native storage primitives |
| [`ink-lowering-wasm`](https://github.com/siliconjungle/ink-lowering-wasm) | Checked C-to-Wasm target configuration and exports |
| [`ink-lowering-gpu`](https://github.com/siliconjungle/ink-lowering-gpu) | WGSL artifacts, shader primitives and WebGPU/wgpu device adapters |

## Build and use

```sh
git clone --recurse-submodules https://github.com/siliconjungle/ink-lang.git
cd ink-lang
cargo build --release
cargo test
cargo test --manifest-path core/Cargo.toml

# Baseline interpreter and native C/LLVM compilation.
target/release/ink run examples/hello.ink total arguments.json
target/release/ink build examples/hello.ink -o build/hello.o

# Search the pinned database, then independently check every proposed change.
target/release/ink build program.ink \
  --optimise knowledge/store/snapshot.json -o build/program.o

# Portable browser/native GPU bundle, with compiled CPU fallback.
target/release/ink build examples/particles.ink --target webgpu \
  --zig /path/to/zig -o build/particles
cargo build --release --manifest-path build/particles/native/Cargo.toml
```

Core-only builds need no planner, database, runtime or lowering checkout. SQLite uses Python's standard library; installed planner deployments depend on the `ink-knowledge` Python package. The pinned source distribution supplies its explicitly assembled checkout.

`--selection selection.json` replays a plan without searching or reading the current database. It contains the exact input identity, an authenticated knowledge view and application proofs. Builds record original and selected identities, proof dependencies, applications and target artifacts. The canonical entry/snapshot/evidence formats replace catalogue selection; there are no compatibility aliases.

## Proofs, capabilities and costs

Rules can compose inside complex expressions and under binders. A database theorem for repeated addition can combine with simplification and collection laws; the core contains general equality/induction checking rather than an optimisation-specific pattern. Explicit conditions require proof at the actual application site. Floating reassociation, state mutation and physical transport cannot borrow a pure word-equality proof.

GPU capability checks and measured profitability are separate decisions. Supported pipelines can keep arrays resident across steps and iterations. Runtime profiling includes allocation, transfer, dispatch and readback; unsupported operations, absent devices, limits or device loss fall back to compiled CPU execution. CPU/GPU floating bit equality is not promised. State/effectful computations are not speculatively replayed.

The checker, source correspondence, literal target emission, host bridges and toolchains remain trusted implementations. Hashes authenticate content and snapshots; they do not prove correctness. Research certificates and experiment-specific proof terms are retained under `knowledge/research/` for reproducibility, outside production discovery.

See [repository architecture and data contract](docs/repository-architecture.md), [composable optimisation](docs/semantic-optimisation.md), [GPU compute](docs/gpu-compute.md), [state and snapshots](docs/wasm-abi.md), and [remaining language work](PLAN.md). Archived reports preserve their original inputs and evidence.

Benchmark methodology and independent proof-audit work are preserved in
[benchmark methodology](docs/benchmark-methodology.md),
[native ownership lowering](docs/native-state-backend.md),
[transaction-plan research](docs/transaction-plans.md), and
[independent certificate replay](reports/rup-crosscheck-phase1/REPORT.md).
