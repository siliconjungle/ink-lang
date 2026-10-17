# Local affine record carriers through helpers and folds

Ink's JavaScript emitter now keeps working-record fields in local variables even
when the record contains owned buffers or maps. Bounded pure helpers can operate
on those fields directly. Repeat loops, left/right folds and inclusive early-stop
folds carry the fields between iterations without constructing a wrapper at every
step. Already evaluated literal initializers need no temporary wrapper either.

This is general literal emission for checked records, not a graph, model or
algorithm recognizer. It changes no source syntax, arithmetic, ownership rules,
logical snapshot schema or public temporary-storage capability. A buffer/map
field keeps the same private owner handle; the source checker still controls
moves and readonly loans. Expanded List parameters remain shared under the
callee's own analysis. Splitting a wrapper supplies no extra uniqueness fact.

## Repeated measurements

All ratios below are paired baseline/new median times; above one favors the new
emitter. The baseline is JavaScript package `306aa216`, after the earlier rounded
F32 change; the new package is `a6c14fb6`. Do not multiply these factors by earlier
speedups. Every image pair uses identical checked source bytes and input data.
The source-bound distribution compiler reproduces all final measured images.

The two neural sources each have 244 weights, ten features, two six-unit hidden
layers, four outputs, live Adam/control state and cancellation. Each study has
six AB/BA fresh-process pairs on a shared macOS arm64 workstation with Node
22.22.1 / V8 12.4.254.21-node.35. Prepared-default source has two independent
studies with unchanged images and protocol; the earlier default source has one.

| Workload | Prepared study 1 | Prepared study 2 | Earlier defaults |
| --- | ---: | ---: | ---: |
| Prediction, public call | 1.197× | 1.299× | 1.307× |
| Prediction, bound call | 1.220× | 1.316× | 1.310× |
| Training, no intervening predictions | 1.305× | 1.294× | 1.321× |
| Training, 4 predictions per observation | 1.289× | 1.271× | 1.297× |
| Training, 16 predictions per observation | 1.316× | 1.345× | 1.358× |

Each process first checks 27 complete reference outcomes and exact portable
snapshots plus sixteen independent dense F32 predictions. Prediction samples
consume 4,000 complete results. Each training sample restores the same trained
seed outside timing, then measures eight observations, two Adam steps per
observation, cancelled frames and the specified prediction cadence. Complete
feedback/events and final snapshots agree between variants. Timings include
invocation, output consumption and reply normalization; source keep/default
preparation after restore may occur in the measured first observation. They are
not isolated arithmetic-kernel timings or GPU training measurements.

**The adverse samples remain part of the evidence.** Prepared study 1's first new
process was slower in training, with paired ratios about 0.58–0.63; another
process had a slow public prediction sample group. Prepared study 2 improves
every paired case, with training ratios 1.21–1.43. Background load was observed
on this shared workstation after acquisition, but was not recorded during the
earlier adverse pair and does not establish its cause. Nothing was discarded or
attributed to a proven JIT/thermal cause. These are descriptive observations,
not a universal latency guarantee or an admitted planner cost model.

A separate six-pair generic mutable-graph study checks 96 independent finite
values and 335 full reference outcomes/snapshots in every process before 24
lifecycle cases. It compares the same generic source before/after emission,
without graph specialization. Stable matching graphs improve 1.140× for one
input, 1.081× for 64 and 1.014× for 1,024. Empty one-input work is approximately
unchanged (0.992×); short lifetimes and frequent writes have their own retained
results. Setup, import, checkpoint/restore and whole-process peak RSS are separate
observations. RSS covers every case and control in that process, not retained
memory for one operation. No other local performance probe or Cargo compilation
ran concurrently with these final studies; the workstation was not isolated.

## Why the fold connection matters

The first implementation handled repeats but not ordinary folds. Its generic
graph images were byte-identical: that early cohort is an A/A control, not an
optimization win. Its prepared neural timings were also mostly flat. Adding
fold handling reached the graph and neural work loops. A further change removed
the fresh initial wrapper instead of allocating it only to unpack its fields.
Earlier sources, genuine emitter receipts, images and cohorts remain under
`diagnostics/`; the final studies are not pooled with those changed protocols or
implementations. The early one-pair neural pilot is not a repeatability claim.

## Correctness, bounds and trust

The final standalone package passes all 61 tests across 48 Cargo targets, builds
its examples and fetches its lockfile. The final owned-record fixture checks
1,731 values in each native-Number and stateful-bit mode through public, compiled
and prepared calls, including fully captured calls and repeated output mutation.
It covers buffer-field swaps, map updates, nested owners, shared immutable Lists,
clipped readonly views, left/right/inclusive folds, empty loops, exceptional F32
bits, actual workers, 96 state outcomes and 17 restores. Test-only source probes
verify both helper expansion and the oversized-helper fallback; neither the
instrumented images nor their counters are implementation/proof premises.

Fold splitting is restricted to private affine records or already local literal
constructors. Arbitrary borrowed host record initializers retain the ordinary
path: empty folds leave unused getters alone, exceptions retry, and an inclusive
fold evaluates its triggering step. Every argument and field still executes once
in source order. Next fields are all computed before any carried assignment.
Mutable fields acquire no immutable Number/range fact. Recursive, codec and
bounded-expansion fallback remain ordinary calls. Existing node, byte, nesting
and proof limits are unchanged.

A private export of committed Git blobs excludes a separate user query-syntax
edit. Its genuine distribution compiler passes the new 1,251-outcome reference /
native Rust / JavaScript / Rust-Wasm history with seventeen restores and exact
snapshots. Existing numerical and both 335-outcome specialization histories also
pass. Native WGPU matches 101 numerical outcomes, an exact final checkpoint and
one required actual eligible word dispatch. That verifies the integrated host;
it does not make affine record handling or training a GPU device capability.

```sh
python3 reports/affine-record-carriers-2026-10-17/audit.py
python3 reports/affine-record-carriers-2026-10-17/audit.py --run --ink /absolute/path/to/ink
```

The auditor verifies original/decompressed bytes and archived source inventories,
recomputes all paired statistics, checks complete observed outputs, and optionally
reproduces the final images and replays retained JavaScript/Wasm histories.
Artifacts are report assets; no Cargo artifacts or fingerprints are fabricated
or restored. The checker, translator, lowerer, ABI, toolchains and hardware remain
trusted. Testing and image/source hashes do not prove the compiler correct or
authorize algebraic replacement/profitable selection. Full Handwired / Pretext /
Freerange parity, learned profitable graph/representation choice, source-wide
differentiation and device training remain open requirements.
