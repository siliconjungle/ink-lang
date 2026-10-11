The matching captured-JS acquisition is offline and untimed. It includes the
actual frozen runner input capture and complete-word consumer; module-only C
smoke counts are not supplied as complete-call feature vectors. Rust and GPU
required work remain unavailable unless separately acquired. No model is fit yet.

```sh
python3 knowledge/producers/target_work40_prepare_js.py \
  --report REPORT --version candidate --compiler FROZEN_CANDIDATE \
  --parser reports/web-stack-engine-40-2026-10-11/cost/tools/node_modules/acorn/dist/acorn.mjs \
  --output reports/web-stack-engine-40-2026-10-11/cost/general40-candidate-js-boundary
```

Combine the baseline and candidate `features.json` rows into a fresh manifest
with absolute sidecar paths; preserve every id/split/version. Baseline acquisition
is `cost/general40-baseline-js-boundary`. A raw-label bridge verifies the final
`node-audit.json`, all final metadata bindings and exact timed source/core/
selection/target bytes against those features. It rejects a boundary mismatch.

After exclusive timers and the raw Node audit complete:

```sh
python3 knowledge/producers/target_work40_labels.py training \
  --report FINAL_REPORT --features COMBINED_FEATURES \
  --protocol reports/web-stack-engine-40-2026-10-11/cost/protocol-general40-before-observations.json \
  --output TRAINING_LABELS
python3 knowledge/producers/web_cost40.py freeze \
  --protocol reports/web-stack-engine-40-2026-10-11/cost/protocol-general40-before-observations.json \
  --features COMBINED_FEATURES --training TRAINING_LABELS --output FROZEN_MODELS
```

The freeze reads no heldout label file. It stores every coefficient, rank/support,
unidentified column, unsupported cohort, failure and prediction before evaluation.
Only then:

```sh
python3 knowledge/producers/target_work40_labels.py heldout \
  --report FINAL_REPORT --features COMBINED_FEATURES \
  --protocol reports/web-stack-engine-40-2026-10-11/cost/protocol-general40-before-observations.json \
  --frozen FROZEN_MODELS --output HELDOUT_LABELS
python3 knowledge/producers/web_cost40.py evaluate \
  --frozen FROZEN_MODELS --heldout HELDOUT_LABELS --output EVALUATION
```

The train split is affine/compaction/scan at 64 and 8192 only. Every 512 cell and
whole other family is excluded from fit. All five paired samples remain in fit;
no rounding or controls. The fixed deterministic NNLS protocol is unchanged by
observations. No failed fit is clipped/refit and no heldout loss removed. Models
stay opt-in; no per-call tracing, value scan, cheap online prediction or selector
speed claim. Fixture acquisition, instrumentation and oracle setup are excluded.

Canonical import preparation after coefficient freeze and evaluation:

```sh
PYTHONPATH=knowledge:planner python3 knowledge/producers/import_target_work40.py \
  --features COMBINED_FEATURES.json \
  --labels TRAINING_LABELS.json HELDOUT_LABELS.json \
  --frozen FROZEN_MODEL_DIRECTORY \
  --output FRESH_CANONICAL_IMPORT_DIRECTORY
```

This produces candidate `entries.json`, `names.json`, `observations.json` and a
bound receipt without changing the canonical store. The parent publisher merges
ordinary definition entries with the pinned catalogue, then separately inserts
measured observations using `Store.observe`. It must retain the source-bound
candidate checking boundary. No diagnostic definition is a semantic theorem;
no model is enabled by this preparation. Exact model JSON and fractional sample
strings remain in diagnostic definitions; the legacy timing index uses rounded
integer strings and leaves peak memory unknown.

For fitting, use the audited restricted view exported by
`general/runbook/training-view.py`. Supply `--training-view TRAIN_VIEW.json` to
`target_work40_labels.py training` alongside the unchanged report/features/protocol
arguments. The importer hashes the whole audited raw result for binding but does
not decode its sample JSON in this mode. Only the restricted48trainingcells enter
labels; all five rounds remain required. Full heldout label extraction requires
an existing frozen model/predictions directory.
