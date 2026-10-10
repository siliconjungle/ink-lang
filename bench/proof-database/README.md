# Web proof database benchmark

Seven scalar tasks exercise wrapping arithmetic loop elimination and collection
work skipping. An eighth task returns a filtered array with mixed selectivity
and nonempty outputs. The current GPU backend cannot emit these filters, so
that task records honest GPU fallbacks. A separate `gpu_repeat_subtract` task
maps a repeated subtraction over each input word; both its source and checked
closed-form versions are GPU eligible.

The main eight-task matrix includes original and checked Ink JS/Wasm,
`js_literal`, `js_literal_typed` and `rust_literal_wasm` translations of the original algorithms,
and separate `js_matched` and `rust_matched_wasm` controls using the checked
algebraic shortcuts. The literal JS control materialises ordinary Array stages;
the typed JS control materialises native Uint32Array.map/filter stages and
converts list results to ordinary Arrays; the literal Rust control materialises
Vec stages. None uses manual shortcuts
or optimisation barriers: normal JavaScript JIT and Rust release optimisation
can eliminate stages and loops. The ninth GPU map task is available separately.

Prepare with the existing release compiler, the isolated checked proof store,
and a configured Zig executable. Use the fresh directory on every command to
preserve previous reports:

```sh
python3 bench/proof-database.py --report reports/proof-database-original-algorithms-2026-10-10 --prepare --zig /absolute/path/to/zig
python3 bench/proof-database.py --report reports/proof-database-original-algorithms-2026-10-10 --validate
```

After other tests and builds stop, run sequentially:

```sh
python3 bench/proof-database.py --report reports/proof-database-original-algorithms-2026-10-10 --node
python3 bench/proof-database.py --report reports/proof-database-original-algorithms-2026-10-10 --costs
python3 bench/proof-database.py --report reports/proof-database-original-algorithms-2026-10-10 --serve --port 8767
```

Open `http://127.0.0.1:8767/browser.html` in a headed browser and click **Run
benchmark**. The server saves the receipt and computes paired bootstrap
intervals. The page displays descriptive medians; use the saved intervals for
claims about measured differences. Use `--report /absolute/path/to/fresh-run`
on every command when preparing another run. Existing raw measurements are
preserved by the preparation and Node entry points.

Prepare the focused GPU workload in a fresh directory, preserving the first
JS/Wasm report:

```sh
python3 bench/proof-database.py --report reports/proof-database-2026-10-10/gpu-follow-up --cases gpu_repeat_subtract --sizes 32 512 4096 --prepare --zig /absolute/path/to/zig
python3 bench/proof-database.py --report reports/proof-database-2026-10-10/gpu-follow-up --cases gpu_repeat_subtract --validate
python3 bench/proof-database.py --report reports/proof-database-2026-10-10/gpu-follow-up --cases gpu_repeat_subtract --serve --port 8766
```

Every variant first passes exact independent Python golden results. Trials use
one shared JavaScript driver, output consumption, calibration, discarded warmup,
seeded shuffled order and seven paired rounds by default. The saved JSON
contains every trial, calibration, warmup, checksum, actual backend and fallback
reason. Module startup and first calls are separate from warmed execution.
Preparation costs use three shuffled rounds of fresh subprocesses.

Original-source comparison ratios are Ink / literal control: above 1 means Ink
is slower, below 1 means Ink is faster. Proof-effect ratios remain original /
checked: above 1 means the checked Ink implementation is faster. Matched-control
ratios compare checked Ink with manually optimised algorithms and are labelled
separately. The browser highlights typed-array literal JS and also displays the
ordinary-array literal JS comparison. Literal source hashes and compiled Rust/Wasm hashes are recorded in
`metadata.json`; all source files and modules are archived in the report.

Each full-call timer includes its implementation's host wrapper. Current Ink
JavaScript functions trust their callers and borrow word-only values; the
benchmark driver captures inputs once for current JS and handwritten controls.
Previous Ink captures inputs inside its runtime. This shared benchmark capture
cost is not required by the generated API. Wasm calls include planning, transport
and result packing. The Rust wrapper copies input into resident Wasm memory, and array
outputs are copied back. Large gaps can therefore expose runtime/ABI costs
rather than differences in compiler optimisation. The shader runtime includes
GPU upload, dispatch, and readback. GPU fallbacks are recorded and excluded from
GPU timing cells.

Canonical observations are saved only in the report's authenticated copy of
the proof store, using `Store.observe`. They never modify the pinned main
snapshot. `peak_bytes` is the observed maximum exported Wasm linear-memory size,
including memory retained after validation; it does not measure process RSS,
JavaScript host memory, or GPU memory. JavaScript and GPU trials have no
canonical observations because those peaks are unmeasured. This is an
execution benchmark; it does not establish end-to-end application superiority.

For a lean-output comparison against archived modules, use a fresh report:

```sh
python3 bench/proof-database.py --report reports/lean-web-output-2026-10-10 --before-report reports/proof-database-original-algorithms-2026-10-10 --direct-program --prepare --zig /absolute/path/to/zig
```

This adds archived JS/Wasm variants and direct generated JavaScript functions.
Preparation checks that source hashes and selected laws match. Previous/current
ratios measure the output/runtime change; direct/matched ratios measure generated
functions against the same hand-optimised algorithm. Both use identical inputs.
