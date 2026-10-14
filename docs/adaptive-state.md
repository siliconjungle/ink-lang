# Opt-in adaptive state execution

Ink can observe recent usage and change between **already compiled, checked** state
implementations. This is a host policy, not a language annotation or runtime proof
search. Defaults remain fixed. The controller never trials an update, runs an
unselected variant for comparison, fits a model, or infers a correctness premise.

## Workflow

1. Produce complete compiled plans through the existing knowledge planner.
2. Prepare a bundle. Every plan is replayed against the original source before
   emission, with exact compiler and generated-module identities retained.
3. Acquire timings and peak-memory observations **offline** for each relevant
   operation/input-shape cell and each migration direction. Keep development and
   evaluation histories separate. The supplied target key must identify hardware,
   runtime/toolchain and measurement conditions, not merely `javascript`.
4. Fit the bounded profile, then explicitly load the adaptive host. Application
   calls execute once; recent windows guide the next migration decision.

```sh
PYTHONPATH=planner python3 -m ink_planner.adaptive_state prepare \
  --compiler target/release/ink --source app.ink --variants variants.json \
  --target-key DEVICE_AND_TOOLCHAIN_KEY -o build/adaptive
PYTHONPATH=planner python3 -m ink_planner.adaptive_state fit \
  --bundle build/adaptive/bundle.json --observations observations.json \
  --policy policy.json -o build/adaptive/ready.json
```

`variants.json` is an ordered list of `{ "id": "direct", "plan": "direct.plan.json" }`
objects; the first is the baseline. Paths are relative to this file. Up to sixteen
variants are supported. This builder emits JavaScript; installed/relocated bundles
include its runtime assets. It creates a fresh directory, preserving earlier builds.

```js
import {loadAdaptiveState} from './adaptive-state.mjs';
const app = await loadAdaptiveState(new URL('./ready.json', import.meta.url), {
  targetKey: DEVICE_AND_TOOLCHAIN_KEY,
  recording: {windowCalls: 256, sampleEvery: 32, maxObservationNs: 10000},
  maxPending: 64,
  maxCaptureBytes: 8 * 1024 * 1024,
  maxSnapshotBytes: 64 * 1024 * 1024,
  onDiagnostic(event) { /* bounded application-owned logging */ }
});
const reply = await app.call('total', [], {
  shape: 'rows128', state_elements: 128
});
const saved = await app.checkpoint();
await app.close();
```

Shape labels identify **exact recorded workload cohorts**, including relevant data
sizes/distributions. They must be supplied by the host; unknown labels have no cost
coverage and cannot justify a switch. `state_elements` is the current state-size
feature for the migration domain, not a bound proved about the program. Never label
unmeasured inputs as a measured cohort. Profiling makes no claim to automatically
infer hot keys, correlations, all fields, or heap size from opaque arguments.

## Decisions and limits

`ink-abi::adaptive` implements the decision once. Native code links it; Node and
browser hosts use that exact Rust implementation compiled to Wasm. It requires
matching source/compiler/artifact/target/boundary identities. For every cell in a
recent window, the current implementation needs a lower cost estimate and the
candidate needs an upper estimate. Missing cells retain the current implementation.

The expected horizon saving must exceed the minimum fractional gain **after**
charging migration with a safety multiplier. Defaults are a 4096-call forecast,
15% gain, twice the measured migration cost, three consecutive qualifying windows,
1024 calls between switches, and at most 32 switches. These are configurable
predictions, not guarantees about future demand. Window counts expire; a historical
write-heavy phase cannot dominate the app's read-heavy phase forever. Saturation
or an unknown workload clears pending confirmation rather than extending it.

Migration evidence includes a state-size range, peak simultaneous memory and pause
cost. Both the candidate and migration must fit the measured memory budget. Costs
are empirical sample extrema from at least three samples, **not statistical
confidence bounds**. Forecasts can fail; a reversal can make detection and migration
more expensive than retaining the original implementation.

The recorder retains at most 64 cells/window and four recent windows by default.
It samples latency every sixteen calls by default, reports failures separately,
and stores no argument values. When sampled observation bookkeeping exceeds its
configured time budget it disables timing; bounded usage counting continues. This
is a sampling throttle, **not a hard bound on total host overhead**. Serialization,
owned input capture and decisions also have costs; see the measured controls.

The JavaScript facade captures arguments on submission, bounds pending calls and
structural capture bytes, and runs source actions sequentially. Inputs are owned
scalar/record/array trees and typed buffers, not cycles, shared graphs, accessors or
foreign handles. Structural capture accounting is not a process-memory measurement.
Each source action is a complete transaction. The facade exposes `call`,
`checkpoint`, `restore`, `acknowledge`, `status` and `close`. Subscriptions and
caller-managed multi-call transactions are not exposed by this facade.

## Migration, failures and trust

At a serialized boundary the host checkpoints the old instance, restores a new
one and verifies its portable checkpoint before publication. Logical state,
versions, rollback outcomes, pending events and acknowledgements survive.
Restoration/checkpoint failure leaves the old instance live and disables further
adaptation. It does not change the completed call's reply or repeat its effects.
Observer and timer failures cannot change source replies. Old and failed candidate
instances are disposed where adapters provide disposal; Rust drops them.

Observed pause overruns disable adaptation and decline publication. A synchronous
codec or callback cannot be preempted: the first overrun can still stall the host.
Measured peak-memory gates likewise do not enforce an OS heap cap. Snapshot and
capture sizes have explicit byte limits; snapshots may allocate before their size
is known. Applications requiring hard deadlines need isolated, cancellable hosts.
External restore invalidates recent assumptions and disables adaptation for that
JavaScript host; recreate it with a suitable profile to enable adaptation again.

Module hashes detect accidental artifact mismatch. They do not prove arbitrary
code safe. Use immutable trusted deployment files between verification and module
import. The low-level `createAdaptiveState` and Rust `runtime::adaptive::Host`
accept **trusted compiled adapters**; the caller must bind factories to the checked
variants. The JS bundle builder performs proof replay and source/artifact binding;
there is no native bundle generator. Rust's generic synchronous facade takes
exclusive mutable access and runs the same decision contract. Its recent-window
latency sampling is diagnostic; native callers can disable adaptation explicitly.

Durability remains the existing portable checkpoint/storage contract. This feature
does not claim a distributed live migration protocol, atomic external side-effect
publication, or automatic integration with every durable/subscription host.

## Evidence

[Recorded benchmark and limitations](../reports/adaptive-state-2026-10-14/README.md)
include aggregate reads, writes, phase reversals, oscillation, unknown workloads,
a point-query negative control, raw calls, fixed choices and a frozen initial-profile
choice. Synthetic prices are used only to force migrations in conformance tests;
performance decisions use the separately acquired empirical samples.
