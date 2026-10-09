# Exact keyed contribution-table evidence

Two version-4 certificates add checked one-step and arbitrary finite write-history correspondence to the exact cache/journal evidence:

- `table.json`: reversible saved difference, certificate `c9ea0f9d8d709473842e0f5e3a6989f859704505aea517ba6b6b4b88291c0973`.
- `table-snapshot.json`: full snapshot, certificate `3ae0ef47f0e2b682daf53a48d652b4cc35c3abfde69c6d3eedc8e177d118b873`.

The 63 immutable objects include canonical exact integers, 128-bit key comparison, first-match contribution lookup/write, recomputation, the actual selected arithmetic, and universal transition/history theorems. `model.json` identifies the 18 table semantic roles and two root theorems. `names.json`/`lock.json` describe the checked dependency closure; each evidence file includes its portable bundle.

`tools/table_transition_proofs.py` is an untrusted external producer. All laws remain proof data; the kernel now supports generic generalised induction for changing states. The source bridge pins semantic definitions and the actual arithmetic before accepting the proofs. Old version 1–3 identities are preserved; older compilers reject the new proof form/version.

See [scope, tests and trust boundary](../../docs/keyed-table-proofs.md). The model covers contribution-table writes and intermediate totals; native map/projection correspondence, failures, events, undo scheduling, transactions and durability are not end-to-end proved. Unsupported key types retain scanning under version 4. This is not the completed generic representation language.
