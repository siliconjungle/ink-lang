# Review of stateful Rust ownership lowering

Claude's `9b62cf1` Rust backend work is integrated with the current semantic
selection backend `2572d6c`, rather than replacing its newer dependency pin or
selected pure helper emission. Its companion `78b58cf` language bundle provides
two ownership tests and historical transaction-plan prototype evidence.

The lowering moves final lexical reads, borrows String lookup keys, borrows
stored rows until a conflicting statement, and snapshots only the still-needed
fields before mutation. Stored-row map/filter stages can use references while
retaining the existing materialised-stage semantics. These are trusted base
ownership decisions; no journal-elision, direct-outbox or always-abort plan was
added to the compiler.

## Review fix and validation

The submitted by-reference scan unconditionally held a table borrow while its
callback ran. Generated pure helpers, queries and derived-value reads take
`&mut self`, so callbacks using them failed Rust compilation with E0500. A new
source-level regression reproduces seven such failures in map, filter and get-map
(`closure-calls-before.log`). The backend now keeps the original owned-row stage
when the callback may borrow `self` mutably. This is a conservative lowering
fallback, not a new optimisation law or a restriction on valid source programs.

`ownership-tests.log` records all three tests passing. The 3,000-step String-keyed
script matches the reference runtime both with row-copy instrumentation and
without it, including nested changes, aborts, overflow and conditional writes.
The instrumented native run makes 669 whole-row clones. This report does not
measure the predecessor's clone count or runtime speed.

The callback regression matches 14 reference invocations on empty, populated,
missing-key and overflow-boundary inputs. The standalone backend builds offline
against its pinned published core (`standalone-rust.log`).

## Remaining work

`docs/transaction-plans.md` and `reports/txn-plan-prototype/` are proposals and
historical hand-edited measurements, not enabled compiler optimisations. The
always-abort shortcut in the handwritten Rust benchmark changes how much work it
performs; performance comparisons must disclose it or use the supplied literal
baseline. Actual source/action correspondence, general effect evidence and
complete trace/representation preservation are required before admitting those
plans from database entries.
