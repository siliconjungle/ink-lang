# Resident source-gradient training

Compiler source: `8ed0999bef59fba1b6eee99543d9e20fe6bd1d57`.
Final validation/CI integration: `1d8189303a316aed36e44348878b47421636c358`.
GPU package main: `547f8aefad0a83639df3463e3ec0844e2138cb4f`.
Runtime main: `69e9556daf562f6c98612ccf0c8ee3c13318b9b9`.
Core and its matching standalone package are unchanged; the exact current core
tree remains `b7c336ad4e7e698813d1ff8a1ddf914b98d67d7b`.

The ordinary authored source consumer has 244 parameters, ten inputs, ReGLU
hidden widths [6,6] and four outputs. Coordinate-wise piecewise forward AD,
ordered batch accumulation, Adam moments/powers/counters and parameter feedback
all execute on the GPU. Generic private immutable lists and a literal lazy list
graph stage enable the path. The compiler recognizes no network, optimizer or
AD-generated helper names. Private-array admission counts WGSL padding within a
4,096-word bound; graph wrapping preserves existing direct collection work limits.

Both native wgpu and browser WebGPU require actual device execution, performing
44 dispatches over eleven iterations. Ten complete reads per interface match
native CPU and browser Wasm CPU values: all parameters, optimizer fields,
gradients, losses and validity. Controls cover normal training, empty and shorter
batches, invalid configuration, nonfinite gradients/state, step exhaustion,
invalid shape and restart. Rejected updates retain the entire prior state;
payload-carrying NaNs and negative zero remain observable. Native step paths make
no transfers; browser buffer-upload/mapping instrumentation independently observes
zero host transfers during every step. Explicit reads/writes are outside that claim.

JavaScript's initial 244-coordinate source gradient matches exactly. An independent
real-valued reverse calculation checks every initial coordinate with tolerance
`1e-6 + 3e-5 * abs(expected)`; maximum observed absolute error is
`5.843331568611276e-09`. This numerical check is distinct from exact cross-target
correspondence and supplies no general mathematical AD or backend correctness proof.

The standalone GPU package passes all 20 tests. Distribution regressions pass ten
GPU tests (including the enabled packed Wasm fallback), six literal collection
tests and all four source-reverse tests. The required native training test passes
with both `INK_TEST_WGPU=1` and `INK_TEST_WASM=1`. The existing F32 learner also
passes 35 complete reference/native/JavaScript/Wasm/native-GPU-host outcomes.
Runtime `cargo check --all-targets` and locked fetches of runtime/GPU dependencies
pass; its tracked lock contains the new exact GPU revision.

The existing default source-history browser command now requires resident training.
Its 105 earlier comparisons, nine restores, six required-GPU rejection controls
and one separate device call still pass; the nested resident training check adds
ten CPU and ten WebGPU complete reads. Both existing CI jobs invoke these gates
without workflow edits. Local receipts are evidence of these runs, not a claim
that every remote CI job has finished successfully.

`histories-and-images.tar.gz` retains the complete selected training inputs,
scripts, raw native histories, browser history, final generated bundle (including
Wasm), combined required browser receipt and the earlier source-history reproduction
inputs. Build targets are excluded. All 79 files in the required native/browser
training fixture match the final frozen CLI bundle exactly; its additional
`plan.json` is CLI source provenance. `source-pins.json` binds the frozen compiler
image, source/core/package revisions, validation files, toolchain and source bytes.
`artifact-equivalence.json` binds every final generated file.

Run `python3 bench/functionality/resident-source-training/verify.py` for retained
file/archive integrity. For complete reproduction, check out the validation commit
with its pinned packages, run the existing `source_reverse` suite with both device
and Wasm flags, build its source-history browser Wasm bundle as in CI, and run
`bench/gpu/replay-source-history-browser.mjs CHROME`. The focused reproduction and
source scope are in [resident source training](../../../docs/resident-source-training.md).

This independently authored consumer has the prepared-network milestone's
architecture; it is not an admitted replacement of that prepared graph. Existing
prepared-graph/reverse-tape learning remains on CPU. Device reverse tapes, F64
shaders, wider graph/control/contract domains and useful automatic placement remain
open. No knowledge revision or selection policy changes, no performance benchmark
and no speed claim accompany this functionality milestone.
