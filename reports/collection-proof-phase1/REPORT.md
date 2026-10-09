# Checked collection implementations: native performance

Database-selected, induction-checked single-fold implementations run **6.17× faster** than the current literal staged baseline by geometric mean over 24 workload cells. Their elapsed times are **1.004× C**, **1.004× C++** and **0.991× Rust** combined-loop times. These differences around one percent are consistent with essentially the same performance on this run; no statistically significant language ranking is claimed.

This milestone removes the former built-in collection-fusion authority. The baseline now executes separate map stages and a reduction. The external database supplies complete alternative bodies and proofs; the compiler independently validates exact source correspondence and equality before installing them. The measured gain is the difference between staged and combined algorithms, not a new optimisation unavailable to C or an improvement over the previously fused backend.

## Method

- Apple M4 Pro, macOS ARM64, 48 GiB. Exact Clang/Rust/LLVM versions and commands are in metadata.json.
- Eight variants: language staged/checked and C/C++/Rust staged/combined. All share one separately compiled C timing driver, native CPU flags and no LTO across the driver boundary.
- Three timed workloads: two maps plus sum, three maps plus sum, and composition with shadowed lambda names. A fourth mapped-count implementation is verified but not timed.
- Modular u64 arithmetic, borrowed contiguous input, scalar scale=3 and bias=11, scalar return. Empty and full-width boundaries are included in correctness fixtures.
- Sizes 32, 4,096, 262,144 and 4,194,304; small/full-width distributions; seven repetitions; calibrated target 25 ms per batch; reproducibly randomised variant order. Every output is consumed and checksums agree.
- 1,344 timing samples, 24 cells, medians per cell and geometric means of per-cell ratios. No CPU pinning or confidence intervals; this was a shared interactive machine.

The staged variants allocate intermediate buffers during timed calls and keep the same stage structure and arithmetic. C uses malloc/free and indexed writes; C++ uses reserved vectors/push_back; Rust collects borrowed iterators into fresh vectors and drops earlier buffers. The native language baseline uses malloc/free and indexed writes. These allocation APIs and vector checks differ. Combined variants have the same arithmetic and reverse reduction loop without intermediate buffers. Rust uses a newer LLVM than Apple Clang. This is algorithm-matched evidence, with the remaining implementation differences disclosed.

## Example cell medians

Full-width inputs, two maps plus sum; nanoseconds per call:

| Elements | Language staged | Language checked | C combined | C++ combined | Rust combined |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 32 | 63.5 | 5.7 | 5.6 | 5.6 | 5.6 |
| 4096 | 961.3 | 664.7 | 664.2 | 662.7 | 662.6 |
| 262144 | 278,225.5 | 43,400.0 | 43,162.4 | 43,627.1 | 43,533.8 |
| 4194304 | 3,904,142.9 | 713,657.2 | 713,222.2 | 712,055.6 | 717,270.3 |

All cells, calibrations/commands and raw timed samples are preserved in summary.json, metadata.json and samples.jsonl. Sources, generated C/LLVM and selection plans are archived under sources/ and artifacts/.

## Correctness and database extension

All eight native variants pass 8,320 independent Python-oracle comparisons over 260 empty/boundary/random fixtures and varying scalar captures. The Rust suite passes 40 tests, including 1,024 original/candidate interpreter comparisons, lexical shadowing, right-fold order and negative correspondence/proof checks. These tests supplement the checked induction theorems; they are not the justification for applying them.

Five database revisions select zero through four candidates under the unchanged compiler SHA-256 a88aacfbcfaef5e75fe0cb36fa6e598141cf042da55bd777fcb935929885975c. Their checked closures contain 0, 6, 12, 17, 21 objects, and all five produce distinct C programs. The empty selection emits byte-identical C to the ordinary baseline. No optimiser law is added to the core. Objects, proofs, proposal ASTs, endpoint models and plans are archived per revision.

The new import-free pure Wasm path passes 4,416 Node/V8 comparisons and ownership checks over three modules, including memory growth, preservation of input bytes, repeated calls, duplicate binder names, nested temporary list arguments and multiple borrowed lists. See ../collection-proof-wasm-phase1/validation.json. This new path has not yet been browser-verified or performance-benchmarked; the existing separate stateful ABI retains its earlier browser evidence.

## Limits and reproduction

The equivalence is total mathematical value equality over finite u64 lists. Resource failures, allocation/OOM/trap traces, source-to-model correspondence, the Rust checker, C lowering, allocators and LLVM remain outside a mechanically verified end-to-end argument. The bridge currently models map/sum/count/foldr with scalar steps. Filter, source calls in proof models, richer types and stateful refinement remain work. Legacy polynomial/aggregate/range-analysis authority still prevents claiming completion of the full small-core architecture.

This is a warm single-threaded pure-collection experiment. It does not measure application I/O, transactions, durability, concurrency or changing workloads, and it does not establish a universally fastest language.

```sh
python3 dev.py test
python3 bench/collection-proof.py
python3 bench/collection-wasm.py
```
