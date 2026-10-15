# Structured preparation

Compare the same checked source and complete trained state under JavaScript
emitter `ae78b7eb` (scalar retention) and `62ea46f8` (immutable structured keeps).
Both harnesses use the distribution's current core checker. No optimizer or
algorithm replacement is selected. `control/` and `current/` pin the emitters;
all generated modules and raw samples are retained in
`reports/structured-preparation-2026-10-16`.

Build the two standalone harnesses with `--locked` and an external target directory.
Each takes `SOURCE.core.json OUTPUT.mjs [EMISSION_COUNT]`. Use the captured
`neural/source.core.json` and `table.core.json` rather than re-resolving imports.
The prepared package uses twelve authored training frames; its initializer contains
all optimizer/control state and pending events.

`run.mjs run ARTIFACT BASELINE.mjs OUTPUT.json` checks sixteen contexts against an
independent dense F32 forward implementation, warms both complete state calls and
a separate dense kernel, then interleaves eleven random-order samples of 2000
predictions. Three fresh processes per development/holdout cohort retain 198 timed
samples. Every output component is consumed. Dense timing excludes state/ABI
handling and is a lower-bound control, not an equivalent deployment.

`table.mjs run BASELINE.mjs CANDIDATE.mjs OUTPUT.json` checks empty, one-row,
128-row and 4096-row data, exact snapshots, selected/full owned outputs, cold private
caches and eight-turn update/read histories. Full output consumption includes
strings, nested values, words and raw float payloads. `memory.mjs` runs each
implementation in its own fresh process at 1024/16384 rows, releases public replies
and collects twice. Heap/RSS include engine overhead; observations are not a bound.

`training.mjs run ARTIFACT BASELINE.mjs OUTPUT.json` warms 128 frames, randomizes
cadence order and times complete eight-turn histories: two Adam updates per frame,
0/4/16 predictions per turn and a rolled-back frame every four turns. Feedback and
complete checkpoints must agree, including across read cadences. Restore,
checkpoint comparison, persistence and device work are outside timing. The earlier
`training-pilot.json` used insufficient warmup and ordered cadences; it is excluded
from current conclusions because it overstated the training-only gain.

`emission.mjs` runs identical harnesses in fresh processes with five literal
emissions each. Source decoding/checking and emission are reported separately;
this excludes training, planner search and native toolchain compilation.
Import/factory observations in the neural runner execute direct before prepared;
retain them as descriptive phase costs rather than a reliable startup ranking.

Run `analyse.py DIRECTORY --check` to check hashes, sample coverage and derived
statistics. Ratios below one are regressions. Cold, memory, training-only and
one-read-per-write losses are part of acceptance evidence. Measurements do not
authorize a rewrite, select a profitable plan or establish Handwired/Pretext parity.
