# Four-column modular matrix experiment

The explicit Ink algorithm accumulates four output columns together. Each inner
iteration reuses one A value and reads four adjacent B values; a `Vec4<u32>` holds
the independent accumulators. Every lane visits k in the original order. Tail
columns are appended only when present, and missing input entries remain zero.

The idea follows the multiple-output accumulation in the pinned
[BLIS Arm microkernel](https://github.com/flame/blis/blob/a8037cfc4330030c726efaec1ffeb1f93d468aa3/kernels/armv8a/3/bli_gemm_armv8a_asm_d6x8.c).
This experiment uses Ink's existing wrapping-u32 matrix contract. A BLAS
floating-point comparison would require its own numerical contract and harness.
No source syntax or compiler implementation was changed for this prototype.

Initial reference execution matches an independent modular matrix oracle for
24 calls, covering zero and odd dimensions, four-column boundaries, truncated
inputs and overflowing products. `tests/support/matmul_tiles.rs` extends this to 88 calls
across 11 dimensions and four input shapes, before and after ordinary checked
helper expansion. Both passes match C, Rust, JavaScript and both Wasm targets;
GPU hosting uses CPU fallback, with no device matrix claim.

Run the portable test with the usual mandatory target toolchain:

```sh
cargo test --test physical_capabilities matmul_tiles -- --nocapture
python3 bench/matmul-tiles/run.py --build-only
# Run after all builds and validation have stopped.
python3 bench/matmul-tiles/run.py --measure-only --rounds 8
```

This is an explicit algorithm candidate. There is no admitted universal rewrite
from the original matrix program to this tiled program yet.

The timing harness compares original and tiled Ink with original and tiled Rust
under the same wrapping-u32 contract. It covers eleven dimensions through 128,
including zero, odd dimensions, tile tails and separately truncated inputs.
Each call owns and clones its inputs and drops the complete output. Every output
cell is checked before and after timing. Twelve inner rotations give each of the
four implementations equal positions; confidence intervals use medians from
eight fresh processes. Build metadata retains source, compiler, plan, generated
code and binary hashes plus the dependency lock and flags. These Rust controls
are purpose-built exact-integer kernels, not a measurement of the BLIS library.

## Measured prototype

On the Apple M4 Pro, full square inputs measured as follows (microseconds):

| Side | Original Ink | Tiled Ink | Tiled Rust | Tiled/original Ink |
|---|---:|---:|---:|---:|
| 64 | 128.965 | 61.811 | 58.380 | 0.479 |
| 127 | 1088.667 | 449.750 | 453.563 | 0.413 |
| 128 | 1141.542 | 463.646 | 477.594 | 0.406 |

The 128-square tiled-Ink/Rust ratio is 0.971, with a process-bootstrap interval
of 0.937–0.986. At 127 it is 0.992 (0.984–1.0003), and at 64 it is 1.059
(1.028–1.069). Small sizes, tails and truncated inputs remain in `results.json`.
The final Rust controls preserve wrapping-u32 index arithmetic and the same
length guard. An earlier usize-index pilot is not used for these comparisons.

This run uses the local cold-growth native-support candidate. Its compiler and
generated-code hashes are recorded; this is not a timing of the published main
binary. That support candidate has a separate pathfinding regression under
investigation. These numbers establish a matrix algorithm result, not a safe
default selection rule or general performance ranking.
