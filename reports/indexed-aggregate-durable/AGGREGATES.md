# Indexed aggregates: measured costs and checked selection

The admitted one-table example uses 4,000 rows, full-width u64 values and an active flag. These measurements include JSON action/reply conversion. Each action starts from the same portable checkpoint, warms a separate state for 16 calls, then measures 96 calls. Five alternating candidate orders are recorded; final checkpoint hashes match exactly across all three candidates. The Apple M2 host was shared. These are workload measurements, not worst-case complexity or memory proofs.

Median microseconds per call:

| Backend | Candidate | Put | Erase | Filtered sum | Filtered count |
|---|---|---:|---:|---:|---:|
| JavaScript | ordinary Map/BTreeMap | 1.918 | 1.458 | 262.611 | 246.164 |
| JavaScript | direct linked list | 814.361 | 573.007 | 1184.635 | 1269.803 |
| JavaScript | indexed cached tree | 37.580 | 20.163 | 1.036 | 1.180 |
| Native Rust | ordinary Map/BTreeMap | 1.094 | 1.082 | 8.784 | 8.582 |
| Native Rust | direct linked list | 261.995 | 251.196 | 446.426 | 450.664 |
| Native Rust | indexed cached tree | 3.706 | 2.972 | 0.362 | 0.356 |

Native cached reads are about 24× faster than ordinary source in this cell; JavaScript cached reads are about 200–250× faster. Indexed writes beat the direct linked-list candidate, but remain slower than ordinary Map/BTreeMap writes. The existing selector therefore needs the ordinary source package as its baseline.

The existing `ink_planner.implementation_selection` compares three database implementation packages, checks every proof package, then uses the existing lifecycle ranker. Observations bind the candidate, compiler bytes and emission target, plus hardware, toolchain and workload. Four receipts cover JavaScript/native Rust and short/read-heavy profiles. Every selected receipt is replayed through actual emission. There is no algorithm recogniser, new selector or live probe.

Both profiles charge one 4,000-row restore, one checkpoint/disposal, one admission, 100 puts and 100 erases. JavaScript also charges one measured emission; native programs are precompiled, so native compile count is zero. Each alternative is charged one measured ordinary-source checkpoint/restore migration. The short profile adds ten sum and ten count calls; the read-heavy profile adds one million of each. These long-profile totals are model estimates from measured phases, not runs of two million calls.

| Backend | Profile | Selected | Estimated ordinary lifecycle | Estimated indexed lifecycle |
|---|---|---|---:|---:|
| JavaScript | short | ordinary source | 0.023 s | 6.895 s |
| JavaScript | read-heavy | indexed | 508.793 s | 9.110 s |
| Native Rust | short | ordinary source | 0.006 s | 3.349 s |
| Native Rust | read-heavy | indexed | 17.371 s | 4.065 s |

Indexed admission is about 3.3 seconds in the measured Release compiler, versus about 26 ms for the direct candidate and 3.2 ms for the empty ordinary selection. JavaScript emission includes another admission and costs about 3.3 seconds for indexed storage. Indexed restore also costs more than ordinary restore. These costs explain why a short action sequence should keep the baseline.

The separate direct-to-indexed bridge proves preservation of both target relations, including repaired aggregate metadata. Portable migration measurements start from ordinary source, as required by the final implementation selector; the bridge remains independently admitted database knowledge. Its compact packet can be reconstructed from the immutable pin named in `migration-admission.json`.

Reproduction requires the explicitly pinned distribution/submodules and a Release `ink` compiler. From the repository root, use:

```sh
python3 reports/indexed-aggregate-durable/aggregate-sources/prepare-native.py
python3 reports/indexed-aggregate-durable/aggregate-sources/run-native.py
node --expose-gc reports/indexed-aggregate-durable/aggregate-sources/bench.mjs reports/indexed-aggregate-durable/aggregate-sources/source.mjs reports/indexed-aggregate-durable/aggregate-sources/direct.mjs reports/indexed-aggregate-durable/aggregate-sources/indexed.mjs reports/indexed-aggregate-durable/aggregate-js-performance.json
node --expose-gc reports/indexed-aggregate-durable/aggregate-sources/migrate.mjs reports/indexed-aggregate-durable/migration-js-ns.json
python3 reports/indexed-aggregate-durable/aggregate-sources/measure-compiler.py
python3 reports/indexed-aggregate-durable/aggregate-sources/record-selection.py
```

The frozen Rust emissions are compiled standalone with pinned dependencies, thin LTO and one codegen unit. The benchmark adapts the infallible ordinary constructor and removes duplicate C symbol-export attributes only when nesting two independent emissions for a Rust migration measurement. Exact emitted programs, harnesses and compiler/toolchain hashes are recorded in `aggregate-provenance.json`. Execution and migration samples were acquired before the final storage integration; `final-artifact-equality.json` verifies that all six emissions are byte-identical. Compiler costs and selection replay use the final integrated compiler. The older representation-only acquisition recipe is archived as `record-representation-selection.py`; the current comparison uses `record-selection.py`.

Correctness coverage: 15 universal whole-action obligations, separately admitted frame/grouping laws, two migration relations, and freshly rehashed incorrect sum/range/event/intermediate proofs that are rejected by mathematical admission. Backend checks cover native Rust/C, JavaScript, both Wasm paths and both GPU hosts. Actual GPU dispatch is exercised by the numeric conformance suite; this recursive tree executes on GPU hosts. The producer remains restricted to the admitted one-table word/Boolean example, and no universal AVL height bound or automatic effectful action fusion is claimed.
