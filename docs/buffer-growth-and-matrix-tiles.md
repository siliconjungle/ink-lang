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
