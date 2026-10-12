# Latest Ink versus Frontier

The report records two exact Ink cohorts: published main `dfaa35f9` and local
integration `5dcbf538`. The integration includes the snapshot work at `62f63f63`.
Frontier is the unchanged published npm package `0.1.9`.

`workload.ink` adds generic final-state reconciliation to the previous frozen
diff/apply source. `snapshots.ink` is copied byte for byte from the integration's
pinned knowledge library. The main counter compiles that same source; its main
knowledge checkout does not yet ship this library. These fixture-only diff
functions do not change Ink's product API or expose new public patch contracts.

The broad seven-round driver measures separate diff, hint, apply, roundtrip and
final-state calls on 27 frozen fixtures, and records eligible GPU execution plus
captured-input Wasm/GPU controls. Whole calls include output materialisation and
a digest of every returned value. GPU fallback is rejected. The resident GPU
control must report zero uploads. Prepared Wasm returns copied packed values;
its setup is excluded from the timed call and remains in the report.

The generic module currently uses complete-state Wasm JSON calls; its native
integer-to-u32 Number materialisation is included. Ordinary diff/apply uses the
separate packed module. Those boundaries are labelled explicitly. Four large
changed-row generic Wasm cells are excluded after a separate 30-second validation
deadline. Exclusion means a measurement budget, not unsupported semantics.

`js-focus.mjs` is a separate, longer-warmed direct-call comparison: eleven rounds,
20 ms calibration, and 256/96/24 warmups at 64/1,024/16,384 rows. It avoids Wasm
allocation and GPU execution in the same process. It was added because identical
JS module bytes showed substantial short-run timing variation in the broad run.
Both runs and every case/loss are retained. Short shared-host measurements remain
exploratory; duplicate module instances can receive different V8 tiering histories.

`native.rs` uses the actual generated typed Rust methods, includes owned input
Vec clones and consumes full output digests. It runs in a separate process and
has no paired Frontier confidence interval.

The two `*-hoisted.ink` files are a diagnostic control only: they move the
unchanged previous-list length outside the loop. Production source, knowledge
and lowerings are unchanged. The probe checks the complete result if it finishes;
a killed call contributes no warm timing or completed correctness claim.

Unpack the report's measured artifact archive at an isolated repository root and
write new results into a fresh report directory before running these drivers.
All JS/browser output destinations refuse overwrites. Run timing processes
serially, after compilation and validation finish:

```sh
node bench/frontier-recheck/node.mjs --validate-only --prepared
node bench/frontier-recheck/node.mjs --prepared
node bench/frontier-recheck/js-focus.mjs /tmp/new-js-focus.json
build/frontier-recheck/rust/target/release/compiled-state build/frontier-recheck/fixtures.json
python3 bench/frontier-recheck/wasm-probe.py /tmp/latest-probe.json ink
python3 bench/frontier-recheck/wasm-probe.py /tmp/previous-probe.json previous-ink
python3 bench/frontier-recheck/wasm-probe.py /tmp/hoisted-probe.json hoisted-ink
python3 bench/frontier-recheck/serve.py --port 8921
```

Visit `http://127.0.0.1:8921/bench/frontier-recheck/browser.html?prepared=1` and run
the browser benchmark. Then derive the audited summary with `summarise.py`.
The report provenance binds exact artifacts, inputs, harnesses and package pins.
Different patch schemas make diff-only timing a different output contract;
final-state and replay comparisons check the same logical result.
