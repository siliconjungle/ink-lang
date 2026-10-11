# Internal snapshot comparison

This compares complete final-state operations on the same immutable inputs. It
includes the old compiler, the same source with the new JavaScript lowering,
the snapshot library, private field updates and unchanged published Frontier
0.1.9. Every call consumes all five fields of every returned row. Setup and input
freezing are outside the timing. There is no public patch output to compare.

The saved run and exact generated artifacts are in
[the report](../../reports/internal-snapshots-2026-10-12/README.md). These are
exploratory JavaScript measurements, not native, GPU or transaction benchmarks.

Unpack the report's `measured-artifacts.tar.gz` at an isolated repository root;
it supplies both compiler revisions' generated modules, fixtures, the exact npm
package and the browser conformance bundle. Then run:

```sh
node bench/internal-snapshots/run.mjs /tmp/new-snapshot-results.json
python3 bench/internal-snapshots/summarise.py /tmp/new-snapshot-results.json
```

The runner refuses to overwrite its destination. Do not run other benchmark or
build processes concurrently. The bootstrap resamples paired round indices;
seven rounds on one shared host provide limited precision.

To regenerate the new modules from source:

```sh
cargo build --bin ink
mkdir -p build/internal-delta-sharing
target/debug/ink build bench/frontier-diff/workload.ink --target javascript -o build/internal-delta-sharing/current.mjs
target/debug/ink build examples/internal-snapshots.ink --target javascript -o build/internal-delta-sharing/snapshots.mjs
python3 knowledge/producers/field_snapshots.py --compiler target/debug/ink --source knowledge/research/internal-snapshots/row-schema.ink --record Row -o build/internal-delta-sharing/fields.ink
target/debug/ink build build/internal-delta-sharing/fields.ink --target javascript -o build/internal-delta-sharing/fields.mjs
```

The old baseline requires JavaScript lowering revision
`563ad812d9385938f8f5a28736cc4ee9d5cdf2d1`; its exact generated file is archived.
Do not regenerate that baseline with the new lowering.

Browser conformance is separate from timings. Run the required GPU test in
[the implementation guide](../../docs/internal-snapshots.md), then start
`python3 bench/internal-snapshots/serve.py --output /tmp/new-webgpu-receipt.json` and open
`http://127.0.0.1:8918/bench/internal-snapshots/browser.html`. The receiver refuses
to overwrite an existing browser result. Successful calls must report actual
GPU dispatch; fallback is rejected.
