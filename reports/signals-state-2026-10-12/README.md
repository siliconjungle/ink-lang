# Signal-inspired state execution — retained comparison

Exploratory state-only Node comparison on Apple M2 (v26.1.0, darwin/arm64). Seven alternating repetitions at 256, 4096 and 16384 rows. The machine was shared with concurrent work; raw samples and ranges are retained. These results do not establish a framework-wide or rendering advantage.

Before uses the independently published JavaScript backend `e9a45c390c3a6a9ffbfe756e2423d280f7a9f430`; current uses `696d203565fe6392378a0fd665dcbfb797d79378`. Both were emitted with the same checked core, source, and aggregate proof request. Baseline/current artifacts and SHA-256 hashes are retained. The earlier initial-distribution comparison is retained under `earlier-pinned-run/`; it predates upstream recursion improvements and the final owned-result copier.

## 4096-row medians

Units are microseconds per complete workload unit, not per individual read. Aggregate units contain a write and both sum/count reads; burst units contain 32 writes and both reads; unchanged units contain both reads. Point units contain one update and one point read. Aggregate boundaries use a common await, while point calls are synchronous.

| Implementation | Write | Update + aggregates | Burst 32 + aggregates | Unchanged aggregates | Point update + read |
|---|---:|---:|---:|---:|---:|
| Ink before | 3.356 | 535.816 | 634.573 | 526.949 | 2.859 |
| Ink current | 1.437 | 538.351 | 610.711 | 0.991 | 0.974 |
| Ink current bound | 1.402 | 533.302 | 612.640 | 0.881 | 0.862 |
| Ink checked tree before | 18.114 | 18.936 | 601.103 | 1.190 | — |
| Ink checked tree current | 4.015 | 5.544 | 138.818 | 1.303 | — |
| Ink checked tree bound | 4.056 | 6.655 | 148.245 | 0.922 | — |
| Svelte deep derived | 3.903 | 1415.219 | 2128.022 | 149.406 | 1.564 |
| SvelteMap derived | 2.858 | 226.011 | 318.178 | 62.841 | 0.677 |
| Preact computed | 0.717 | 200.197 | 217.384 | 0.927 | 0.108 |
| Preact chunk64 | 0.672 | 37.141 | 105.090 | 0.923 | 0.110 |
| Svelte manual delta | 2.421 | 3.272 | 62.696 | 0.890 | 0.556 |
| Preact manual delta | 0.839 | 2.255 | 27.125 | 0.933 | 0.409 |

Connected observers are measured separately. These controls include reactive notification/effect scheduling; Ink measurements include transaction, version and event work but no UI subscription adapter.

| Connected control | Update + aggregates (µs) | Unchanged aggregates (µs) |
|---|---:|---:|
| Svelte deep observed | 1486.054 | 0.990 |
| SvelteMap observed | 272.560 | 1.020 |
| Preact computed observed | 250.927 | 1.037 |
| Preact chunk64 observed | 8.294 | 1.021 |

## Interpretation

The normal checked-tree update/aggregate median changes from 18.936 to 5.544 µs (3.42×). Ordinary unchanged sum/count reads change from 526.949 to 0.991 µs (531.67×). These are workload medians on a shared host, not isolated causal estimates.

Normal before/current lanes retain the same public observation contract. Bound lanes are an explicit typed API: trusted scalar carriers and result-only replies avoid boundary work while preserving versions, rollback and committed outbox events. Signal controls do not implement the full Ink transaction/event/ownership contract. Manual deltas and connected chunk graphs are retained as strong controls rather than treating full scans as signals’ only possible algorithm.

Ordinary Ink still scans after relevant row changes. Raw point signals can have lower overhead; manually maintained deltas can beat a general checked tree. This pass does not add per-key/field subscriptions, DOM scheduling, a proved automatic dynamic graph or universal superiority. Cold setup/compile/admission, complete lifecycle, durability, peak allocations and native/GPU speed are outside the timed loops.

## Context reuse probe

The pre-local-context run is retained under `pre-local-context-run/`. Its ordinary changed-aggregate result prompted a separate synchronous probe: before 1508.4 µs, reused-context current 1641.2 µs, invocation-local current 1487.0 µs at 4096 rows (seven measured repetitions; shared host). This supported dropping context reuse. It is exploratory evidence, not an isolated causal proof. `context-probe.json` records original samples/hashes; `context-probe.mjs` replays archived source into an independent build directory.

## All sizes and ranges

| Rows | Phase | Implementation | Median µs | Min µs | Max µs |
|---:|---|---|---:|---:|---:|
| 256 | write-only | Svelte deep derived | 2.891 | 2.490 | 3.984 |
| 256 | update-and-aggregate | Svelte deep derived | 101.706 | 85.295 | 114.360 |
| 256 | burst32-and-aggregate | Svelte deep derived | 229.855 | 222.641 | 246.044 |
| 256 | unchanged-read | Svelte deep derived | 9.761 | 9.281 | 9.851 |
| 256 | point-update-and-read | Svelte deep derived | 3.062 | 2.194 | 4.349 |
| 4096 | write-only | Svelte deep derived | 3.903 | 2.896 | 4.530 |
| 4096 | update-and-aggregate | Svelte deep derived | 1415.219 | 524.807 | 1498.761 |
| 4096 | burst32-and-aggregate | Svelte deep derived | 2128.022 | 2008.299 | 2429.359 |
| 4096 | unchanged-read | Svelte deep derived | 149.406 | 147.363 | 165.214 |
| 4096 | point-update-and-read | Svelte deep derived | 1.564 | 1.407 | 1.650 |
| 16384 | write-only | Svelte deep derived | 4.722 | 3.807 | 5.632 |
| 16384 | update-and-aggregate | Svelte deep derived | 3523.862 | 3035.545 | 4176.242 |
| 16384 | burst32-and-aggregate | Svelte deep derived | 10881.992 | 7984.335 | 14472.326 |
| 16384 | unchanged-read | Svelte deep derived | 8447.625 | 7371.590 | 8919.982 |
| 16384 | point-update-and-read | Svelte deep derived | 2.044 | 1.882 | 2.240 |
| 256 | write-only | SvelteMap derived | 2.729 | 2.390 | 3.209 |
| 256 | update-and-aggregate | SvelteMap derived | 19.544 | 17.892 | 35.078 |
| 256 | burst32-and-aggregate | SvelteMap derived | 95.764 | 85.344 | 101.812 |
| 256 | unchanged-read | SvelteMap derived | 5.055 | 4.879 | 6.376 |
| 256 | point-update-and-read | SvelteMap derived | 0.737 | 0.515 | 2.429 |
| 4096 | write-only | SvelteMap derived | 2.858 | 2.699 | 3.742 |
| 4096 | update-and-aggregate | SvelteMap derived | 226.011 | 216.696 | 242.828 |
| 4096 | burst32-and-aggregate | SvelteMap derived | 318.178 | 292.601 | 346.604 |
| 4096 | unchanged-read | SvelteMap derived | 62.841 | 60.109 | 65.244 |
| 4096 | point-update-and-read | SvelteMap derived | 0.677 | 0.519 | 0.783 |
| 16384 | write-only | SvelteMap derived | 3.316 | 2.875 | 4.333 |
| 16384 | update-and-aggregate | SvelteMap derived | 1058.499 | 980.923 | 1142.673 |
| 16384 | burst32-and-aggregate | SvelteMap derived | 1218.189 | 1143.884 | 1849.761 |
| 16384 | unchanged-read | SvelteMap derived | 700.611 | 672.287 | 2290.304 |
| 16384 | point-update-and-read | SvelteMap derived | 0.754 | 0.669 | 1.019 |
| 256 | write-only | Preact computed | 0.511 | 0.453 | 0.756 |
| 256 | update-and-aggregate | Preact computed | 13.667 | 12.794 | 21.182 |
| 256 | burst32-and-aggregate | Preact computed | 29.053 | 26.522 | 40.356 |
| 256 | unchanged-read | Preact computed | 0.961 | 0.930 | 1.448 |
| 256 | point-update-and-read | Preact computed | 0.064 | 0.050 | 0.183 |
| 4096 | write-only | Preact computed | 0.717 | 0.564 | 0.872 |
| 4096 | update-and-aggregate | Preact computed | 200.197 | 197.149 | 213.740 |
| 4096 | burst32-and-aggregate | Preact computed | 217.384 | 199.592 | 233.888 |
| 4096 | unchanged-read | Preact computed | 0.927 | 0.872 | 1.404 |
| 4096 | point-update-and-read | Preact computed | 0.108 | 0.061 | 0.201 |
| 16384 | write-only | Preact computed | 0.470 | 0.328 | 0.793 |
| 16384 | update-and-aggregate | Preact computed | 901.033 | 802.499 | 948.712 |
| 16384 | burst32-and-aggregate | Preact computed | 990.849 | 914.947 | 1034.208 |
| 16384 | unchanged-read | Preact computed | 0.399 | 0.370 | 0.416 |
| 16384 | point-update-and-read | Preact computed | 0.199 | 0.150 | 0.257 |
| 256 | write-only | Preact chunk64 | 0.623 | 0.486 | 12.334 |
| 256 | update-and-aggregate | Preact chunk64 | 6.537 | 6.354 | 8.025 |
| 256 | burst32-and-aggregate | Preact chunk64 | 31.391 | 28.025 | 37.436 |
| 256 | unchanged-read | Preact chunk64 | 1.097 | 0.930 | 1.141 |
| 256 | point-update-and-read | Preact chunk64 | 0.082 | 0.051 | 0.901 |
| 4096 | write-only | Preact chunk64 | 0.672 | 0.541 | 0.869 |
| 4096 | update-and-aggregate | Preact chunk64 | 37.141 | 34.732 | 38.893 |
| 4096 | burst32-and-aggregate | Preact chunk64 | 105.090 | 101.408 | 134.753 |
| 4096 | unchanged-read | Preact chunk64 | 0.923 | 0.863 | 1.319 |
| 4096 | point-update-and-read | Preact chunk64 | 0.110 | 0.060 | 0.262 |
| 16384 | write-only | Preact chunk64 | 0.506 | 0.345 | 0.926 |
| 16384 | update-and-aggregate | Preact chunk64 | 148.807 | 135.182 | 205.096 |
| 16384 | burst32-and-aggregate | Preact chunk64 | 294.094 | 247.510 | 317.721 |
| 16384 | unchanged-read | Preact chunk64 | 0.390 | 0.381 | 0.414 |
| 16384 | point-update-and-read | Preact chunk64 | 0.211 | 0.131 | 0.282 |
| 256 | write-only | Svelte manual delta | 2.216 | 2.025 | 3.055 |
| 256 | update-and-aggregate | Svelte manual delta | 3.631 | 3.195 | 6.047 |
| 256 | burst32-and-aggregate | Svelte manual delta | 67.739 | 62.089 | 82.012 |
| 256 | unchanged-read | Svelte manual delta | 1.006 | 0.931 | 1.134 |
| 256 | point-update-and-read | Svelte manual delta | 0.664 | 0.476 | 2.326 |
| 4096 | write-only | Svelte manual delta | 2.421 | 2.093 | 2.875 |
| 4096 | update-and-aggregate | Svelte manual delta | 3.272 | 2.756 | 3.525 |
| 4096 | burst32-and-aggregate | Svelte manual delta | 62.696 | 59.585 | 94.071 |
| 4096 | unchanged-read | Svelte manual delta | 0.890 | 0.837 | 1.169 |
| 4096 | point-update-and-read | Svelte manual delta | 0.556 | 0.381 | 0.675 |
| 16384 | write-only | Svelte manual delta | 2.808 | 2.039 | 3.424 |
| 16384 | update-and-aggregate | Svelte manual delta | 3.640 | 3.547 | 10.930 |
| 16384 | burst32-and-aggregate | Svelte manual delta | 74.098 | 51.708 | 106.798 |
| 16384 | unchanged-read | Svelte manual delta | 0.399 | 0.387 | 0.663 |
| 16384 | point-update-and-read | Svelte manual delta | 0.586 | 0.496 | 0.892 |
| 256 | write-only | Preact manual delta | 1.045 | 0.904 | 1.241 |
| 256 | update-and-aggregate | Preact manual delta | 2.026 | 1.861 | 2.878 |
| 256 | burst32-and-aggregate | Preact manual delta | 23.924 | 23.009 | 30.842 |
| 256 | unchanged-read | Preact manual delta | 0.980 | 0.913 | 1.153 |
| 256 | point-update-and-read | Preact manual delta | 0.534 | 0.442 | 1.604 |
| 4096 | write-only | Preact manual delta | 0.839 | 0.803 | 0.987 |
| 4096 | update-and-aggregate | Preact manual delta | 2.255 | 2.057 | 2.819 |
| 4096 | burst32-and-aggregate | Preact manual delta | 27.125 | 23.918 | 40.535 |
| 4096 | unchanged-read | Preact manual delta | 0.933 | 0.860 | 1.295 |
| 4096 | point-update-and-read | Preact manual delta | 0.409 | 0.321 | 0.624 |
| 16384 | write-only | Preact manual delta | 0.827 | 0.727 | 1.263 |
| 16384 | update-and-aggregate | Preact manual delta | 1.713 | 1.604 | 2.818 |
| 16384 | burst32-and-aggregate | Preact manual delta | 23.714 | 22.231 | 28.921 |
| 16384 | unchanged-read | Preact manual delta | 0.384 | 0.369 | 0.686 |
| 16384 | point-update-and-read | Preact manual delta | 0.435 | 0.385 | 1.177 |
| 256 | write-only | Ink before | 3.774 | 3.479 | 4.285 |
| 256 | update-and-aggregate | Ink before | 43.563 | 41.257 | 47.446 |
| 256 | burst32-and-aggregate | Ink before | 126.170 | 119.407 | 142.949 |
| 256 | unchanged-read | Ink before | 37.026 | 35.347 | 39.906 |
| 256 | point-update-and-read | Ink before | 5.370 | 4.388 | 8.214 |
| 4096 | write-only | Ink before | 3.356 | 2.862 | 3.785 |
| 4096 | update-and-aggregate | Ink before | 535.816 | 526.939 | 567.556 |
| 4096 | burst32-and-aggregate | Ink before | 634.573 | 621.014 | 689.052 |
| 4096 | unchanged-read | Ink before | 526.949 | 517.010 | 542.661 |
| 4096 | point-update-and-read | Ink before | 2.859 | 2.685 | 3.156 |
| 16384 | write-only | Ink before | 2.967 | 2.732 | 4.155 |
| 16384 | update-and-aggregate | Ink before | 2837.594 | 2654.486 | 3297.079 |
| 16384 | burst32-and-aggregate | Ink before | 3081.443 | 2899.464 | 3404.635 |
| 16384 | unchanged-read | Ink before | 2930.161 | 2863.336 | 6864.850 |
| 16384 | point-update-and-read | Ink before | 3.138 | 2.852 | 4.726 |
| 256 | write-only | Ink current | 2.343 | 1.717 | 3.734 |
| 256 | update-and-aggregate | Ink current | 40.795 | 38.007 | 44.548 |
| 256 | burst32-and-aggregate | Ink current | 83.245 | 79.447 | 92.525 |
| 256 | unchanged-read | Ink current | 1.228 | 1.043 | 1.445 |
| 256 | point-update-and-read | Ink current | 1.941 | 1.470 | 2.842 |
| 4096 | write-only | Ink current | 1.437 | 1.363 | 2.050 |
| 4096 | update-and-aggregate | Ink current | 538.351 | 526.300 | 563.886 |
| 4096 | burst32-and-aggregate | Ink current | 610.711 | 559.893 | 712.557 |
| 4096 | unchanged-read | Ink current | 0.991 | 0.987 | 1.481 |
| 4096 | point-update-and-read | Ink current | 0.974 | 0.920 | 1.346 |
| 16384 | write-only | Ink current | 1.704 | 1.267 | 2.499 |
| 16384 | update-and-aggregate | Ink current | 2611.906 | 2531.599 | 3174.718 |
| 16384 | burst32-and-aggregate | Ink current | 2859.380 | 2646.509 | 3001.638 |
| 16384 | unchanged-read | Ink current | 0.560 | 0.543 | 0.659 |
| 16384 | point-update-and-read | Ink current | 1.165 | 1.028 | 1.365 |
| 256 | write-only | Ink current bound | 1.819 | 1.574 | 2.332 |
| 256 | update-and-aggregate | Ink current bound | 40.248 | 36.161 | 44.308 |
| 256 | burst32-and-aggregate | Ink current bound | 81.304 | 77.974 | 88.540 |
| 256 | unchanged-read | Ink current bound | 1.231 | 0.945 | 1.493 |
| 256 | point-update-and-read | Ink current bound | 1.802 | 0.960 | 4.338 |
| 4096 | write-only | Ink current bound | 1.402 | 1.359 | 1.889 |
| 4096 | update-and-aggregate | Ink current bound | 533.302 | 527.543 | 559.707 |
| 4096 | burst32-and-aggregate | Ink current bound | 612.640 | 565.520 | 3169.835 |
| 4096 | unchanged-read | Ink current bound | 0.881 | 0.877 | 1.034 |
| 4096 | point-update-and-read | Ink current bound | 0.862 | 0.811 | 1.218 |
| 16384 | write-only | Ink current bound | 2.145 | 1.361 | 2.520 |
| 16384 | update-and-aggregate | Ink current bound | 2660.405 | 2495.564 | 3649.597 |
| 16384 | burst32-and-aggregate | Ink current bound | 2859.901 | 2697.591 | 3187.600 |
| 16384 | unchanged-read | Ink current bound | 0.424 | 0.409 | 0.753 |
| 16384 | point-update-and-read | Ink current bound | 1.018 | 0.895 | 2.350 |
| 256 | write-only | Ink checked tree before | 13.029 | 12.489 | 18.064 |
| 256 | update-and-aggregate | Ink checked tree before | 14.310 | 13.330 | 17.316 |
| 256 | burst32-and-aggregate | Ink checked tree before | 381.493 | 366.417 | 562.689 |
| 256 | unchanged-read | Ink checked tree before | 1.288 | 1.195 | 2.133 |
| 4096 | write-only | Ink checked tree before | 18.114 | 17.889 | 19.238 |
| 4096 | update-and-aggregate | Ink checked tree before | 18.936 | 18.162 | 23.434 |
| 4096 | burst32-and-aggregate | Ink checked tree before | 601.103 | 555.727 | 675.079 |
| 4096 | unchanged-read | Ink checked tree before | 1.190 | 1.148 | 1.923 |
| 16384 | write-only | Ink checked tree before | 21.661 | 19.961 | 22.444 |
| 16384 | update-and-aggregate | Ink checked tree before | 24.367 | 20.397 | 35.869 |
| 16384 | burst32-and-aggregate | Ink checked tree before | 727.044 | 680.869 | 763.329 |
| 16384 | unchanged-read | Ink checked tree before | 0.792 | 0.763 | 1.273 |
| 256 | write-only | Ink checked tree current | 2.948 | 2.702 | 4.272 |
| 256 | update-and-aggregate | Ink checked tree current | 4.118 | 3.848 | 5.550 |
| 256 | burst32-and-aggregate | Ink checked tree current | 85.851 | 83.378 | 98.338 |
| 256 | unchanged-read | Ink checked tree current | 1.428 | 1.212 | 1.728 |
| 4096 | write-only | Ink checked tree current | 4.015 | 3.861 | 4.227 |
| 4096 | update-and-aggregate | Ink checked tree current | 5.544 | 4.755 | 5.963 |
| 4096 | burst32-and-aggregate | Ink checked tree current | 138.818 | 123.562 | 166.847 |
| 4096 | unchanged-read | Ink checked tree current | 1.303 | 1.092 | 3.050 |
| 16384 | write-only | Ink checked tree current | 4.691 | 4.444 | 4.961 |
| 16384 | update-and-aggregate | Ink checked tree current | 6.116 | 5.482 | 10.199 |
| 16384 | burst32-and-aggregate | Ink checked tree current | 185.441 | 149.441 | 226.739 |
| 16384 | unchanged-read | Ink checked tree current | 0.670 | 0.659 | 10.841 |
| 256 | write-only | Ink checked tree bound | 2.917 | 2.551 | 3.251 |
| 256 | update-and-aggregate | Ink checked tree bound | 3.993 | 3.648 | 5.285 |
| 256 | burst32-and-aggregate | Ink checked tree bound | 89.032 | 84.946 | 103.630 |
| 256 | unchanged-read | Ink checked tree bound | 1.030 | 0.968 | 1.349 |
| 4096 | write-only | Ink checked tree bound | 4.056 | 3.832 | 4.353 |
| 4096 | update-and-aggregate | Ink checked tree bound | 6.655 | 5.044 | 12.076 |
| 4096 | burst32-and-aggregate | Ink checked tree bound | 148.245 | 118.514 | 206.010 |
| 4096 | unchanged-read | Ink checked tree bound | 0.922 | 0.897 | 1.370 |
| 16384 | write-only | Ink checked tree bound | 4.684 | 4.390 | 6.042 |
| 16384 | update-and-aggregate | Ink checked tree bound | 6.705 | 5.632 | 32.695 |
| 16384 | burst32-and-aggregate | Ink checked tree bound | 167.956 | 145.790 | 218.468 |
| 16384 | unchanged-read | Ink checked tree bound | 0.422 | 0.419 | 0.462 |
| 256 | observed-update-and-aggregate | Svelte deep observed | 98.061 | 96.622 | 109.785 |
| 256 | observed-unchanged-read | Svelte deep observed | 0.982 | 0.929 | 1.054 |
| 4096 | observed-update-and-aggregate | Svelte deep observed | 1486.054 | 404.863 | 1498.593 |
| 4096 | observed-unchanged-read | Svelte deep observed | 0.990 | 0.987 | 1.139 |
| 16384 | observed-update-and-aggregate | Svelte deep observed | 10034.494 | 2775.729 | 17001.826 |
| 16384 | observed-unchanged-read | Svelte deep observed | 0.987 | 0.982 | 1.010 |
| 256 | observed-update-and-aggregate | SvelteMap observed | 21.007 | 19.367 | 21.990 |
| 256 | observed-unchanged-read | SvelteMap observed | 0.964 | 0.932 | 1.072 |
| 4096 | observed-update-and-aggregate | SvelteMap observed | 272.560 | 250.802 | 284.529 |
| 4096 | observed-unchanged-read | SvelteMap observed | 1.020 | 0.984 | 1.053 |
| 16384 | observed-update-and-aggregate | SvelteMap observed | 1145.975 | 997.311 | 1516.249 |
| 16384 | observed-unchanged-read | SvelteMap observed | 1.063 | 0.984 | 1.239 |
| 256 | observed-update-and-aggregate | Preact computed observed | 14.847 | 13.789 | 16.662 |
| 256 | observed-unchanged-read | Preact computed observed | 0.995 | 0.899 | 1.077 |
| 4096 | observed-update-and-aggregate | Preact computed observed | 250.927 | 241.472 | 269.146 |
| 4096 | observed-unchanged-read | Preact computed observed | 1.037 | 0.968 | 1.241 |
| 16384 | observed-update-and-aggregate | Preact computed observed | 907.050 | 842.411 | 970.051 |
| 16384 | observed-unchanged-read | Preact computed observed | 0.964 | 0.958 | 1.244 |
| 256 | observed-update-and-aggregate | Preact chunk64 observed | 5.695 | 5.204 | 6.218 |
| 256 | observed-unchanged-read | Preact chunk64 observed | 1.004 | 0.906 | 1.075 |
| 4096 | observed-update-and-aggregate | Preact chunk64 observed | 8.294 | 8.113 | 11.200 |
| 4096 | observed-unchanged-read | Preact chunk64 observed | 1.021 | 0.958 | 1.221 |
| 16384 | observed-update-and-aggregate | Preact chunk64 observed | 23.443 | 19.796 | 39.425 |
| 16384 | observed-unchanged-read | Preact chunk64 observed | 1.093 | 0.956 | 1.198 |

## Emitted code size

This pass trades additional direct-call code for steady-state execution. Parsing/startup cost is not measured. Gzip sizes use Python gzip with a fixed timestamp.

| Lane | Program | Bytes | Gzip bytes |
|---|---|---:|---:|
| before | aggregate | 30912 | 9009 |
| before | point | 28044 | 8644 |
| before | indexed | 49961 | 11366 |
| after | aggregate | 35609 | 10208 |
| after | point | 32457 | 9794 |
| after | indexed | 82102 | 15438 |

## Validation and replay

Raw samples, history assertions, counters, setup observations, exact npm versions and source hashes are in `results.json`. `validation.json` records focused regressions, cross-target conformance, the integration rollback regression and mathematical admission. The new law closure, six new state tests, JavaScript package suite, focused store tests and configured cross-target histories passed. Broad historical knowledge discovery had 61 errors (297 tests, 135 skips), including unavailable archive fixtures, legacy compiler paths and historical module imports; it is not claimed to pass.

From the distribution checkout:

```sh
cd bench/signals-state
npm ci
npm run prepare:frozen
npm run build
npm run bench
```

`prepare:frozen` verifies and inflates the exact retained modules. `prepare:source` instead rebuilds the pinned baseline backend and current backend with the same current core/source/request. Neither mode needs the historical research repositories or a published frozen demo. Rebuilding after code changes produces new artifacts and measurements. See `bench/signals-state/README.md` and `docs/signals-state-performance.md` for API, proof and semantic scope.
