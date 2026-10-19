# Adaptive call transport and reusable ownership

The packed compute host now captures the ABI input domain directly into native
JavaScript values. F32 inputs normalize with their declared rounding; signed
zero and explicit nonfinite payloads survive exactly. Shape, byte counts and
finite flags are available without a pack/decode round trip. The shared ABI
selector chooses a target before Wasm/GPU words are materialized. CPU fallback
packs the already owned snapshot, including after JavaScript/device failure.

A profile-free default engine obtains its unconditional CPU decision once at
load through the same Rust/Wasm contract. Ordinary automatic CPU calls then use
the existing direct CPU boundary. Explicit/static JavaScript keeps borrowed,
caller-stable inputs. No arithmetic, derivative or backend algorithm changed.

`engine.prepareCall(name,args)` provides a separate fixed-input lifetime. It
owns the typed snapshot and topology once, retains needed packed words and
workload descriptors, and evaluates fresh primals on each `run(options)`.
Complete public results detach from its private captures. Close rejects new
runs and drains accepted work. Changing weights, cues or any other argument
requires new preparation. This does not turn ordinary calls into cached results
or resident GPU sessions.

Whole-call scopes are now `ink-complete-call-v2`, binding the source core,
generated CPU/JavaScript sources, runtime host and entry. Existing profiles need
new scope-bound measurements. Prepared scopes wrap this with
`ink-prepared-call-v1`; ordinary-call prices cannot select that different
lifetime. Missing comparable profiles still retain compiled CPU. No generated
benchmark profile is installed in an application or in knowledge.

## Fresh Nocturne control

Three fresh Node 22 processes, three Node 26 processes and three hardware Chrome
155 browser processes used identical generated JavaScript, CPU Wasm, shaders
and device adapters for both host versions. Each process measured 17 batches
per mode with alternating order. Results were checked outside timed intervals;
held-out values and independent reference outputs were also checked. The table
is the median of browser process medians for 100 cues, in microseconds.

| Complete call boundary | Previous host | New host |
| --- | ---: | ---: |
| Automatic, no profile; compiled CPU | 92.52 | 85.92 |
| Automatic, test profile selecting JavaScript | 163.98 | 50.12 |
| Reused owned capture, test profile selecting JavaScript | — | 8.44 |
| Direct generated JavaScript, shared control | 4.71 | 4.71 |

Profiled JavaScript calls improved **3.27×**; the 1024-cue control improved
**3.53×** (1524.14 to 431.41 µs). Node 22/26 showed 3.44×/3.33× improvements at
100 cues. Profile-free CPU calls improved modestly; packing remains necessary.
The hardware GPU still took about **729 µs** for 100 cues, so this result provides
no reason to default that workload to GPU. Its complete results and actual
hardware dispatches were checked.

Reused capture timing has a different lifetime. At 100 cues, the browser's
median capture for the profiled prepared engine was about 150 µs, followed by
about 230 µs for its first automatic run; engine load is reported separately.
The first preparation on the other engine has its own cold capture/CPU timings.
Finite-workload comparisons must count those setup costs and their call count.
The synthetic constant profiles force a path for timing and held-out value
checks; they are not fitted deployment evidence. Existing direct Nocturne
forecasting continues to use its direct JavaScript path. These are complete-call
microbenchmarks, not measured game frame-rate improvements.

Historical audit timings belong to an earlier compiler/engine epoch. These
numbers use fresh paired controls on current generated code. The numerical
[summary](../bench/functionality/owned-call-capture/performance-summary.json)
retains fresh-process medians and setup timings. Private source, generated
learning code, raw application timings and reproduction inputs remain in the
private Nocturne audit.

## Validation and reproduction

The [public proof](../bench/functionality/owned-call-capture/README.md) uses an
independently authored four-field program. It retains exact runtime assets,
reference inputs/results, source pins and executable JS/Wasm/shaders; it copies
no dependency or compiler build targets. Source regeneration matched the selected
JavaScript, host, ABI and Wasm bytes at the recorded toolchain epoch.

Validation covered 27 ABI tests, all 104 runtime JavaScript checks on Node 22
and 26, nine standalone runtime Rust tests, and 35 distribution GPU/compute,
adaptive-bundle and adaptive-host checks. Generic source/reference/JS/Wasm
checks include 42 comparisons, empty and held-out shapes, exact NaN payloads,
signed zero, mutation and detached repeated results. The private forecast adds
36 independent reference/JS/Wasm comparisons. Browser checks exercise actual
Apple Metal GPU dispatch with matching complete results. The main CI workflow
now runs the owned-boundary host regressions, native packed ABI checks and
retained generic replay; full CI completion is reported separately.
