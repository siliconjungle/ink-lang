# Ink versus Frontier diff/patch

The saved run is in [the report](../../reports/frontier-diff-2026-10-12/README.md).
This harness compares a fixed-schema Ink diff/replay program with the unchanged
published `@shapeshift-labs/frontier@0.1.9` package. It does not benchmark a
general JSON implementation in Ink, or stored-state transaction throughput.

`workload.ink` accepts equal-length `List<u32>` and lists of five-u32 records.
Edit indices must be sorted, unique and in range. Dirty hints must cover all
changes; the fixtures deliberately also include false positives. Row edits
replace the whole changed row. Frontier uses its ordinary compact patches and
immutable replay. The logical replay results must agree, but the wire formats
and output ownership mechanisms differ.

`prepare.py` independently creates 27 fixtures: three sizes (64, 1,024, 16,384),
three change densities (unchanged, about 1%, 50%), and scalars/fresh rows/shared
rows. JavaScript restores unchanged row identities in the shared case. Rust,
Wasm and GPU inputs represent those rows by value. The extra scalar
`apply-probe` deliberately uses O(N*K) searches to exercise an admitted GPU
replay expression; it is kept separate from efficient buffer replay.

## Reproduce

Run from the repository root with the pinned submodules in `provenance.json`.
Install the normal repository toolchains/dependencies first. Use an isolated
checkout or archive the existing report directory before generating new results.
The browser receiver rejects attempts to overwrite saved runs; the Node drivers
write their named report files.

```sh
cargo build --bin ink
python3 bench/frontier-diff/prepare.py
npm pack @shapeshift-labs/frontier@0.1.9 --pack-destination build/frontier-diff --json > build/frontier-diff/npm-pack.json
mkdir -p build/frontier-diff/frontier
tar -xzf build/frontier-diff/shapeshift-labs-frontier-0.1.9.tgz -C build/frontier-diff/frontier
target/debug/ink check bench/frontier-diff/workload.ink
target/debug/ink build bench/frontier-diff/workload.ink --target webgpu --zig /path/to/zig -o build/frontier-diff/ink
target/debug/ink build bench/frontier-diff/workload.ink --target rust -o build/frontier-diff/rust
target/debug/ink build bench/frontier-diff/workload.ink --target javascript --optimise knowledge/store/snapshot.json -o build/frontier-diff/optimised-probe.mjs
cp bench/frontier-diff/native.rs build/frontier-diff/rust/src/main.rs
cargo build --release --manifest-path build/frontier-diff/rust/Cargo.toml
mkdir -p reports/frontier-diff-2026-10-12
node bench/frontier-diff/node.mjs --validate-only
node bench/frontier-diff/node.mjs
build/frontier-diff/rust/target/release/compiled-state build/frontier-diff/fixtures.json > reports/frontier-diff-2026-10-12/native-results.jsonl
python3 bench/frontier-diff/serve.py --port 8917
```

In a WebGPU browser, visit `http://127.0.0.1:8917/bench/frontier-diff/browser.html`
and click **Run benchmark**. Wait until it reports a pass and saves the results.
Then use the **Captured-input comparison** link and run again. Run native, Node
and browser timing processes sequentially, not concurrently. Finally:

```sh
node bench/frontier-diff/node.mjs --prepared
python3 bench/frontier-diff/summarise.py > reports/frontier-diff-2026-10-12/audit.json
```

The GPU bundle contains the exact JavaScript and C/Wasm artifacts used by all
web measurements. `gpu-required` is mandatory: CPU fallback is never labelled
as GPU. Efficient Buffer replay and roundtrip are currently unsupported GPU
cells, retained as such rather than timed through fallback.

The main measurements include packing, transfers, logical output construction
and a digest of every returned value. The separate captured-input measurements
exclude initial input capture: Wasm returns an owned packed output copy; GPU
returns unpacked logical values and still incurs readback. Every GPU resident
call must report zero upload bytes. These repeat fixed inputs, not a stream of
newly changed snapshots. Capture/first-call costs remain in raw `setup` records.

`summarise.py` checks exact cell/round coverage, independent fixture replay,
full numeric output digests, actual GPU counters and unsupported cells. It
retains every case and loss, with same-run paired bootstrap ratios against
Frontier. Native measurements are a separate process and receive no paired
Frontier ratio. Five short rounds on a shared machine make these exploratory
measurements, not a universal performance claim.

## Exact-byte replay

The report freezes the fixture JSON, measured generated artifacts and published
npm tarball. Unpack `measured-artifacts.tar.gz` at the repository root and
decompress `fixtures.json.gz` to `build/frontier-diff/fixtures.json`. For the
original full-call run, decompress `runner.mjs.gz`, `node.mjs.gz` and
`browser.html.gz` into `bench/frontier-diff/`; the `prepared-` archives contain
the subsequent captured-input harness. Do this in an isolated checkout.
Hashes in the two provenance files bind each harness revision and artifact.
Replay the native program by rebuilding its archived generated Rust source,
driver, Cargo manifest and lockfile with the recorded Rust toolchain. Raw timing
results stay separate from rebuilds or replays.
