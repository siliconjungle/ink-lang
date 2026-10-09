# Verification receipt

`python3 dev.py test` passes all 65 tests, including the real reference/native signed cache, multi-table and repeated-write abort, no-op removal, tentative-read, event, future-checkpoint and commit-exhaustion cases. Bounded cache fallback is exercised separately in the native suite. The source files and full test output are archived in `verification-sources/` and `tests.log`.

`python3 tools/audit_reversible_reports.py --execute` passes: archived measured source/artifact hashes, matrix and median summary reconstruction, exact emitted code/plan replay, independent native oracle validation, deterministic regeneration of both journal candidates and new theorem objects, and replay of measured native binaries without rebuilding them. `audit.json` records 64 replayed streams for the wide-Int report and 108 for the inventory report. The wide report also reproduces 32 instrumented allocation cases; these separate instrumented binaries do not affect the timing artifacts.

The new theorem objects are checked by the preserved original compiler. Generic logic, bit-vector and library checker source hashes are unchanged from the prior milestone. The new bridge checks actual save/apply/restore composition, with original insert/replace/remove source-to-list-sum proofs still required. This proves cache algebra, not complete table/transaction/backend soundness. See the design document for scope and open requirements.

Raw timing binaries and original compilers are ignored local build artifacts. Their identities, exact source, pinned toolchains, commands and results are archived; fresh checkouts can rebuild a new measurement but must not claim to replay an absent original binary.
