# Frozen fusion V8 profile recipe

Prepared only. The benchmark agent has not executed profiles, timers, tests, or builds. Parent execution must follow the ordinary three-fresh-process audit and an exclusive profiling grant. Preserve ordinary results, frozen modules, manifest, and runner. These four new profile processes have **no ordinary speed samples**.

The exact commands and source hashes are in `commands.json`; `receipt.template.json` carries PID, command, exit status, host, raw-log hashes, failure, ordinary-audit link, and serial-gate hash fields. Keep that template unchanged and complete a new receipt after execution. The selected cells are left-padded plain and scalar-helper-composed, high-value regime, 65536 words, prior/checked originals. They share the same fixture and public capture/owned-output boundary within each pair. This is an initial explanatory subset, not coverage of all orientations or value regimes.

From the repository root, after granting the gate:

```sh
FUSION40_PROFILE_AUTHORIZED=yes sh reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/parent-commands.sh
```

The script verifies exact runner/manifest bytes and the authorized hash-bound fusion serial gate, creates fresh directories (an existing directory is rejected), starts each exact Node command separately, saves its PID immediately, records even a nonzero exit, and waits serially. It does not grant authorization or modify the frozen runner. `--trace-opt --trace-deopt --prof` record optimization decisions and sampled hotspots together; profiling overhead can itself change tiering and allocation behavior.

For each actual V8 log discovered in the new run directory, process it with the **same Node executable/version** as the run, preserving raw bytes:

```sh
node --prof-process /absolute/path/to/actual-isolate-PID-v8.log > /absolute/path/to/new-processed-profile.txt 2> /absolute/path/to/new-processing-stderr.txt
```

Node may prefix the requested `v8.log` basename with isolate/PID details. Record every actual file and SHA in the receipt; do not assume the requested basename is the actual log. Record the Node executable/version and V8 version from each result, plus the exact processing command and both output hashes. Inspect source locations using the pinned module paths; generated primary methods share the name `__fn0`, so a function name without its path is insufficient attribution.

Before accepting any profile, require exit 0; `profile-result.json` status passed, mode profile, expected exact CLI/bindings; one full-output validation; changed-input/zero-divisor/nonmutation/owned-result-lifetime flags true; 64 successful warmups; one `profile_calls` record of 256 calls; no calibration or speed samples; and the declared weighted all-word observable. The existing frozen runner validates full vectors and original-input nonmutation, tests changed inputs with k=0 against an independent expert, and preserves an earlier owned result across later calls. Warmups validate full vectors. Profile calls consume every word; profile-mode calls use this deterministic checksum rather than a new full equality check on every call. Do not describe them as per-call full-output validation.

Keep validation/import/setup/first-tier and warmed computation distinguishable: the V8 trace covers the whole process and profiles include validation and warmup. The timed comparison boundary captures **both public input lists**, allocates owned results, and consumes all output words. Copying, checksum consumption, GC, and harness functions are legitimate sampled hotspots but do not establish an emitted-kernel regression. Where stacks permit, report primary source traversal, public capture, consumer, allocation/GC, and unattributed/shared-library ticks separately, with total sampled ticks and unaccounted proportions.

For each pair, record optimization tiers/OSR and exact deoptimization reasons/locations; hotspot fractions/tick counts in the primary method, capture, consumer, and GC; and whether a suspected source mechanism is compatible with ordinary repeated results. `__fn0` tiering, Smi/Number representation, branches/division, allocation/GC, and loop fusion remain hypotheses until matched evidence supports them. A bailout does not by itself prove a steady-state slowdown. Sampling fractions are not call cost, explicit loop instruction counts are not dynamic iteration counts, and this subset cannot prove a universal fusion penalty. Use canonical/typed/two-pass ordinary one-factor contrasts and existing native vectorizer reports as separate evidence; never merge profile results into ordinary speed ratios or claim JavaScript vectorizer behavior from LLVM reports.
