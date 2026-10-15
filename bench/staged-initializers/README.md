# Prepared value-state defaults

This study compares three literal JavaScript modules on M4 Pro / Node 25.3.0:

- `scalar`: the prior scalar-only keep emitter and captured neural source;
- `keeps`: immutable structured retention and the same captured source;
- `defaults`: authored keeps for the architecture/default optimizer, with mutable
  live training state. This has a new checked source identity.

The first two controls are retained in `reports/structured-preparation-2026-10-16`.
The new complete deployment, core, twelve-frame trace and checkpoint are retained
in `reports/prepared-initializers-2026-10-16/neural`. Both deployments were trained
independently from the same declared trace. Each module restores only its own
checkpoint. The exact schema and typed state payload agree, including all Adam
moments, controls, versions and events; source identities remain distinct.

Use Node 25.3.0 for these measurements (`/opt/homebrew/bin/node` on the measured
host). Children use the same `process.execPath` with explicit GC enabled.

```
node bench/staged-initializers/run.mjs run \
  reports/structured-preparation-2026-10-16/neural \
  reports/prepared-initializers-2026-10-16/neural build/staged-samples.json
node bench/staged-initializers/memory.mjs run \
  reports/structured-preparation-2026-10-16/neural \
  reports/prepared-initializers-2026-10-16/neural build/staged-memory.json
node bench/staged-initializers/phases.mjs target/debug/ink \
  reports/structured-preparation-2026-10-16/neural \
  reports/prepared-initializers-2026-10-16/neural build/staged-phases.json
```

`run.mjs` uses six fresh processes: three development seeds and three holdout
seeds. Sixteen F32 contexts per process have a separate ordered dense forward
oracle. Each complete prediction consumes all four outputs; eleven mixed-order
samples of 2000 calls compare all three state modules and the narrower dense
kernel. Warmup and exact final checkpoint checks are outside timing. Import/factory
and first-prediction observations are recorded separately. The oracle's model read
occurs after first predictions, so it cannot pre-prepare one cold control.

Training samples time complete eight-turn histories: two Adam steps per turn,
0/4/16 predictions per turn and an additional rolled-back frame every fourth turn.
Each cell has 128 warm histories before eleven mixed-order samples. Restore,
checkpoint comparison and hashing are outside timing; input capture, complete
training replies/events and prediction outputs are included. Feedback, results and
all typed state payload bytes agree across sources and serving cadences. A
BigInt-aware hash encoding retains exact public commit/version words. Each row's
checkpoint hash remains bound to its own source; comparing logical payloads never
rewrites a snapshot header.

`memory.mjs` uses a separate process per implementation, repeated three times.
It imports, creates/restores state, observes the model and executes ten checked
predictions. Oracle/public arrays leave a completed synchronous scope before two
explicit collections. Heap/RSS include engine/JIT behavior and are neither
allocation counts nor peak-memory bounds. Import and create/restore have separate
observations. Snapshot-file reading is outside startup timing.

`phases.mjs` uses three fresh CLI subprocesses per source to admit captured core
and emit complete JavaScript. Timing includes process startup/file I/O and excludes
source parsing/import resolution, training, optimizer search and native toolchain
compilation. Every emitted byte matches the retained module. These are descriptive
phase costs, not an isolated compiler-throughput ranking.

Run `analyse.py DIRECTORY --check` to audit retained hashes, matrix coverage,
state/source bindings and derived statistics. The earlier cold-phase pilot is
retained and excluded: it observed weights before one control's first prediction.
All final conclusions use the corrected complete run, including its slower cases.
No result authorizes automatic staging, certifies a compiler or establishes
Handwired/Pretext performance parity. The dense kernel excludes state/ABI work.


The frozen composition check uses the real checked source/checkpoint exported by
`frozen_state`, then compiles the restricted module through the normal CLI:

```
ink build reports/prepared-initializers-2026-10-16/frozen/source.core.json --core \
  --target javascript --initial-state reports/prepared-initializers-2026-10-16/frozen/model.snapshot \
  -o build/staged-frozen.mjs
node bench/staged-initializers/check-frozen.mjs build/staged-frozen.mjs \
  reports/prepared-initializers-2026-10-16/neural \
  reports/prepared-initializers-2026-10-16/frozen/model.snapshot
```

It compares complete model/control/prediction/objective replies, checks detached
model outputs, withdrawn learning writers, exact checkpoints and rejection of a
foreign source snapshot. This is execution validation, without a throughput claim.
