# Cold buffer support and matrix-library corpus

This fixed-corpus run uses the frozen compiler built from distribution
`4c68c180160e93a7eb592c7220ec984511f46bda`, published with reports at
`7cbea21028f9c0ec26a19dbbf9c6aeadc5665eb3`, and knowledge `e7a98364359de17670594900c27fb01be69dfa9a`.
Each program receives a private knowledge copy. `context.json` binds the exact
compiler, planner, producer/library sources, manifest and knowledge snapshot.
The evaluation completed before the subsequent broadphase library was added.

This is the JavaScript planning corpus; it does not measure the native buffer
change or the explicit matrix algorithm's speed. The matrix library adds no
automatic original-to-tiled replacement proof. Consult `report.md` for the
observed funnel, near misses and cross-program reuse. Prior reports use different
contexts and planning budgets: selection-count changes are not causal speedups.

Native portfolio and matrix timings, including the remaining medium-grid
pathfinding regression, are in `bench/cross-domain/cold-buffer-results.json`
and `bench/matmul-tiles/results.json`. The separate generated-Rust owner-ABI
experiment is diagnostic evidence; none of its alternatives replaces the
published support implementation.
