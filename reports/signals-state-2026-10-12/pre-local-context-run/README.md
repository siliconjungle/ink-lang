# Dependency-tracked state execution — retained comparison

Exploratory state-only Node comparison on Apple M2 (v26.1.0, darwin/arm64). Seven alternating repetitions at 256, 4096 and 16384 rows. The machine was shared with concurrent work; raw samples and ranges are retained. These results do not establish a framework-wide or rendering advantage.

Before uses the independently published JavaScript backend `e9a45c390c3a6a9ffbfe756e2423d280f7a9f430`; current uses `6886e75b0b9730c2c3a7d2e4cb10a0093cc86207`. Both were emitted with the same checked core, source, and aggregate proof request. Baseline/current artifacts and SHA-256 hashes are retained. The earlier initial-distribution comparison is retained under `earlier-pinned-run/`; it predates upstream recursion improvements and the final owned-result copier.

## 4096-row medians

Units are microseconds per complete workload unit, not per individual read. Aggregate units contain a write and both sum/count reads; burst units contain 32 writes and both reads; unchanged units contain both reads. Point units contain one update and one point read. Aggregate boundaries use a common await, while point calls are synchronous.

| Implementation | Write | Update + aggregates | Burst 32 + aggregates | Unchanged aggregates | Point update + read |
|---|---:|---:|---:|---:|---:|
| Ink before | 8.282 | 1237.961 | 1463.527 | 1129.187 | 13.115 |
| Ink current | 2.854 | 1581.038 | 1241.499 | 2.117 | 7.214 |
| Ink current bound | 2.792 | 1331.859 | 1291.400 | 1.922 | 1.955 |
| Ink checked tree before | 42.281 | 40.623 | 1263.789 | 2.457 | — |
| Ink checked tree current | 8.066 | 10.701 | 282.291 | 2.378 | — |
| Ink checked tree bound | 7.791 | 13.589 | 267.478 | 1.608 | — |
| Svelte deep derived | 8.402 | 5488.943 | 6902.095 | 455.736 | 10.053 |
| SvelteMap derived | 6.413 | 651.675 | 719.829 | 143.078 | 3.572 |
| Preact computed | 0.771 | 632.762 | 633.497 | 1.672 | 0.385 |
| Preact chunk64 | 0.992 | 135.070 | 291.663 | 1.212 | 0.384 |
| Svelte manual delta | 5.535 | 7.525 | 140.446 | 1.880 | 2.705 |
| Preact manual delta | 1.624 | 4.095 | 41.234 | 1.396 | 1.823 |

Connected observers are measured separately. These controls include reactive notification/effect scheduling; Ink measurements include transaction, version and event work but no UI subscription adapter.

| Connected control | Update + aggregates (µs) | Unchanged aggregates (µs) |
|---|---:|---:|
| Svelte deep observed | 5916.221 | 2.448 |
| SvelteMap observed | 813.140 | 4.009 |
| Preact computed observed | 676.237 | 2.551 |
| Preact chunk64 observed | 23.344 | 2.489 |

## Interpretation

The normal checked-tree update/aggregate median changes from 40.623 to 10.701 µs (3.80×). Ordinary unchanged sum/count reads change from 1129.187 to 2.117 µs (533.42×). These are workload medians on a shared host, not isolated causal estimates.

Normal before/current lanes retain the same public observation contract. Bound lanes are an explicit typed API: trusted scalar carriers and result-only replies avoid boundary work while preserving versions, rollback and committed outbox events. Signal controls do not implement the full Ink transaction/event/ownership contract. Manual deltas and connected chunk graphs are retained as strong controls rather than treating full scans as signals’ only possible algorithm.

Ordinary Ink still scans after relevant row changes. Raw point signals can have lower overhead; manually maintained deltas can beat a general checked tree. This pass does not add per-key/field subscriptions, DOM scheduling, a proved automatic dynamic graph or universal superiority. Cold setup/compile/admission, complete lifecycle, durability, peak allocations and native/GPU speed are outside the timed loops.

## All sizes and ranges

| Rows | Phase | Implementation | Median µs | Min µs | Max µs |
|---:|---|---|---:|---:|---:|
| 256 | write-only | Svelte deep derived | 11.453 | 6.822 | 27.595 |
| 256 | update-and-aggregate | Svelte deep derived | 335.342 | 269.571 | 525.031 |
| 256 | burst32-and-aggregate | Svelte deep derived | 686.355 | 539.604 | 1419.977 |
| 256 | unchanged-read | Svelte deep derived | 21.702 | 20.907 | 28.648 |
| 256 | point-update-and-read | Svelte deep derived | 8.497 | 6.306 | 15.443 |
| 4096 | write-only | Svelte deep derived | 8.402 | 6.806 | 10.360 |
| 4096 | update-and-aggregate | Svelte deep derived | 5488.943 | 2039.576 | 7419.982 |
| 4096 | burst32-and-aggregate | Svelte deep derived | 6902.095 | 6119.506 | 8118.033 |
| 4096 | unchanged-read | Svelte deep derived | 455.736 | 344.194 | 1345.248 |
| 4096 | point-update-and-read | Svelte deep derived | 10.053 | 4.831 | 14.962 |
| 16384 | write-only | Svelte deep derived | 13.407 | 8.695 | 31.676 |
| 16384 | update-and-aggregate | Svelte deep derived | 12252.480 | 9588.037 | 35680.202 |
| 16384 | burst32-and-aggregate | Svelte deep derived | 56338.520 | 40229.297 | 116412.945 |
| 16384 | unchanged-read | Svelte deep derived | 126328.089 | 47461.763 | 185549.696 |
| 16384 | point-update-and-read | Svelte deep derived | 10.670 | 5.712 | 14.642 |
| 256 | write-only | SvelteMap derived | 10.337 | 5.377 | 21.887 |
| 256 | update-and-aggregate | SvelteMap derived | 60.870 | 47.191 | 140.475 |
| 256 | burst32-and-aggregate | SvelteMap derived | 222.668 | 198.243 | 396.122 |
| 256 | unchanged-read | SvelteMap derived | 12.758 | 9.461 | 16.457 |
| 256 | point-update-and-read | SvelteMap derived | 2.110 | 0.755 | 4.930 |
| 4096 | write-only | SvelteMap derived | 6.413 | 5.888 | 7.779 |
| 4096 | update-and-aggregate | SvelteMap derived | 651.675 | 569.387 | 806.870 |
| 4096 | burst32-and-aggregate | SvelteMap derived | 719.829 | 665.627 | 1067.593 |
| 4096 | unchanged-read | SvelteMap derived | 143.078 | 132.572 | 265.852 |
| 4096 | point-update-and-read | SvelteMap derived | 3.572 | 2.926 | 4.387 |
| 16384 | write-only | SvelteMap derived | 9.507 | 5.950 | 28.248 |
| 16384 | update-and-aggregate | SvelteMap derived | 2650.702 | 2254.208 | 6905.085 |
| 16384 | burst32-and-aggregate | SvelteMap derived | 6088.514 | 3349.513 | 11726.213 |
| 16384 | unchanged-read | SvelteMap derived | 8910.557 | 3477.761 | 14036.985 |
| 16384 | point-update-and-read | SvelteMap derived | 2.347 | 1.870 | 4.865 |
| 256 | write-only | Preact computed | 2.014 | 1.355 | 5.518 |
| 256 | update-and-aggregate | Preact computed | 42.165 | 31.064 | 61.633 |
| 256 | burst32-and-aggregate | Preact computed | 86.580 | 48.083 | 144.711 |
| 256 | unchanged-read | Preact computed | 1.834 | 1.156 | 4.563 |
| 256 | point-update-and-read | Preact computed | 0.572 | 0.081 | 1.599 |
| 4096 | write-only | Preact computed | 0.771 | 0.717 | 1.610 |
| 4096 | update-and-aggregate | Preact computed | 632.762 | 562.460 | 1757.623 |
| 4096 | burst32-and-aggregate | Preact computed | 633.497 | 527.018 | 893.334 |
| 4096 | unchanged-read | Preact computed | 1.672 | 1.191 | 22.235 |
| 4096 | point-update-and-read | Preact computed | 0.385 | 0.102 | 1.009 |
| 16384 | write-only | Preact computed | 1.096 | 0.500 | 7.082 |
| 16384 | update-and-aggregate | Preact computed | 4118.447 | 2380.652 | 9907.414 |
| 16384 | burst32-and-aggregate | Preact computed | 6594.150 | 4448.762 | 8426.879 |
| 16384 | unchanged-read | Preact computed | 1.766 | 1.365 | 19.981 |
| 16384 | point-update-and-read | Preact computed | 0.661 | 0.253 | 1.674 |
| 256 | write-only | Preact chunk64 | 2.921 | 0.704 | 3.452 |
| 256 | update-and-aggregate | Preact chunk64 | 15.686 | 13.369 | 41.122 |
| 256 | burst32-and-aggregate | Preact chunk64 | 76.197 | 52.269 | 114.681 |
| 256 | unchanged-read | Preact chunk64 | 1.352 | 1.267 | 3.342 |
| 256 | point-update-and-read | Preact chunk64 | 0.105 | 0.081 | 5.948 |
| 4096 | write-only | Preact chunk64 | 0.992 | 0.709 | 2.637 |
| 4096 | update-and-aggregate | Preact chunk64 | 135.070 | 94.946 | 290.618 |
| 4096 | burst32-and-aggregate | Preact chunk64 | 291.663 | 241.222 | 355.515 |
| 4096 | unchanged-read | Preact chunk64 | 1.212 | 1.188 | 4.413 |
| 4096 | point-update-and-read | Preact chunk64 | 0.384 | 0.156 | 3.100 |
| 16384 | write-only | Preact chunk64 | 0.765 | 0.528 | 6.325 |
| 16384 | update-and-aggregate | Preact chunk64 | 1192.048 | 658.856 | 1408.899 |
| 16384 | burst32-and-aggregate | Preact chunk64 | 3460.074 | 1488.949 | 4697.928 |
| 16384 | unchanged-read | Preact chunk64 | 2.001 | 1.320 | 86.348 |
| 16384 | point-update-and-read | Preact chunk64 | 1.045 | 0.189 | 2.370 |
| 256 | write-only | Svelte manual delta | 7.286 | 5.975 | 13.960 |
| 256 | update-and-aggregate | Svelte manual delta | 6.847 | 6.139 | 73.568 |
| 256 | burst32-and-aggregate | Svelte manual delta | 144.958 | 97.259 | 208.883 |
| 256 | unchanged-read | Svelte manual delta | 1.855 | 1.171 | 2.494 |
| 256 | point-update-and-read | Svelte manual delta | 2.854 | 1.058 | 4.977 |
| 4096 | write-only | Svelte manual delta | 5.535 | 4.144 | 8.451 |
| 4096 | update-and-aggregate | Svelte manual delta | 7.525 | 5.762 | 31.622 |
| 4096 | burst32-and-aggregate | Svelte manual delta | 140.446 | 112.356 | 256.019 |
| 4096 | unchanged-read | Svelte manual delta | 1.880 | 1.205 | 2.798 |
| 4096 | point-update-and-read | Svelte manual delta | 2.705 | 1.650 | 3.616 |
| 16384 | write-only | Svelte manual delta | 7.561 | 5.164 | 15.308 |
| 16384 | update-and-aggregate | Svelte manual delta | 6.710 | 6.182 | 155.401 |
| 16384 | burst32-and-aggregate | Svelte manual delta | 574.777 | 105.090 | 1024.223 |
| 16384 | unchanged-read | Svelte manual delta | 2.108 | 1.407 | 3.042 |
| 16384 | point-update-and-read | Svelte manual delta | 2.161 | 1.594 | 3.594 |
| 256 | write-only | Preact manual delta | 2.207 | 1.679 | 4.305 |
| 256 | update-and-aggregate | Preact manual delta | 3.765 | 2.856 | 16.499 |
| 256 | burst32-and-aggregate | Preact manual delta | 48.092 | 36.567 | 122.213 |
| 256 | unchanged-read | Preact manual delta | 1.425 | 1.143 | 3.868 |
| 256 | point-update-and-read | Preact manual delta | 1.688 | 1.021 | 2.964 |
| 4096 | write-only | Preact manual delta | 1.624 | 1.171 | 3.509 |
| 4096 | update-and-aggregate | Preact manual delta | 4.095 | 3.195 | 27.296 |
| 4096 | burst32-and-aggregate | Preact manual delta | 41.234 | 36.616 | 48.400 |
| 4096 | unchanged-read | Preact manual delta | 1.396 | 1.170 | 2.908 |
| 4096 | point-update-and-read | Preact manual delta | 1.823 | 0.651 | 2.716 |
| 16384 | write-only | Preact manual delta | 1.755 | 1.087 | 6.341 |
| 16384 | update-and-aggregate | Preact manual delta | 2.589 | 2.443 | 82.570 |
| 16384 | burst32-and-aggregate | Preact manual delta | 93.395 | 49.874 | 793.389 |
| 16384 | unchanged-read | Preact manual delta | 2.273 | 1.321 | 14.192 |
| 16384 | point-update-and-read | Preact manual delta | 2.089 | 1.258 | 3.648 |
| 256 | write-only | Ink before | 11.492 | 9.311 | 26.620 |
| 256 | update-and-aggregate | Ink before | 106.802 | 96.971 | 365.568 |
| 256 | burst32-and-aggregate | Ink before | 329.831 | 310.988 | 439.897 |
| 256 | unchanged-read | Ink before | 73.159 | 63.124 | 94.000 |
| 256 | point-update-and-read | Ink before | 14.817 | 11.731 | 22.825 |
| 4096 | write-only | Ink before | 8.282 | 6.797 | 11.131 |
| 4096 | update-and-aggregate | Ink before | 1237.961 | 1149.332 | 2370.637 |
| 4096 | burst32-and-aggregate | Ink before | 1463.527 | 1275.612 | 1992.738 |
| 4096 | unchanged-read | Ink before | 1129.187 | 1090.032 | 2569.531 |
| 4096 | point-update-and-read | Ink before | 13.115 | 8.853 | 22.617 |
| 16384 | write-only | Ink before | 9.147 | 7.285 | 10.301 |
| 16384 | update-and-aggregate | Ink before | 9083.016 | 5812.929 | 28958.333 |
| 16384 | burst32-and-aggregate | Ink before | 17053.781 | 14212.525 | 26225.110 |
| 16384 | unchanged-read | Ink before | 47544.744 | 16055.660 | 66051.951 |
| 16384 | point-update-and-read | Ink before | 15.095 | 9.834 | 17.780 |
| 256 | write-only | Ink current | 7.302 | 5.292 | 8.655 |
| 256 | update-and-aggregate | Ink current | 85.322 | 73.880 | 154.541 |
| 256 | burst32-and-aggregate | Ink current | 213.946 | 165.895 | 784.179 |
| 256 | unchanged-read | Ink current | 2.074 | 1.410 | 6.186 |
| 256 | point-update-and-read | Ink current | 7.703 | 2.189 | 10.023 |
| 4096 | write-only | Ink current | 2.854 | 2.664 | 5.957 |
| 4096 | update-and-aggregate | Ink current | 1581.038 | 1175.422 | 1678.620 |
| 4096 | burst32-and-aggregate | Ink current | 1241.499 | 1132.523 | 1632.102 |
| 4096 | unchanged-read | Ink current | 2.117 | 1.546 | 3.629 |
| 4096 | point-update-and-read | Ink current | 7.214 | 2.222 | 8.117 |
| 16384 | write-only | Ink current | 6.007 | 2.679 | 31.657 |
| 16384 | update-and-aggregate | Ink current | 7743.143 | 5605.332 | 23682.457 |
| 16384 | burst32-and-aggregate | Ink current | 13361.216 | 12034.557 | 18889.546 |
| 16384 | unchanged-read | Ink current | 2.749 | 1.822 | 15.820 |
| 16384 | point-update-and-read | Ink current | 4.464 | 2.575 | 7.582 |
| 256 | write-only | Ink current bound | 4.416 | 2.830 | 7.669 |
| 256 | update-and-aggregate | Ink current bound | 95.353 | 77.053 | 194.496 |
| 256 | burst32-and-aggregate | Ink current bound | 192.548 | 150.367 | 360.160 |
| 256 | unchanged-read | Ink current bound | 3.422 | 1.204 | 8.380 |
| 256 | point-update-and-read | Ink current bound | 5.490 | 2.547 | 8.228 |
| 4096 | write-only | Ink current bound | 2.792 | 2.389 | 3.671 |
| 4096 | update-and-aggregate | Ink current bound | 1331.859 | 1069.835 | 1586.910 |
| 4096 | burst32-and-aggregate | Ink current bound | 1291.400 | 1146.303 | 1570.942 |
| 4096 | unchanged-read | Ink current bound | 1.922 | 1.286 | 2.271 |
| 4096 | point-update-and-read | Ink current bound | 1.955 | 1.401 | 11.553 |
| 16384 | write-only | Ink current bound | 3.090 | 2.232 | 11.437 |
| 16384 | update-and-aggregate | Ink current bound | 9617.962 | 6774.221 | 18284.258 |
| 16384 | burst32-and-aggregate | Ink current bound | 13098.405 | 11350.567 | 15080.476 |
| 16384 | unchanged-read | Ink current bound | 2.105 | 1.366 | 55.705 |
| 16384 | point-update-and-read | Ink current bound | 3.735 | 2.821 | 5.461 |
| 256 | write-only | Ink checked tree before | 41.166 | 28.397 | 69.522 |
| 256 | update-and-aggregate | Ink checked tree before | 40.089 | 35.814 | 72.429 |
| 256 | burst32-and-aggregate | Ink checked tree before | 865.933 | 775.158 | 1166.131 |
| 256 | unchanged-read | Ink checked tree before | 2.083 | 1.728 | 5.202 |
| 4096 | write-only | Ink checked tree before | 42.281 | 38.706 | 50.288 |
| 4096 | update-and-aggregate | Ink checked tree before | 40.623 | 34.967 | 56.267 |
| 4096 | burst32-and-aggregate | Ink checked tree before | 1263.789 | 1071.499 | 1514.501 |
| 4096 | unchanged-read | Ink checked tree before | 2.457 | 1.769 | 4.603 |
| 16384 | write-only | Ink checked tree before | 44.847 | 38.219 | 64.029 |
| 16384 | update-and-aggregate | Ink checked tree before | 41.951 | 35.383 | 208.202 |
| 16384 | burst32-and-aggregate | Ink checked tree before | 2127.665 | 1664.447 | 3869.931 |
| 16384 | unchanged-read | Ink checked tree before | 8.804 | 2.343 | 85.749 |
| 256 | write-only | Ink checked tree current | 8.240 | 4.636 | 24.664 |
| 256 | update-and-aggregate | Ink checked tree current | 10.777 | 6.714 | 14.552 |
| 256 | burst32-and-aggregate | Ink checked tree current | 206.618 | 165.214 | 420.649 |
| 256 | unchanged-read | Ink checked tree current | 1.783 | 1.606 | 4.644 |
| 4096 | write-only | Ink checked tree current | 8.066 | 7.298 | 9.114 |
| 4096 | update-and-aggregate | Ink checked tree current | 10.701 | 9.730 | 29.696 |
| 4096 | burst32-and-aggregate | Ink checked tree current | 282.291 | 237.079 | 426.066 |
| 4096 | unchanged-read | Ink checked tree current | 2.378 | 1.680 | 20.684 |
| 16384 | write-only | Ink checked tree current | 11.350 | 7.942 | 12.863 |
| 16384 | update-and-aggregate | Ink checked tree current | 11.788 | 9.928 | 44.924 |
| 16384 | burst32-and-aggregate | Ink checked tree current | 584.227 | 415.981 | 816.904 |
| 16384 | unchanged-read | Ink checked tree current | 2.328 | 1.970 | 25.710 |
| 256 | write-only | Ink checked tree bound | 8.669 | 6.344 | 45.224 |
| 256 | update-and-aggregate | Ink checked tree bound | 13.207 | 6.423 | 36.632 |
| 256 | burst32-and-aggregate | Ink checked tree bound | 179.047 | 163.792 | 362.979 |
| 256 | unchanged-read | Ink checked tree bound | 1.309 | 1.268 | 3.272 |
| 4096 | write-only | Ink checked tree bound | 7.791 | 6.422 | 9.190 |
| 4096 | update-and-aggregate | Ink checked tree bound | 13.589 | 9.302 | 35.678 |
| 4096 | burst32-and-aggregate | Ink checked tree bound | 267.478 | 229.947 | 454.798 |
| 4096 | unchanged-read | Ink checked tree bound | 1.608 | 1.265 | 2.167 |
| 16384 | write-only | Ink checked tree bound | 15.554 | 8.550 | 21.900 |
| 16384 | update-and-aggregate | Ink checked tree bound | 10.698 | 9.428 | 59.150 |
| 16384 | burst32-and-aggregate | Ink checked tree bound | 608.557 | 560.018 | 783.301 |
| 16384 | unchanged-read | Ink checked tree bound | 2.172 | 1.572 | 43.044 |
| 256 | observed-update-and-aggregate | Svelte deep observed | 397.386 | 250.758 | 653.734 |
| 256 | observed-unchanged-read | Svelte deep observed | 2.375 | 1.231 | 7.366 |
| 4096 | observed-update-and-aggregate | Svelte deep observed | 5916.221 | 2687.814 | 7460.120 |
| 4096 | observed-unchanged-read | Svelte deep observed | 2.448 | 1.802 | 10.385 |
| 16384 | observed-update-and-aggregate | Svelte deep observed | 40627.994 | 10940.582 | 43795.363 |
| 16384 | observed-unchanged-read | Svelte deep observed | 1.649 | 1.167 | 14.902 |
| 256 | observed-update-and-aggregate | SvelteMap observed | 93.593 | 47.848 | 121.032 |
| 256 | observed-unchanged-read | SvelteMap observed | 2.916 | 1.568 | 7.864 |
| 4096 | observed-update-and-aggregate | SvelteMap observed | 813.140 | 695.607 | 1474.527 |
| 4096 | observed-unchanged-read | SvelteMap observed | 4.009 | 1.344 | 9.752 |
| 16384 | observed-update-and-aggregate | SvelteMap observed | 3860.686 | 3654.451 | 6261.281 |
| 16384 | observed-unchanged-read | SvelteMap observed | 2.306 | 1.174 | 21.561 |
| 256 | observed-update-and-aggregate | Preact computed observed | 58.444 | 46.112 | 106.178 |
| 256 | observed-unchanged-read | Preact computed observed | 2.972 | 1.530 | 10.624 |
| 4096 | observed-update-and-aggregate | Preact computed observed | 676.237 | 519.864 | 991.901 |
| 4096 | observed-unchanged-read | Preact computed observed | 2.551 | 1.131 | 5.588 |
| 16384 | observed-update-and-aggregate | Preact computed observed | 3532.088 | 2485.132 | 4607.172 |
| 16384 | observed-unchanged-read | Preact computed observed | 1.950 | 1.126 | 7.154 |
| 256 | observed-update-and-aggregate | Preact chunk64 observed | 37.467 | 12.594 | 150.393 |
| 256 | observed-unchanged-read | Preact chunk64 observed | 2.464 | 1.589 | 16.419 |
| 4096 | observed-update-and-aggregate | Preact chunk64 observed | 23.344 | 14.764 | 136.801 |
| 4096 | observed-unchanged-read | Preact chunk64 observed | 2.489 | 1.185 | 11.120 |
| 16384 | observed-update-and-aggregate | Preact chunk64 observed | 86.164 | 43.913 | 442.431 |
| 16384 | observed-unchanged-read | Preact chunk64 observed | 1.230 | 1.130 | 2.379 |

## Emitted code size

This pass trades additional direct-call code for steady-state execution. Parsing/startup cost is not measured. Gzip sizes use Python gzip with a fixed timestamp.

| Lane | Program | Bytes | Gzip bytes |
|---|---|---:|---:|
| before | aggregate | 30912 | 9009 |
| before | point | 28044 | 8644 |
| before | indexed | 49961 | 11366 |
| after | aggregate | 35624 | 10216 |
| after | point | 32472 | 9804 |
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
