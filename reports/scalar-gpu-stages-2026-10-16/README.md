# Group literal scalar GPU statements without changing arithmetic

Eligible pure scalar expressions, lets and helper calls now share one ordered
shader stage. A bounded transitive walk excludes collection operations, including
through callees, using the shared core expression visitor. Existing source-order
argument/let binding, lexical scope and integer-lane binary32 emission remain in
use. Statement emission publishes a node only on success; an unsupported larger
statement retains the staged attempt or CPU fallback. No stage, work, depth or
precision allowance was raised. This is general target scheduling, with no
opcode/function whitelist, new semantic equality or collection/reduction fusion.

| Pure helper operations | Previous stages | Grouped stages |
| --- | ---: | ---: |
| 8 | 8 | 1 |
| 16 | 16 | 1 |
| 32 | 32 | 1 |
| 64 | 64 | 1 |
| 128 | Unsupported: stage budget | 1 |
| 256 | Unsupported: stage budget | 1 |
| 512 | Unsupported: stage budget | 1 |

Complete 32/128/512-operation roots each pass eleven raw F32 input/weight classes
against independent execution of the original traversal. Each size also retains
the full live-weight/update/rollback/event/checkpoint history: 155 complete
observations per target, including twelve actual GPU calls on the native host.
The initialized 512-operation package passes 465 browser comparisons, twelve
actual GPU calls, six seed checks and three rejected frozen checkpoints. These
GPU calls run the pure model root, not the stateful serving action or training.

Separate wide U64, signed wrapping I32, records, unused arguments, scoped lets
and lazy-default cases pass 38 native GPU calls and 114 browser comparisons
(38 actual GPU calls). All fourteen independent backend tests pass, including
Naga shader validation and transitive collection-boundary coverage. All twelve
frozen-state integration tests pass; existing device host tests also pass.
These are finite conformance checks, not generated-code correctness proofs.

## Matched complete-call measurements

Apple M4 Pro / Mac16,7, six fresh headless Chrome processes. Each process compares
the same retained previous/grouped artifact images, alternating case order.
Each cell initializes once, warms twelve calls, then records seven samples of
24 complete asynchronous calls with four varying input/weight frames. Every
result is checked against the independent source evaluator and accumulated.
GPU calls require the device and validate their actual dispatch counters.

| Explicit backend / helper | Median process median, microseconds |
| --- | ---: |
| Previous GPU / 64 operations | 975.94 |
| Grouped GPU / 64 operations | 508.54 |
| Grouped GPU / 512 operations | 498.96 |
| Wasm CPU / 512 operations | 7.60 |
| JavaScript / 512 operations | 6.46 |

The paired geometric GPU64 improvement is **1.84×**. Each sample includes input
capture, upload, dispatch, readback, result decoding and complete oracle checking;
imports and initial shader/backend setup are recorded separately. Upload/readback
remain 12/4 bytes per request. Reported `live_buffer_bytes` falls from 272 to 20;
this is a device counter, not whole-process/driver memory. These are warm
workstation measurements, not cold-start, exclusive-machine, upstream-library or
automatic-profitability evidence. The CPU/JavaScript numbers use this same async
host boundary and must not be combined with earlier bound-state nanosecond tests.

The first six successful pairs overlapped actual GPU conformance. Every one is
retained under `performance/contended`; none is used in the headline. After that
concurrency was identified, a separate six-pair acquisition ran with our GPU
conformance and private compiler build finished. All samples in that second
acquisition are retained and included. The initial set measured 1.81×, the second
1.84×; no claim of exclusive access to the workstation is made. An earlier
harness attempt failed during host cleanup and published no result packet.

A single small request still strongly favors CPU/JavaScript. Larger batch,
resident and application/query pipelines require their own lifecycle evidence.
This work installs no profile or automatic choice policy.

## Artifact and implementation assurance

The initialized 512-operation GPU inventory shrinks from 851 files / 26,943,249
bytes to 314 files / 16,573,460 bytes, excluding the top artifact manifest.
Repeated stage shaders disappear even while larger roots become eligible. These
are inventory file bytes, not compressed download size or retained heap use.
Source/selected core, selection proofs, model/deployment checkpoints and serving
JavaScript are byte-identical between the retained previous and grouped images.
The old complete artifact is reused from the preceding immutable report; the
new artifact and both full replay fixtures are retained here.

A fresh private compiler checkout and Cargo target at distribution commit
`e3ea5af3f150db038b8557269dce653092d5a4a5`, GPU package
`177f6dc99a2c86a1a99c71fa3d4b9094042817c0` and runtime
`953fab79b780d3a0b71c9b14bde12cca56e30d0e` reproduce 170 GPU shader/host/descriptor
images byte for byte, including all 30 WGSL files. Baseline/selected initialized
JavaScript model images reproduce too. Both GPU inventories, proofs and training
replay check. This comparison does not establish CPU fallback binary identity,
backend correctness or toolchain/driver correctness. The unrelated local query
parser edit remains excluded from the committed-source rebuild and preserved
(diff SHA256 `750cc8098faaad5bd8278f93760af008129ce3c136a79471334c7f604aa564ab`).

The opcode trace is configured explicitly. Whole-application learning, learned
representation and objective selection, general graph/tape/query/state fusion,
device training, broader Handwired/Freerange/Pretext workloads and matched
upstream performance remain required work. No new default knowledge laws or
profitability evidence were installed; a new planning-corpus acquisition is not
claimed for this backend-only mechanism.

Run `python3 audit.py`, optionally with `--ink /absolute/path/to/ink` for complete
model proof/training replay and `--chrome /absolute/path/to/Chrome` for fresh
execution of both retained browser histories. The inventory checks every
retained file and archive member hash and recalculates every timing summary.
