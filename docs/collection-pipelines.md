# Checked collection pipeline selection

The next database pass adds 80 laws using the unchanged core/checker and
source language. The canonical store now contains 787 entries, including 167
executable semantic laws. The previous buffer/stopping laws and all archived
benchmark results remain.

| Family | Laws | Replacement |
| --- | ---: | --- |
| Length after map | 25 | `length(xs.map(f))` → `length(xs)` across five input/output types |
| Map then right-fold | 12 | Map inside ordered sum/difference/product fold |
| Filter then right-fold | 12 | Test predicate inside ordered fold; skip rejected elements |
| Filter/map then right-fold | 12 | One ordered fold, two intermediate lists removed |
| Integer sum pipelines | 9 | Fuse map, filter or filter/map directly into a right-fold |
| Discarded cardinality | 10 | Length/count after an always-false filter → zero |

All proofs are general list induction; filter-dependent cases additionally split
on the head predicate. They quantify over every list, mapper, predicate and
initial accumulator permitted by their declared sorts. Fold reducers are explicit
sum, difference or product templates, matching the existing source/checker
interface; arbitrary curried reducers are outside these executable laws.

Fold fusion retains right-to-left arithmetic operation order and the initial
accumulator. No associativity or floating arithmetic theorem is introduced.
Integer `sum` already has the corresponding right-fold meaning. Floating
`sum` has a different ordered accumulation meaning and is deliberately excluded
from those nine laws; explicit f32 `foldr` pipelines are supported.
Predicates and maps are pure/total in the equality domain. Fusion can reorder
work across elements, but the result is unchanged; fuel, allocation failures,
host traps, timing and physical backend generation remain outside the proof.

```ink
fn total(xs:List<u32>,limit:u32)->u32 {
    return sum(xs.filter(fn(x)=>x<limit).map(fn(x)=>x*17+3));
}
```

The database can select a single fold over `xs` rather than construct filtered
and mapped lists. No program-specific heap/algorithm primitive or proof rule is
added. See [the example](../examples/collection-pipelines.ink).

The planner CLI exposes `--rounds 0..64` with the existing default of twelve;
`--rounds 32` lets larger modules select more than twelve independent changes.
The separate proof-check budget remains bounded by 4,096 and baseline fallback
remains checked. More rounds confer no admission authority.

The producer appends immutable objects and refreshes named transport views with
new membership witnesses while preserving selected roots. Canonical snapshot,
names and all three active views reproduce byte-for-byte from `build_store.py`.
Old snapshots/objects continue to authenticate archived packages.

Validation replays every new law and all 167 executable laws. Rehashed wrong
lengths, reversed subtraction, discarded predicates, wrong seeds and false float
fold laws are rejected. The same compiler binary selects plans from the enlarged
database; the final module contains no intermediate list in its selected
reductions. Independent oracles and 78 requests compare native C/Rust, JavaScript
and C/Rust Wasm, including overflow, subtraction order, NaNs, infinities, signed
zero, empty input and float cancellation.

At 65,536 u32 elements on the recorded native Rust run, length-after-map is
3.43× faster, filtered sums 3.18× and filter/map/sum 2.95×. Plain map/sum is
slower on the two smaller inputs and only modestly faster on the largest.

See [the native benchmark](../bench/collection-pipelines/README.md) for actual
profitability, raw samples, paired intervals and separate search/check costs.

```sh
python3 knowledge/producers/build_store.py --output /tmp/ink-pipelines
INK_TEST_ZIG=/path/to/zig cargo test --test collection_pipeline_optimisation
PYTHONPATH=knowledge python3 -m unittest discover -s knowledge/tests
PYTHONPATH=planner:knowledge python3 -m unittest discover -s planner/tests
python3 bench/collection-pipelines/run.py
```
