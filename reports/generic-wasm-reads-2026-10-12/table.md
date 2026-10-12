| Case | Wasm before | Wasm fixed | Frontier JS | Ink JS | Before/fixed |
|---|---:|---:|---:|---:|---:|
| scalar-64-unchanged | 0.025 | 0.024 | 0.004 | 0.001 | 1.03× |
| scalar-64-sparse | 0.163 | 0.106 | 0.006 | 0.002 | 1.54× |
| scalar-64-dense | 0.167 | 0.111 | 0.005 | 0.002 | 1.50× |
| scalar-1024-unchanged | 0.319 | 0.306 | 0.051 | 0.021 | 1.04× |
| scalar-1024-sparse | 8.143 | 1.601 | 0.075 | 0.024 | 5.09× |
| scalar-1024-dense | 8.669 | 1.768 | 0.066 | 0.026 | 4.90× |
| scalar-16384-unchanged | 5.615 | 5.404 | 0.392 | 0.363 | 1.04× |
| scalar-16384-sparse | 1653.238 | 25.994 | 0.948 | 0.396 | 63.60× |
| scalar-16384-dense | 1681.895 | 28.511 | 1.124 | 0.521 | 58.99× |
| rows-64-unchanged | 0.361 | 0.345 | 0.028 | 0.002 | 1.05× |
| rows-64-sparse | 1.283 | 0.493 | 0.030 | 0.003 | 2.60× |
| rows-64-dense | 1.317 | 0.514 | 0.034 | 0.003 | 2.56× |
| rows-1024-unchanged | 5.686 | 5.394 | 0.207 | 0.049 | 1.05× |
| rows-1024-sparse | 190.380 | 7.726 | 0.230 | 0.051 | 24.64× |
| rows-1024-dense | 191.859 | 8.139 | 0.242 | 0.052 | 23.57× |
| rows-16384-unchanged | 97.778 | 93.384 | 2.415 | 0.907 | 1.05× |
| rows-16384-sparse | budget exclusion | 132.166 | 3.204 | 0.946 | — |
| rows-16384-dense | budget exclusion | 139.346 | 3.781 | 0.982 | — |
| rows-shared-64-unchanged | 0.359 | 0.340 | 0.007 | 0.002 | 1.06× |
| rows-shared-64-sparse | 1.325 | 0.503 | 0.009 | 0.003 | 2.63× |
| rows-shared-64-dense | 1.353 | 0.537 | 0.024 | 0.003 | 2.52× |
| rows-shared-1024-unchanged | 5.909 | 5.426 | 0.089 | 0.048 | 1.09× |
| rows-shared-1024-sparse | 192.180 | 7.974 | 0.119 | 0.052 | 24.10× |
| rows-shared-1024-dense | 212.495 | 9.127 | 0.185 | 0.055 | 23.28× |
| rows-shared-16384-unchanged | 98.431 | 91.897 | 0.929 | 0.866 | 1.07× |
| rows-shared-16384-sparse | budget exclusion | 146.614 | 1.463 | 0.995 | — |
| rows-shared-16384-dense | budget exclusion | 171.459 | 3.019 | 1.113 | — |
