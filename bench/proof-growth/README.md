# Proof growth, compiler epoch 3

This isolates useful generic families from catalogue volume. The source kernels
were chosen to exercise the capabilities, so this is not held-out-source
coverage. Real input distributions use Acorn's parsed Lodash AST and Khronos's
Damaged Helmet positions, acquired after the laws were written.

`author.py` repeatedly discovers templates on newly reached expressions, composes
ordinary checked applications and replays the complete package. It is a
capability/conformance author, not a profitability policy. `--option` deliberately
exercises the alternative optional-result algorithm; it does not assert that
alternative is faster. `automatic.py` separately runs the ordinary measured
planner. Its selection inputs differ from benchmark inputs.

Run from the repository root with an existing, preserved before-epoch compiler.
Libraries must be the actual verified npm packages: Lodash 4.17.21, Three.js
0.180.0 and Acorn 8.15.0. The saved evidence records package integrity and source
hashes. Download metadata/tarballs from the npm registry and verify SHA512 before
extracting them, as `prepare-data.py` does for Acorn. The geometry source and
SHA256 are recorded in the data provenance.

```sh
python3 bench/proof-growth/admit.py
python3 bench/proof-growth/automatic.py
python3 bench/proof-growth/run.py --before PATH/TO/PRESERVED/ink --lodash PATH/TO/lodash.js --three PATH/TO/three.core.js --automatic build/proof-growth-epoch3/automatic
python3 bench/proof-growth/prepare-data.py --directory build/proof-growth-epoch3/data --lodash PATH/TO/lodash.js
python3 bench/proof-growth/run.py --before PATH/TO/PRESERVED/ink --lodash PATH/TO/lodash.js --three PATH/TO/three.core.js --automatic build/proof-growth-epoch3/automatic --fixture build/proof-growth-epoch3/data/fixture.json --output build/proof-growth-epoch3/real
python3 bench/proof-growth/author.py --compiler target/debug/ink --source bench/proof-growth/corpus.ink --directory build/proof-growth-epoch3/option18 --count 18 --option
python3 bench/proof-growth/native.py --option --output build/proof-growth-epoch3/native-final
INK_TEST_ZIG=PATH/TO/zig python3 bench/proof-growth/gpu.py
```

Run timing cohorts sequentially on a quiet machine. JS includes complete trusted
calls, conversions and full consumption. Rust/Rust-Wasm include owned argument
capture and full consumption, with input setup outside; they do not include the
JSON ABI. The C/wgpu numeric companion includes complete packed calls; GPU calls
require actual GPU execution and include packing, upload, dispatch, wait,
readback and decode. Boundaries differ, so compare each target against its own
baseline rather than ranking targets across these cohorts.

Every result and input must match before and after timing. Nine or eleven
interleaved rounds are retained, including regressions. JS post-batch memory
samples are diagnostic, not exact peaks or allocation counts. `report.py` produces
paired bootstrap intervals and curves without fitting an extrapolated scaling
law or claiming a general catalogue-size/performance correlation.
