All numbers are medians in microseconds per call. Each includes consuming the entire returned representation.

### browser-results

| Case (16,384 entries; 164 changes) | Phase | Frontier | Ink JS | Ink Wasm | Ink WebGPU | Wasm captured | GPU resident | Rust native |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| scalar | diff | 67.07 | 60.04 | 100.55 | 4,765.00 | — | — | — |
| scalar | hint | 8.80 | 5.94 | 82.27 | 1,094.37 | — | — | — |
| scalar | apply | 195.00 | 441.56 | 680.00 | — | — | — | — |
| scalar | roundtrip | 239.53 | 503.13 | 765.62 | — | — | — | — |
| rows | diff | 1,895.00 | 144.38 | 4,755.00 | 13,275.00 | — | — | — |
| rows | hint | 15.21 | 15.93 | 4,892.50 | 6,675.00 | — | — | — |
| rows | apply | 1,178.12 | 6,100.00 | 8,940.00 | — | — | — | — |
| rows | roundtrip | 3,090.00 | 6,285.00 | 14,660.00 | — | — | — | — |
| rows-shared | diff | 110.70 | 137.11 | 4,640.00 | 12,570.00 | — | — | — |
| rows-shared | hint | 14.58 | 14.80 | 4,545.00 | 6,000.00 | — | — | — |
| rows-shared | apply | 1,087.50 | 5,485.00 | 7,930.00 | — | — | — | — |
| rows-shared | roundtrip | 1,245.00 | 5,655.00 | 12,530.00 | — | — | — | — |

### node-results

| Case (16,384 entries; 164 changes) | Phase | Frontier | Ink JS | Ink Wasm | Ink WebGPU | Wasm captured | GPU resident | Rust native |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| scalar | diff | 78.08 | 90.11 | 107.42 | — | — | — | — |
| scalar | hint | 9.58 | 7.50 | 90.72 | — | — | — | — |
| scalar | apply | 225.22 | 500.08 | 804.82 | — | — | — | — |
| scalar | roundtrip | 278.02 | 585.03 | 916.26 | — | — | — | — |
| rows | diff | 2,130.18 | 179.88 | 5,079.00 | — | — | — | — |
| rows | hint | 15.65 | 15.61 | 4,951.54 | — | — | — | — |
| rows | apply | 1,678.90 | 11,561.67 | 11,335.58 | — | — | — | — |
| rows | roundtrip | 3,402.69 | 8,619.13 | 15,972.79 | — | — | — | — |
| rows-shared | diff | 134.61 | 225.59 | 5,373.33 | — | — | — | — |
| rows-shared | hint | 16.08 | 18.32 | 5,302.29 | — | — | — | — |
| rows-shared | apply | 1,450.20 | 7,824.71 | 10,517.62 | — | — | — | — |
| rows-shared | roundtrip | 1,562.31 | 9,236.54 | 17,506.38 | — | — | — | — |

### browser-prepared

| Case (16,384 entries; 164 changes) | Phase | Frontier | Ink JS | Ink Wasm | Ink WebGPU | Wasm captured | GPU resident | Rust native |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| scalar | diff | 70.27 | 62.77 | 102.97 | 11,050.00 | 28.11 | 9,795.00 | — |
| scalar | hint | 8.81 | 5.78 | 81.88 | 1,096.87 | 7.92 | 832.50 | — |
| scalar | apply | 189.22 | 440.94 | 684.37 | — | 402.81 | — | — |
| scalar | roundtrip | 242.03 | 495.31 | 774.38 | — | — | — | — |
| rows | diff | 1,837.50 | 141.48 | 4,857.50 | 10,595.00 | 69.45 | 8,265.00 | — |
| rows | hint | 14.59 | 14.50 | 4,522.50 | 5,980.00 | 37.21 | 1,013.75 | — |
| rows | apply | 1,091.25 | 5,715.00 | 8,290.00 | — | 2,013.75 | — | — |
| rows | roundtrip | 2,912.50 | 5,755.00 | 13,290.00 | — | — | — | — |
| rows-shared | diff | 121.41 | 155.47 | 5,180.00 | 17,150.00 | 73.32 | 12,360.00 | — |
| rows-shared | hint | 16.09 | 15.94 | 5,305.00 | 7,285.00 | 43.12 | 1,037.50 | — |
| rows-shared | apply | 1,270.00 | 6,810.00 | 9,130.00 | — | 2,081.25 | — | — |
| rows-shared | roundtrip | 1,457.50 | 7,105.00 | 13,985.00 | — | — | — | — |

### node-prepared

| Case (16,384 entries; 164 changes) | Phase | Frontier | Ink JS | Ink Wasm | Ink WebGPU | Wasm captured | GPU resident | Rust native |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| scalar | diff | 78.07 | 91.61 | 120.45 | — | 26.24 | — | — |
| scalar | hint | 9.54 | 8.04 | 94.86 | — | 8.31 | — | — |
| scalar | apply | 229.01 | 513.07 | 838.99 | — | 468.28 | — | — |
| scalar | roundtrip | 295.01 | 583.84 | 908.20 | — | — | — | — |
| rows | diff | 2,268.24 | 249.48 | 6,334.25 | — | 83.09 | — | — |
| rows | hint | 17.93 | 21.15 | 5,568.12 | — | 52.95 | — | — |
| rows | apply | 1,867.54 | 11,099.83 | 12,772.71 | — | 2,860.15 | — | — |
| rows | roundtrip | 4,214.73 | 10,613.25 | 22,530.67 | — | — | — | — |
| rows-shared | diff | 165.23 | 244.33 | 6,892.96 | — | 89.75 | — | — |
| rows-shared | hint | 20.38 | 20.39 | 6,246.46 | — | 52.09 | — | — |
| rows-shared | apply | 1,769.14 | 11,453.04 | 14,656.83 | — | 2,832.52 | — | — |
| rows-shared | roundtrip | 1,641.51 | 10,093.42 | 17,592.00 | — | — | — | — |

### native-results

| Case (16,384 entries; 164 changes) | Phase | Frontier | Ink JS | Ink Wasm | Ink WebGPU | Wasm captured | GPU resident | Rust native |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| scalar | diff | — | — | — | — | — | — | 51.00 |
| scalar | hint | — | — | — | — | — | — | 3.25 |
| scalar | apply | — | — | — | — | — | — | 82.75 |
| scalar | roundtrip | — | — | — | — | — | — | 260.67 |
| rows | diff | — | — | — | — | — | — | 132.23 |
| rows | hint | — | — | — | — | — | — | 186.17 |
| rows | apply | — | — | — | — | — | — | 243.42 |
| rows | roundtrip | — | — | — | — | — | — | 457.54 |
| rows-shared | diff | — | — | — | — | — | — | 162.99 |
| rows-shared | hint | — | — | — | — | — | — | 56.94 |
| rows-shared | apply | — | — | — | — | — | — | 276.60 |
| rows-shared | roundtrip | — | — | — | — | — | — | 306.66 |
