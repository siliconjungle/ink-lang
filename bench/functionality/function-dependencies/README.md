# Per-function device types

Implementation: `1674a59db3796c5e053c00d0ae7c0906c14c8a78`.
Matching standalone core: `1c1b5c577dfec1d8aef115864e28c944f1fb87ee`.
All independent package revisions and the immutable compiler digest are in
`source-pins.json`. The core package contains exactly the distribution's complete
239-file core tree, validated in a fresh private checkout and build target.

Generic bounded lexical dependency analysis now supplies GPU record declarations
and the existing mixed-module closure extractor. Calls, signatures, annotations,
constructors, enum constants and complete transitive record fields remain visible.
Lexical shadowing does not import an unrelated global record. Work exhaustion
returns an error; no partial dependency result grants device capability.

The same complete source module containing the 244-parameter resident F32 learner,
binary64 forward-AD companions and an unrelated owned carrier previously lost all
four training kernels. `before-after.json` and both manifests bind that exact
source identity. All four now have device graphs; binary64 still uses CPU fallback.
Ten complete native CPU/wgpu and browser Wasm/WebGPU reads match. Each GPU history
performs 44 dispatches with no iteration transfers. JavaScript's initial gradient
matches exactly; all 244 coordinates also pass the independent real-valued reverse
oracle at its declared tolerance. The companion derivative at
`1.0000000000000002` returns exactly `2.0000000000000004` on native CPU, Wasm CPU
and JavaScript; required GPU execution rejects for unsupported binary64 arithmetic.

A stateful reverse-AD fixture also tests a parameter named `Alias` shadowing an
unrelated `Alias` record containing `List<f64>`. Native/JavaScript/Wasm and the
native GPU host match all 25 results and complete checkpoints, including a real
GPU dispatch. The required browser replay adds 75 complete comparisons and 24
required-GPU rejection controls. The existing source history retains 105 browser
comparisons, nine restores, six rejection controls and an actual separate device
call, together with the complete resident training history.

Checks passed: 534 core tests (87 integration targets, 89 result groups), all 23
GPU package tests, three runtime unit tests, all-target package checks and locked
fetches, and 28 distribution tests across compute, GPU, source reverse and literal
collection suites. These are local execution and integrity checks, not a claim
that every remote CI job has finished green.

The archive retains exact generated assets, inputs, scripts, complete raw native
and browser histories, Wasm images and stateful snapshots. All 79 active validated
assets match the clean final CLI output byte for byte; `plan.json` adds CLI source
provenance. Eighteen historical unreferenced shader files in the reused test
fixture are explicitly excluded. Build targets and temporary dependency metadata
are retired; Git history retains implementation revisions.

Run `python3 bench/functionality/function-dependencies/verify.py` for retained
integrity. Reproduce by checking out the implementation and its pinned packages,
then running `INK_TEST_WGPU=1 INK_TEST_WASM=1 cargo test --test gpu --test compute
--test source_reverse`, `cargo test --test literal_collections_package`, the exact
standalone core gate, and the existing browser preparation/replay commands in CI.
`docs/function-dependencies.md` and `docs/resident-source-training.md` describe the
contracts and direct training reproduction.

No timing or broad speed claim is made. This adds neither binary64 device
arithmetic, owned reverse tapes on GPU, checked replacement of the prepared graph,
automatic profitable placement nor completion of the wider programme.
