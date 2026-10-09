# First native compiler benchmark results

This measures the first working pure-collection subset of the proposed language. The full language remains in development. State transactions, incremental query maintenance, persistence, general proof terms, WebAssembly and runtime adaptation are not represented by these results.

The generated code is approximately at parity with optimised C, C++ and hand-written Rust loops on this suite. With the imported proof package it takes **0.999× C time**, **0.989× C++ time**, and **0.986× Rust-loop time** (geometric means across the measured cases; lower is better). Against the fastest of the four baseline implementations for each case, it takes **1.005×** the time.

Importing the checked polynomial rewrite improves that kernel by **1.30×** in geometric-mean throughput relative to the compiler without the package. The C/C++/Rust baselines already use the factored form, so this demonstrates automated recovery of an expert optimisation rather than a new algorithm unavailable to those languages.

The Rust iterator pipeline is slower than the Rust loop version in this run. The loop comparison removes most of that apparent language advantage. Backend versions also differ; these measurements do not isolate the cause of the iterator result.

## Representative results

Median microseconds per call, 4,194,304 elements, small-integer input distribution. Seven repeated timing batches per implementation. These are warm in-memory kernels; input allocation and generation are outside the timed region.

| Kernel | Language | Language with knowledge | C | C++ | Rust iterators | Rust loops |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| sum_values | 373.620 | 370.916 | 369.815 | 368.991 | 372.194 | 378.217 |
| affine | 684.982 | 680.818 | 689.554 | 687.786 | 684.780 | 699.351 |
| squares | 493.775 | 493.737 | 494.568 | 496.886 | 498.086 | 496.600 |
| filter_sum | 433.818 | 436.604 | 439.744 | 432.043 | 439.099 | 432.440 |
| pipeline | 1176.121 | 1180.382 | 1190.882 | 1196.794 | 3224.083 | 1187.364 |
| expanded | 779.040 | 605.779 | 609.426 | 605.478 | 605.559 | 606.418 |
| count_under | 422.697 | 419.553 | 440.330 | 424.804 | 447.020 | 420.117 |

## Validation and method

- 8,568 native comparisons and 84 interpreter comparisons passed against an independent Python integer reference, including empty inputs and unsigned-overflow boundaries.
- 2,352 timed samples cover 56 workload/size/distribution combinations and six variants.
- All timed executables link the identical C timing-driver object against separately compiled kernels. No LTO is used across this boundary, and every returned value contributes to an emitted checksum.
- Full runs use 32, 4,096, 262,144 and 4,194,304 elements; distributions include bounded small values and values spanning the full u64 range.
- Implementations use the same modular-u64 semantics and fused algorithms. There is no deliberately allocating C/C++/Rust comparison.
- Each variant has a calibrated batch duration and seven samples. Variant order is shuffled within each round. Three calls warm the kernel before timing.
- All native compilers use optimisation level 3 and native CPU targeting. The language emits C and then uses the same Clang backend as the C/C++ baselines.
- Proof checking and compilation happen before the execution benchmark. Their process timings are retained in metadata.json; they are not hidden in runtime measurements.

## Machine and toolchains

- CPU: Apple M4 Pro.
- Memory: 48 GiB.
- Platform: macOS-15.7.4-arm64-arm-64bit-Mach-O.
- Clang: Apple clang version 17.0.0 (clang-1700.6.3.2).
- Rust: rustc 1.99.0 (b940084d7 2026-09-28).
- LLVM version: 23.1.1.

## Interpretation and limits

These results support a useful starting point: the frontend can generate competitive fused loops, and a locally checked proof package can change generated code and improve an eligible workload. They do not establish an overall lead over expert native code.

The suite runs on one shared, interactive Apple Silicon machine without CPU pinning or controlled thermal conditions. Differences of a few percent should be treated as approximate parity. The results are single-threaded and exclude application startup, durable writes, foreign-call-heavy workloads, concurrent updates, and adaptive migration.

The proof checker covers modular polynomial identities only. It is a trusted Rust decision procedure, not a mechanically verified general-purpose kernel. Fused-loop lowering and Clang/LLVM remain trusted. Differential tests add evidence but are not formal code-generation proofs.

The most important next benchmark is an actual stateful language program: imported checked incremental-maintenance knowledge versus manually maintained C/C++/Rust, including query/update tradeoffs and transaction costs. A rescan-only baseline would overstate the result.

## Reproduce and inspect

Run `python3 bench/run.py` and then `python3 bench/report.py` from the repository. The runner discovers this workspace’s isolated Rust installation, or uses an existing toolchain on PATH.

- [Raw samples](samples.json)
- [Summaries](summary.json)
- [Environment, commands and source hashes](metadata.json)
- [Correctness checks](correctness.json)
- [Language source](../../examples/kernels.lang)
- [Proof-package source](../../knowledge/ring.lang)
- [Full implementation plan](../../PLAN.md)
