# Scalable state measurements

These are local exploratory controls on Apple arm64. Each control has five
repetitions. JavaScript alternates candidate order; native storage operations
measure the tree first and the slots second. Exact sums, matching portable
snapshots and restored scan values are checked outside
transaction timings. See `provenance.json` for source hashes and tool versions.
The two measured emitted JavaScript modules are also frozen as gzip files here.
The JavaScript control is the same generated program with whole-table transaction
save/restore substituted for its journal; it is not a historical released binary.
Ingress, typed outcomes and commit processing are included. Input construction is
outside construction timing. Snapshot encode/decode is measured separately.

## JavaScript complete calls

Median elapsed milliseconds; mutation and rollback each contain 200 calls, scans
20 calls. Both update controls use the same point updates and initial rows.
Checkpoint and restore columns represent one operation.

| Rows | Candidate | Construct | Mutate | Rollback | Direct scan | Materialised scan | Checkpoint | Restore |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1,024 | journal | 0.906 | 0.331 | 0.352 | 2.474 | 3.480 | 7.102 | 2.514 |
| 1,024 | fullcopy-control | 0.884 | 15.956 | 18.628 | 2.767 | 2.931 | 5.004 | 1.869 |
| 100,000 | journal | 75.589 | 0.239 | 0.159 | 246.043 | 325.241 | 176.447 | 112.862 |
| 100,000 | fullcopy-control | 43.818 | 5589.138 | 3998.431 | 286.514 | 383.083 | 206.590 | 122.687 |

The journal removes a per-change copy of all rows; its cost follows the writes.
It does not make checkpoint/restore incremental. Direct-scan timings vary with
size and repetition. Other compilation work was running during the final samples;
these are exploratory timings, not immutable selection prices. The recorded heap deltas include fixture
inputs and two sessions after GC; they are not allocator peaks or comparable
isolated retained-storage estimates. No memory-constrained selector uses them.

## Native fixed storage primitive

Uninstrumented elapsed-time ratios, indexed slots / ordered BTreeMap. A ratio
above one is a loss. Scans perform 20 ordered passes; replacement/churn perform
10,000 operations. Construction inserts ascending keys. Payloads are fixed arrays
of one or 32 u64 words; these are storage controls, not end-to-end Ink programs.
Timing samples come from ordinary allocation; separate allocator-instrumented
runs count requested bytes. Those instrumented timings are excluded.

| Rows | Payload words | Construction ratio | Replacement ratio | Ordered scan ratio | Churn ratio | Tree retained bytes | Slots retained bytes |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1,024 | 1 | 1.48 | 1.00 | 1.25 | 2.24 | 35,232 | 51,616 |
| 1,024 | 32 | 0.50 | 0.84 | 0.80 | 1.21 | 501,720 | 305,568 |
| 100,000 | 1 | 1.90 | 1.05 | 1.27 | 2.14 | 3,428,352 | 5,525,504 |
| 100,000 | 32 | 1.85 | 1.43 | 0.30 | 0.88 | 48,893,200 | 38,031,360 |

Slots lose construction time and scalar memory, but can improve wide-row scans
and retained payload storage. The compiler therefore retains BTreeMap by default.
The optional dense traversal is only a storage microbenchmark; generated ordered
scans do not use it. No scan reassociation or order-independent source law is
inferred from its timing. Key width, heap-owned fields and random construction may
change this result. There is no fitted automatic layout selector from these data.

## Mathematical candidates and lifecycle

Frozen batch-total and key-only-cache candidates reproduce byte for byte and are
locally checked. `tools/reproduce_scalable_knowledge.py` measures source projection,
untrusted proof production and admission independently. One local run took about
0.07 / 8.73 / 19.64 seconds for the bulk candidate and 0.15 / 1.26 / 3.29 seconds for
the membership candidate. These are setup observations, not per-call costs or
measurements of a competing baseline. The full candidate runtime histories check
C, Rust, JavaScript and both Wasm lanes, exact checkpoints and restored state.
Re-signed false mathematical laws are rejected after authentication succeeds.

The lifecycle planner tests include construction, batches, scans, removals,
failed transactions, checkpoints, restore, compilation and checking. Missing any
required comparable phase retains the baseline. The report does not publish a
profitability model or promote a candidate into the default catalogue.

Reproduction:

```sh
ink build bench/scalable-state/transactions.ink --target javascript -o build/transaction-benchmark.mjs
node --expose-gc bench/scalable-state/transactions.mjs
rustc --edition=2021 -O bench/scalable-state/indexed.rs -o build/indexed-bench
build/indexed-bench
rustc --edition=2021 -O --cfg 'feature="allocation_profile"' bench/scalable-state/indexed.rs -o build/indexed-allocation-bench
build/indexed-allocation-bench
```

The C scratch conformance fixture builds 400,000 rows through ordinary batches,
then computes the exact sum through emitted C. Callback scratch is reclaimed
per iteration; the retained ordered keys/accumulator stay below 30 MiB in the
primitive arena accounting. This is a resource/retention check, not an RSS or
allocator measurement. Persistent table storage and fixture inputs are excluded.
