# Explicit GPU calibration of a V8-derived quotient rewrite

Ink's pre-existing, independently checked U64 quotient-by-eight equality plan
improves this warm GPU workload on the observed Apple/Metal adapter. A new generic
planner companion acquires complete-call evidence for arbitrary supported equality
plans. Neither the new adapter nor these observations change automatic selection.

| Pinned compiler cohort | Held-out baseline | Held-out checked rewrite | Median paired ratio |
|---|---:|---:|---:|
| Historical integer-law image (`9dd57e18da8c`) | 2.710 ms | 0.685625 ms | 3.9551 |
| Distribution source `e62614e33e5d` (`8b3d7d14a058`) | 6.2775 ms | 0.7075 ms | 8.9576 |

Times are medians of three fresh-process medians. Ratios are medians of the three
within-process ratios. Every training and holdout process passes a stricter
control: the rewrite's largest sample is below 90% of the baseline's smallest
sample. Both implementations receive the exact same observed physical GPUDevice.
Every result matches the original core evaluator before and after timing, and
all outputs are consumed inside the clock. Lengths, values and normalized typed
input identities are disjoint between training and holdout.

The emitted browser execution assets are byte-identical between the two compiler
cohorts (`execution-asset-comparison.json`, archived). These cohorts **do not show
a compiler-version speedup or regression**. This is a shared workstation, and
absolute timing varies. Each paired comparison demonstrates the effect of the
explicit equality rewrite on that cohort. This is a particular workload, not a
claim about all Ink software or a renewed comparison against Frontier.

The timed async call includes capture/upload, dispatch, readback, decoding,
independent device observation hooks and complete consumption. Browser/device
startup, module load, first call with lazy shader setup, reference validation and
CPU fallback compilation are recorded separately. First-call costs vary; no
cold-start, complete-lifecycle or GPU-versus-CPU placement claim follows. Whole
browser/renderer/GPU peak memory remains unknown. Per-buffer runtime counters
are not a peak-memory estimate. Hardware model details hidden by browser privacy
remain empty; the exposed identity is provenance, not unique-device attestation.

Source is the frozen `integer-division/javascript/core.json`, with its original
empty baseline and checked shift-three plan. The companion replays each plan
before literal WebGPU emission. Independent hooks require positive real compute
dispatch/submission/readback, matching the runtime's dispatch count. Six actual
hardware rejection controls reject wrong/rounded results, input mutation, CPU
fallback, spoofed dispatch counts and fake GPU labels without device work. The
valid baseline survives. Exact U64 JSON words, raw F32 bits, vector dimensions,
record fields, source bindings and request seals have additional regressions.

Twenty-four timing-only canonical observations retain both cohorts, each with its
original source/full-plan identity, exact context, explicit-device bridge and
unknown memory. They grant no equality, range, automatic-selection or cache
reuse authority. They are distinct from the automatic adapter's implementation
identities. Missing comparable lifecycle/memory evidence continues to retain the
compiled CPU baseline.

## Reproduction

`selected-inputs.tar.gz` retains the selected checked source/plans, workloads,
source oracle receipts, exact execution bundles, CPU source/locks/Wasm, raw
requests/process reports, test logs, rejection fixtures and build/package pins.
`selected-inputs-index.json` hashes every archived file. Executable images remain
local selected reproducibility baselines, not Git binaries. The historical build
pins are also supplied in `historical-compiler-pins.json`; current cohort pins are
`current-cli-pins.json` inside the archive.

The original adapter source is planner commit
`6b4f66ef94275d30566919f83161ee08f1a7c9b1`. Use that revision to reproduce the
recorded context. The subsequent owned-browser timeout cleanup changes only the
host/controller; `measure()` bytes remain identical and the old receipt contexts
have not been relabelled. A normal current acquisition uses:

```sh
PYTHONPATH=knowledge:planner python -m ink_planner.gpu_measurements \
  --compiler /path/to/pinned/ink \
  --source extracted/current-main/source.core.json \
  --plan extracted/current-main/plan-0.json \
  --plan extracted/current-main/plan-1.json \
  --training extracted/training.json --holdout extracted/holdout.json \
  --browser '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  --scratch fresh-device-acquisition --timeout 900
```

Use the local Cargo entry point and exact source preflight, built-in WebSocket
Node, a Wasm-capable Rust toolchain and an actual supported hardware adapter.
Requests and raw receipts retain their historical absolute paths intentionally;
a new acquisition creates and seals new requests at the reproduction location.
Do not edit acquisition inputs while it runs. Build targets, failed/intermediate
cohorts and private corpus indexes are not retained as selected evidence.

The paired frozen ten-program corpus outputs live at
`../corpus-device-calibration` and `../corpus-device-current`. These are default
planner regressions, separate from the explicit device performance comparison.

Run `python3 bench/v8-learning/device-calibration/audit.py` to verify every
archived byte, paired summary, actual-device counter, rejection control and
canonical observation identity without rebuilding or launching a browser.
