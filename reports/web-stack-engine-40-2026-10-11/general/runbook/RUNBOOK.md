# General40 final preparation and serial measurement

This runbook grants no timing authorization. The parent supplies the frozen candidate path/SHA and grants each exclusive host window after all preparation and correctness gates pass. General40 benchmark sources, fixtures, dimensions, model, ownership boundaries and timing protocol stay unchanged. The published compiler is distinct from the previously measured baseline.

The declaration is 12 tasks, 492 correctness frames and 288 timed cells. The training view has exactly48cells: affine/compaction/scan at64/8192. The other240timedcells are excluded from fitting; size512 plus every other family is held out. The eight Engine39 families have already been observed, so reused-family evaluation is exploratory. The four added families are disjoint from this fit. Every vector word is consumed, and ownership/transfer/setup boundaries remain separate.

## Prepare and validate without timing

Run from the ink-lang root after receiving the candidate SHA. Substitute the parent-supplied path for `CANDIDATE_PATH`. Preserve existing preparations; choose another fresh report if this one already exists.

```sh
python3 bench/web-stack-general40.py prepare --candidate-compiler CANDIDATE_PATH --knowledge reports/web-stack-engine-40-2026-10-11/general/knowledge-index-cache --snapshot reports/web-stack-engine-40-2026-10-11/general/declaration/baseline-knowledge-snapshot.json --report reports/web-stack-engine-40-2026-10-11/general/prepared-final
python3 bench/web-stack-general40.py node --validate-only --report reports/web-stack-engine-40-2026-10-11/general/prepared-final
python3 bench/web-stack-general40.py audit --validate-only --host node --report reports/web-stack-engine-40-2026-10-11/general/prepared-final
python3 bench/web-stack-general40.py native-prepare --report reports/web-stack-engine-40-2026-10-11/general/prepared-final
python3 bench/web-stack-general40/preparation-audit.py --report reports/web-stack-engine-40-2026-10-11/general/prepared-final
python3 bench/web-stack-general40.py serve --report reports/web-stack-engine-40-2026-10-11/general/prepared-final --port 8906
```

The parent opens `http://127.0.0.1:8906/browser.html`, runs Validate only, then audits:

```sh
python3 bench/web-stack-general40.py audit --validate-only --host browser --report reports/web-stack-engine-40-2026-10-11/general/prepared-final
```

Bind candidate compiler, exact catalogue snapshot, fixed cost model, generated core/selection/modules/shaders, harness and all validation receipts before timing. The private index is disposable and grants no authority; selected proofs still pass the semantic checker. No active catalogue/index mutation or candidate forcing occurs. Archive source-selected differences rather than assuming both compilers select identical bodies. Emitted Rust is real separately compiled method data, never C data relabelled as Rust; capability failures stay explicit. Into/destination cohorts do not pool with Rust owned Vec cohorts.

Expected complete capabilities give15Nodevariants and7,380validation rows, plus6native libraries and2,952native validation rows. Browser residency/actual-device counts must be derived from final metadata capabilities and actual results, not these estimates. Static eligibility is not actual GPU validation.

## Serial timing and structural audit

`serial-gate.template.json` has authorized=false. The parent creates the real `prepared-final/serial-gate.json`, binds its metadata SHA, and explicitly grants one host at a time. All agents/builds/profilers must be idle. Do not run the commands below before that grant. Gates do not waive correctness or source drift checks.

```sh
python3 bench/web-stack-general40.py node --serial-gate reports/web-stack-engine-40-2026-10-11/general/prepared-final/serial-gate.json --report reports/web-stack-engine-40-2026-10-11/general/prepared-final
python3 bench/web-stack-general40.py audit --host node --report reports/web-stack-engine-40-2026-10-11/general/prepared-final
```

Release the Node window. Native starts only after its separate parent grant:

```sh
python3 bench/web-stack-general40.py native --serial-gate reports/web-stack-engine-40-2026-10-11/general/prepared-final/serial-gate.json --report reports/web-stack-engine-40-2026-10-11/general/prepared-final
python3 bench/web-stack-general40.py native-audit --report reports/web-stack-engine-40-2026-10-11/general/prepared-final
```

Release the native window. The parent then grants and runs browser timing in the headed device session. Finish with:

```sh
python3 bench/web-stack-general40.py audit --host browser --report reports/web-stack-engine-40-2026-10-11/general/prepared-final
```

Five randomized interleaved rounds, two web warmups,2ms calibration and16,384maximumiterations are unchanged. Native retains its continuous timer, full-word consumer/reset, three per-process prewarm calls and linear flushed NDJSON journal. Full requests versus resident inputs, complete owned readback versus reused destinations, and native versus browser hosts stay separate. Preserve partial/failure journals; no rerun or pooling to hide losses. Cold startup is not represented by warm import/first-call diagnostics.

## Training data and heldout lock

The existing runner executes the complete frozen protocol once. Until coefficient/prediction freeze, use raw rows only for integrity, coverage, checksum, boundary and device-counter audits. Those structural checks may read durations but never compute or expose heldout comparisons, winners or fit targets. Do not call summarize, evaluate heldout rows or inspect comparative heldout performance.

After the Node structural audit passes, export a restricted training view:

```sh
python3 reports/web-stack-engine-40-2026-10-11/general/runbook/training-view.py --report reports/web-stack-engine-40-2026-10-11/general/prepared-final --output reports/web-stack-engine-40-2026-10-11/general/prepared-final/training/node-training-view.json
```

The view includes only48declaredtraincells and all their variants/rounds, binds the full audit and immutable source fixtures, and excludes all240heldouttimedcells. It computes no ratios/classifications. The cost producer matches only exact acquired target/boundary/source/fixture features and converts supported training samples to its strict `ink-target-work-training-v1` schema. Unsupported Rust/GPU work features retain baseline. Missing features are unknown, not invented from source operations or graph capacities.

Freeze coefficient bytes **and predictions for every heldout feature/cell** before opening heldout performance labels. Bind protocol, sidecars, training view/importer, training rows, coefficients and predictions in the freeze receipt. Then heldout evaluation and host summaries are permitted. Freezing coefficients alone is insufficient if prediction rules/features are changed after seeing labels. No fresh model is fed back into this baseline/candidate physical-emission benchmark; its unchanged compile-time model isolates the engine comparison.

## Publication checks

Report gains and losses against both old compiler and strong controls, separated by exact host/ownership/transport boundary. Update/recompute input frames match by dimensions, allowing a fastest-predeclared same-operation expert challenge without new timers. C-native is an Ink C target, separate from emitted Rust-native. All current baseline selections have zero DB applications; attribute physical changes to lowering unless final receipts demonstrate an actual checked selection difference. No generalized superiority follows from the diagnostic family alone.

Frozen boundary goldens/checksums are correct. Their `reverse_order_negative_witness` descriptive flags were constructed before the k=0 edge override; do not count those flags for edge frames. Timed order witnesses remain valid. Reused historical families, noisy within-process intervals, trusted wrapper/toolchain extraction, shader traversal unknowns and warm startup scope remain disclosed.

## Restoring published evidence and exact cost replay

Restore the large artifacts with `python3 bench/web-stack-report-archive.py restore --report reports/web-stack-engine-40-2026-10-11`. The absolute-symlink private index and installed Node dependency directory are disposable and excluded from publication. Rebuild the private index with `python3 bench/web-stack-general40/private-index.py` and install the exact locked parser dependency with:

```sh
npm ci --prefix reports/web-stack-engine-40-2026-10-11/cost/tools --ignore-scripts --no-audit --no-fund
```

Frozen cost training/heldout/context receipts contain source paths under `/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang`. Exact freeze/evaluate/import replay validates those paths as well as hashes and requires that same prefix layout. Restoring bytes in a moved checkout does not automatically relocate these immutable receipts. Do not edit bound receipts to disguise relocation. A fresh preparation/acquisition in another location must use fresh output directories and new bound receipts; that is a new experiment. Existing raw result and relative-artifact audits remain available after lossless restoration.

Historical serial gates document permission for completed runs only; their separate release receipts end those windows. They grant no future timing permission. This pass serialized its own agents and clocks but did not isolate other chats or the OS scheduler, so all timings remain provisional.
