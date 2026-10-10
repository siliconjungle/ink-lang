# Proved shared-sequence optimisation

This database-only pass adds 83 laws with no change to Ink syntax, the compiler,
core/checker or backends. The canonical store contains 870 entries and 250
executable semantic laws. Earlier objects, snapshots and benchmark results remain.

| Family | Laws | Replacement |
| --- | ---: | --- |
| Count after mapping | 25 | `count(xs.map(f))` → `count(xs)` for five input/output types |
| Zip self projections | 10 | Zip the same list and select either element → original list |
| Shared arithmetic zip | 48 | Raw/left-map/right-map/both-map branches → one map for sum/difference/product over four numeric types |

```ink
fn weighted(xs:List<u32>)->u32 {
    return sum(xs.map(fn(x)=>x*17+3)
                 .zip(xs.map(fn(x)=>x*5+1),fn(a)=>fn(b)=>a*b));
}
```

The new law replaces the two maps and zip with one mapped expression over
`xs`. The preceding integer sum law then selects a single fold, removing
the intermediate mapped/paired list too. This composes ordinary data laws;
no recognised algorithm name or new core optimisation pattern is involved.

All proofs are list induction, quantified over every list and pure/total mapper
permitted by the declared sorts. Both zip branches must refer to the exact same
semantic source expression, giving equal lengths and position correspondence.
These laws do not assume that independent lists agree or erase zip truncation.
A forged application on separate source lists is rejected; unequal-length
independent zip execution stays unchanged.

Subtraction retains operand order; floating arithmetic retains its exact operand
tree without reassociation. Zip projections preserve float payloads as values/bits.
The equality domain remains total result values, excluding fuel, allocation
failures, host traps, timing and physical backend generation.

All 83 new laws and all 250 executable laws replay locally. Rehashed wrong
counts, a projection with a different second list, reversed subtraction, an
omitted mapper and a false float operation are rejected. Tests check complete
intermediate-list removal and law composition, including under captured binders.
Independent oracles and 67 requests compare native C/Rust, JavaScript and C/Rust
Wasm, including empty lists, truncation, overflow, NaNs, infinities and signed zero.

The canonical snapshot, names and all four active views reproduce byte-for-byte.
Transport witnesses are refreshed against the new snapshot, retaining selected
roots and all archived snapshot/object identities.

The full fifteen-function example uses the existing maximum 4,096 proof-check
budget and 32 rounds. At 1,024 checks search stops before all independent
rewrites; that partial selection remains checked and correct. No search or
checker limit was raised. Profitability is recorded separately in
[the native benchmark](../bench/shared-sequences/README.md).

```sh
python3 knowledge/producers/build_store.py --output /tmp/ink-shared
INK_TEST_ZIG=/path/to/zig cargo test --test shared_sequence_optimisation
PYTHONPATH=knowledge python3 -m unittest discover -s knowledge/tests
PYTHONPATH=planner:knowledge python3 -m unittest discover -s planner/tests
python3 bench/shared-sequences/run.py
```
