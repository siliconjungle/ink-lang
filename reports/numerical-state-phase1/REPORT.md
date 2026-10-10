# Numerical state/action boundary validation

Functional distribution commit: `b94ef06553228019aff5ed7cc1b4a12af2322553`.
Core API: `17bef6c455fd60feb295f8216136145e68948598`.
Exact package revisions and reproduction hashes are in `receipt.json`.

Existing i32/f32 and fixed numerical vectors cross actions, table values, keeps,
events, nested values and portable checkpoints. The source Type, proof kernel
and logical action model were not changed. Numerical domains use explicit typed
actions V2; old-domain V1 bytes are checked against a golden artifact emitted by
exact pre-extension core 225f98c. Carrier declarations and the knowledge snapshot
remain unchanged; only the independent value producer gained numerical encoding.

## Results

- Final enabled numerical fixture: 101 replies and exact snapshots on native C,
  native Rust, JavaScript, C/Wasm and Rust/Wasm. Restore follows each action.
  Mixed wgpu execution matches all 101 replies and dispatches one signed integer
  kernel; numerical transactions execute on the host.
- Four general action-value tests pass, including independent numerical encoding
  of actual action arguments, results and events. Core adversarial images reject
  wrong widths/kinds and vector dimensions. Malformed ingress leaves state and
  outbox unchanged.
- Isolated core: 41 tests pass, without distribution/knowledge/backend dependencies.
- Broad admission regressions: 100 tests pass across source/effects/proofs/state/
  snapshots/ownership/modules/compute. Counts overlap the focused checks.
- Wider enabled conformance/durability gate: 29 tests pass, covering 627 requests
  and exact snapshots across CPU paths, plus 103 actual GPU calls. That run used
  the earlier 89-request numerical fixture; the final 101-request run above
  supersedes its numerical portion. Other fixtures are unchanged.
- All six independently pinned package `test --all-targets` builds pass.
  C/Rust/GPU/Wasm packages have compile harnesses with no behavior tests; JS has
  two differential tests and runtime has four execution/durability tests.
  Runtime Node policies/failure tests: 12 pass. Knowledge storage: six pass.
- Final distribution `check --all-targets --locked --offline` is warning-free.

## Reproduction

```sh
cargo test --manifest-path core/Cargo.toml --offline
INK_TEST_ZIG=/path/to/zig INK_TEST_WGPU=1 cargo test \
  --test numerical_state --test action_values --offline -- --nocapture
INK_TEST_ZIG=/path/to/zig INK_TEST_WGPU=1 cargo test \
  --test generated_parity --test lowering_parity --test durability \
  --test selected_checkpoint --test action_optimisation --test action_transitions \
  --test distribution --offline -- --nocapture
cargo check --all-targets --locked --offline
```

Pinned toolchains must be installed/fetched first. The broader generated gate
uses its default seeds 1, 7, 23, 3735928559. This report retains the final numerical
source, script, expected outcomes and GPU request script, plus successful logs.
CI adds numerical execution to both existing conformance jobs and retains its
reproduction files. Numerical docs describe exact semantics and remaining limits.

## Limits and resolved failures

Arithmetic NaN payloads can differ between CPU engines; storage, pass-through,
negation and checkpoints preserve raw bits. WGSL float rounding/fusion/subnormal
behavior retains its separate contract. The GPU case is an integer conformance
check, not a hardware performance result. Numerical logical projection rejects
this domain; no optimisation or machine-code proof authority was added.

The expanded full numerical conformance module exceeds the existing logical
entry resource cap when binding its complete source image. Independent value
correspondence uses a compact numerical module with the same stored data types
and actual transaction observations. No proof budget was raised. The golden V1
fixture was emitted by an isolated dependency on exact225f core; older archived
research artifacts were already incompatible with that core and were preserved.

Initial standalone builds exhausted local disk; removing only disposable build
caches fixed them. A stale disposable SQLite index was rebuilt for its pinned
snapshot. Successful final runs are retained here; neither issue changed source,
proof limits or archived evidence. Conformance validates observed execution and
encoding. It does not establish universal primitive/native correspondence or
physical representation preservation.
