# Fusion40 ordinary result audit and analysis

Preparation only: this directory grants no timer or profiler permission. Use exact manifest-final.json and its exact runner. The analysis never reads General40 labels. Parent must grant an exclusive window, bind fusion/serial-gate.json, launch three separate ordinary Node processes serially and preserve their command/PID/output receipts. Defaults and source files remain unchanged.

The seeds are predeclared as2026114001/2026114002/2026114003 in process order. Each process uses all16declared frames, all12strictESM plus4residentWasm variants,64warmups,4ms calibration and9randomized interleaved rounds. Do not override frames, variants, warmups, rounds or Node optimization flags. Expected per-process coverage is256validation rows,16,384warmups and2,304samples. Preserve failed/partial outputs and contention snapshots rather than rerunning into the same paths.

From the ink-lang root, after parent authorization, launch each command as a fresh process with an absolute output path under the fusion directory:

```sh
node bench/diagnose-pipeline40.mjs --mode=reproduce --manifest=manifest-final.json --seed=2026114001 --output=ABS_FUSION/reproduce-1.json
node bench/diagnose-pipeline40.mjs --mode=reproduce --manifest=manifest-final.json --seed=2026114002 --output=ABS_FUSION/reproduce-2.json
node bench/diagnose-pipeline40.mjs --mode=reproduce --manifest=manifest-final.json --seed=2026114003 --output=ABS_FUSION/reproduce-3.json
```

The parent records processes.json with status=passed, contention_status one of unobserved/none_observed/observed, and three ordered records containing pid, argv, exit_code and raw_sha256. The actual PID/command is captured by the launcher; do not infer a fresh process merely from three output filenames. The template has no valid PID/hash or passed status. Process receipts and observation snapshots are trusted provenance, not a proof of exclusive scheduler access. Any observed external jobs must keep speed conclusions provisional.

Audit, then analyze without executing any target or clock:

```sh
python3 reports/web-stack-engine-40-2026-10-11/fusion/analysis-tools/results.py audit --raw ABS_FUSION/reproduce-1.json ABS_FUSION/reproduce-2.json ABS_FUSION/reproduce-3.json --processes ABS_FUSION/processes.json --output ABS_FUSION/timing-audit.json
python3 reports/web-stack-engine-40-2026-10-11/fusion/analysis-tools/results.py analyze --raw ABS_FUSION/reproduce-1.json ABS_FUSION/reproduce-2.json ABS_FUSION/reproduce-3.json --processes ABS_FUSION/processes.json --output ABS_FUSION/timing-analysis.json
```

Both modes revalidate hashes, exact CLI/seeds, full-output/nonmutation/lifetime coverage, calibration doubling/termination, nine rounds, full-vector checksums, consumed-element counts, final observable and exact randomized order. They reject profile or instrumentation results, partial variants and cross-boundary pooling. Analysis includes all12predeclared JS comparisons, four source/vectorizer Wasm comparisons and the ordinary-versus-no-vectorizers pipeline interaction. Static function-scoped IR counts/remarks are bound alongside results; they are not dynamic operation counts.

Every comparison remains separate by plain/composed context, left/right padded orientation, low/high value regime,4096/65536size and owned-JS/resident-Wasm boundary. Report each process ratio and medians. The combined ratio equally weights three process log-ratios; its bootstrap resamples process clusters. With only three clusters, nominal95%intervals are fragile, exploratory and uncorrected for many comparisons. Do not call nine within-process rounds independent process replicates.

Clone comparisons measure unchanged-source module/compilation-context sensitivity. Canonical U32/neutral arithmetic, typed storage, blocked loops and two-pass variants diagnose possible interactions. Typed outputs differ from the public Array representation; no replacement authority is granted. Two-pass retains one result allocation but may change JIT scheduling and integer representation. The staged-to-fused comparison removes intermediates as well as changing loops and is explicitly multifactor. Vectorizer switches change optimized code; their interaction is sensitivity evidence rather than a proved dynamic cause. No generalized superiority or compiler-default policy follows from these two historical source families.
