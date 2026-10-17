# F32/F64 differentiation through shared source machinery

Source gradient/JVP/linearize and bounded reverse differentiation now choose the
objective's F32/F64 scalar precision. Trainable shapes are homogeneous; forward
supports finite scalar/record coordinates and reverse also supports dynamic lists.
The same transforms and bundled tape implementation supply typed carriers,
constants, division, tape fields and cotangents. Context remains untracked;
tracked hard conversions keep explicit piecewise policy. Unsupported pure helper
proof preconditions reject in both modes instead of silently disappearing.
This introduces no new executable primitive or binary64 mathematical proof domain.

The exact 238-file standalone core passes 528 tests across 86 integration targets,
library and doctests in a fresh private checkout/target. Nine new core tests cover
closed-form derivatives, binary64 resolution, mixed precision, records/lists,
nonfinite primals, tape limits, terminal control, hygiene and precondition rejection.
The receipt binds the exact package/source/tree/archive and complete log.

The real 64-coordinate F64 source learner matches 69 complete reference/native/
JavaScript/Wasm/native-GPU-host outcomes. It exercises authored updates, constraints,
events, failures, rollback, offline/runtime equivalence, restore, raw binary64
primal bits and record-valued forward trajectories/directions. CPU targets compare
every exact checkpoint; the GPU host compares its exact final checkpoint. The same
history requires one actual eligible F32 dispatch. Tapes/training remain CPU work.
The retained F32 and terminal controls match 35 and 25 outcomes respectively,
each with its own required GPU dispatch. Their earlier complete suite output
contains the superseded 65-case F64 history; the final 69-case run adds record
trajectory controls without changing the core implementation or the F32 cases.

All eight existing forward-source integration tests pass, including independent
numerical oracles, the 32-coordinate boundary and complete compiled histories.
Existing polynomial/nonlinear batching equations replay through ordinary
check-selection; their complete selected packet is retained. This proves those
replacement equalities, not that the AD transformation computes mathematical
derivatives in general. Three published F32/no-AD source controls retain exact
checked image bytes. This is finite compatibility evidence, not a universal proof.

`histories-and-images.tar.gz` contains exact authored/checked source, complete
scripts/expected results, GPU receipts/final snapshots/shaders, the retained F32
batching proof and source test. `published-image-controls.tar.gz` preserves the
three selected previous images. Reproduce from the matching committed tree:

    INK_PARITY_REQUIRE_ALL=1 INK_TEST_WASM=1 INK_TEST_WGPU=1 cargo test --test source_reverse -- --nocapture --test-threads=1
    INK_PARITY_REQUIRE_ALL=1 INK_TEST_WASM=1 cargo test --test differentiation -- --nocapture

Use the local Cargo entry point/source-preparation policy on hosts that require it.
Source, checker, AD translation, ABI/backends and toolchain remain trusted.
No new speed, numerical-error, arbitrary-program AD or automatic-selection claim
follows. F64 proof/library generalization, wider contracts/owned source values,
actual GPU-resident training and the full programme remain open.

All five independently pinned lowering/runtime crates pass all-target compilation
and locked fetch with the matching core. Runtime and JavaScript tracked locks
are refreshed; runtime resolves one exact core revision. Package revisions and
validation logs are retained alongside the conformance inputs.
