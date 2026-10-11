# General web-stack suite39

The suite compares two explicitly bound compiler binaries using exactly the same
source/inputs/oracles/catalogue/model. A preparation with identical binaries is
labelled parity-only; it establishes no upgrade improvement.

Eight tasks cover seven families: affine and piecewise maps, stable compaction,
ordered reduction, scan, three-point stencil, and sparse overwrite with an explicit
full recompute control. U32 operations wrap exactly. An arbitrary ordered reducer
runs from right to left; no parallel reduction claim is made.

338 correctness frames independently cross lengths, shapes, distributions and
compaction/update density. 198 nonempty timed cells cross all benchmark axes.
Train families are affine/compaction/scan at sizes32 and16384. Size2048 cells are
held out from train tuning; branch, ordered fold, stencil and overwrite are entire
held-out families. The full suite must be frozen before candidate tuning. Reusing
holdout results to tune makes them exploratory in subsequent rounds.

Overwrite semantics are pure, fixed snapshot calls: unique cadence indices below
min(nx,ny) overwrite xs with ys. The sparse handwritten control copies xs then
applies changed positions. The recompute control reads the full state and tests
all positions. Every invocation starts from the same declared state. Both declared
arrays are captured/transported equally, including unused elements. No maintained
state, dynamic migration, or stateful proof authority is claimed.

Web comparisons preserve owned JS/owned full Wasm, resident borrowed Wasm output,
scalar values and full GPU requests as separate boundaries. A real prepared GPU
session, where provided by the candidate runtime, uploads input at setup and
returns a fresh full owned readback every run. Its setup and counters are separate;
missing APIs/routes are reported unsupported. Native comparison is emitted Ink C
versus handwritten Rust, with resident/copied-input boundaries; it is not an Ink
Rust backend comparison. Host results and ownership boundaries are never pooled.

Every vector word is consumed inside timing through a common weighted U32 sum.
Scalar controls return U32 directly, with no BigInt result machinery. Complete
output, input nonmutation and changed-input owned lifetime are checked outside
kernel timing. Common consumption/counter instrumentation remains included.
Startup/load and prepared upload/capture setup are recorded separately from warm
kernel results. Five interleaved 2ms rounds are exploratory; no universal language
ranking follows from these workloads or nominal intervals.

Preparation and validation run without measurement authorization:

```
python3 bench/web-stack-general39.py prepare --report <fresh-directory> --candidate-compiler <binary>
python3 bench/web-stack-general39.py node --validate-only --report <directory>
python3 bench/web-stack-general39.py audit --validate-only --host node --report <directory>
python3 bench/web-stack-general39.py native-prepare --report <directory>
python3 bench/web-stack-general39.py serve --report <directory> --port 8894
```

Timed runners require an explicitly supplied `--serial-gate` file with
`authorized:true` and the exact `metadata_sha256`. Browser measurement likewise
requires that bound file. No gate is created automatically. Preserve archived
preparations/results and use a fresh directory after changes.

Active audit tools accept `--audit-output <new-file>` to preserve earlier audit
receipts during coverage refinements. Supplementary audits validate resident
capability and availability completeness, ownership boundary labels, exact
full-output check counts, and finite calibration records. Summary generation
rechecks audited result/metadata hashes and all frozen assets before computing
comparisons; a native summary also checks its main-metadata binding.

For reproduction against a historical catalogue, pass `--snapshot <snapshot.json>`
with a knowledge store containing its immutable tree and objects. The explicit
snapshot is archived in a fresh preparation, and selection still uses the same
ordinary planner. Omitting the option keeps the current-store default. General39
publication uses the measured2550-object `8d1f3460...` snapshot.
