# Original-algorithm comparison — 10 October 2026

**Proof-optimised Ink JavaScript beats the original handwritten JavaScript algorithm on both browser scalar-repeat tasks by about 5×. Handwritten JavaScript wins on all measured collection tasks; Rust compiled to Wasm wins against Ink/Wasm in every measured cell.** Original Ink without the proof rewrites is slower than the literal JavaScript controls throughout this suite.

This answers the clarified question: keep the originally written algorithm in each language, then let each compiler/JIT optimise normally. The previous benchmark used handwritten closed-form shortcuts as controls and therefore answered a different comparison. Those earlier results remain intact.

## Direct browser timings

The scalar tasks perform 4096 repetitions on full-width wrapping U32 values. Collection rows use 65536 full-width words. All timings below are warmed complete calls, including input capture, result conversion and checksum consumption. The original JS control uses native Uint32Array stages; ordinary Array translations were measured separately and give the same winner for these browser rows.

| Original source task | Original JS (µs) | Ink → JS with proofs (µs) | Original Rust → Wasm (µs) | Ink → Wasm with proofs (µs) |
| --- | ---: | ---: | ---: | ---: |
| repeat_subtract | 28.95 | 5.75 | 0.20 | 4.71 |
| repeat_product | 29.30 | 5.93 | 0.20 | 5.00 |
| scaled_sum | 2,037.50 | 13,700.00 | 60.00 | 6,100.00 |
| zero_sum | 1,200.00 | 9,750.00 | 29.69 | 4,866.67 |
| mapped_count | 1,291.67 | 10,450.00 | 36.75 | 5,466.67 |
| true_filter_sum | 3,550.00 | 13,700.00 | 116.50 | 5,633.33 |
| false_filter_count | 710.00 | 9,600.00 | 28.89 | 4,633.33 |
| fused_filter | 4,933.33 | 12,800.00 | 1,177.78 | 6,200.00 |

Scalar browser speedups against original typed-array JavaScript, with paired bootstrap 95% intervals:
- repeat_subtract: **5.03×** [4.67, 5.34].
- repeat_product: **4.94×** [4.85, 5.17].

Node behaves differently on the product loop. On its full-width subtraction loop, Ink wins by 4.79× [4.29, 5.02]. On its full-width product loop, literal typed-array JS wins by 3.33× [3.19, 3.47]. Inputs and archived module hashes are identical across hosts. The difference is consistent across the calibrated trials, warmups and seven measured rounds. Different ordinary engine/JIT optimisation is a plausible explanation, not an established cause without profiling. The benchmark therefore does not establish a universal winner across JavaScript engines.

## What was compared

- Original Ink source, compiled without proof selection, and the same source compiled with checked proof selection. The compiler binary and trusted semantic core are unchanged.
- Original-algorithm JavaScript translations using ordinary Array stages and native Uint32Array stages. All source loops and separate map/filter materialisations remain; no manual algebraic shortcuts.
- Original-algorithm Rust using explicit loops and Vec materialisations, compiled with opt-level=3 and SIMD128 to Wasm. Normal compiler optimisation is allowed; no black-box barriers artificially preserve dead work.
- The previous hand-optimised algorithm-matched JS/Rust controls remain separate in the same run.

This measures each implementation through its web host call. Ink pays its generic public validation, packing and scheduling costs. Controls capture the typed input; Rust controls copy it into Wasm and copy array results back. These are materialised source translations, not lazy Rust iterator alternatives. Native Rust execution was not measured. Wasm is the execution target here, with both Ink and Rust compiled to it.

No main-suite workload executed on WebGPU: all requested GPU calls recorded CPU fallback and were excluded from GPU timings. The earlier separate real-GPU vector experiment remains archived.

## Evidence and database

Each host covers eight algorithms, 40 input cells, nine timed variants and seven paired rounds: **2520 samples per host**. Browser validation completed 1232 exact Python-oracle comparisons; Node completed 1152. An independent source review found no blocking issue. Receipt inspection verified complete rounds, exact outputs/checksums, timing normalization and unchanged source/artifact/compiler identities.

Full paired results: [browser-REPORT.md](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/proof-database-original-algorithms-2026-10-10/browser-REPORT.md), [node-REPORT.md](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/proof-database-original-algorithms-2026-10-10/node-REPORT.md). Raw receipts: [browser-results.json](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/proof-database-original-algorithms-2026-10-10/browser-results.json), [node-results.json](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/proof-database-original-algorithms-2026-10-10/node-results.json). Source/toolchain identities: [metadata.json](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/proof-database-original-algorithms-2026-10-10/metadata.json).

Another 320 canonical Wasm performance observations were imported, bringing this work to **578 observations**. The 648-entry proof snapshot is unchanged. Observed memory means exported Wasm linear-memory highwater only; JS/GPU peaks were not invented. [canonical-observation-import.json](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/proof-database-original-algorithms-2026-10-10/canonical-observation-import.json)

Reproduce using the fresh-report commands in [the harness README](/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/bench/proof-database/README.md). Preparation refuses to overwrite archived timings. Changes remain local; no commits, pushes or pull requests.

The result demonstrates the benefit of proof-based work elimination on some original JavaScript algorithms. The larger collection and Rust/Wasm gaps still motivate runtime ingress, conversion and scheduling work before expecting broad wins.
