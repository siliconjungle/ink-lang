# Source-bound sorted/unique layout proof milestone

Two database packages add the missing sorted/unique invariants to the previous row/column sequence correspondence. Each adds 22 objects, including 17 universal theorems; complete closures contain 128 and 125 objects. The compiler, generic proof kernel, native runtime and resource limits are unchanged. See [the model and exact scope](../../docs/sorted-layout-models.md).

`audit.json` records source binding, previous-kernel acceptance and fresh byte-identical reproduction of both full packages, including their CNF and SAT certificates. `tests.log` records the full 89-test suite. New tests check 128 write prefixes through row/column models and two native flat stores, 128 boundary-key pairs and 1,024 order-transitivity combinations. Twelve fully rehashed false models are rejected. Reversed, duplicate and aliased-word key sequences and mismatched column lanes exercise the validity boundary. Existing 512-prefix four-storage comparisons remain in the suite.

The mathematical result covers all finite write histories from a sorted initial row sequence and derives uniqueness. Column validity combines lane alignment with sortedness, so an unmatched tail cannot disappear through zip and pass this check. The proof obligations use all-tail bounds and scoped guarded equalities, without introducing a core ordering law or optimizer catalogue.

This does not verify native binary search, `Vec` indexing/allocation/moves, tree promotion, source action/effect execution, codecs, cache/undo composition or physical candidate installation. Those remain necessary for native database representation admission.

`benchmark-inputs.json` regenerates the exact five prior emitted bodies and plans. The 31 compiler/runtime/build source hashes and 44 retained lifecycle timed/probe binary hashes remain unchanged. No new timing run or speedup is claimed. Earlier C/C++/Rust benchmarks remain the current performance evidence.

`verification.json` pins source, packages and executed evidence. `sources` retains this milestone's producer, audit, comparison test, fixtures, design and checker sources. Reproduction requires the existing external `python-sat` environment; the native compiler needs no solver dependency.

```sh
python3 tools/audit_sorted_layouts.py --reproduce --python /path/to/python-with-python-sat
python3 dev.py test
python3 bench/state/lifecycle.py --validate-inputs-only \
  --compiler build/source-row-original/lang \
  --build-directory build/source-sorted-benchmark-inputs
```

Use a fresh benchmark input directory when replaying. The command validates code and plan identities; it does not rebuild or retime the retained benchmark binaries.
