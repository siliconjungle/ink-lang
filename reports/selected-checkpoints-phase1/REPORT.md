# Checked selection checkpoint interoperability

Selected C, Rust, JavaScript and complete Wasm emission now consume the core's
sealed `CheckedSelection` and `snapshot::selected_layout`. They emit selected
code while retaining the authenticated original application's snapshot identity.
Private layout-aware helpers prevent callers from supplying arbitrary identity
or layout overrides. Bare checked-module/Program emission keeps its own namespace.
Mixed GPU modules retain the witness in their compiled CPU and JavaScript state
hosts; GPU kernels do not receive transaction or checkpoint authority.

Core dependency is 68f6d2177559c86c5969e6624dba5233a83f6b95, including the reviewed
source-bound action-region and general-law APIs. Every independently compiled
lowerer/runtime uses that same core revision. The Rust emitter also includes the
reviewed exhaustive rejection of abstract logic declarations from e76fdf0.
Knowledge is pinned to 5463c4a, snapshot 00bf3b… with 658 canonical entries.
Metadata records complete package hashes; Git identities do not establish proof
validity. Public-main integration is a subsequent reviewed publication, not claimed
by these branch receipts.

## Acceptance

`tests/selected_checkpoint.rs` passes three meaningful integration tests:

- A database-supplied add-zero selection changes a pure helper invoked by inventory
  changes and a GPU-eligible map. Seven replies and exact portable checkpoints
  match the original reference across native C/Rust, JavaScript and both Wasm
  paths. Every step restores an original checkpoint. Mixed wgpu also restores
  those checkpoints and executes one eligible GPU map. Histories include live
  state, ordered pending events, overflow rollback, exact words and UTF-8 data.
- CLI builds complete C/Rust/JavaScript and specialised emit-state projects from
  a saved selection. Native projects compile and restore a baseline checkpoint.
  The emit-state CLI now uses the shared complete runner and durable library
  adapter; the specialised harness runner remains separate. Existing options
  still distinguish Wasm ABI emission. Numeric host JSON uses float_roundtrip.
- A native durable file moves baseline C → selected C → selected Rust. Retained
  requests replay their original replies without duplicate writes; all resulting
  portable checkpoints equal the original reference. Bare emission of the changed
  selected Program rejects that original durable file.

The fixed/generated/module suites continue to pass alongside durable recovery:
523 replies/exact snapshots per CPU path, including the new seven, and 103 actual
wgpu calls. Shrinking/empty GPU residency tests and compiled JS/Wasm/native crash
recovery tests pass. Standalone C/Rust/GPU/Wasm build/test commands pass (these
packages currently have no standalone test cases); JS's two integration cases and
runtime's four host/composition cases pass. General-law, existing semantic, source
binding and action-value regressions pass. All-target compilation is warning-free.
Raw logs are adjacent; counts overlap across suites.

## Replay and boundaries

Selected conformance fixtures retain `input-core.json`, `selected-core.json` and
`selection.json` alongside source/script/expected results. CI runs the selected
checkpoint tests on CPU/Wasm and wgpu and retains those files on failure.
CLI build/emit paths keep the witness. A later independent implementation or
replacement changing the actual program cannot reuse its checkpoint authority.

This is plan interoperability for one unchanged source, not schema evolution.
Mathematical equality checks retain the current total-value observation contract;
source/primitive correspondence, generated code, LLVM, host codecs and physical
storage remain trusted. No whole-action logical interpreter, universal stateful
replacement or physical representation proof is claimed. Source-bound action
regions and the general-law kernel have separate core review/evidence. Earlier
reports and all open PLAN acceptance gates remain preserved.
