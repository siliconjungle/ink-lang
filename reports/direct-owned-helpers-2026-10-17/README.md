# Direct owned parameters through bounded JavaScript helpers

Ink's JavaScript emitter now expands eligible small helpers with checked owned
parameters even when no argument is an already split record. Direct Buffer/Map
parameters and records containing owners retain their private handles. This
allows graph evaluation and adjoint updates to cross helper boundaries and can
expose returned record fields directly to the caller's existing local storage.

This is ordinary literal execution. Every argument still evaluates once in
source order, source moves/readonly loans remain checked, and the callee's own
List analysis keeps its parameters shared. Recursive helpers, oversized bodies
and unsuccessful optional expansion keep ordinary calls. The existing limits
remain: 512 nodes per opportunity, four expansion levels, depth headroom 28,
16,384 expansion nodes, 262,144 source bytes and 65,536 bytes per expansion.
There is no new syntax, source primitive, public owned ABI, retained scratch,
algebraic rewrite or planner selection rule.

The baseline is JavaScript package `a6c14fb6`; the final package is `dc5e2908`.
The source-bound distribution compiler is built from `802dac62`, using the
matching GPU/runtime dependency pins. Core and its standalone package remain
unchanged. The user's uncommitted query-parser work is excluded from the private
committed-source build. Tests strengthen this execution boundary; they do not
prove the whole compiler, checker, ABI, runtime or driver correct.

## Repeated complete-model comparisons

Both studies compare the same source, 244-weight checkpoint and inputs against
the published working-record baseline. Each contains six AB/BA fresh-process
pairs with seven samples per case. Median baseline/new time ratios are:

| Complete workload | Study 1 | Study 2 |
| --- | ---: | ---: |
| Prediction, public call | 1.185× | 1.135× |
| Prediction, bound call | 1.150× | 1.145× |
| Training, no intervening predictions | 1.040× | 1.022× |
| Training, 4 predictions per observation | 0.949× | 1.167× |
| Training, 16 predictions per observation | 1.058× | 1.161× |

Above one favors the new emitter. Prediction improves in every pair in both
studies. Training is mixed: the four-read cadence regresses in study 1, while
every such pair improves in study 2. Training-only gains are small, with adverse
individual pairs retained. All raw samples, ranges and complete replies remain
recorded. The cause of the variation is unresolved; no samples were discarded
or attributed to a demonstrated JIT/thermal effect.

The generated neural module grows from 1,041,667 to 1,093,906 bytes, about 5%.
Module import time and whole-process peak RSS remain in every process record.
They are not a retained-memory estimate for one operation. First-call latency,
compiler throughput, GPU training and Handwired parity are not established here.
Do not multiply these ratios by earlier compiler improvements.

Acquisition used Node 22.22.1 / V8 12.4.254.21-node.35 on a shared macOS arm64
workstation. No other local performance probe or Cargo compilation ran during
the cohorts; the host was not CPU-isolated. These observations are not an admitted
planner cost model, a universal latency guarantee or an automatic layout choice.

Each process first checks 27 independent reference outcomes/exact snapshots and
sixteen independent dense F32 predictions. The model has ten features, two
six-unit hidden layers and four outputs. Prediction samples consume 4,000 full
results. Training samples restore the identical trained seed outside timing,
then run eight observations with two Adam steps, cancelled updates and the stated
prediction cadence. Complete feedback, events, sinks and checkpoints match
between images and across both studies. Keep/default preparation after restore
can occur inside the first timed observation; this is complete host execution,
not an isolated arithmetic kernel.

One retained generic mutable-graph source and one complex-text source emit
byte-identical modules before/after this change. Their source/image hashes and
genuine emitter hashes are retained. This makes no new speed claim for those
sources, complete Pretext fidelity or broad upstream parity.

## Execution and ownership checks

The final standalone package passes all **62 tests across 49 targets**, locked
fetch and example builds, with 111 source files inventoried before/after. Tests
use Rust 1.99.0, Node 25.3.0 and the default stack. A new suite checks 291 reference
cases in each float mode, including raw NaN payloads, signed zero, shared caller
Lists, direct Buffer/Map helpers, recursive helpers and a 530-node fallback.
Public, compiled-value and prepared calls preserve values and detached results.
Instrumentation establishes that small helpers expand while recursion and the
oversized helper still execute as calls. Each mode uses eighteen real workers.

The required distribution suite compares **388 values/outcomes and exact
checkpoints** across the reference evaluator, Rust, JavaScript and Rust-Wasm,
including ordered events, aborted updates and seventeen restores. The private
committed-source build also passes the existing 1,251-outcome ownership history,
772/101-outcome numerical histories and both 335-outcome specialization histories.
Its genuine CLI reproduces the final measured neural image byte for byte.

The actual native WGPU host matches all 388 results, preserves the exact final
checkpoint and performs one required word-kernel dispatch. Unsupported entries
also exercise required-GPU error handling. This is a distribution/device sanity
check, not JavaScript helper expansion on a GPU, browser GPU coverage or device
training. CPU histories compare every checkpoint; the GPU check includes the
final checkpoint.

Retained fixture failures include a Map receiver read after its move, and direct
List `at_or` inside an action expression. The former was corrected by reading
before the consuming method; the latter uses an ordinary checked pure helper.
The checker was not weakened. The first failed root build and fixed committed
build have separate source inventories/receipts. Cargo artifacts and fingerprints
were never fabricated or restored; copied genuine executables only leave targets.

## Reproduce and continue

Run `python3 reports/direct-owned-helpers-2026-10-17/audit.py --run` to verify the
complete file set, source archives, receipts, both cohorts and statistics, replay
both finite owner controls, replay the retained 388-outcome JavaScript/Wasm
history, and recheck complete neural results. Replay timing is not a new cohort.
Add `--ink PATH` for optional exact image reproduction with this milestone's
distribution compiler. CI replays retained semantics without permanently
requiring future emitters to produce identical historical bytes.

`sources/` contains standalone source packages without build targets. `data/`
stores logical assets with gzip where useful; `summary.json` records the encoding,
length and hashes. The native source project, portable Wasm artifact and original
harnesses are retained. The auditor relocates that Wasm asset beside its harness,
never into a Cargo target. Compilation/source exports and acquisition scripts
remain available for reconstructing the checked builds normally.

Full graph/tape compilation, learned representation/goal selection, device
training, broader text/fact inference and the complete Handwired/Pretext/Freerange
programme remain open. This delivery removes another literal execution boundary
without changing their acceptance requirements.
