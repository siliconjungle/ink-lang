# Arithmetic proofs: database extension and native performance

The external arithmetic package changes generated C under one unchanged compiler, but produces **no demonstrated runtime gain** on these elementary identities. All eight baseline/checked ARM64 function bodies are instruction-identical: LLVM already performs the relevant simplifications. This is a proof-boundary and extensibility milestone.

The measured baseline/checked speed ratio is 0.9967×. Checked elapsed times are 1.0070× C, 1.0079× C++ and 1.0453× Rust by geometric mean across 16 cells. These tiny functions mostly measure calls, wrappers and driver-loop overhead; there are no confidence intervals or universal language-ranking claims.

## Method

- Apple M4 Pro, macOS ARM64, 48 GiB; Apple Clang 17 and Rust 1.99 / LLVM 23.1.1. Native CPU flags are recorded. Clang's emitted target is `apple-m3`, while Rust's newer LLVM selects `apple-m4`; the archived LLVM IR and metadata record this difference. These are the installed toolchains' native settings, not identical backend versions or processor tuning.
- Eight scalar kernels: addition by zero, subtraction from self, addition commutation, cancellation, multiplication by zero, unsigned reflexivity/maximum and equal conditional branches. Fixed u64 arithmetic wraps modulo 2^64.
- Five variants: Ink baseline, Ink database-selected, C, C++ and Rust. C++ compiles the same typed arithmetic through an extern-C interface; Rust explicitly uses wrapping arithmetic.
- All use one separately compiled C driver and one separately compiled adapter object. Adapters normalise unary/binary/Bool signatures; no LTO crosses those boundaries. Every result contributes to a checked checksum.
- Each batch cycles over 256 resident input pairs, with small (0..1023) and full-width distributions. Seven repetitions, randomised variant order, 25 ms calibrated target per batch. The matrix contains 560 raw samples across 16 cells.
- This shared interactive machine has no CPU pinning. Body alignment, aliases, branch prediction and common call overhead can affect these nanosecond measurements. The reported Rust advantage is concentrated in the equal-branch case; it does not indicate less arithmetic work in Ink’s checked form.

## Full-width cell medians

Nanoseconds per scalar call, including the shared adapter/driver costs:

| Kernel | Ink baseline | Ink checked | C | C++ | Rust |
| --- | ---: | ---: | ---: | ---: | ---: |
| add_zero | 1.008 | 1.001 | 1.014 | 1.020 | 1.010 |
| subtract_self | 1.022 | 1.026 | 1.026 | 1.034 | 1.026 |
| add_commute | 0.750 | 0.748 | 0.753 | 0.751 | 0.745 |
| cancel_add | 0.750 | 0.751 | 0.741 | 0.748 | 0.757 |
| multiply_zero | 1.018 | 1.012 | 1.010 | 1.006 | 1.007 |
| unsigned_reflexive | 1.281 | 1.261 | 1.280 | 1.275 | 1.256 |
| unsigned_maximum | 1.256 | 1.264 | 1.251 | 1.268 | 1.261 |
| choose_equal | 1.023 | 1.021 | 1.028 | 1.026 | 0.767 |

All cell medians and per-cell min/max ranges are in `summary.json`; raw samples are in `samples.jsonl`. `assembly.json` records the baseline/checked instructions, including the one-instruction return cases. These are scalar-call measurements, not a vectorisation, stateful, memory, durability or application benchmark.

## Database and checking cost

Compiler SHA-256: `e5a175c282b1f0e619bf5f1b6e48b844eb81e25c26b367ce6b2854501d193bbb`. Nine revisions select zero through eight candidates without rebuilding it. Their closures have 0/2/3/4/5/6/7/8/9 objects, and all nine generate distinct C. The empty revision matches baseline C byte for byte; the final revision matches the measured checked C. `database-extension.json`, `database-*` and archived plans preserve the exact selections.

The full installed library includes ten objects: a list datatype, eight unconditional theorems and one conditional theorem. The conditional `x - y = 0` theorem requires `x = y`; it is never offered as an unconditional source replacement.

Median fresh-process wall times across seven repeats: full library verification **22.15 ms**, baseline C emission **3.75 ms**, checked C emission **22.46 ms**. These include process startup, JSON parsing, certificate checking and warm filesystem I/O. Clang compilation and SAT proof production are excluded. Raw measurements are in `checking-cost.json`.

`knowledge/production.json` retains original proof-production costs and its original debug compiler identity. This is provenance from the earlier production run, not the benchmark compiler identity. The producer’s two larger carry-arithmetic examples took roughly 7.2 and 10.7 seconds including Python hint reconstruction; installed proofs are checked without that solver or search.

## Correctness and replay

- The complete Rust suite passes 54 tests (`tests.log`), including six checker/encoding unit tests and five arithmetic integration tests. The latter compare 8,192 before/after interpreter outcomes, compose an arithmetic theorem with list induction, reject scope escape/rehashed false proofs/stale source, and compile baseline/checked C with strict diagnostics.
- All five native variants pass **42,920** comparisons over 1,073 fixtures and all eight functions: 49 boundary pairs and 1,024 deterministic full-width random pairs (`validation.json`).
- An independent Python arithmetic oracle and external SAT solver check **2,534** expected/mutated output assignments across 15 fixed operations, including all Bool inputs, unsigned boundaries and random inputs. Correct fixed outputs must make the exported inequality circuit UNSAT; changed outputs must admit a model. The exact goals/CNFs are archived under `semantic-obligations/`. This checks encoding on those fixtures, not all possible values.
- `tools/audit_bitvector_report.py --execute` independently recomputes the raw-sample summary/checksums, checks source/object/plan identities, reloads the full theorem library, replays all nine compilation plans and 15 semantic circuits, recompiles the five native variants and reruns 42,920 oracle comparisons. It also checks the replayed baseline/checked disassembly. It does not retime kernels or treat a pass label as proof.

The measured source hashes are preserved in metadata. Additional compiler modules were archived after measurement with separate supplementary hashes; existing measured files were unchanged. The complete compiler `src/` tree is present. The report archives its own oracle source under `supplementary-tools/`.

## Trust boundary and remaining work

The fixed Boolean/u64 encoder, hinted RUP checker, source correspondence, Rust implementation, C lowering, Clang/LLVM and host ABI remain trusted. A correctly checked refutation establishes its encoded total scalar equality for all inputs; the connection between accepted circuits and the intended language semantics still rests on the unverified encoder. Tests and solver cross-checks do not supply a mechanically proved checker/encoder soundness theorem. Resource failure, OOM, trap traces and execution time are outside this equality model.

The solver is an external, untrusted producer. Its SAT/UNSAT claim never authorises a rewrite: the compiler rebuilds the exact circuit and checks the certificate, premises and whole-function replacement. General induction and checked theorem reuse remain separate proof rules.

Legacy polynomial, aggregate and bounded-representation authority still exists. This new path does not complete its migration or implement the full language. The next useful performance work is externally justified collection/state algorithms and representation changes that remove substantial work beyond what LLVM already does.

## Reproduce

```sh
python3 dev.py test
python3 bench/bitvector-proof.py
python3 -m venv build/bitproof-venv
build/bitproof-venv/bin/python -m pip install python-sat==1.9.dev5
build/bitproof-venv/bin/python tools/check_bitvector_semantics.py
python3 tools/audit_bitvector_report.py --execute
```

The native benchmark/audit currently targets macOS and requires Clang, Rust and `otool`. Importing the installed arithmetic database needs no Python SAT dependency. Repeating timings creates a new run; do not combine samples from different runs. The original compiler hash is required for exact report replay; another build may have a different binary identity.
