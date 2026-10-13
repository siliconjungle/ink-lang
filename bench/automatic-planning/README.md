# Ordinary automatic planning

This experiment changes machinery in a new epoch. It preserves the earlier
knowledge-growth experiment and uses no hand-authored selection packet. Exact
before/after source, executable fingerprints, package pins, program/input hashes,
ordinary planning receipts and selection measurements are retained in
`reports/automatic-planning-2026-10-13`.

The before cohort uses the isolated distribution/package revisions in
`protocol.json`. The after cohort uses the code fingerprint in
`after-machinery-freeze.json`. Both run the ordinary balanced effort, the same
source programs and the same evaluation inputs. The compiler front end only
forwards new policy controls; core checking, runtime, ABI and backend pins stay
fixed. Rebuilds must record their executable hash in another replay epoch.

Ten source programs are a known regression cohort, with E1 outcomes already
available during development. Six additional authored sources and 120 new inputs
were reserved before implementation changes. All are typed operations or partial
kernels. The selected training calls are generated automatically from signatures
and source constants; they use different sizes, values and distributions from
evaluation. Synthetic probes are explicitly labelled and do not stand for actual
user usage. Supplied development workloads remain a separate mode.

Extract `raw-evidence.tar.xz` into the historical report to inspect its inputs and
samples. To acquire new results, create a fresh directory *inside this checkout*,
copy `protocol.json`, `corpus.json` and `fixtures.json` into it, and set
`INK_AUTO_REPORT=/absolute/checkout/reports/my-replay`. Sources and input bytes
remain at the frozen manifest paths. The tools write only the new acquisition
there. Never run acquisition against a populated historical report: process
receipts deliberately resume completed work rather than overwrite it.

Extract the before/after source archives into isolated installations with their
recorded independent pins. Extract `before-database.tar.xz` into two separate
fresh databases. The archived measured adapters and benchmark tools are in
`measurement-tooling.tar.xz`; current tools add output-directory controls and identify unchanged artifacts in the chart.
A new executable build is a separately recorded replay, not a historical hash
match. Supply the after source directory as the third argument to `warm.py` and
`audit.py` when the current checkout has advanced. Run each acquisition serially. Keep exact source
snapshots, raw receipts, all cohort members and all adverse cases. Do not copy
archived result caches into a reproduction or feed evaluation timings back into
the compiler. The `--code`, `--compiler` and `--database` arguments name each
isolated installation; snapshot roots are frozen on the first call:

```sh
python3 bench/automatic-planning/compile.py --lane before --code /absolute/before \
  --compiler /absolute/before/target/release/ink --database /absolute/before-database
python3 bench/automatic-planning/compile.py --lane after --code /absolute/after \
  --compiler /absolute/after/target/release/ink --database /absolute/after-database
python3 bench/automatic-planning/run.py --mode reference --compiler /absolute/before/target/release/ink
python3 bench/automatic-planning/run.py --mode validate
python3 bench/automatic-planning/run.py --mode time
python3 bench/automatic-planning/run.py --mode memory
python3 bench/automatic-planning/warm.py /absolute/after-database /absolute/after/target/release/ink
python3 bench/automatic-planning/summarise.py
python3 bench/automatic-planning/chart.py
```

Every output field and floating-point bit is consumed. Inputs are checked before
and after repeated execution. Memory uses independent per-variant processes;
sampled RSS/heap, post-GC retention and whole-process high-water include the
harness/input/oracle and are not allocation totals or exact peak-live memory.
Timing intervals are conditional on this fixed corpus. The complete cold build
includes discovery, checking, publication, automatic acquisition and emission.
Warm compilation replays the selected complete proof under identical machinery.
