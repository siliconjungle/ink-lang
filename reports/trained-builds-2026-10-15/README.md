# Explicit adaptive training builds

`ink build-model` captures a checked module and trace, fits through authored
learning actions, compiles that captured module with a complete startup checkpoint,
and publishes a new bound directory. Runtime learning remains enabled. This is an
adaptive package, not frozen specialization. See
[interfaces and limits](../../docs/trained-builds.md).

Five mandatory integration tests pass in `conformance.log`. They cover initialized
JavaScript/native/Rust-project/Wasm execution, continued learning and unrelated
application updates, complete checkpoints, durable recovery, fitting failure,
compiler failure, immutable destination handling and artifact tampering. Both
JavaScript and Wasm build-stage candidates continue through the actual cooperative
service to the same final durable checkpoint. The 244-parameter Adam case resumes
six frames and matches the retained twelve-frame result, including both moments
and all control state. The tests execute generated code and compare complete values and state.

The trained GPU module compares a seeded query and complete snapshot with the
reference and requires one actual numeric GPU dispatch. `gpu-binding.log` reruns
that test after adding a negative case for rehashed conflicting GPU startup
metadata. A separate negative case rehashes a different typed startup checkpoint
and still fails binding to the fitted result. Inventories are not authenticity or
machine-code correctness proofs.

`regression.log` records 25 existing tests (adaptive learning 9, modules 8,
reverse learning 8), including required Wasm/GPU-host checks and actual eligible
GPU dispatch. `native-host.log` records all five standalone native durable-host
tests passing; `node-host.log` records 14 Node host/integrity tests. Constructor
errors publish no state, and an existing durable record never invokes the new
seed initializer.

The final in-app-browser run reports exact trained CPU-Wasm/JavaScript checkpoint
bytes, identical prediction 0.37996864318847656 and actual WebGPU numeric output.
`browser-result.json` retains the observed AX result; `browser-fixture.mjs` can
serve a regenerated WebGPU package for repetition. No throughput/latency or memory
ranking is claimed. Pure invocation holders use original source state because
checked pure functions cannot observe the deployed application state.

The `javascript/` directory is a complete unchanged published test package. Run:

```sh
ink verify-model reports/trained-builds-2026-10-15/javascript --replay
```

It includes the captured module, raw trace, complete checkpoint, receipt, generated
entry/source files, startup sidecar and host helpers. `metadata.json` binds every
retained file. The test package compiler digest identifies the actual local binary;
rebuilding another platform does not promise an identical native binary. Local
validation includes the same pre-existing unpublished semi/anti-join parser change
in core/src/syntax/query.rs; this work does not modify or publish it. These programs
do not use those forms; the clean pinned CI revision remains the full-revision gate.

Run `python3 reports/trained-builds-2026-10-15/audit.py` to check the retained
inventory and coverage markers. Replay verification above additionally executes
the captured training trace against the checked reference module.

Frozen specialization, trained implementation selection, parallel/device training,
F64/Pretext fidelity and the broader three-project performance requirements remain
open. There is no new canonical knowledge publication or broad speedup claim here.
