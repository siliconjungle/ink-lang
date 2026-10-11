# Storage, bulk loops and compiler work

These measurements retain losing candidates. They are seven-sample complete-call
measurements on one machine, not a universal ranking. Setup, proof checking,
emission, native build and steady-state action costs are separate. Runtime
measurements use generated JavaScript and release native Rust; explicit native
argument/result conversion and event publication are included. Canonical
observations are in the knowledge store. The existing lifecycle selector consumes
them with exact target/workload/phase provenance.

At 1,024 initial rows, representative complete-call medians were:

| Target and phase | Direct | Candidate | Candidate median |
| --- | ---: | --- | ---: |
| JavaScript put | 567 µs | packed four-row chunks | 384 µs |
| JavaScript hot-key get | 150 µs | indexed four-row chunks | 308 µs |
| Native Rust hot-key get | 8.36 µs | indexed four-row chunks | 159 µs |
| JavaScript any query | 149 µs | any delta/cache | 0.836 µs |
| JavaScript all query | 307 µs | all delta/cache | 1.20 µs |
| Native Rust any query | 121 µs | any delta/cache | 0.655 µs |
| JavaScript insert | 447 µs | any delta/cache | 803 µs |

The measured selector chooses packed four-row chunks for the large JavaScript
write-heavy profile, direct storage for table read-heavy profiles on both targets,
and the appropriate Boolean cache for any/all read-heavy profiles. JavaScript's
Boolean insert-heavy profile retains direct storage. Selection totals include all
nonzero action phases declared by each profile; these are steady-state profiles,
not cold-start or migration amortisation claims. The initial state has ascending
keys and true Boolean rows. Insert samples grow it by 112 rows; the shape label is
the initial size and every candidate receives the same action history. Measurements
ran in a development environment with other validation work; inspect raw samples
and reproduce on deployment hardware before treating prices as production evidence.

Packed fields reduce physical node density, but this first implementation does
**not** reduce complete native allocation requests on the measured actions. The
observation adapter materialises logical rows. At 1,024 rows a direct hot-key get
requests 16 allocations/reallocations, whereas packed/indexed variants request
1,041. That conversion dominates their faster internal indexed lookup. A checked,
compact host-publication adapter is a useful next optimisation; this report does
not claim it is implemented. Writes refresh the auxiliary hot-key set and keep
its ordering/duplicate behaviour universally checked. These candidates remain
optional; their index alone does not justify selection.

Boolean caching has a clearer benefit: native any-query allocation requests fall
from 2,058 to nine. Native insertion requests are almost unchanged (2,198 versus
2,204), while recomputation and intermediate representation costs can differ.
Allocation results come from **separate instrumented builds**, and requested bytes
are neither peak memory nor retained capacity. Memory remains `null` in observations.

The pure JavaScript bulk fixture at length 1,024 reduced prepend-construction from
about 918 µs to 2.87 µs, and right-fold append from about 832 µs to 5.79 µs. At
length 10,000 both eliminate quadratic copying. These are exact loop shapes with
an arbitrary suffix; arithmetic order and returned values are unchanged. No claim
is made that every loop can be combined or that every backend has the same gain.

Checked search caching measured one cold search at 5.49 s and a warm median of
0.173 s, including fresh selected-closure proof replay. Backend emission and native
compilation are excluded. Invalid cached hints are rejected and searched again.
Overlapping proof sessions admit only 32 new laws for each 64-law request in this
fixture, but take more wall time than independent admission of these cheap proofs:
union handling and authentication still cost work. Reuse is an infrastructure
capability, not a claim that every incremental admission is faster.

For 3,000 knowledge entries plus eight insertions, stable bucket publication adds
36 tree nodes versus 92 under sorted fixed-size leaf packing. Median index refresh
was 0.168 s versus 0.371 s for rebuild. Full publication still scans provided
canonical entries. Topology growth thresholds can cause broader tree churn.

Raw reports:

- `runtime.json`: action samples, compiler/request/generated hashes, check/emission/build costs and measured profile decisions.
- `allocations.json`: separate instrumented native allocation requests and requested bytes.
- `bulk.json`: exact generated JavaScript loop samples and artifact hashes.
- `compilation.json`: fresh search-cache replay, overlapping admissions, publication churn and incremental index refresh.

Reproduce from the repository root:

```sh
python3 knowledge/producers/storage_bulk_publish.py --output-store knowledge \
  --source-root . --compiler target/debug/ink
python3 bench/storage-bulk.py
python3 tools/bench_storage_allocations.py
python3 tools/bench_storage_compilation.py
ink build examples/bulk-collections.ink --target javascript -o build/bulk-baseline.mjs
ink build examples/bulk-collections.ink --target javascript \
  --selection build/bulk-collection-selection/selection.json -o build/bulk-selected.mjs
node tools/bench_bulk_folds.mjs build/bulk-baseline.mjs build/bulk-selected.mjs
```

Generate the bulk selection by running `tests/bulk_collection_optimisation.rs` or
using `planner/plan.py` with the checked core, pinned knowledge snapshot and
`--budget 4096 --rounds 32`. Compiler hashes can differ between the runtime and
compiler-work reports: the latter follows the subsequent sealed-view merge change;
the literal runtime emitters and generated support were unchanged. Correctness
checks cover all native, JavaScript, Wasm and GPU host paths, plus an actual GPU
kernel in the bulk test. They do not constitute a proof of the compiler or emitters.
