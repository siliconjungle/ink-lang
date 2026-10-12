# Knowledge growth on frozen execution machinery

The checked experiment is `reports/knowledge-growth-2026-10-13/README.md`.
This directory contains acquisition, universal authoring, generic template
replay, ordinary default planning, full-output timing, separate memory acquisition,
paired uncertainty, charts and proof export. Source names never choose a law.

The immutable protocol, corpus, inputs and independently pinned repositories are
in the report. **Do not run `freeze.py` over an existing report:** it is the
initial preregistration/acquisition operation, not a reproduction command.

For exact historical replay, use distribution
`c30236f29d7eab18b2f1b07a8e39b50d8023eaf6` and its submodule pins. Copy this
harness, the frozen corpus/input manifests and the new source helper from the
published report revision into that isolated checkout. Build using the recorded
Rust toolchain and `cargo build --release --locked`. Keep the published report in
a separate directory. `prepare-replay.py` verifies every historical Git pin and
execution source, copies the frozen programs, inputs, manifests and pinned control
archives, and records a new replay epoch and executable hash. It refuses an
existing report and copies no compiled artifacts, process records or result caches.
Supply the published knowledge library explicitly:

```sh
python3 bench/knowledge-growth/prepare-replay.py \
  --evidence /absolute/path/to/published/reports/knowledge-growth-2026-10-13 \
  --helper /absolute/path/to/published/knowledge/libraries/controlled-folds.ink
python3 bench/knowledge-growth/prepare-controls.py
```

The original local compiler
binary and its SHA256 are retained with the experiment. A relocated/new-toolchain
rebuild may have a different binary hash; record it as a separate replay epoch,
never replace the original pins or pretend it is the same measured executable.

Restore upstream implementations with `prepare-controls.py`; it verifies the
saved tarball SHA512 integrity and SHA256, then uses the exact independent npm
lockfile for `quickselect` and `tslib`. It never substitutes a latest package.

```sh
python3 bench/knowledge-growth/validate-corpus.py
python3 bench/knowledge-growth/reference.py --small
python3 bench/knowledge-growth/author.py
python3 bench/knowledge-growth/compile.py --lane forced
python3 bench/knowledge-growth/compile.py --lane forced --repeat 3
python3 bench/knowledge-growth/compile.py --lane forced --repeat 4
python3 bench/knowledge-growth/compile.py --lane forced --repeat 5
python3 bench/knowledge-growth/compile.py --lane automatic
python3 bench/knowledge-growth/compile.py --lane automatic-default
python3 bench/knowledge-growth/run.py --mode validate
python3 bench/knowledge-growth/export-candidates.py
python3 bench/knowledge-growth/run.py --mode time
python3 bench/knowledge-growth/run.py --mode memory
python3 bench/knowledge-growth/summarise.py
python3 bench/knowledge-growth/chart.py
```

Run cohorts serially. Original evidence is immutable: reproduce in a separate
checkout/report directory, and remove cached result files there before acquiring
a new run. The bounded `automatic` configuration is supplemental; the primary
`automatic-default` uses the installed balanced defaults, without cost profiles
or heldout measurements. Forced priority exercises newly supplied law families
before older alternatives, then uses structural cost. It is an intentional
capability intervention, not a production profitability result.

Whole trusted calls include every output word/field and preserve captured input
values. Imports, fixture/oracle construction and per-lane adaptation are separate
setup metrics. Memory is measured in independent per-variant processes; observed
RSS/heap and whole-process high-water RSS include harness/setup/validation, and
are not total allocation or exact peak-live-heap metrics.

The matched state/snapshot helper test uses the existing parity harness. Require
both Wasm targets with an existing Zig installation:

```sh
INK_TEST_ZIG=/absolute/path/to/zig INK_PARITY_REQUIRE_ALL=1 \
  cargo test --locked --release --test knowledge_growth_helpers
```

No GPU execution-speed extrapolation follows from this JavaScript cohort.
Correctness, target availability and profitability remain separate checks.
