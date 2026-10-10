# Benchmarks

The full language is still in development. Every result below is about a specific
implemented subset, compiler revision, machine and baseline. The method is in
[docs/benchmark-methodology.md](docs/benchmark-methodology.md). Archived reports
are immutable; each records its own toolchain, sources and commands.

## Current results index

| Report | Measures | Headline (see report for limits) |
| --- | --- | --- |
| [native-state-phase3-native-abi](reports/native-state-phase3-native-abi/REPORT.md) | Stateful generated Rust vs C/C++/Rust (M4 Pro) | Bounded Ink takes 1.75× handwritten Rust u128 time (geomean of 18 cells). That baseline's aborting change is a presence check, which is disclosed in the report |
| [bench-method-linux](reports/bench-method-linux/REPORT.md) | The same harness on Linux, with warmup, 11 rounds, paired bootstrap CIs and an algorithm-matched `fail` baseline | Methodology validation only (cloud VM, LLVM 22 vs 18). Bounded is 1.51× Rust tree and 1.36× algorithm-matched Rust (geomean) |
| [lifecycle-phase1](reports/lifecycle-phase1/REPORT.md) | Construction, growth, mixed operations, clearing and teardown, plus retained allocations across C, C++, Rust and Ink | See report |
| [collection-proof-phase1](reports/collection-proof-phase1/REPORT.md) | Database-selected, induction-checked single-fold collection implementations | 6.17× faster than Ink's staged baseline; 1.004× C, 0.991× Rust combined loops |
| [filter-proof-phase1](reports/filter-proof-phase1/REPORT.md) | Checked filtered pipelines | 3.43× faster than the materialised baseline; ≈1.00× C/C++/Rust |
| [cache-lowering-phase1](reports/cache-lowering-phase1/REPORT.md), [wide-cache-phase1](reports/wide-cache-phase1/REPORT.md), [reversible-cache-phase1](reports/reversible-cache-phase1/REPORT.md), [storage-reuse-phase1](reports/storage-reuse-phase1/REPORT.md), [ordered-storage-phase1](reports/ordered-storage-phase1/REPORT.md) | Cache lowering, wide Int caches, reversible journals, integer storage reuse, ordered storage | See each report |
| [source-routing-phase1](reports/source-routing-phase1/REPORT.md), [gpu-phase2](reports/gpu-phase2/REPORT.md) | Checked CPU/GPU routing and resident compute pipelines | External cost selection keeps CPU where GPU loses |
| [wasm-phase3-literal](reports/wasm-phase3-literal/metadata.json), [compact-state-wasm-phase1](reports/compact-state-wasm-phase1/REPORT.md) | WebAssembly targets | See each report |

Unless a report says otherwise, these use a single machine with no CPU pinning,
and differences of a few percent are noise.

## Historical: first pure-collection milestone (2026-10-09, `reports/native-phase1`)

> **Historical.** The "Language with knowledge" column used the modular-polynomial
> certificate path, which has since been retired from the compiler. The current
> pure harness (`bench/run.py`) uses external checked rewrite search instead, and
> the current baseline materialises collection stages. Numbers from a run today
> therefore differ from this table. The archived samples and metadata are in
> [reports/native-phase1](reports/native-phase1/REPORT.md).

This measures the first working pure-collection subset of the proposed language. The full language remains in development. State transactions, incremental query maintenance, persistence, general proof terms, WebAssembly and runtime adaptation are not represented by these results.

The generated code is approximately at parity with optimised C, C++ and hand-written Rust loops on this suite. With the imported proof package it takes **0.999× C time**, **0.989× C++ time**, and **0.986× Rust-loop time** (geometric means across the measured cases; lower is better). Against the fastest of the four baseline implementations for each case, it takes **1.005×** the time.

Importing the checked polynomial rewrite improves that kernel by **1.30×** in geometric-mean throughput relative to the compiler without the package. The C/C++/Rust baselines already use the factored form, so this demonstrates automated recovery of an expert optimisation rather than a new algorithm unavailable to those languages.

The Rust iterator pipeline is slower than the Rust loop version in this run. The loop comparison removes most of that apparent language advantage. Backend versions also differ; these measurements do not isolate the cause of the iterator result.

### Representative results

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

### Validation and method

- 8,568 native comparisons and 84 interpreter comparisons passed against an independent Python integer reference, including empty inputs and unsigned-overflow boundaries.
- 2,352 timed samples cover 56 workload/size/distribution combinations and six variants.
- All timed executables link the identical C timing-driver object against separately compiled kernels. No LTO is used across this boundary, and every returned value contributes to an emitted checksum.
- Full runs use 32, 4,096, 262,144 and 4,194,304 elements; distributions include bounded small values and values spanning the full u64 range.
- Implementations use the same modular-u64 semantics and fused algorithms. There is no deliberately allocating C/C++/Rust comparison.
- Each variant has a calibrated batch duration and seven samples. Variant order is shuffled within each round. Three calls warm the kernel before timing.
- All native compilers use optimisation level 3 and native CPU targeting. The language emits C and then uses the same Clang backend as the C/C++ baselines.
- Proof checking and compilation happen before the execution benchmark. Their process timings are retained in metadata.json; they are not hidden in runtime measurements.

### Machine and toolchains

- CPU: Apple M4 Pro.
- Memory: 48 GiB.
- Platform: macOS-15.7.4-arm64-arm-64bit-Mach-O.
- Clang: Apple clang version 17.0.0 (clang-1700.6.3.2).
- Rust: rustc 1.99.0 (b940084d7 2026-09-28).
- LLVM version: 23.1.1.

### Interpretation and limits

These results support a useful starting point: the frontend can generate competitive fused loops, and a locally checked proof package can change generated code and improve an eligible workload. They do not establish an overall lead over expert native code.

The suite runs on one shared, interactive Apple Silicon machine without CPU pinning or controlled thermal conditions. Differences of a few percent should be treated as approximate parity. The results are single-threaded and exclude application startup, durable writes, foreign-call-heavy workloads, concurrent updates, and adaptive migration.

The proof checker covers modular polynomial identities only. It is a trusted Rust decision procedure, not a mechanically verified general-purpose kernel. Fused-loop lowering and Clang/LLVM remain trusted. Differential tests add evidence but are not formal code-generation proofs.

The most important next benchmark is an actual stateful language program: imported checked incremental-maintenance knowledge versus manually maintained C/C++/Rust, including query/update tradeoffs and transaction costs. A rescan-only baseline would overstate the result.

### Reproduce and inspect

The archived run's results are in `reports/native-phase1/`. Running `python3 bench/run.py` today writes a *new* local run to `bench/results/` (gitignored) using the current compiler, so it does not reproduce the retired column below. The runner discovers this workspace’s isolated Rust installation, or uses an existing toolchain on PATH.

- [Raw samples](reports/native-phase1/samples.json)
- [Summaries](reports/native-phase1/summary.json)
- [Environment, commands and source hashes](reports/native-phase1/metadata.json)
- [Correctness checks](reports/native-phase1/correctness.json)
- [Language source](examples/kernels.lang)
- [Proof-package source](knowledge/ring.lang)
- [Full implementation plan](PLAN.md)
