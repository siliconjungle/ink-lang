# Factored closed-data proofs and configured model startup

This acquisition removes the exceptional-literal proof resource limit in the
preceding sharing report. The knowledge producer factors equal closed data into
ordinary source-bound theorems; it does not add a trusted rewrite, change the
kernel, or raise checker limits. Complete exceptional lists of 64, 128, 244 and
512 values pass the new producer tests. The source/pin ledger is `metadata.json`.

The runnable `examples/frozen-parameters.ink` configures 244 raw F32 values and a
separate trainable cell. Freezing `Model` withdraws its writer while `retune`
continues to update `Weights`. Selected queries return the complete model;
checkpoints preserve NaN payloads, signed zero, pending events and version state.
This is explicit configuration with a live training API, not fitted weights or
evidence of neural convergence.

Validation retained here includes:

- 20 knowledge tests, including rehashed invalid lemmas with valid membership,
  a changed NaN payload with its source-bound closure rebuilt, and resource-limit
  fallback after partial private construction.
- Eleven frozen-state integration tests with all CPU/GPU coverage flags enabled,
  followed by the configured-model test with additional direct startup-bit checks.
- Five ordinary trained-build tests. The separate all-target run passed four and
  failed to execute a cached GPU runner (`PermissionDenied`); that file was 32
  non-executable bytes. Cleaning that Cargo package and rebuilding made the sole
  affected GPU test pass, including an actual dispatch. Both runs are retained;
  the default five-test run alone does not establish device execution.
- 33 complete reference observations replayed through native Rust, JavaScript
  and Rust/Wasm; native wgpu receipts include one actual pure GPU control.
  Retained browser images pass 99 comparisons, six restores and three rejected
  checksum-valid checkpoints with an altered frozen NaN payload. Each browser
  comparison checks the complete reply and exact checkpoint; rejected restores
  leave live state unchanged. Stateful training executes on the CPU host.
- A fresh committed compiler/package source rebuild with a fresh Cargo target,
  reproducing both packages' executable images, typed cores, selection proof
  bytes and startup snapshots. This is finite reproducibility evidence, not a
  compiler, backend, ABI, toolchain or driver correctness proof.

The kernel/backend pins are unchanged from the preceding sharing acquisition.
Its 450 isolated core tests remain historical evidence for the same core tree;
they were not rerun for this knowledge/packaging change. The older retained
531 browser comparisons were also replayed successfully with the updated runner.

## Package cost

The selected model carries 76 database objects, including 15 ordinary closed
theorems. Serializing its complete rebased plan as compact JSON reduces
inventoried package bytes from 4,131,526 to 1,704,472 (58.7%). The compact baseline
is 296,952 bytes, so the selected package remains about 5.74 times larger.
Previous plan bytes are retained and parse to the same JSON values. Executed
images and proof bytes were unchanged by this serialization adjustment. Earlier
pretty-printed packages still verify. No runtime throughput, compilation-speed,
memory or automatic profitability improvement is claimed here.

The generated lemmas travel with the model's database view; this change does not
expand the default catalogue. Fingerprints only locate candidates. Ordinary
theorem and complete action checking remain the admission boundary.

Run the file/inventory audit with `python3 audit.py`. Add `--ink /absolute/path/to/ink`
to recheck both packages and ordinary action proofs, and `--chrome /absolute/path/to/Chrome`
to replay the retained browser images. Archives contain regular files only.

Large generated action continuations, reusable graph/tape compilation, learned
structural/device choices, GPU training and the remaining upstream Handwired,
Pretext and Freerange performance work are still open. This milestone addresses
proof construction for fixed data, not those larger capabilities.
