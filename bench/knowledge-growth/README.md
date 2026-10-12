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
Rust toolchain and `cargo build --release --locked`. The original local compiler
binary and its SHA256 are retained with the experiment. A relocated/new-toolchain
rebuild may have a different binary hash; record it as a separate replay epoch,
never replace the original pins or pretend it is the same measured executable.

Restore upstream implementations with `prepare-controls.py`; it verifies the
saved tarball SHA512 integrity and SHA256, then uses the exact independent npm
lockfile for `quickselect` and `tslib`. It never substitutes a latest package.

```sh
python3 bench/knowledge-growth/validate-corpus.py
python3 bench/knowledge-growth/author.py
python3 bench/knowledge-growth/compile.py --lane forced
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
