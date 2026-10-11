# Ink versus Frontier: diff and patch

Measured on an Apple M2, macOS 26.5.2, Node 26.1.0, Chromium 154 and the Apple
Metal WebGPU adapter. Frontier is the unchanged published npm package
`@shapeshift-labs/frontier@0.1.9`. Ink is root commit
`4747cc684756044d80d20c3350add3279693a40a`, with all compiler/runtime/knowledge
package commits recorded in [provenance.json](provenance.json).

Ink's generated JavaScript diff is fast on fresh fixed-schema records. Frontier
does better when snapshots share unchanged row objects, and its immutable patch
application beats this Ink program's JavaScript/Wasm replay. Captured Wasm inputs
remove much of its boundary cost. WebGPU loses on the measured diff workloads,
including when the inputs are already resident.

## Representative full-call results

Median microseconds per call; lower is better. Each case has 16,384 entries and
164 changes. Browser comparisons run in the same process with interleaved rounds.
Input preparation is outside the timer; every result is consumed inside it.
Wasm and GPU include input packing, transport and logical result construction.

| Operation | Frontier | Ink JavaScript | Ink Wasm | Ink WebGPU |
|---|---:|---:|---:|---:|
| Scalar diff | 67.07 | 60.04 | 100.55 | 4,765.00 |
| Fresh row diff | 1,895.00 | 144.38 | 4,755.00 | 13,275.00 |
| Shared row diff | 110.70 | 137.11 | 4,640.00 | 12,570.00 |
| Fresh row diff with dirty hints | 15.21 | 15.93 | 4,892.50 | 6,675.00 |
| Fresh row patch application | 1,178.12 | 6,100.00 | 8,940.00 | Unsupported |
| Fresh row diff + application | 3,090.00 | 6,285.00 | 14,660.00 | Unsupported |

The browser fresh-row diff ratio is 13.13× in Ink JavaScript's favour (nominal
paired bootstrap 95% interval 10.20–13.42×). With structural sharing it reverses:
Frontier/Ink is 0.81× (0.80–0.84×). Scalar diff's advantage is modest at 1.12×
(1.09–1.14×), and it reverses in Node: Frontier 78.08 µs versus Ink JavaScript
90.11 µs. These are particular schema, ownership and host measurements, not a
claim that Ink replaces Frontier for arbitrary JSON.

### Native Rust

The exact emitted Rust methods were compiled in ordinary Cargo release mode
with Rust 1.96.0 / LLVM 22.1.2. Inputs are typed owned vectors, including input
clones required by these entry points; JSON parsing is untimed. Results include
consuming every returned field. This process ran separately from Node/browser,
so cross-process ratios are not paired comparisons.

| Operation | Scalars | Fresh rows | Rows labelled shared in JS fixtures |
|---|---:|---:|---:|
| Diff | 51.00 | 132.23 | 162.99 |
| Dirty-hinted diff | 3.25 | 186.17 | 56.94 |
| Patch application | 82.75 | 243.42 | 276.60 |
| Diff + application | 260.67 | 457.54 | 306.66 |

The two row columns have the same value representation in Rust: the harness
does not supply shared Arc identities. Their timing differences, particularly
the hinted diff, demonstrate variation between equivalent cells. Do not infer
a Rust structural-sharing benefit from them. The native build took 20.31 seconds
including Cargo/toolchain work; this is separate from steady execution, not an
isolated compiler-lowering time.

## Captured inputs

A second run interleaves the original implementations with captured-input
variants. Initial capture is excluded and recorded separately. Wasm keeps inputs
in its linear memory and returns an owned packed word array; logical decoding
is checked outside the timer. GPU keeps inputs on the device, enforces zero
uploads per call, and still includes dispatch, readback, logical unpacking and
the output digest. This is repeated computation over fixed inputs, not an online
update stream or an all-device pipeline.

| Browser operation | Frontier | Wasm full call | Wasm captured | GPU full call | GPU resident |
|---|---:|---:|---:|---:|---:|
| Scalar diff | 70.27 | 102.97 | 28.11 | 11,050.00 | 9,795.00 |
| Fresh row diff | 1,837.50 | 4,857.50 | 69.45 | 10,595.00 | 8,265.00 |
| Fresh row hinted diff | 14.59 | 4,522.50 | 37.21 | 5,980.00 | 1,013.75 |
| Fresh row application | 1,091.25 | 8,290.00 | 2,013.75 | Unsupported | Unsupported |

Removing row input packing and logical output conversion reduces Wasm diff by
about 70× in this captured-input run. That result has a different boundary from
the full-call results: it does not mean a JavaScript caller receives the same
speedup while supplying fresh object snapshots and receiving object outputs.
Hinted execution still loses to Frontier here. GPU residency helps some cells,
but does not make this emitted diff competitive. The full GPU scalar diff also
varies considerably between runs; retain both runs rather than choose the lower
number as a stable GPU expectation.

## What explains the results

- **Fixed schema:** Ink compares five known integer fields, while Frontier
  supports general JSON. Fresh row snapshots require Frontier to inspect
  unchanged objects too. This is useful specialization, with narrower semantics.
- **Structural sharing:** The shared fixture reuses each unchanged row object
  in JavaScript. Frontier can skip it using reference equality. The Ink source
  maps rows into new edit records and compares their fields; it does not exploit
  that identity. Wasm/GPU packing erases the input object identities altogether.
- **Replay copying:** The JavaScript Buffer lowering uses recursive temporary
  copies (`__tempCopy`) when constructing mutable buffers and writing replacement
  records. Freezing this buffer returns the owned result without another copy.
  Frontier can share unchanged immutable rows. This is a substantial
  cost for the snapshot-returning Ink replay program.
- **Packing:** Hinting cuts the number of compared rows, but full Wasm/GPU calls
  still transport complete snapshots. Full row Wasm hinted diff takes roughly
  as long as a full scan. Captured inputs expose the cheaper computation.
- **GPU execution:** The emitted packed graph contains a parallel map followed
  by a serial stable filter with workgroup size 1. It materializes intermediate
  edit records and retains the literal stages. Transfer and readback add cost,
  but the serial compaction stage also matters. No GPU replay fallback is
  mislabelled as GPU.
- **Ownership in Rust:** Typed native vectors avoid JavaScript object packing,
  but the owned entry points clone full input vectors, even for dirty-hinted
  reads. The reported numbers include that contract.

The current knowledge snapshot applied **zero checked rewrites** to this source;
the input and selected core identities match. These measurements describe the
literal compiled workload, not every available representation or the maximum
performance obtainable from Ink. In particular, this does not exercise stored
tables/keeps, point-query deltas, shared Rust representation targets, column
representations, destination-output entry points or saved-model target selection.

### Structural sharing and Ink

Structural sharing is already present in parts of Ink. The Rust representation
lowering supports shared immutable Arc values, identity memoization of eligible
pure scalar calls, and packed spines that share immutable chunks. These do not
automatically supply Frontier's shared-row diff shortcut to the ordinary
`List<Row>` program used here. See
[database representations](../../docs/database-representations.md#explicit-packed-scalar-storage)
and the [memoization implementation](../../lowerings/rust/src/identity_memo.rs.txt).

Extending that benefit involves compiler/ABI mechanisms and knowledge. The
lowering must preserve shared storage and expose safe internal identity or
version checks. Knowledge can describe representations and checked algorithms
that reuse unchanged parts. Source values can retain ordinary value semantics;
machine pointer identity need not become user-visible. Persistent memoization at
a JavaScript bridge requires immutable inputs or tracked versions so mutations
cannot invalidate a cached result. Dirty sets or immutable chunk versions may
serve Ink-owned state better than pointer identity across packed device memory.
No implementation changes were made for this benchmark.

## Coverage, correctness and limits

There are 27 independently generated fixtures: scalar lists, fresh row lists,
and shared row lists; sizes 64, 1,024, 16,384; unchanged, about 1%, and 50% changed.
Rows have five u32 fields and these fixtures change only `x`. Dirty sets contain
all changed positions and some false positives. Arrays never change length.
No strings, JSON trees, inserts/removals, key moves, CRDTs or persistence are
tested. Frontier emits compact patches; Ink emits one flat edit per changed row
including all five fields. Whole-output digest cost therefore depends on each
implementation's returned representation. This benchmark excludes patch
encoding/compression and does not establish patch-wire equivalence.

The source has sorted unique in-range edits and complete dirty hints as caller
preconditions. Efficient buffer replay is unsupported by this GPU graph backend.
The separately reported `apply-probe` scans all edits per output position
(O(N*K)) and is measured only for scalar cases with at most 256 edits. It must
not be treated as an efficient GPU replacement for ordinary replay.

Each implementation is checked against complete expected outputs before and
after timed batches; every timed output is digested. Frontier's full and hinted
patches independently replay to the target. Input mutation is checked in the
web harness. The offline audit checks independent fixture replay, expected
numeric digests, exact cell/round coverage, unsupported GPU cells and actual
dispatch counters. These are finite correctness checks, not formal backend or
compiler proofs. GPU device errors/fallbacks would fail the GPU-required run.

Three warmups precede calibration to at least 5 ms or 4,096 iterations, then
five rounds are retained. Web variants are randomly interleaved within each
cell, seeded with 71331. Setup, capture and first-call costs are outside steady
timing and retained in raw records. Runs were sequential within this task;
other chats and processes were not stopped. There are 173/1,854 cells with more
than a 2× max/min spread. The intervals describe this small sample, without
multiple-comparison adjustment, and are not release gates or universal claims.
No online migration workload or isolated compilation benchmark was run.

| Run | Cells | Timed samples | Actual GPU cells |
|---|---:|---:|---:|
| Node full calls | 345 | 1,725 | 0 |
| Browser full calls | 406 | 2,030 | 61 |
| Node with captured-input variants | 433 | 2,165 | 0 |
| Browser with resident variants | 555 | 2,775 | 122 |
| Native Rust | 115 | 575 | 0 |
| Total | 1,854 | 9,270 | 183 |

All five runs passed. Every losing cell remains in [summary.json](summary.json);
it includes medians, min/max, nominal median intervals and same-run paired
Frontier/Ink ratio intervals. No native/Node samples are paired with one another.
[tables.md](tables.md) provides representative tables for each run.

## Evidence and reproduction

The [harness README](../../bench/frontier-diff/README.md) contains exact commands,
preconditions and archive replay instructions. Raw results are
[Node](node-results.json), [browser](browser-results.json),
[captured Node](node-prepared.json), [captured browser](browser-prepared.json)
and [native Rust](native-results.jsonl). The [audit](audit.json) retains coverage
counts. [Provenance](provenance.json) pins the original full-call harness;
[prepared provenance](prepared-provenance.json) pins the later harness and
generated artifacts. Both measured harness revisions are frozen as gzip files,
along with [fixtures](fixtures.json.gz) and
[generated artifacts and the npm release](measured-artifacts.tar.gz).

No remote changes were pushed, and no compiler, database, runtime or Frontier
library implementation was changed.
