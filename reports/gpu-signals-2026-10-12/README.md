# Ink WebGPU versus Svelte and Preact

Measured on Apple M2, Chrome 154.0.8037.98, hardware apple / metal-3. Svelte 5.57.2; Preact Signals Core 1.14.4. This compares complete pure compute requests with changed inputs and owned CPU-visible outputs, not framework rendering or database state actions.

## Complete-request warm medians

All times are milliseconds. Input capture, GPU upload, every dispatch, synchronization, readback and complete result materialization are inside the timed GPU calls. Control calls capture input copies and return fresh owned results. Every output word is checked outside timing. GPU execution is explicitly required and every nonempty call must report actual GPU dispatch/readback counters; fallback timings are rejected.

| Workload | Elements | Ink GPU | Svelte | Preact | Plain JS | GPU speedup vs Svelte | GPU speedup vs Preact |
|---|---:|---:|---:|---:|---:|---:|---:|
| affine | 4,096 | 0.6953 | 0.0172 | 0.0125 | 0.0125 | 0.025× | 0.018× |
| affine | 65,536 | 3.7375 | 0.2125 | 0.2250 | 0.2125 | 0.057× | 0.060× |
| affine | 1,048,576 | 54.0000 | 3.5000 | 4.1000 | 3.5000 | 0.065× | 0.076× |
| cheap-sum | 4,096 | 2.0594 | 0.0063 | 0.0062 | 0.0063 | 0.003× | 0.003× |
| cheap-sum | 65,536 | 10.0750 | 0.0750 | 0.0625 | 0.0750 | 0.007× | 0.006× |
| cheap-sum | 1,048,576 | 130.1000 | 1.1000 | 1.2000 | 1.1000 | 0.008× | 0.009× |
| heavy512 | 4,096 | 0.9500 | 7.2250 | 6.9750 | 8.2250 | 7.605× | 7.342× |
| heavy512 | 65,536 | 6.7000 | 114.7000 | 110.5000 | 110.0000 | 17.119× | 16.493× |
| heavy512 | 1,048,576 | 124.1000 | 1814.7000 | 1816.9000 | 1784.3000 | 14.623× | 14.641× |
| feedback32 | 4,096 | 2.1750 | 26.4750 | 28.0750 | 26.1750 | 12.172× | 12.908× |
| feedback32 | 65,536 | 14.0000 | 394.9000 | 402.1000 | 391.7000 | 28.207× | 28.721× |
| feedback32 | 1,048,576 | 158.1000 | 6683.5000 | 6885.3000 | 6903.1000 | 42.274× | 43.550× |

A speedup below 1 means GPU loses. The cases are:

- `affine`: a cheap independent integer array transform.
- `cheap-sum`: an affine map followed by a wrapping integer reduction, with scalar readback. The current emitted graph reduction uses one sequential GPU invocation; it is not a parallel reduction benchmark.
- `heavy512`: 512 steps of data-dependent wrapping integer arithmetic per element, with full array readback. The remainder term prevents the simple affine closed form of the earlier fixture.
- `feedback32`: 32 simultaneous steps. Each row reads its neighbor from the prior array and performs 64 data-dependent arithmetic steps. GPU intermediates remain resident until final full readback. CPU controls use two reusable typed work buffers rather than per-row reactive objects or arrays allocated per pass.

Svelte uses a production-compiled `$state.raw` typed input and a connected `$derived` consumer; Preact uses one typed-array signal and a connected computed consumer. Both update the captured array once per complete request. Each callback is verified to run exactly once per call. These are efficient array-backed CPU controls, not a deliberately expensive graph of a million individual signals. The plain-JS control has the same arithmetic with no reactive scheduling. Ink JavaScript and compiled Wasm execute the same source/pipeline literally.

## Heavy-case averages

Equal-weight geometric means of CPU/GPU median ratios across the two heavy workloads and the three measured sizes; these are fixture averages, not a universal application speedup.

- GPU versus Svelte derived: **17.39×** geometric mean speedup.
- GPU versus Preact computed: **17.49×** geometric mean speedup.
- GPU versus Plain JS fused: **17.63×** geometric mean speedup.

For comparison, giving all four workloads and all three sizes equal weight, including the cheap-case losses:

- GPU versus Svelte derived: **0.53×** geometric mean ratio across all cases. Values below 1 favor the CPU control.
- GPU versus Preact computed: **0.52×** geometric mean ratio across all cases. Values below 1 favor the CPU control.
- GPU versus Plain JS fused: **0.52×** geometric mean ratio across all cases. Values below 1 favor the CPU control.

## GPU transfer/dispatch receipts

| Workload | Elements | Upload bytes | Readback bytes | Dispatches | Peak live device bytes |
|---|---:|---:|---:|---:|---:|
| affine | 4,096 | 16,396 | 16,388 | 1 | 65,560 |
| affine | 65,536 | 262,156 | 262,148 | 1 | 1,048,600 |
| affine | 1,048,576 | 4,194,316 | 4,194,308 | 1 | 16,777,240 |
| cheap-sum | 4,096 | 16,388 | 4 | 2 | 32,784 |
| cheap-sum | 65,536 | 262,148 | 4 | 2 | 524,304 |
| cheap-sum | 1,048,576 | 4,194,308 | 4 | 2 | 8,388,624 |
| heavy512 | 4,096 | 16,396 | 16,388 | 1 | 65,560 |
| heavy512 | 65,536 | 262,156 | 262,148 | 1 | 1,048,600 |
| heavy512 | 1,048,576 | 4,194,316 | 4,194,308 | 1 | 16,777,240 |
| feedback32 | 4,096 | 16,404 | 16,388 | 32 | 65,568 |
| feedback32 | 65,536 | 262,164 | 262,148 | 32 | 1,048,608 |
| feedback32 | 1,048,576 | 4,194,324 | 4,194,308 | 32 | 16,777,248 |

## First use in fresh pages

Three fresh pages per implementation/workload at 65,536 elements. Timings include application-module import, engine/model setup and the first complete request. Page creation/navigation and common input generation are outside timing. The same browser process and OS/driver caches remain shared: this is page/engine first use, not a clean-machine or uncached-driver measurement. Cold controls have separately bundled dependencies.

| Workload | Implementation | Median ms | Min ms | Max ms |
|---|---|---:|---:|---:|
| affine | Ink WebGPU | 31.2000 | 30.7000 | 102.8000 |
| affine | Ink JavaScript | 13.3000 | 12.4000 | 27.5000 |
| affine | Ink Wasm | 25.2000 | 18.1000 | 28.0000 |
| affine | Svelte derived | 9.8000 | 9.2000 | 13.1000 |
| affine | Preact computed | 10.2000 | 8.5000 | 12.1000 |
| affine | Plain JS fused | 8.5000 | 7.9000 | 10.7000 |
| cheap-sum | Ink WebGPU | 57.5000 | 47.7000 | 66.5000 |
| cheap-sum | Ink JavaScript | 14.6000 | 12.4000 | 15.8000 |
| cheap-sum | Ink Wasm | 18.7000 | 14.5000 | 19.9000 |
| cheap-sum | Svelte derived | 9.8000 | 9.7000 | 10.7000 |
| cheap-sum | Preact computed | 9.1000 | 9.1000 | 9.6000 |
| cheap-sum | Plain JS fused | 8.9000 | 8.1000 | 11.7000 |
| heavy512 | Ink WebGPU | 34.5000 | 29.3000 | 35.8000 |
| heavy512 | Ink JavaScript | 141.1000 | 129.1000 | 142.0000 |
| heavy512 | Ink Wasm | 211.3000 | 208.7000 | 216.0000 |
| heavy512 | Svelte derived | 143.7000 | 142.3000 | 163.4000 |
| heavy512 | Preact computed | 131.7000 | 129.9000 | 140.8000 |
| heavy512 | Plain JS fused | 131.4000 | 126.1000 | 141.3000 |
| feedback32 | Ink WebGPU | 44.9000 | 32.0000 | 48.3000 |
| feedback32 | Ink JavaScript | 647.8000 | 568.7000 | 664.4000 |
| feedback32 | Ink Wasm | 511.4000 | 501.9000 | 513.4000 |
| feedback32 | Svelte derived | 456.4000 | 435.0000 | 486.0000 |
| feedback32 | Preact computed | 471.9000 | 444.3000 | 473.2000 |
| feedback32 | Plain JS fused | 442.5000 | 412.1000 | 478.8000 |

## All warm samples and ranges

Seven alternating repetitions after two warmups. Cheap small cases are timed in batches of different preconstructed inputs (64 calls at 4,096 elements; 8 at 65,536) to avoid browser timer quantization. Small heavy cases use four calls per sample; large cases use one. Reported times are per complete call. Values and every measured result are consumed and checked outside the timer. No sample or loss is dropped.

| Workload | Elements | Implementation | Median ms | Min ms | Max ms | Calls per sample |
|---|---:|---|---:|---:|---:|---:|
| affine | 4,096 | Ink WebGPU | 0.6953 | 0.6109 | 0.7453 | 64 |
| affine | 4,096 | Ink JavaScript | 0.0094 | 0.0062 | 0.0125 | 64 |
| affine | 4,096 | Ink Wasm | 0.1562 | 0.1375 | 0.1969 | 64 |
| affine | 4,096 | Svelte derived | 0.0172 | 0.0125 | 0.0203 | 64 |
| affine | 4,096 | Preact computed | 0.0125 | 0.0094 | 0.0172 | 64 |
| affine | 4,096 | Plain JS fused | 0.0125 | 0.0109 | 0.0141 | 64 |
| affine | 65,536 | Ink WebGPU | 3.7375 | 3.5750 | 5.0250 | 8 |
| affine | 65,536 | Ink JavaScript | 0.0875 | 0.0750 | 0.1250 | 8 |
| affine | 65,536 | Ink Wasm | 2.1750 | 2.1000 | 3.0250 | 8 |
| affine | 65,536 | Svelte derived | 0.2125 | 0.1750 | 0.2625 | 8 |
| affine | 65,536 | Preact computed | 0.2250 | 0.1750 | 0.2500 | 8 |
| affine | 65,536 | Plain JS fused | 0.2125 | 0.2000 | 0.2500 | 8 |
| affine | 1,048,576 | Ink WebGPU | 54.0000 | 47.2000 | 64.7000 | 1 |
| affine | 1,048,576 | Ink JavaScript | 1.6000 | 1.5000 | 2.0000 | 1 |
| affine | 1,048,576 | Ink Wasm | 35.3000 | 33.7000 | 47.0000 | 1 |
| affine | 1,048,576 | Svelte derived | 3.5000 | 3.3000 | 4.1000 | 1 |
| affine | 1,048,576 | Preact computed | 4.1000 | 3.2000 | 5.4000 | 1 |
| affine | 1,048,576 | Plain JS fused | 3.5000 | 3.2000 | 4.9000 | 1 |
| cheap-sum | 4,096 | Ink WebGPU | 2.0594 | 2.0031 | 2.1406 | 64 |
| cheap-sum | 4,096 | Ink JavaScript | 0.0328 | 0.0312 | 0.0453 | 64 |
| cheap-sum | 4,096 | Ink Wasm | 0.0078 | 0.0062 | 0.0109 | 64 |
| cheap-sum | 4,096 | Svelte derived | 0.0063 | 0.0047 | 0.0094 | 64 |
| cheap-sum | 4,096 | Preact computed | 0.0062 | 0.0031 | 0.0094 | 64 |
| cheap-sum | 4,096 | Plain JS fused | 0.0063 | 0.0047 | 0.0078 | 64 |
| cheap-sum | 65,536 | Ink WebGPU | 10.0750 | 8.1500 | 13.2750 | 8 |
| cheap-sum | 65,536 | Ink JavaScript | 0.4625 | 0.4500 | 0.6625 | 8 |
| cheap-sum | 65,536 | Ink Wasm | 0.0625 | 0.0500 | 0.0625 | 8 |
| cheap-sum | 65,536 | Svelte derived | 0.0750 | 0.0500 | 0.1000 | 8 |
| cheap-sum | 65,536 | Preact computed | 0.0625 | 0.0500 | 0.0875 | 8 |
| cheap-sum | 65,536 | Plain JS fused | 0.0750 | 0.0625 | 0.1000 | 8 |
| cheap-sum | 1,048,576 | Ink WebGPU | 130.1000 | 128.2000 | 131.4000 | 1 |
| cheap-sum | 1,048,576 | Ink JavaScript | 9.1000 | 7.6000 | 12.4000 | 1 |
| cheap-sum | 1,048,576 | Ink Wasm | 0.9000 | 0.8000 | 1.3000 | 1 |
| cheap-sum | 1,048,576 | Svelte derived | 1.1000 | 1.0000 | 1.6000 | 1 |
| cheap-sum | 1,048,576 | Preact computed | 1.2000 | 1.1000 | 1.5000 | 1 |
| cheap-sum | 1,048,576 | Plain JS fused | 1.1000 | 1.0000 | 1.5000 | 1 |
| heavy512 | 4,096 | Ink WebGPU | 0.9500 | 0.9250 | 1.2500 | 4 |
| heavy512 | 4,096 | Ink JavaScript | 7.1750 | 7.0250 | 7.9500 | 4 |
| heavy512 | 4,096 | Ink Wasm | 9.1500 | 8.1500 | 9.5750 | 4 |
| heavy512 | 4,096 | Svelte derived | 7.2250 | 6.9750 | 9.3750 | 4 |
| heavy512 | 4,096 | Preact computed | 6.9750 | 6.7750 | 10.5500 | 4 |
| heavy512 | 4,096 | Plain JS fused | 8.2250 | 7.1750 | 10.4500 | 4 |
| heavy512 | 65,536 | Ink WebGPU | 6.7000 | 6.1000 | 14.6000 | 1 |
| heavy512 | 65,536 | Ink JavaScript | 108.1000 | 100.9000 | 905.4000 | 1 |
| heavy512 | 65,536 | Ink Wasm | 128.9000 | 117.2000 | 148.6000 | 1 |
| heavy512 | 65,536 | Svelte derived | 114.7000 | 100.6000 | 129.1000 | 1 |
| heavy512 | 65,536 | Preact computed | 110.5000 | 105.7000 | 128.8000 | 1 |
| heavy512 | 65,536 | Plain JS fused | 110.0000 | 101.0000 | 151.4000 | 1 |
| heavy512 | 1,048,576 | Ink WebGPU | 124.1000 | 77.6000 | 180.0000 | 1 |
| heavy512 | 1,048,576 | Ink JavaScript | 1808.7000 | 1617.7000 | 1825.5000 | 1 |
| heavy512 | 1,048,576 | Ink Wasm | 2092.3000 | 1957.3000 | 2153.9000 | 1 |
| heavy512 | 1,048,576 | Svelte derived | 1814.7000 | 1622.4000 | 1994.3000 | 1 |
| heavy512 | 1,048,576 | Preact computed | 1816.9000 | 1613.7000 | 1973.8000 | 1 |
| heavy512 | 1,048,576 | Plain JS fused | 1784.3000 | 1638.3000 | 2003.3000 | 1 |
| feedback32 | 4,096 | Ink WebGPU | 2.1750 | 1.9000 | 2.7250 | 4 |
| feedback32 | 4,096 | Ink JavaScript | 27.9750 | 25.8500 | 33.9750 | 4 |
| feedback32 | 4,096 | Ink Wasm | 29.4750 | 27.3500 | 30.8500 | 4 |
| feedback32 | 4,096 | Svelte derived | 26.4750 | 25.9500 | 30.4000 | 4 |
| feedback32 | 4,096 | Preact computed | 28.0750 | 25.4000 | 30.9500 | 4 |
| feedback32 | 4,096 | Plain JS fused | 26.1750 | 25.5750 | 33.2750 | 4 |
| feedback32 | 65,536 | Ink WebGPU | 14.0000 | 11.3000 | 17.8000 | 1 |
| feedback32 | 65,536 | Ink JavaScript | 399.6000 | 386.9000 | 467.6000 | 1 |
| feedback32 | 65,536 | Ink Wasm | 445.8000 | 408.9000 | 480.0000 | 1 |
| feedback32 | 65,536 | Svelte derived | 394.9000 | 379.3000 | 472.1000 | 1 |
| feedback32 | 65,536 | Preact computed | 402.1000 | 378.3000 | 449.0000 | 1 |
| feedback32 | 65,536 | Plain JS fused | 391.7000 | 377.8000 | 452.1000 | 1 |
| feedback32 | 1,048,576 | Ink WebGPU | 158.1000 | 101.3000 | 254.0000 | 1 |
| feedback32 | 1,048,576 | Ink JavaScript | 7548.8000 | 6045.7000 | 9589.3000 | 1 |
| feedback32 | 1,048,576 | Ink Wasm | 7661.9000 | 6385.6000 | 10993.8000 | 1 |
| feedback32 | 1,048,576 | Svelte derived | 6683.5000 | 5903.3000 | 10060.9000 | 1 |
| feedback32 | 1,048,576 | Preact computed | 6885.3000 | 5945.0000 | 10020.1000 | 1 |
| feedback32 | 1,048,576 | Plain JS fused | 6903.1000 | 5985.3000 | 9765.5000 | 1 |

## Validation, provenance and limits

The Python oracle validates 24 corner fixtures, including empty inputs, unsigned wrapping extremes, neighbor wraparound and lengths around workgroup boundaries, on all six implementations. The full source Wasm output is also compared with controls at every size; every timed output word is checked. Additional checks cover input nonmutation, old-output lifetime, detached later results, one derived evaluation per update and hardware GPU receipts. These are conformance tests, not a proof of drivers or generated code.

This is one shared development machine. Concurrent work and process/driver caches can affect timings; raw distributions are retained. No DOM rendering, transaction/event publication, manual aggregate deltas, GPU-only timestamp timings, arbitrary floating-point programs or cross-device claims are included. GPU routing is explicitly requested; no adaptive profile or default policy is promoted. Large data with sparse edits can still favor incremental CPU algorithms.

The initial affine-loop run is retained under `initial-affine-loop/`, including measured artifacts and raw samples. It predates batching and the data-dependent/coupled fixtures; tiny zero readings there are timer-resolution artifacts. It is not silently substituted for the final comparison.

Exact source/emission/package hashes, code revisions, hardware/browser identity, GPU receipts, cold samples and warm samples are in `results.json`. `measured-artifacts.tar.gz` freezes the benchmark source and actual browser bundle (excluding dependencies and unused native build projects). Rebuild with the pinned npm lock and source checkout, or replay the archive.

```sh
cd bench/gpu-signals
npm ci
python3 prepare.py --zig /absolute/path/to/zig
npm run build
npm run smoke
npm run bench
npm run report
```

The archive and every frozen source/emitted file, including WGSL, are bound by SHA-256 in `artifact-hashes.json`.
