# Ink GPU / Svelte / Preact compute comparison

This is a real-Chrome, hardware-WebGPU benchmark of matched pure computations.
Svelte is compiled for production; Preact and plain JavaScript run efficient
array-based kernels. Exact wrapping integers avoid floating-point contract mismatches.
See `reports/gpu-signals-2026-10-12/README.md` for all results and limitations.

From this directory:

```sh
npm ci
python3 prepare.py --zig /absolute/path/to/zig
npm run build
npm run smoke
npm run bench
npm run report
```

The default Chrome is `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`;
set `CHROME` to another real installation. Playwright Core does not download browsers.
The local HTTP server and browser are closed in `finally`. GPU execution is required:
software adapters and fallback timings are rejected.

The full run uses 4,096, 65,536 and 1,048,576 elements; four workloads; seven
alternating repetitions after two warmups; and 72 fresh-page first-use calls.
Small fast cases use batches of different inputs to avoid timer quantization.
Input generation and full-output checking are outside timing. Capture, scheduling,
execution, upload and full CPU-visible readback are inside each complete call.
Cold runs include module imports/setup but share browser/process/driver caches.
Source Wasm and an independent Python integer oracle check the results.

GPU arrays stay resident between the 32 coupled feedback passes; every request
still captures changed inputs and reads back the complete final output.
This does not benchmark identical-input cache hits, DOM updates, transactional
state, automatic default routing or hand-maintained aggregate deltas.

To replay the measured browser artifacts, use a source checkout with the recorded
lowering/runtime/ABI revisions, extract `measured-artifacts.tar.gz` at its root,
then run `npm ci` and `npm run bench` here without preparing or rebuilding.
The runner records those Git revisions; the archive is not a standalone Git checkout.
