# GPU residency: mechanism measurements on a software adapter

These runs exercise resident sessions on **lavapipe**, Mesa's CPU
implementation of Vulkan, in a container without a GPU. They measure the
mechanism (what stays resident, what is read back, how costs split), not GPU
performance: lavapipe executes every "GPU" dispatch on the same CPU cores the
compiled CPU baseline uses. Re-run the commands on real hardware before
drawing performance conclusions.

```sh
# native wgpu host (bundle programs from examples/gpu-session.ink, examples/particles.ink)
python3 bench/gpu/residency.py --session GPU_SESSION_PROGRAM --particles PARTICLES_PROGRAM --out native.json
# browser host under Node with Dawn
node bench/gpu/residency.mjs build/gpu-session build/particles --out browser.json
```

Columns: steady-state time per iteration from `step(K2) - step(K1)` with
K = (10, 110); one-shot is a complete `pipeline` call per iteration (upload,
run, read back everything: the pre-session behaviour); fixed is upload plus one
whole readback; small read is the bytes a device reduction returns.

## Native wgpu (lavapipe)

| workload | elements | GPU steady ms/iter | CPU steady ms/iter | GPU one-shot ms/iter | GPU fixed ms (upload+read) | small read bytes | break-even iterations |
|---|---:|---:|---:|---:|---:|---:|---:|
| life (element-wise stencil) | 4096 | 0.130 | 0.063 | 1.147 | 0.498 | 12 | never (CPU faster per iteration) |
| life (element-wise stencil) | 65536 | 1.574 | 0.916 | 7.606 | 6.515 | 12 | never (CPU faster per iteration) |
| life (element-wise stencil) | 262144 | 5.148 | 3.923 | 26.505 | 20.324 | 12 | never (CPU faster per iteration) |
| life (element-wise stencil) | 1048576 | 20.887 | 16.034 | 119.537 | 85.098 | 12 | never (CPU faster per iteration) |
| particles (element-wise records) | 4096 | 0.222 | 0.039 | 12.045 | 9.632 | 40 | never (CPU faster per iteration) |
| particles (element-wise records) | 65536 | 1.632 | 0.841 | 175.930 | 180.779 | 40 | never (CPU faster per iteration) |
| particles (element-wise records) | 262144 | 7.994 | 4.974 | 635.679 | 811.591 | 40 | never (CPU faster per iteration) |
| particles (element-wise records) | 1048576 | error:  | | | | | |
| prefix (parallel scan, feedback) | 4096 | 0.960 | 0.002 | 1.692 | 0.928 | 12 | never (CPU faster per iteration) |
| prefix (parallel scan, feedback) | 65536 | 5.204 | 0.035 | 11.624 | 6.997 | 12 | never (CPU faster per iteration) |
| prefix (parallel scan, feedback) | 262144 | 19.077 | 0.188 | 45.114 | 27.079 | 12 | never (CPU faster per iteration) |
| prefix (parallel scan, feedback) | 1048576 | 77.633 | 0.758 | 155.751 | 77.126 | 12 | never (CPU faster per iteration) |
| shuffle (map + radix sort, feedback) | 4096 | 10.317 | 0.242 | 18.569 | 0.930 | 24 | never (CPU faster per iteration) |
| shuffle (map + radix sort, feedback) | 65536 | 110.509 | 4.794 | 125.261 | 6.227 | 24 | never (CPU faster per iteration) |
| shuffle (map + radix sort, feedback) | 262144 | 447.282 | 18.515 | 475.814 | 22.214 | 24 | never (CPU faster per iteration) |
| shuffle (map + radix sort, feedback) | 1048576 | 1691 | 72.600 | 1792 | 88.464 | 24 | never (CPU faster per iteration) |


The native particles run at 1,048,576 elements failed while generating its
JSON input script; it is not a device limit.

## Browser host (Node + Dawn, lavapipe)

| workload | elements | GPU steady ms/iter | CPU steady ms/iter | GPU one-shot ms/iter | GPU fixed ms (upload+read) | small read bytes | break-even iterations |
|---|---:|---:|---:|---:|---:|---:|---:|
| life (element-wise stencil) | 4096 | 0.233 | 0.253 | 9.820 | 8.209 | 12 | 392 |
| life (element-wise stencil) | 65536 | 2.352 | 4.534 | 10.933 | 9.835 | 12 | 2 |
| life (element-wise stencil) | 262144 | 7.778 | 16.447 | 31.546 | 36.791 | 12 | 2 |
| life (element-wise stencil) | 1048576 | 32.886 | 66.930 | 176.032 | 130.405 | 12 | 1 |
| particles (element-wise records) | 4096 | 0.280 | 0.134 | 23.126 | 29.788 | 40 | never (CPU faster per iteration) |
| particles (element-wise records) | 65536 | 3.429 | 2.185 | 272.346 | 280.422 | 40 | never (CPU faster per iteration) |
| particles (element-wise records) | 262144 | 12.090 | 9.995 | 1091 | 970.597 | 40 | never (CPU faster per iteration) |
| particles (element-wise records) | 1048576 | 52.596 | 66.019 | 5509 | 4253 | 40 | 3 |
| prefix (parallel scan, feedback) | 4096 | 0.750 | 0.010 | 4.249 | 2.097 | 12 | never (CPU faster per iteration) |
| prefix (parallel scan, feedback) | 65536 | 9.359 | 0.158 | 17.033 | 9.592 | 12 | never (CPU faster per iteration) |
| prefix (parallel scan, feedback) | 262144 | 35.256 | 0.579 | 68.983 | 46.043 | 12 | never (CPU faster per iteration) |
| prefix (parallel scan, feedback) | 1048576 | 125.404 | 1.856 | 256.949 | 199.681 | 12 | never (CPU faster per iteration) |
| shuffle (map + radix sort, feedback) | 4096 | 14.130 | 0.138 | 16.657 | 5.550 | 24 | never (CPU faster per iteration) |
| shuffle (map + radix sort, feedback) | 65536 | 177.158 | 2.802 | 225.903 | 17.618 | 24 | never (CPU faster per iteration) |
| shuffle (map + radix sort, feedback) | 262144 | 680.455 | 13.323 | 783.970 | 58.352 | 24 | never (CPU faster per iteration) |
| shuffle (map + radix sort, feedback) | 1048576 | 2710 | 71.443 | 4969 | 291.180 | 24 | never (CPU faster per iteration) |


## What the numbers show

- **Residency removes the per-call cost.** For 65,536 particles, a one-shot
  call costs 176 ms per iteration natively; a resident step costs 1.6 ms. At a
  million cells, Life costs 120 ms per one-shot call and 21 ms per resident
  step.
- **The one-off cost is mostly value decoding, not transfer.** The CPU
  session's full read of 65,536 particles (no device transfer at all) costs
  about the same as the GPU's, because both decode records to JSON. Small
  reads avoid it: a bounds reduction returns 40 bytes.
- **Break-even needs a real GPU.** On lavapipe the "GPU" competes with the CPU
  for the same cores, so the compiled CPU wins every steady-state comparison
  natively; in the browser host the CPU baseline is Wasm, and Life beats it
  from two iterations at 65,536 cells. Radix sort and scan are many small
  dispatches, which a software adapter serialises; expect the opposite
  ordering on hardware.
