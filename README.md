# Ink

Ink is a programming language with a small semantic core and proof-backed, data-driven optimisation. Pure functions support word and signed arithmetic, binary32, records/vectors, collections, [checked self recursion and ordered parallel work](docs/bend-inspired.md), bounded loops, [owned local buffers/maps](docs/local-collections.md) and typed higher-order collection operations. Stateful programs add tables, transactions, events, maintained results and portable snapshots.

Read the [practical guide](https://siliconjungle.github.io/ink-spec-site/) or the [language reference](https://siliconjungle.github.io/ink-spec-site/reference.html).

The core checks what programs mean and whether proposed changes preserve that meaning. The knowledge store supplies immutable definitions, laws and proofs; the planner searches and selects candidates; the runtime orchestrates physical execution; target packages emit code and operate devices.

Physical layouts, cached query implementations and transaction-boundary migrations
can now be [canonical database entries](docs/database-representations.md), checked
against every action of unchanged source and compiled literally to Rust. Source
syntax is unchanged. The current proof path covers the u64 transition subset;
other domains retain baseline execution. Old aggregate/bounded-cache/storage-policy
approval is retired from default builds; historical reproduction requires the
explicit `legacy-optimisation-research` feature.

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
| [`ink-lowering-js`](https://github.com/siliconjungle/ink-lowering-js) | JavaScript ES modules with explicit Ink numeric semantics |
| [`ink-lowering-gpu`](https://github.com/siliconjungle/ink-lowering-gpu) | WGSL artifacts, shader primitives and WebGPU/wgpu device adapters |

## Build and use

```sh
git clone --recurse-submodules https://github.com/siliconjungle/ink-lang.git
cd ink-lang
cargo build --release
(cd knowledge && python3 -m ink_knowledge --root . rebuild)
cargo test
cargo test --manifest-path core/Cargo.toml

# Baseline interpreter and native C/LLVM compilation.
target/release/ink run examples/hello.ink total arguments.json
target/release/ink build examples/hello.ink -o build/hello

# Search the pinned database, then independently check every proposed change.
target/release/ink build program.ink \
  --optimise knowledge/store/snapshot.json -o build/program

# Portable browser/native GPU bundle, with compiled CPU fallback.
target/release/ink build examples/particles.ink --target webgpu \
  --zig /path/to/zig -o build/particles
cargo build --release --manifest-path build/particles/native/Cargo.toml
```

Core-only builds need no planner, database, runtime or lowering checkout. SQLite uses Python's standard library; installed planner deployments depend on the `ink-knowledge` Python package. The pinned source distribution supplies its explicitly assembled checkout.

`--selection selection.json` replays a plan without searching or reading the current database. It contains the exact input identity, an authenticated knowledge view and application proofs. Builds record original and selected identities, proof dependencies, applications and target artifacts. The canonical entry/snapshot/evidence formats replace catalogue selection; there are no compatibility aliases.

Explicit [module imports and standard helpers](docs/modules.md) work across targets. [Durable host adapters](docs/durable-host.md) supply filesystem/IndexedDB recovery and ordered outbox delivery for native C/Rust and compiled JavaScript/Wasm.

For a relocatable installation with optional pinned tools, run
`python3 tools/install.py --prefix DIRECTORY`. `ink doctor` diagnoses missing
tools; `ink explain SOURCE [--selection PACKAGE.json]` inspects a checked program
and its optimisation plan. See [installation and inspection](docs/installation.md).

Complete CPU targets share the [lowering parity contract](docs/lowering-parity.md), including transactions and portable snapshots. GPU execution uses eligible pure closures with host execution for stateful operations.

## Proofs, capabilities and costs

Rules can compose inside complex expressions and under binders. A database theorem for repeated addition can combine with simplification and collection laws; the core contains general equality/induction checking rather than an optimisation-specific pattern. Explicit conditions require proof at the actual application site. Floating reassociation, state mutation and physical transport cannot borrow a pure word-equality proof.

GPU capability checks and measured profitability are separate decisions. Supported pipelines can keep arrays resident across steps and iterations. Runtime profiling includes allocation, transfer, dispatch and readback; unsupported operations, absent devices, limits or device loss fall back to compiled CPU execution. CPU/GPU floating bit equality is not promised. State/effectful computations are not speculatively replayed.

An optional [independent Lean verdict](docs/bend-inspired.md#independent-boolean-verdict) now checks a limited Boolean equality calculus. It does not verify the complete compiler. The checker, source correspondence, literal target emission, host bridges and toolchains remain trusted implementations. Hashes authenticate content and snapshots; they do not prove correctness. Research certificates and experiment-specific proof terms are retained under `knowledge/research/` for reproducibility, outside production discovery.

See [repository architecture and data contract](docs/repository-architecture.md), [composable optimisation](docs/semantic-optimisation.md), [GPU compute](docs/gpu-compute.md), [state and snapshots](docs/wasm-abi.md), and [remaining language work](PLAN.md). Archived reports preserve their original inputs and evidence.

Benchmark methodology and independent proof-audit work are preserved in
[benchmark methodology](docs/benchmark-methodology.md),
[native ownership lowering](docs/native-state-backend.md),
[transaction-plan research](docs/transaction-plans.md), and
[independent certificate replay](reports/rup-crosscheck-phase1/REPORT.md).

The [runtime value correspondence bridge](docs/source-value-correspondence.md)
connects actual typed rows and ordered source keys to checked row/column models.
It is bounded validation infrastructure; transaction/native refinement and an
efficient logical integer representation remain open.

[General action values](docs/action-values.md) now bind complete source data and
the actual action signatures without an aggregate certificate. A flat canonical
carrier preserves recursive nominal values and full-width words/IDs, with binary
exact-integer magnitudes. This is data correspondence; logical arithmetic and
whole-action execution proofs remain open.

Programs can also [compile to JavaScript](docs/javascript-backend.md):

```sh
ink build examples/particles.ink --target javascript -o build/particles.mjs
```

[Typed ordered actions](docs/typed-actions.md) retain the checked types and
execution order of stateful code. `ink emit-actions` exports the source-bound
artifact and `ink check-actions` replays it against the complete source module.
Reference and Rust execution use its retained judgments. Whole-action logical
refinement and stateful replacement admission remain open.

[Source-bound action effects](docs/action-effects.md) distinguish reads, writes,
emits, local Result errors and abrupt exits. Database composition laws bind to
the fixed effect algebra; whole-action/refinement proofs remain required.

The preceding checked web proof batch and its preserved timings are in [batch32](reports/web-stack-proofs-32-2026-10-11/REPORT.md). [Direct main integration](reports/web-stack-proofs-32-2026-10-11/main-integration/REPORT.md) records the merged source revisions, generated-target correctness replay and publication checks.

[Batch33](reports/web-stack-proofs-33-2026-10-11/REPORT.md) adds checked unused-scan projection laws for independent lists. All four tested source contexts select the DB rewrite with the production compiler unchanged. Measured gains over prior Ink include 1.57× browser JS, 1.93× resident Wasm, 2.77× resident native and 3.15× complete GPU calls. Handwritten controls usually remain faster; these results do not establish general native superiority.

[Batch34](reports/web-stack-proofs-34-2026-10-11/REPORT.md) adds six derived unused-map projection endpoints and four source-bound certificates. Against the exact prior catalogue, measured geometric-mean gains are 4.15× Node JS, 1.73× browser JS, 2.60× resident Wasm and 3.86× resident native; complete WebGPU calls are essentially unchanged. This is one general projection family; strong handwritten controls usually remain faster.

[Batch38](reports/web-stack-proofs-38-2026-10-11/REPORT.md) adds six integer same-origin padded indexed-zip fusion endpoints, six Nat-beta supports and four helper-bound certificates. Both mapped values remain observed; an appended suffix and three traversal stages disappear. Across four U32 contexts, prior/checked geometric means are 1.19× Node JS, 1.26× browser JS, 1.05× browser resident Wasm, 1.67× resident native C and 3.35× complete WebGPU requests. Actual GPU dispatches drop four to one, with 20 additional upload bytes and unchanged readback. All 20 classified prior regressions are composed-helper CPU cases and remain archived. Checked Node JS beats its fused control in 15 cells, but native Rust and browser CPU controls generally remain faster; GPU requests lose to both CPU controls in every cell. All 7,560 samples consume full outputs.

[Batch37](reports/web-stack-proofs-37-2026-10-11/REPORT.md) adds six integer independent-list indexed-map projection laws, twelve induction supports and four helper-bound source certificates. They remove an unobserved indexed traversal while preserving zip extent and order. Across four U32 contexts, prior/checked geometric means are 1.45× Node JS, 1.39× browser JS, 1.19× browser resident Wasm and 3.32× resident native C. Full Wasm/GPU requests are near unchanged; five prior cells regress. Native C is close to the fused Rust control, while captured Rust-Wasm remains faster overall. All 7,560 samples consume complete outputs and retain adverse cells.

[Batch36](reports/web-stack-proofs-36-2026-10-11/REPORT.md) adds four helper-bound ordered-fold source certificates, deploying existing generic laws without duplicating mathematics or changing the compiler. Across four scalar U32 reductions, prior/checked geometric means are 1.18× Node JS, 1.30× browser JS, 1.26× browser resident Wasm and 1.62× resident native. GPU stages decrease, but complete GPU requests average only 1.03× and six cells regress. Already-fused handwritten JS is roughly level; Rust controls remain faster overall, and GPU requests lose to both CPU controls in every cell. All 7,560 samples and adverse results are retained.

[Batch35](reports/web-stack-proofs-35-2026-10-11/REPORT.md) adds nine derived observed-map/zip fusion endpoints and four source-bound certificates. Four ordinary selections eliminate intermediate maps while retaining both inputs. Measured prior/checked geometric means are 1.19× Node JS, 1.08× browser JS, 1.37× resident Wasm and 1.74× resident native. Results are mixed: 25 prior comparisons regress, including the right-mapped browser JS family; GPU physical work is unchanged. Strong fused controls and all adverse cells are retained.
