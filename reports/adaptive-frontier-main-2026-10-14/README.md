# Main adaptive Ink versus Frontier — 14 October 2026

**Adaptive Ink loses to both Frontier controls on all six tested histories.**
Main was fetched and frozen at `e7f3ec476250c8cfa1ea5d2f0fe3a5a479cf272c`.
The compiler and package sources were exported from its exact pins; local
unpublished compiler/ABI changes are excluded. Frontier main was frozen at
`9ff840ea690e55fd8c064934f92a26c1603a63fa`, still current when fetched.

Three fresh Node 26.1.0 processes on Apple ARM, seven rotated rounds per trace.
First two rounds are retained as warmup and excluded from summaries. 128 numeric
rows, 512 calls per phase. Values below are milliseconds, median of process
medians. Every process independently shows an adaptive loss on every trace.

| Trace | Adaptive Ink, 512-call window | Frontier scan | Frontier maintained sum |
|---|---:|---:|---:|
| Steady reads | 44.23 | 12.48 | 2.98 |
| Steady writes | 37.03 | 5.87 | 5.28 |
| Writes → reads | 77.17 | 14.27 | 4.94 |
| Reads → writes | 172.04 | 10.43 | 4.89 |
| Alternating phases | 65.89 | 9.64 | 4.41 |
| Sparse updates | 150.06 | 11.27 | 4.36 |

The scan control uses Frontier's actual state engine and patch commits, then scans
rows for the sum. The maintained control uses the same engine with an explicitly
authored equivalent running sum. This is a stronger control, not a claim that
Frontier automatically invents that aggregate. Both adapters add matching Ink
reply, version, event and rollback observations. Comparisons use the common
finite exact safe-integer domain. Frontier does not implement Ink portable
snapshots: its logical rows, complete event history and version are checked.

Separate conformance checks compare full replies and failed-update rollback with
direct Ink. Timed executions consume every result/version/event and check the
checksum; final complete events, versions and rows are checked for Frontier.
All Ink variants and adaptive execution match exact portable snapshots.

## What the fixed controls show

On steady reads, fixed cached Ink takes **6.16 ms**, versus **58.67 ms** for
direct Ink and **12.48 ms** for Frontier scan. The useful implementation exists;
the adaptive host initially executes direct queries and then pays capture,
queue, recording, decision and migration costs. Frontier's maintained sum is
still faster than fixed cached Ink on this fixture.

On steady writes, direct Ink takes **8.22 ms**, the non-recording fixed host
**30.69 ms**, and adaptive **37.03 ms**. Capture and serialized Promise scheduling
produce a large observable host increment before recording/selection. The cached
variant costs **516.30 ms** for these writes. A read-to-write reversal temporarily
keeps that expensive variant active. A 64-call window improves this reversal
(**70.98 ms**), but worsens alternating phases (**235.23 ms**).

This supports fixed execution for these histories and retaining workload-based
compile-time selection. It does not establish that every workload or future
adaptive implementation benefits from disabling adaptation.

## Timing and limits

Timings include complete session restoration/setup, every call and result
checksum, recording, decisions, migrations and restored-state comparison.
Imports, compilation/proof checks, offline development price acquisition,
forced GC and final validation are outside timings. The profile was acquired
from homogeneous development calls before the evaluation histories; evaluation
calls do not fit prices. Ordinary plan checks admit both variants before emission.

Shared development host with uncontrolled concurrent work. Acquisition outliers
and process variation are retained. No confidence intervals, tail-latency claim,
heap/import/startup ranking or JSON text/transport comparison. Main's optional
JSON lookup view is a separate API and is not exercised by this aggregate fixture.

## Reproduce

Prepare the aggregate bundle and acquire a fresh profile with main's
`bench/adaptive-state/prepare.py` and `bench/adaptive-state/run.mjs`, using an
exact-main compiler and a device-specific target key. Then run:

```sh
node --expose-gc bench/adaptive-learning/frontier-main-frozen.mjs \
  build/adaptive-main-frontier/aggregate/bundle \
  build/adaptive-main-frontier/acquisition.json.fitted.json \
  build/adaptive-main-frontier/frontier-0.json 0
```

Repeat in fresh processes with outputs `frontier-1.json` / `frontier-2.json`
and rotations `2` / `4`. `summary.json` retains all process medians. The raw
timings, profile, ordinary plan receipts, exact package pins and generated bundle
are archived here. `manifest.json` binds archived artifacts and compiler bytes;
the raw reports identify the actual Frontier modules and runner. Production code
is unchanged.
