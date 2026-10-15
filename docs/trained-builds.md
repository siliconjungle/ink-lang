# Training as an explicit build stage

`build-model` captures a checked module, runs its authored training trace, compiles
the captured module and publishes one new artifact directory. The compiled startup
factory restores the complete fitted checkpoint. Runtime learning stays enabled.
This is adaptive deployment, not frozen-weight specialization.

```sh
ink build-model examples/adaptive-layout.ink examples/adaptive-layout-training.json \
    --target javascript -o build/fitted-layout
ink verify-model build/fitted-layout --replay
```

Supported targets are `javascript`, `native`, `rust`, `wasm32` and `webgpu` (`gpu`
is an alias). `native` produces an executable; `rust` produces a locked source
project. Wasm and GPU artifacts include their compiled components and host files.
The destination must be a new directory. Compilation uses private staging and a
directory rename publishes the completed package. Training/compiler/verification
failure leaves that destination absent. Existing artifacts are never overwritten.
Use one publisher per destination; rename is an atomic namespace publication, not
a power-loss durability guarantee for a compiler output directory.

The artifact contains:

- `source.core.json`: the checked module captured before training, including linked
  definitions and evidence; compilation consumes this file rather than rereading
  changing source files.
- `trace.json`, `training.receipt.json` and `model.snapshot`: explicit observations,
  deterministic replay receipt and the complete resulting state.
- `parent.snapshot`, when resuming: the complete initial state bound by the receipt.
- `program` components and `hosts/`: the target implementation, startup factory,
  persistence helpers and cooperative scheduler.
- `artifact.json`: source/checkpoint/compiler identities, target, entry point and
  a bounded inventory of file sizes and hashes, including generated dependency locks.

Configuration belongs in the authored program and trace: objectives, observations,
seeds, optimizer settings, constraints and update actions. The build does not infer
labels, shuffle data, choose an optimizer or run a profitability experiment.
`--contract-proofs`, `--termination-proofs` and checked `--core` input retain normal
admission. Implementation planning/selection inside `build-model` remains open;
unsupported options reject instead of silently being ignored.

## Startup and continuation

For JavaScript, import the manifest's entry and await its factory:

```js
import {createState, restoreState} from './build/fitted-layout/program.mjs';
const state = await createState();
const prediction = state.invoke('suggest', [{width:0.5, length:0.5}]);
// Ordinary authored learning actions remain available after deployment.
state.invoke('observe', [{width:0.3, length:0.7}, 0.4, 0.05]);
```

Each new factory instance starts from the same captured checkpoint, independently
of earlier instances. `restoreState(bytes)` explicitly continues a later checkpoint.
JavaScript startup reads and hashes its sidecar once; restoring creates private
logical state. The initialized JavaScript factory is asynchronous. Unseeded
`build --target javascript` retains its existing synchronous factory.

Native executables use the trained checkpoint by default, including when creating
an empty durable store. A generated Rust library exposes `initial_state()` for the
same startup operation. `State::new()` remains the explicit original source state.
Existing durable stores recover their stored state and retry receipts; deployment
does not reset them to the build's seed. Native `--restore` is an explicit in-memory
state replacement and keeps the normal restriction against replacing a durable
history. See [durable hosts](durable-host.md).

Wasm artifacts expose `program.wasm.entry.mjs` with async `createState` and
`restoreState`. Its factory loads and verifies the Wasm component and checkpoint.
The raw Wasm ABI retains original source initialization; use the entry factory, or
`StatefulModule.instantiate(bytes,{initialSnapshot})`, for deployed initialization.
That option captures private checkpoint bytes and validates them before use.
`createSourceState()` explicitly requests original source state. Pure-call holders
use that source state because checked pure functions receive all data explicitly;
they do not retain an unnecessary copy of deployed optimizer/application data.

The complete GPU bundle uses `loadInk(...)`. Its CPU state factory starts trained;
`await createJavaScriptState()` supplies the same state on JavaScript. Eligible pure
numeric work can still dispatch to the GPU. Training/state transactions execute on
CPU hosts; this package does not establish a device optimizer or reverse pass.

The checkpoint contains the **whole logical application state**, optimizer moments,
control/progress, commit version and pending events. It is not a tensor-only export.
Outbox delivery and acknowledgement retain their existing semantics. For live
model promotion, use source session base/ticket validation rather than restoring an
old whole-application checkpoint over newer live state.

## Resume training before deployment

```sh
ink build-model SOURCE TRACE.json --restore previous.snapshot \
    --target wasm32 -o build/model-next
```

Resume validates the exact source identity before executing updates. Tests resume
six more frames of the 244-parameter Adam example and compare the result byte for
byte with its twelve-frame checkpoint, including both moments and control state.
A frozen build must restrict writes through every entry point and restore
boundary, declare the remaining degrees of freedom and expose immutable values to
ordinary checked specialization. That contract remains required work.

Existing checkpoints can also initialize a normal literal build without a training
stage:

```sh
ink build SOURCE --initial-state MODEL.snapshot --target native -o build/app
```

This validates the source/checkpoint binding before emission. Checked semantic
selection can retain the existing source snapshot identity. Separate implementation
or replacement changes with an initial checkpoint currently reject. The `build`
command keeps its ordinary output/failure behavior; use `build-model` for staged
directory publication and a complete input/artifact inventory.

## Verification and limits

`verify-model DIRECTORY` checks file inventory/hashes, checked source, typed model
checkpoint, parent lineage, trace binding and compiled startup metadata. It also
checks that emitted initial-checkpoint copies match the training result. Merely
rehashing a different startup seed does not satisfy that binding. `--replay`
additionally reruns the authored reference training and compares the complete
checkpoint and receipt. This verifies deterministic fitting independently of the
emitted program; it does not prove compiler/native-code correctness or artifact
authenticity. Local artifact inventories are not signatures or approximation proofs.

Trace, receipt and manifest inputs are bounded to 16 MB. Training permits at most
100,000 explicit learning-action calls; ordinary
per-action fuel limits still apply. Checkpoints and initialized Wasm components
are bounded to 64 MB. Inventories reject symlinks, compiler cache directories,
depth above 48, more than 8192 directory entries or more than 1 GiB total files.
Complete source projects capture dependency locks before publication. Build them
with `--locked` and an external target directory to keep the package verifiable.
Dependency archives are not vendored: prefetch the generated project's exact lock
before requiring an offline build, rather than relying on a host-template cache.
The compiler's shared generated-code cache stays outside the artifact, with an OS
file lock retained through compilation and copying its output.

The mandatory `trained_build` suite checks seeded startup, continued learning,
nontraining application state, exact checkpoints and durable recovery across CPU
targets; model/trace tampering, rejection and failed compilation; complete Adam
resume; and a trained mixed module with a required native GPU dispatch. An unfinished
build-stage candidate also continues through the JavaScript and Wasm continuous
services to the same durable checkpoint. A browser
fixture separately compares CPU-Wasm/JavaScript startup snapshots and actual WebGPU
output. These checks establish neither a training-throughput ranking nor frozen,
parallel/device learning or a universal convergence guarantee.

[Retained package, checkpoints, target logs and browser observation](../reports/trained-builds-2026-10-15/README.md).
