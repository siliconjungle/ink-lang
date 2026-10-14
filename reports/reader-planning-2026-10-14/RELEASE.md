# Checked boundary planning integration

The distribution composes database-proposed checked boundary readers with the independently developed source-state protocols and Set/fact machinery. Each independent package below was published after its relevant standalone gates; JavaScript additionally passed every standalone CI job. Runtime metadata and its complete lockfile were refreshed after transitive pin changes. All standalone JavaScript CI jobs for 5766277 passed, and GPU/runtime pins were subsequently refreshed and tested. The final distribution candidate 3a184663 is under complete CI run 38510074790; final main publication remains pending.

- abi: `8ad066eaca7ed7d7876bb3ff88414b071013b554`
- native-support: `ca9bc59f119db62c2c1ea5000b6baf390f94705a`
- lowerings/js: `5766277bc03be5526282bde100c108de8d62baf7`
- lowerings/rust: `2a1c2b04edcc55c3465bc7bdf03386861e3ec867`
- lowerings/c: `a52c85e88267204330fb06ebabfee0e903422556`
- lowerings/wasm: `29dec0577d71cb5e50376534c94352b2be3149fb`
- lowerings/gpu: `2011f68c3061614e6279822f37d31fffd6f453a7`
- runtime: `85735bfbab33a0d02092f38993a48958ac1fc3ff`
- knowledge: `00e0d893f8734e7550a6ba3f2b1f6b804376c666`
- planner: `bd00dc3053f05839aad9f794e79abda81c638456`

The original frozen planning corpus compiled 10/10 programs against snapshot 89052405cb98c2483b26c6a3a899acd40e66d155c12a8b6233996e2965189676. Later Set knowledge was merged into snapshot 46dcbc6df4711e2a59714a076791f8e47228abcb70bad5bb8aa4f62808009dd8 (30,253 entries); canonical coverage has no unhandled entries, and 20 current recipe/probe/candidate/proof-composition tests pass. Those are separate epochs.

A broad historical knowledge test discovery run reported 63 missing-file errors and 137 skips in 429 tests. All errors are missing pinned historical compiler binaries or quarantined oracle files. It is retained as a failed run; current binaries were not substituted for pinned historical hashes.

The captured-input preflight regression passed before and after the small factory change. Existing identity converters already preserved float bits and prevented recapture. The change removes identity-converter arrays/calls and records the internal captured-input handoff explicitly. Direct, prepared, bound and host-transaction tests preserve complete replies, raw float bits, ownership and portable snapshots. This change has no new speed claim.

The source-state benchmark control preparation checks and compiles database proposals, including preflight/snapshot-cache combinations. The mixed-32 smoke compares complete replies, checksums, versions and exact initial/final Ink portable checkpoints with baseline and Frontier adapters. Its single timing round is not profitability evidence.

The 295–297 wire-reader cohort and automatic-selection smoke retain their archived compiler/layout epochs. They do not measure this final graph or establish an all-metrics Frontier win.
