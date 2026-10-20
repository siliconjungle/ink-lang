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
- `config.json` protects all fourteen cases against the initial prepared-API
  artifact from JavaScript package `c0b94f3caa732d869c940f69fa05bf5a4d5fb32b`.
  This preserves the new gains instead of keeping the old materialization cost
  as a loose future regression floor.

Both use the same mandatory policy. For the full new-API floor:

```sh
node tools/engine-gate/gate.mjs \
  --config bench/functionality/call-boundaries/config.json \
  --compiler target/debug/ink --out build/call-boundary-rollout \
  --node22 /absolute/path/to/node-22.22.1 \
  --node26 /absolute/path/to/node-26.1.0 \
  --chrome /absolute/path/to/google-chrome
```

Each engine has three fresh processes, equal warmup of at least 65,536 calls,
a 250 ms baseline warmup target, calibrated 24 ms batches, fifteen alternating
samples and byte-identical A/A controls. Every case/process must satisfy the
unchanged maximum of 10% or 0.02 microseconds regression budget; A/A differences above the same maximum of 10% or 0.02 microseconds, or
inconsistent process verdicts, block the gate. Engines are separate.
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
