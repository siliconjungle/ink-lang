# Native F32 and database-update epoch

The report and raw-acquisition archives are in `reports/native-f32-epoch-2026-10-13`.

- `store_cost.py` compares publication, index refresh, authenticated export and repeated publication. Old implementations come from the frozen `before-*.py` files. Immutable transport is shared only inside this experiment's workspace; pointers, indexes, observations and explicit pins stay per database. Setup is excluded from timed update phases and separately reported.
- `cold_build.py` profiles two pairs of complete quick builds with the same new compiler/search workers; it substitutes parent storage/migration implementations only.
- `experiment.py` creates reference fixtures, freezes code/resources and source manifests, publishes base/grown checkpoints, then uses ordinary quick automatic selection without supplied held-out workloads. Complete automatic receipts and unsupported ports remain visible.
- `benchmark.mjs` measures complete calls in 15 interleaved rounds. New upstream adapters extract the original pinned function bodies; batching and shape conversion stay inside upstream timing. Input and module setup stay outside every runtime lane.
- `memory.mjs` records separate-process high-water/GC diagnostics. It does not measure exact allocation counts or exact per-call peaks.
- `report.py` preserves every cell and loss, computes fixed-corpus timing intervals, and draws the comparisons and the flat database-growth curve.

Source ports: [gl-matrix vec2](https://github.com/toji/gl-matrix/blob/6f96d577ee0217b5cfce334e2cad92a6ac3572d2/src/vec2.js), [vec3](https://github.com/toji/gl-matrix/blob/6f96d577ee0217b5cfce334e2cad92a6ac3572d2/src/vec3.js), [D3 extent](https://github.com/d3/d3-array/blob/be0ae0d2b36ab91b833294ad2cfc5d5905acbd0f/src/extent.js), [Earcut equality](https://github.com/mapbox/earcut/blob/20a6fae724a58dd78b637ab8477fa20a227c954e/src/earcut.js). Original licenses and seed sources are retained in `bench/real-software-delivery/upstream`. The new upstream byte hashes are in the epoch manifest. Bounded fixtures make Number and ordered binary32 results coincide; this does not assert equivalence of the unrestricted library APIs.

The held-out registration predates new-law authoring and execution timing, but selection is human and several programs share a library. Development programs are separate authored conditional pipelines, not upstream baselines. No supplied plan establishes headline performance.

To replay, unpack the verified machinery/resource archive into a separate workspace, restore the archived compiler binaries, reconstruct the canonical base checkpoint from its historical public snapshot, and set `INK_DISTRIBUTION`/`PYTHONPATH` to that workspace. `experiment.py assert_frozen` binds exact files; the integrated current main intentionally differs. The canonical tree/witness and equality checker still authenticate all exported/admitted objects. Caches, observations, names and manifests supply no proof authority.
