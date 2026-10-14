# Buffer growth and modular matrix tiles

The native support change preserves the consuming `DirectBuffer.push` operation
while moving allocation growth and length failure into separate cold functions.
The ordinary path still uses safe `Vec.push`; the u32 length limit, argument
evaluation, elements and capacity behavior remain unchanged. This applies to the
existing checked direct-buffer representation. It introduces no source syntax,
algorithm rewrite, unchecked memory access or new proof authority.

Tests exercise noncopy element ownership across repeated growth, exactly-once
destruction, spare-capacity reuse and the actual u32 length boundary using
zero-sized elements. The full physical-capability suite compares portable values
and snapshots; eligible word workloads still require actual GPU execution.

## Performance and the remaining regression

The initial cold-growth candidate reduced the 16,384-element game kernel's time
by about 47% and rendering by 28%. At the same time, the 4,096-cell pathfinding
case became about 10% slower. A nine-process comparison of the baseline, growth
candidate and growth-plus-failure candidate confirmed the tradeoff. Outlining
both paths retained the game/rendering gains and reduced that pathfinding
regression to about 6% (ratio 1.060, interval 1.043–1.072). It did not eliminate it.
The implementation uses the latter variant. Continued pathfinding work is needed;
there is no claim that this is uniformly faster for every input.

The scalar-sharing plans and algorithms were fixed during those comparisons.
Generated Rust differed only in the direct buffer support. Control programs,
source hashes, compiler/binary hashes and process observations are retained in
the benchmark reports. The nine-process failure-path experiment edited generated
Rust directly and is identified as diagnostic evidence, not a compiled release.
Release measurements must be distinguished from those diagnostics by their
recorded compiler and binary hashes.

The ECS comparison tool now has an explicit `--allow-compiler-change` option.
It retains the requirement for identical source, driver, upstream revisions and
flags. This permits an actual compiler comparison without relabeling old build
metadata; the report records the option and both compiler identities.

## Matrix algorithm

`knowledge/libraries/matrix_tiles.ink` contains an explicit four-column algorithm.
Each inner iteration reuses one A value and reads adjacent B values. Each output
lane keeps the original accumulation order, wrapping-u32 arithmetic and missing
input semantics. Tail columns are appended only when present. This follows the
multiple-output accumulation idea studied in BLIS's pinned Arm microkernel,
but does not implement or benchmark floating-point BLAS.

The benchmark compares original/tiled Ink with original/tiled independent Rust.
Rust controls retain u32 index wrapping and the same length guard. The portable
test covers 88 cases before and after ordinary checked helper expansion and is
included in the mandatory physical-capability suite. GPU hosting uses CPU
fallback for this matrix program; no device matrix performance is claimed.

The explicit algorithm is usable through an ordinary knowledge-library import.
There is not yet a universal proof allowing automatic replacement of the original
matrix algorithm. Timings do not supply that proof. See `bench/matmul-tiles` for
the full experiment, provenance, sizes, truncated inputs and measured intervals.

## Actual compiler measurements

`bench/cross-domain/cold-buffer-results.json` compares the actual compiler
from root `4c68c180` against the frozen scalar-sharing baseline, using eight
fresh paired processes. These measurements supersede the generated-code
diagnostics for this release. Ratios below one mean less time.

| Kernel | Size | Ink µs | Rust control µs | Ink/control | New/previous Ink |
|---|---:|---:|---:|---:|---:|
| ecs | 16384 | 8.691 | 8.705 | 0.998 | 0.997 |
| game_engine | 16384 | 18.751 | 19.052 | 0.984 | 0.543 |
| compiler | 16384 | 26.777 | 10.412 | 2.572 | 1.023 |
| database | 16384 | 9.790 | 9.865 | 0.992 | 0.996 |
| rendering | 16384 | 12.193 | 15.590 | 0.782 | 0.729 |
| physics | 16384 | 14.959 | 15.059 | 0.993 | 1.000 |
| physics_finite_native | 16384 | 15.024 | 11.820 | 1.271 | 1.002 |
| math | 64 | 128.350 | 127.620 | 1.006 | 0.995 |
| pathfinding | 16384 | 47.595 | 56.536 | 0.842 | 0.996 |
| pathfinding_vs_upstream_dijkstra_all | 16384 | 53.483 | 630.342 | 0.085 | 0.986 |
| pathfinding_vs_upstream_bfs_reach | 16384 | 52.154 | 340.557 | 0.153 | 0.989 |

At 4,096 cells, pathfinding takes 1.068x the previous time
(95% interval 1.058–1.097). This regression remains open.

Controls use matched semantics except the explicitly labeled finite-native
physics control (without NaN canonicalization). Named upstream pathfinding
comparisons pit a general library against a specialized unit-grid program.
These are limited kernels, not whole engines or universal library rankings.
Every measured output is checked; all sizes and intervals remain in the report.
