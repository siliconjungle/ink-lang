# Complete JavaScript call boundaries

This Ink-owned corpus covers scalar arithmetic, numeric lists, record maps and
stable membership indexes. Its fourteen cases separate ordinary public calls,
owned calls, public destination calls, explicit sealed prepared destinations,
and capture/preparation included in the timed interval. Application repositories
are not inputs to this corpus.

The preceding compiler cannot write prepared results directly to public storage.
Its comparison adapter calls `callPreparedCompiled`, materializes its result, and
converts each element while writing the destination. It does not create an extra
top-level conversion array. The new API writes into the same destination shape.
Both paths preserve complete outputs and tails, including raw NaN payloads and
signed zero. Forty independent verification checks run for every module/process;
timed batches consume complete results outside the measurement interval.

Preparation and sealed captures are outside the steady-state cases. The separate
`shift-prepare-call-8` case times capture, preparation, invocation and destination
writes together. These are warmed execution measurements; they do not price
first-ever JIT compilation, application ticks, server capacity or frame rates.

See [the API contract](../../../docs/prepared-destinations.md). Internal Ink calls
already use private targets, so public-wrapper savings apply at the host boundary.
Prepared-destination gains require using the new explicit API. Updating Ink alone
does not regenerate a consuming application's checked exports.

## Reproduction

Build the proposed compiler outside timing. CI uses two explicit floors, alongside
the original forecasting/learning corpus:

- `existing-api-config.json` compares the eight existing public/owned/Into cases
  with the preceding compiler. `existing-workload.mjs` is a frozen self-contained
  projection of the same adapter with only its case list filtered.
- `config.json` protects all fourteen cases against the prepared-API floor
  `prepared-floor-2026-11-11.mjs` from JavaScript package
  `9d8bdf5e66e03fb83f2c07e91a4f5e4a0ad24fec`. This preserves the new gains
  instead of keeping the old materialization cost as a loose future regression
  floor. The initial floor `prepared-baseline.mjs`, from JavaScript package
  `c0b94f3caa732d869c940f69fa05bf5a4d5fb32b`, and all of its evidence below
  are retained unchanged; see "Second prepared floor".

Both use the same mandatory policy. For the full new-API floor:

```sh
node tools/engine-gate/gate.mjs \
  --config bench/functionality/call-boundaries/config.json \
  --compiler target/debug/ink --out build/call-boundary-rollout \
  --node22 /absolute/path/to/node-22.22.1 \
  --node26 /absolute/path/to/node-26.1.0 \
  --chrome /absolute/path/to/google-chrome
```

Each engine has five fresh processes, equal warmup of at least 65,536 calls,
a 250 ms baseline warmup target, calibrated 24 ms batches, fifteen alternating
samples and byte-identical A/A controls. Every case must satisfy the
unchanged maximum of 10% or 0.02 microseconds regression budget in a strict
majority of the processes whose A/A control is within the same maximum. At
least three of the five processes must be trusted that way; a majority over
budget is a regression and a tie blocks as inconclusive. Engines are separate.
Import times and emitted bytes are recorded separately. No automatic planner
choice or arithmetic rewrite follows from these measurements.

Replay current emission against unchanged reference and retained native/Wasm
controls without copying dependency or knowledge stores:

```sh
python3 bench/functionality/call-boundaries/replay.py \
  --compiler target/debug/ink --out build/call-boundary-conformance \
  --node /absolute/path/to/node-22.22.1 --node /absolute/path/to/node-26.1.0
```

The [unpromoted broad-wrapper runs](rejected/README.md) retain the Chrome forecast
regression and A/A noise that narrowed the implementation and extended warmup.
Their original settings are preserved; do not mix them with the selected epoch.

## Comparison evidence and admission

`comparison-config.json` retains the complete old-versus-new API comparison. Its
aggregate verdict is inconclusive because one Node 22 record-preparation A/A
ratio was 1.1015. All candidate process medians stayed within the regression
budget; the prepared-call savings remain observations with that noise caveat.
Do not use that comparison receipt for promotion. Existing APIs have their own
prior-compiler gate, while the explicit new API has its reviewed initial floor.
No engine, budget, adverse process or failed comparison is averaged away.

## Selected results (20 October 2026)

The three release gates pass for all three engines and all processes. The
comparison below reports median per-process wall-time reductions; it does not
average engines. Positive values mean less time.

| Existing call | Node 22 | Node 26 | Chrome |
|---|---:|---:|---:|
| Scalar public F32 | 83.0% | 83.7% | 90.9% |
| Scalar owned F32 | 34.4% | 37.3% | 36.4% |
| 100-value public map | 0.4% | 0.3% | 1.3% |
| 100-value public Into | -1.8% | -1.8% | -1.2% |
| 100-record public map | 0.2% | -0.1% | 0.3% |

| New prepared destination vs previous materialization API | Node 22 | Node 26 | Chrome |
|---|---:|---:|---:|
| 100 numeric values | 74.6% | 73.3% | 76.1% |
| 100 records † | 88.2% | 84.4% | 82.6% |
| 100 membership queries | 25.3% | 24.3% | 21.5% |
| Capture + prepare + 8-value call | 25.4% | 20.2% | 23.8% |

† The comparison aggregate remains inconclusive: one Node 22 record A/A process
exceeded 10% (1.1015). Its observations are retained with that caveat; they are
not the promotion receipt. Numeric prepared and other comparative rows satisfy
their per-process budgets. The final compiler emits byte-identical corpus
artifacts after the copier namespace fix.

Emitted bytes: preceding artifact 165,983; new artifact 174,412. Import timings are retained and are not a startup-speed claim.

Terminal result arrays disappear for eligible scalar maps. Argument assembly,
intermediate stages, residual result lists and detached record outputs can still
allocate. The record-map source helper still returns a private record before
structured detachment; this work does not make that path allocation-free.

Validation: 70 standalone JavaScript tests (Node 22), 26 integrated JavaScript
tests (Node 26), 33 GPU-package tests and 9 runtime tests passed. The final
current-emitter replay checks 5,390 derivative executions and 612 exact state
outcomes/snapshots on each Node engine, plus a retained native/Wasm control of
204 outcomes for the identical checked core image. These are finite checks.

Saved artifacts: the three `release-*-receipt.json` files and candidates,
`comparison-receipt.json`, `summary.json`, `validation.json`, compressed test
logs, exact final conformance inputs/results, dependency locks, and the known
field-label regression before/after program are retained here.

## Second prepared floor (11 November 2026)

The initial floor registered every captured value, call result and prepared
token in a module-wide `WeakMap`. `shift-prepare-call-8` captures and prepares
on every call, so on that floor it mostly measured weak-table insertion and
when the collector swept the table. In each of the eight CI gate runs examined
between 9 and 11 November the byte-identical control for that case missed its
own baseline by more than the 10% control budget on Node 22.22.1 or Node 26.1.0
(control ratios from 0.49 to 1.90), so the gate was inconclusive for every
changed module, whatever the module did. The other failure in that period,
`shift-prepared-100` at 1.23x to 1.34x on Node, was a real regression and was
fixed in the JavaScript package before this floor was taken.

The second floor is the module emitted by distribution
`86a4c8bac20bbc728d5b744ba482f77793a58354` with JavaScript package
`9d8bdf5e66e03fb83f2c07e91a4f5e4a0ad24fec`. It keeps a handle's payload in a
private field and converts records at public calls through literals. CI run
42933071350 measured exactly this module against the initial floor with the
required gate. Medians of the five process ratios:

| case | Node 22.22.1 | Node 26.1.0 | Chrome |
| --- | ---: | ---: | ---: |
| scalar-f32 | 1.00 | 1.00 | 0.98 |
| scalar-owned-f32 | 1.00 | 1.00 | 1.01 |
| shift-public-8 | 0.15 | 0.16 | 0.19 |
| shift-into-8 | 0.18 | 0.17 | 0.20 |
| move-public-8 | 0.42 | 0.43 | 0.39 |
| shift-prepared-8 | 0.97 | 0.97 | 0.90 |
| move-prepared-8 | 0.99 | 0.99 | 0.97 |
| shift-public-100 | 0.14 | 0.16 | 0.16 |
| shift-into-100 | 0.22 | 0.22 | 0.21 |
| move-public-100 | 0.53 | 0.53 | 0.49 |
| shift-prepared-100 | 1.04 | 1.02 | 0.96 |
| move-prepared-100 | 0.99 | 0.98 | 1.00 |
| indexed-prepared-100 | 1.00 | 1.02 | 1.02 |
| shift-prepare-call-8 | 0.27 | 0.24 | 0.42 |

Every case passed on Chrome, and every case but the last passed on both Node
versions. The last was reported inconclusive on Node because the initial
floor's control ratios ran from 0.54 to 1.90, not because of this module. No
engine shows a regression that another engine's gain is being used to excuse.

With the second floor as its own candidate, the gate's Node procedure run on a
two-core development machine passes all fourteen cases on Node 22.22.1 and
Node 26.1.0, with control ratios for `shift-prepare-call-8` between 0.86 and
1.04. Chrome was not available on that machine.

`config.json` keeps the initial floor's hash frozen beside the new one, so
neither file can change unnoticed. `initial-prepared-config.json` is the
configuration as it stood for the initial floor, byte for byte, so the
`release-prepared-receipt.json` binding recorded on 20 October still names a
file that exists.
