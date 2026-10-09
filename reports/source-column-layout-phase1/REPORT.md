# Source-bound sequence layout proof milestone

Two database packages establish row/column sequence correspondence for Ink's actual nested `Row` and `Ledger` payload sorts. They add 38 checked objects each, including 12 universal theorems, without changing the compiler or generic kernel. The closures contain 111 and 108 objects. See [the model and scope](../../docs/column-layout-models.md).

`audit.json` records byte-identical reproduction under the preserved source-row compiler and acceptance under the earlier whole-row kernel. `tests.log` records the full 86-test suite. The new tests compare 512 write prefixes with a tree oracle and four native storage variants, yielding 2,048 native mutation/old-value comparisons and 6,144 native lookup comparisons plus exact ordered key/payload enumeration, values and length checks. Ten fully rehashed false model closures are rejected, and malformed column witnesses expose truncating zip behavior.

The proofs cover complete sequence roundtrips, lookup, linear ordered-write correspondence, all finite future write histories, lane alignment and checked column reencoding. They are not proofs of sorted/unique map semantics, native binary search, `Vec` operations, tree promotion, source actions/effects, cache/undo composition or codecs. Concrete whole-history symbolic evaluation is bounded by the unchanged proof evaluator resource budget; universal history proofs check symbolically, every 64-step history is checked incrementally, and independent two-write batch replay covers small states.

`benchmark-inputs.json` regenerates the exact five prior benchmark bodies and plans. The 31 compiler/runtime/build source hashes and 44 retained lifecycle timed/probe binary hashes remain unchanged. No new runtime optimization, timing run or speedup is claimed. The earlier C/C++/Rust performance comparisons remain the current performance evidence.

`verification.json` pins source, packages, audits, tests and preserved benchmark evidence. `sources` retains this milestone's producer, audit, comparison test, fixtures and design document. The full implementation/performance objective remains active; native search/map invariants and complete source/protocol refinement are next dependencies for database representation admission.

```sh
python3 tools/audit_column_layouts.py --reproduce
python3 dev.py test
python3 bench/state/lifecycle.py --validate-inputs-only \
  --compiler build/source-row-original/lang \
  --build-directory build/source-column-benchmark-inputs
```

Use a fresh benchmark build directory when replaying input generation. These commands validate evidence; they do not retime or replace the preserved benchmark binaries.
