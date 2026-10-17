# Three rejected F32 storage and decoding experiments

Three private JavaScript compiler experiments preserve the exercised outputs but
lose to the published emitter on the complete 244-weight neural workload. None
changes Ink's compiler, syntax, planner, physical capabilities or default layout.
This report retains the negative evidence and reproducible source packages.

The baseline is standalone JavaScript package `a6c14fb6`, integrated in distribution
`96979a85`. It already includes rounded arithmetic carriers and affine working
records. These are further comparisons against that implementation, rather than
against Handwired or the earlier Ink baseline. Do not multiply their ratios by
previous reports.

## Designs and measured outcomes

**Numeric buffers** store rounded Numbers and immutable exact NaN tags in private
F32 owners, while ordinary scalar calls, lists, state and ABI values retain raw
bits. Arithmetic reads/stores can use the numeric lane; freeze converts back.
All other buffer element types and pure-module storage retain their baseline.

**Typed views** store exact words in a Uint32Array with an aliased Float32Array
for numeric operations. Partitions retain bounded views; growth detaches and
resizes private storage. Copies retain raw words, arithmetic NaNs canonicalize,
and freeze materializes an ordinary logical list. This avoids the first design's
per-copy decoding/tag construction, but adds typed-array allocation, growth and
materialization costs.

**Decoded scalars** leave buffer storage unchanged. Fresh immutable F32 bindings
and eligible nonrecursive scalar parameters can keep a decoded Number alongside
their original bits. Arithmetic consumes the Number; copies, negation and opaque
calls keep bits. The existing bounded optional opportunity scan is shared with
arithmetic islands. This design can also change which later opportunities the
scan reaches; the experiment does not isolate those effects.

Each variant has six AB/BA fresh-process pairs against the same published image,
source, trained checkpoint and inputs. Median baseline/new time ratios are:

| Complete workload | Numeric buffers | Typed views | Decoded scalars |
| --- | ---: | ---: | ---: |
| Prediction, public call | 0.489× | 0.534× | 0.977× |
| Prediction, bound call | 0.484× | 0.542× | 0.974× |
| Training, no intervening predictions | 0.788× | 0.927× | 0.953× |
| Training, 4 predictions per observation | 0.809× | 0.835× | 0.959× |
| Training, 16 predictions per observation | 0.703× | 0.715× | 0.971× |

Below one favors the published baseline. Every prediction pair loses for both
buffer designs. Two typed-view training-only pairs are just above parity; all
their training-plus-prediction pairs lose. The complete per-pair ranges, seven
raw samples and process import/RSS observations remain in the archives. Nothing
was removed as an outlier or attributed to a demonstrated JIT/thermal cause.

Acquisition used Node 22.22.1 / V8 12.4.254.21-node.35 on the shared macOS arm64
workstation. No other local performance probe or Cargo compilation ran during
these cohorts. The host was not CPU-isolated. These are observations for this
workload, not universal layout rankings or an admitted planner model. They do
not establish whether a different dense/bulk workload could favor typed storage.

## Complete-result and ownership controls

Every one of the 36 measured processes first checks 27 independent reference
outcomes and exact snapshots plus sixteen independent dense F32 predictions.
The same complete-output runner as the published working-record study consumes
4,000 results per prediction sample. Training samples restore the identical
trained seed outside timing, then run eight observations with two Adam steps,
cancelled updates and the specified prediction cadence. Full feedback, events,
sinks and final checkpoints match across all variants and cohorts.

Targeted standalone tests use Rust 1.99.0 and Node 25.3.0 with the default stack.
Each final prototype passes the existing F32 carriers, float arithmetic islands,
affine record, parallel scope and ownership-alias tests. In particular the
record suite checks 1,731 pure cases in each float mode, 96 state outcomes and
17 restores, prepared reuse, detached results and real workers. The complete
61-test standalone suite was not rerun for these rejected implementations.

Both buffer designs additionally pass a new 1,540-case set in each float mode:
raw exceptional payloads, signed zero, clipping at u32 limits, bulk fill and
overlapping copy, adjacent rejoining, truncated-range growth, map/filter/scan,
readonly ranges, empty/fill constructors and actual parallel mapping. Public,
compiled-value and prepared calls preserve inputs and detached outputs. Each
mode executes 48 workers. These checks exercise private JavaScript prototypes;
there is no claim of new Rust/Wasm/GPU implementation parity or device training.

Retained failures include an initially untyped Rust u32-boundary fixture and a
test-harness misuse of the compiled-value result encoder. Both were corrected
without changing the checker. An earlier decoded-scalar source passed targeted
tests but was tightened after inspection: a decoding created inside a branch
must not become a fact about an enclosing aliased local. Final measured source
only adds local facts for fresh bindings. Source inventories distinguish these
stages. No compiler target or fingerprint was fabricated or restored.

## Reproduce and continue

Run `python3 reports/f32-storage-experiments-2026-10-17/audit.py` to check the
complete file set, all archives/source inventories, process receipts, every
deterministic result row and every statistic. Add `--run` to replay the retained
1,540-case typed-buffer control and the complete neural controls for all four
images. Replay timing is not a new performance cohort.

Each `sources/*.tar.gz` is a standalone source package with pinned core/ABI
dependencies, not a Cargo target. Extract to a new directory and use normal
`cargo build --locked --examples` / targeted `cargo test --locked` commands.
`acquisition/` retains the private construction/measurement scripts; `study.json`
binds each archive's individual files. Build receipts bind tested inventories and
genuine emitter hashes. The snapshots and source bytes are under `workload/`.

The result rejects adopting these particular changes as general defaults. It
does not reject representation alternatives, learned selection or specialization.
The next investigations should remove interpretation/staging work across larger
graph regions and measure any layout alternative over its full lifecycle, with
the existing exact-bit fallback and profitability gates. Full graph/tape
compilation, learned physical choices, device training and the complete
Handwired/Pretext/Freerange programme remain open.
