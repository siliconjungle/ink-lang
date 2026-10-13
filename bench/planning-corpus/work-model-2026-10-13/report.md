### reference_fuel

| Program | Training pairs | Pick | Predicted | Held-out geomean | Robust gains / losses |
|---|---:|---|---:|---:|---:|
| ast-ancestor | 331 | baseline | | 1.000× | – |
| bulk-update | 343 | baseline | | 1.000× | – |
| compact-set | 321 | baseline | | 1.000× | – |
| drawing-hit | 266 | baseline | | 1.000× | – |
| incremental-distinct | 344 | baseline | | 1.000× | – |
| index-membership | 196 | baseline | | 1.000× | – |
| particle-step | 343 | baseline | | 1.000× | – |
| sequence-every | 328 | baseline | | 1.000× | – |
| spatial-collision | 280 | baseline | | 1.000× | – |
| text-lines | 344 | baseline | | 1.000× | – |

Fit on all programs: slope 0.000, residual spread 0.551 on 344 pairs. Validation: **rejected** (the model picked nothing on any held-out program); 0 of 10 programs picked; geomean over all programs 1.000×.

### target_iterations

| Program | Training pairs | Pick | Predicted | Held-out geomean | Robust gains / losses |
|---|---:|---|---:|---:|---:|
| ast-ancestor | 251 | baseline | | 1.000× | – |
| bulk-update | 251 | baseline | | 1.000× | – |
| compact-set | 229 | baseline | | 1.000× | – |
| drawing-hit | 178 | baseline | | 1.000× | – |
| incremental-distinct | 251 | baseline | | 1.000× | – |
| index-membership | 157 | baseline | | 1.000× | – |
| particle-step | 251 | baseline | | 1.000× | – |
| sequence-every | 251 | baseline | | 1.000× | – |
| spatial-collision | 189 | rewrite | 1.84× (≥1.60) | 1.528× | 18 / 0 |
| text-lines | 251 | baseline | | 1.000× | – |

Fit on all programs: slope 0.727, residual spread 0.256 on 251 pairs. Validation: **validated**; 1 of 10 programs picked; geomean over all programs 1.043×.

