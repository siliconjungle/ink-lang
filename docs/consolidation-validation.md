# Universal knowledge consolidation validation

The universal-knowledge head `ff51bbce` was integrated with main `1ed39c79`.
The combined source retains control semantics V6 and canonical binary32 V7.
Standalone caller-trusted calls and required-GPU failures retain main’s contract.

The failed CI used incomplete offline caches: the independent core and generated
programs need the locked serde_json 1.0.151 package, alongside root dependencies.
Both CI execution jobs now fetch the independent core lockfile before offline tests.
The integration also updates the feature-parity fixture to the canonical content
lock API. The standalone command explicitly chooses its scratch build directory
so an inherited Cargo target override cannot mislocate the executable.

Local validation on macOS arm64, Rust stable, Zig 0.15.2:

- Locked distribution check and every integration test compile.
- Independent core: 75 tests pass offline.
- Numeric definitions: 702 comparisons on each of C, Rust, JavaScript,
  C/Wasm and Rust/Wasm (3510 comparisons).
- Universal control/owned collections: 16 outcomes and exact snapshots match
  on all five CPU targets, including empty inputs and exceptional float bits.
- Semantic optimisation: 17 tests pass, including independent law checking,
  proof rejection, scoped premises and external selection.
- Representation histories/proofs: all nine tests pass (eight in the suite,
  then the CLI scratch-directory regression replay), including rollback,
  migrations, portable snapshots and forged-proof rejection.
- Planner Python suite: 54 tests pass; fold-until producer/application test passes.
- Runtime backend selection and failure/recovery: 12 Node tests pass.
- Native wgpu binary32: 53 outcomes match through 53 actual GPU calls.
- Required contract inventory passes; GPU device graph models pass.
- General laws, generalized induction, source syntax and bitproof suites pass.

The complete hosted conformance jobs additionally exercise Linux/Vulkan,
Chrome/WebGPU, worker receipts and all 19 mandatory CPU suites. Their result must
be checked before distribution merge. These tests are not compiler-correctness
proofs. Full GPU device coverage remains distinct from eligible kernels and CPU
host execution; unrestricted device gaps remain explicit in the inventory.
