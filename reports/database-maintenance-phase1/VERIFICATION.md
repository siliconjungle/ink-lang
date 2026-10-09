# Proof bridge and replay evidence

The native timing report uses a real version-2 maintenance certificate. Its three actual source update expressions are translated into the checked canonical integer/list model and proved to produce the updated sum at an arbitrary position. These application proofs, immutable raw object bytes and exact semantic-definition identities are bound into the certificate. Optimisation laws remain database data; `logic.rs` and `bitproof.rs` are unchanged from the parent revision. The library loader gained portable bounded bundles, and the source bridge is new trusted Rust code.

`audit.json` records a successful executed replay: all 201 measured source files match their archived hashes, all 756 samples fill exactly 18 × 6 × 7 cells, observations agree within each cell, and reported geometric means recompute. The measured compiler rechecks the package and deterministically replays its producer, exact emitted source and build plans. Twelve measured executable/library hashes are recorded, and those native artifacts pass the independent 2,005-operation oracle again. No binaries were silently rebuilt by the audit. Fresh-process certificate checking with a warm filesystem takes median 6.08 ms for canonical and 6.60 ms for commuted.

Canonical version-1 and version-2 certificates generate byte-identical native runtime source in both BigInt and bounded modes. The proof authority changes, while the executing algorithm does not. `selections.json` separately records empty, canonical and commuted choices producing three distinct runtime sources under one compiler identity. This demonstrates actual candidate selection without recompilation; it is not a benchmark of growing theorem counts.

The full suite passes 62 tests (`tests.log`). Five new integration tests cover source/proof tampering after content rehashing, irrelevant true theorems, altered model meanings, missing direct imports, bundle hash/size/closure failures and atomic rejected selection. Direct update checks include ±2^512 values. Two maintained reference implementations match recomputation over 512 mixed operations with filtered sums/counts, tentative reads, nested aborts, ordered events, acknowledgements and snapshot reconstruction. Both compiled candidate implementations match 320 signed-data calls and 192 further calls after restoring portable checkpoints: 1,024 native outcome comparisons, with complete checkpoint byte equality.

The native benchmark's four handwritten baselines and two Ink variants all maintain totals; the benchmark oracle covers statuses, exact totals, versions, ordered event digests/counts and touched rows. Differences in storage, arithmetic layout and speculative transaction execution remain explicit in REPORT.md. The measured fixed driver includes final complete state/status checks. Timings cover warm, single-threaded in-memory execution without durability or concurrency; no universal fastest-language claim follows.

`backend-targets.json` records Clang's apple-m3 and Rust's apple-m4 choices on the Apple M4 Pro host. The original private Rust probe was eliminated and initially lacked CPU attributes. The audit repaired this reporting metadata using an exported function, the same rustc and the same native-CPU setting. Timing samples are unchanged. The original measured script remains in `sources/`; the reporting fix and new audit/tests/producer are separately archived in `verification-sources/` and identified in `verification.json`.

The bridge's initial expression fragment supports `+`, `-` and literals up to 32; variables remain arbitrary exact integers. Larger literals and multiplication still use the legacy path. Table-to-list projection, zero contributions for filtered rows, row-pipeline recognition, the transaction/cache protocol, range analysis and backend execution remain trusted. The tests are engineering evidence; they do not supply complete state-transition/representation simulation proofs, a mechanically verified Rust kernel or a formally proved compiler/backend. The full requirements in PLAN.md remain open.

Reproduce with:

```sh
python3 dev.py test
python3 bench/state/run.py --maintenance knowledge/exact-maintenance/canonical.json --output reports/database-maintenance-phase1 --build-directory build/database-maintenance-bench
python3 tools/audit_maintenance_report.py --execute
```

Executed replay requires the recorded compiler and native build artifacts to remain available. Static archive checks run without `--execute`; they provide narrower evidence and do not rerun native behaviour.
