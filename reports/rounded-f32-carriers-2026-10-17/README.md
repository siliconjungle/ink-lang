# Rounded F32 intermediates in stateful JavaScript

The JavaScript lowerer now keeps adjacent F32 arithmetic in rounded Number
temporaries instead of converting every intermediate result to u32 bits and back.
Fresh immutable arithmetic locals can carry this representation between uses.
Queries and actions also remove adjacent conversions. This is literal execution
support for arbitrary checked arithmetic, including training helpers; there is no
model, algorithm, graph or benchmark recognizer.

Every source operation still rounds to F32 in its original grouping. There is no
reassociation or fused multiply-add. Calls, negation, containers, bit observations,
worker captures and state/result boundaries retain the bit protocol. Arithmetic
NaNs encode canonically; raw copied payloads, signed zero and subnormals retain
their original semantics. Mutable storage never acquires an immutable Number
fact. Existing work/depth limits and optional expansion rollback remain in force.

## Measurements

Each retained six-pair study alternates baseline/new and new/baseline fresh Node
processes on a shared macOS arm64 host. Node is 22.22.1, V8 12.4.254.21-node.35.
There is no exclusive CPU or thermal-isolation guarantee. Ratios are medians of
the six paired baseline/new median times; greater than one favors this change.

| Workload | Paired ratio |
| --- | ---: |
| Neural training, no intervening predictions | 1.235× |
| Neural training, 4 predictions per update | 1.217× |
| Neural training, 16 predictions per update | 1.179× |
| Prepared-default neural training, 0 / 4 / 16 predictions | 1.161× / 1.134× / 1.152× |
| Neural prediction, public / bound entry | 1.000× / 1.001× |
| Prepared-default neural prediction, public / bound entry | 1.026× / 1.009× |
| 24-binding scalar arithmetic chain | 1.716× |
| Warm committing / aborting transactions | 1.014× / 0.989× |

The neural examples have 244 weights, ten features, two six-unit hidden layers,
four outputs and live Adam/control state. Each measurement process first checks
27 complete reference outcomes and snapshots plus sixteen independent dense F32
predictions. Training measures the complete update/reply path, including two Adam
steps per observation, prediction calls where specified, and cancelled frames.
All paired feedback, events, checksums and final checkpoints agree exactly.
The prepared-default example establishes that the gain also occurs after default
preparation. Final emitted images reproduce both measured neural images exactly.

The scalar studies include empty/tiny collections, loops, branches, state reads,
learning cadence and committing/aborting frames. Each process first checks 3,543
independent values and the earlier 128-outcome state history. The longer warm
study increases frame iterations to 32,768 per sample after the initial short
cohorts showed transaction timing noise. It retains committed events in the
durable outbox: the growing snapshots and whole-process peak RSS are not
constant-memory or per-operation memory measurements. Tiny cases sometimes lose
a few percent. Prediction gains seen in the one-pair neural pilot did not survive
the repeated study and are not a prediction speed claim.

The initial decode-heavy implementation, its sources, shorter timing cohorts and
pilot results remain under `diagnostics/` and `scalar/cohort-1`. The compact
implementation changed generated code; the warm protocol changed iteration
counts. These are separate studies, not pooled samples. Speedup factors from
other Ink changes must not be multiplied by these ratios.

## Correctness and source binding

The standalone package's complete 60-test suite passes across 47 Cargo targets.
The final fixture checks 3,543 pure cases through public, binary and compact
entry points, 208 state outcomes and 17 restores. Cases cover raw NaNs, signed
zero, subnormals, overflow, explicit non-FMA cancellation, shadowing, real worker
execution, lazy branches, ingress order and retries after host failures. The
test-only instrumented image checks source call order and is never an admitted
implementation or a proof premise. The final full-suite terminal log is retained;
its process exit code was lost at a context boundary, which the receipt states
explicitly instead of inventing one.

The distribution integration runs from a private export of committed Git blobs,
excluding a separate user query-syntax edit. Its receipt records actual compiler
and test exit codes and all owned source hashes. The new numerical history checks
772 complete outcomes and 17 restores against independent reference evaluation,
native Rust, JavaScript and Rust-Wasm, including exact checkpoint bytes. Existing
numerical and guarded specialization regressions run with Wasm required. This
does not claim device training or GPU arithmetic-carrier support. A separate
native WGPU run matches the existing 101-outcome numerical history and its exact
final checkpoint, including one required, actual eligible word dispatch. That
checks the integrated GPU host; it does not establish browser WebGPU execution.

Immutable package revisions and inventories are recorded in `summary.json`.
The historical baseline compiler is bound to the earlier
[guarded specialization source inventory](../guarded-function-specialization-2026-10-17/compiler-sources.json).
The new package example and distribution CLI were genuinely built and exercised;
no Cargo artifact or fingerprint was fabricated or restored.

```sh
python3 reports/rounded-f32-carriers-2026-10-17/audit.py
python3 reports/rounded-f32-carriers-2026-10-17/audit.py --run --ink /absolute/path/to/ink
```

The auditor verifies retained and decompressed hashes, recomputes every paired
statistic, compares complete observed outputs and optionally reproduces current
images and finite JavaScript controls. It also replays the retained 772-outcome
JavaScript and Wasm history. The Wasm image is an ordinary report asset; the
replay changes only its harness URL and never restores it into a Cargo target.
Timing records and tests grant no rewrite
authority. These observations are not admitted planner measurements or a validated
cost model. Compiler translation, the lowerer, ABI, runtime, toolchain and hardware
remain trusted. Automatic profitable graph/representation selection, device
training and the full Handwired/Pretext/Freerange performance requirement remain
open; no upstream performance parity is claimed here.
