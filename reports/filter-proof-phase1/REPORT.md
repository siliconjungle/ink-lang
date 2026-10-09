# Checked filtered implementations: native performance

Database-selected, induction-checked replacements run **3.43× faster** than Ink's materialised baseline across the three input-traversal workloads (72 cells). Their geometric-mean elapsed times are **1.002× C**, **1.002× C++** and **0.990× Rust** combined implementations. Differences around one percent on this shared machine do not establish a significant language ranking.

The fourth workload maps every element to a constant. Its checked replacement lets LLVM eliminate the traversal altogether. We report this separately: its 24-cell geometric-mean speedup is about **21,827×**, and its time matches the constant-time handwritten implementations. Mixing that asymptotic change with the traversal results produces the 30.62× all-workload average retained in summary.json; that number should not be read as the normal traversal speedup.

The main result is that externally supplied proofs select better algorithms without adding filter-fusion laws to the core compiler. It does not show an advantage over equally combined C/C++/Rust algorithms, or establish a universally fastest language.

## Workloads and results

All arithmetic is modular u64. The timed scalar parameters are scale=3 and bias=11; the threshold varies by profile.

| Workload | Staged computation | Checked implementation | Speedup over Ink staged |
| --- | --- | --- | ---: |
| mapped_filter_sum | Map, filter mapped values, sum | One conditional right fold | 5.11× |
| filter_map_sum | Filter inputs, map, sum | One conditional right fold | 3.41× |
| mapped_filter_count | Map, filter mapped values, count | One conditional right fold | 2.31× |
| constant_filter_sum | Map to bias, filter, sum | Checked fold; LLVM reduces it to conditional bias × length | 21,827× |

The constant case's final LLVM IR contains comparison, selection, multiplication and return, with no list access or loop. The database proves equality to the fold; LLVM's subsequent loop elimination remains backend optimisation. Constant-time elimination is not supplied as an additional database theorem in this experiment. All combined handwritten baselines explicitly implement the same conditional multiplication.

Example cell medians, full-width inputs and the `half` threshold profile, mapped_filter_sum; nanoseconds per call:

| Elements | Ink staged | Ink checked | C combined | C++ combined | Rust combined |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 32 | 72.0 | 8.1 | 8.1 | 8.1 | 8.3 |
| 4,096 | 2,195.3 | 780.3 | 780.9 | 781.0 | 782.9 |
| 262,144 | 655,322.6 | 50,326.6 | 50,202.5 | 50,083.5 | 50,460.8 |
| 4,194,304 | 12,641,499.8 | 833,720.0 | 826,208.3 | 827,680.0 | 830,480.0 |

## Method and fairness

- Apple M4 Pro, macOS ARM64, 48 GiB. Apple Clang 17 and Rust 1.99/LLVM 23.1.1; exact versions and commands are in metadata.json. Both request their toolchain's native CPU target; the archived Clang IR records apple-m3, so identical CPU flags do not imply identical backend feature selection.
- Eight variants: Ink staged/checked and C/C++/Rust staged/combined. All use one separately compiled C timing driver, release optimisation and no LTO across the driver/kernel boundary.
- Four sizes: 32, 4,096, 262,144 and 4,194,304. Two xorshift input distributions: small values 0–1023 and full-width values. Input creation is outside measured calls; fresh intermediate allocations and frees are inside them.
- Three threshold profiles: `none` uses 0, `all` uses UINT64_MAX, and `half` uses 512 for small filter-first inputs, 1547 for the other small workloads, or 2^63 for full-width inputs. `half` names a target regime, not a measured exact selection fraction. A constant predicate can only select none or all. The driver excludes UINT64_MAX and the affine preimage of UINT64_MAX so `all` is exact for timed inputs. Correctness fixtures still include these boundary values.
- Seven repetitions, reproducibly shuffled variant order, calibrated target 20 ms per batch. A preliminary 5 ms batch makes very short kernels observable. Every return value contributes to a checked checksum; variants agree in every timed cell.
- 5,376 samples, 96 cells. Results use the median of seven samples per variant/cell and the geometric mean of cell ratios, with equal weight per cell. No CPU pinning, thermal isolation or confidence intervals; this was an interactive shared machine.

Staged implementations have the same operation order and capacity choices. C/Ink use malloc/free and indexed writes; C++ uses reserved vectors/push_back; Rust collects maps into fresh vectors and filters into explicitly reserved vectors. Earlier buffers are released before final reduction. Their allocation APIs, vector checks and empty-allocation behaviour differ: C/Ink allocate at least one element, while empty Rust/C++ vectors may allocate nothing. Combined implementations use the same reverse-loop arithmetic and avoid intermediate buffers. Rust and Clang use different LLVM versions. These remaining differences limit cross-language conclusions.

## Correctness and independently growing knowledge

All eight native variants pass **8,320 independent Python-oracle comparisons** over 260 empty/boundary/random fixtures with varying full-width scalar parameters and thresholds. Results are in validation.json. This supplements the compiler's checked proofs; sampled agreement is not the authority for installing candidates.

Five database revisions select zero through four candidates under the same compiler SHA-256:

```text
f01de1c76c2e264d46334c027f534974927c4025127a6d4793f9cf53036fab81
```

Their selected checked closures contain **0, 11, 20, 29 and 36 objects**. All five generate distinct C programs; the empty selection is byte-identical to ordinary staged output. Each revision archives its lock, immutable objects, proposal and generated plan. This demonstrates extension of selected checked knowledge, not automatic registry retrieval, discovery or profitability selection. See database-growth.json and artifacts/phase-*.plan.json.

The source bridge checks exact source/callee models and closed whole-function equality. The general kernel checks structurally recursive definitions, induction, Boolean cases and equality substitution. The external Python proof producer is untrusted. Tests additionally cover stale callees, forged proposals, lexical capture, lazy branches and closed case hypotheses; no checker or core source changed during this benchmark phase.

## WebAssembly evidence

The shared filtered suite passes **4,476 checks over 261 fixtures in each of Node/V8 and actual Chromium 155**. It covers three import-free modules: staged, checked, and conditional/ownership examples. Inputs include modular boundaries, random captures, ignored lambda parameters, lazy numeric/Boolean branches, order-sensitive right folds, nested collection computations, repeated calls and preservation of borrowed inputs after memory growth.

The staged module is 19,874 bytes; the checked module is 7,363 bytes. Their observed memory sizes grow from 17 to 90 pages and 16 to 41 pages respectively during this particular suite. These are observed module sizes and memory growth, not a general memory bound or a Wasm speed result. Binaries, hashes, Node/browser receipts and an actual browser screenshot are in ../filter-proof-wasm-phase1/. That report documents reproduction.

## Evidence and reproduction

samples.jsonl and metadata.json retain the original timings, commands, measured source copies and source hashes. summary.json now separates traversal and constant groups. analysis.json records reporting-only reanalysis and its script/raw-sample/summary hashes; the original measured harness in sources/ is unchanged. Generated C/LLVM and plans are under artifacts/. audit.json records the subsequent integrity and native-oracle audit.

```sh
# Rebuild, validate and time a fresh run (rewrites this report's data files).
python3 bench/filter-proof.py

# Recompute groups and check completeness/checksums of the existing raw matrix.
python3 bench/filter-proof.py --summarise-only

# Audit archived sources, objects, plans, measurements and recorded Wasm results.
python3 tools/audit_filter_reports.py
# Also replay checking/native oracles/Node using the original local build.
python3 tools/audit_filter_reports.py --execute

# Rebuild and validate Wasm in Node; browser instructions in the Wasm report.
python3 bench/filter-wasm.py
```

Equivalence covers total mathematical values over finite lists. Allocation/OOM/trap traces, the source translator, Rust checker, C lowering, allocator and LLVM remain outside a mechanically verified end-to-end argument. Legacy polynomial/aggregate/range-analysis authority still prevents claiming the full small-core architecture is complete. This experiment excludes transactions, durability, concurrency, I/O and changing distributions during execution. The broader language and evaluation requirements remain open in PLAN.md.
