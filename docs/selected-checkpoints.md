# Checkpoints across checked optimisation plans

A checked semantic selection can change helper bodies and total pure expressions
inside supported action regions without changing the application's logical
state schema. A baseline checkpoint must remain usable after selecting such an
equivalent build. Checkpoints from that build must remain usable by the baseline.
This is interoperability between checked plans for one unchanged source program;
it is not schema evolution or arbitrary cross-program restore.

The core's `snapshot::selected_layout(&CheckedSelection)` checks the selected
schema, roots and events against the original checked input, then retains the
original snapshot program identity. Lowerings consume this private checker
witness through selected APIs:

- C: `complete::lower_selected`.
- Rust: `state_native::emit_selected` and `emit_selected_with_storage`.
- JavaScript: `lower_selected`.
- Wasm: `lower_complete_selected` delegates to complete C emission.
- Runtime: `emit_c_program_selected`, `emit_selected` and
  `module::emit_selected` retain the witness during assembly. Rust assembly takes
  code produced by the Rust selected emitter.

These emission APIs accept no caller-supplied snapshot identity or layout override.
Bare `Program`/`CheckedModule` emission keeps that program's own namespace.
Manifest core identities still name the actual selected program; snapshot
identity names its authenticated original. Neither identity grants proof
validity by itself.

`ink build`, `emit-c-project`, `emit-rust` and `emit-state` dispatch through the
selected APIs when `--selection` or optimisation search supplies a checked
selection. A separate legacy implementation/replacement that subsequently
changes the program cannot reuse this witness. Submit a composed checked plan
rather than attaching the original identity to independently modified code.
`emit-state` projects now use the shared complete native runner and export the
native durable host, including restore steps and `--durable FILE`.

For mixed GPU modules, transactions stay on the CPU host. Eligible pure kernels
continue to run through WebGPU/wgpu, while the compiled CPU state and JavaScript
state instances use the original checked checkpoint namespace. A GPU dispatch
or performance observation does not grant checkpoint authority.

`tests/selected_checkpoint.rs` compares replies and exact checkpoints across
native C/Rust, JavaScript and both Wasm paths, restoring a baseline checkpoint
after every step. With `INK_TEST_WGPU=1`, the mixed runner also restores those
checkpoints and must execute an eligible map on the GPU. It builds the CLI
projects and reopens a native durable file across baseline C, selected C and
selected Rust, replaying retained receipts without applying the writes twice.
Bare emission of the changed selected program rejects that original file.
These finite conformance checks do not establish machine-code, storage or
universal stateful replacement proofs.
