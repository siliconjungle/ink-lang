These are selected exact generated conformance inputs and outcomes, not a formal proof.
The two archives retain complete source, histories, expected values/snapshots, generated
JavaScript, native Rust sources/lockfiles, Wasm images and GPU bundle inputs. Cargo
build trees are excluded; selected executable/image files are retained for replay.

To replay in the distribution root, extract each archive into its correspondingly
named `build/` directory, then use `bench/gpu/replay-source-history-browser.mjs`
with real Chrome. Regenerate all inputs with the source_reverse integration test.
Node verification is in each archive's check.mjs/check-wasm.mjs. Native rebuilds
use the local Cargo entry point and exact pinned source preparation policy.

The private standalone core receipt binds the exact package tree and all 539 tests;
its compressed log is retained. Leaf package tests and locked fetch logs, full
F32/F64 target histories, actual-device controls, browser replays and compiler
artifact metadata are retained separately. None attests whole compiler correctness.

Only the separately dispatched device() function GPU sub-bundle is retained;
other generated function bundle copies were unused by these histories and can
be regenerated from the retained source. Top-level manifests remain exact.
