# Whole state implementation plans

Implementation choices compose through `ink-state-protocol-v1` steps in ordinary
checked compiled plans. The knowledge registry owns proposal families and their
parameters. The planner ranks admitted whole implementations using source-oracle
histories and lifecycle costs; the runtime performs no search or timing probes.

## Source execution contracts

A change can declare `protocol(preflight)` or `protocol(transactional)` after its
reads/writes/emits clauses and before requires/ensures clauses. These are executable
implementation contracts, not assumptions of success. A preflight declaration must
pass the same source-derived capability analysis as a database proposal. Bounded
single-cell actions with at most one event stage writes in lexical locals. Every
return, exception, ingress/output conversion and version check precedes commit.
Failure after a staged source write discards the locals. A host transaction takes
the journalled implementation even when standalone calls use preflight.

Transactional requests retain the ordinary staged/journalled action protocol.
The absence of an annotation lets knowledge propose an eligible implementation.
Rollback, publication and batching remain distinct: all successful actions publish
an atomic committed state; batch combines notifications without undoing actions;
host transaction defers notifications and restores changes on rollback.

The current capability conservatively declines reads after a possible write,
multiple writes/events, arbitrary calls and collection loops. They retain ordinary
execution, including budget checks. Bounded literal preflight actions cannot
exhaust the fixed 100-million-step action budget, so repeated ticks are unnecessary.
The source-derived bound is structural admission, not whole compiler correctness.

## Direct reads and output publication

A database choice can select a parameterless scalar query returning a checked
maintained keep. Its boundary getter reads that scalar directly. Source action
reads still use staged semantics. Unknown or composite queries retain ordinary
execution and ownership capture. Publication can select changed maintained output
edges while unknown dependencies remain conservatively root-based.

`subscribeGroup(['total_query','count_query'], values => ...)` publishes one tuple
per changed group at an action or batch boundary. Entries can also be
`{query:name,args:[...]}`. Values are collected before listeners execute; disposal,
reentrancy, listener isolation, host rollback and asynchronous restore retain the
ordinary subscription contracts. Independent subscriptions keep independent
notifications.

## Scalar column prefixes

A protocol choice can install a fixed scalar-record prefix with presence bits,
separate typed columns and an exact sparse fallback. The ordinary inductive
source-column codec proof is mandatory. U64 lanes can use machine-width typed
storage or exact Number cells with BigInt overflow side lanes. Number compression
requires checked 53-bit guard certificates. It does not replace full-width U64
arithmetic with Number arithmetic. Values above the guard widen independently;
replacement can narrow again. F32 columns retain raw bits. Logical checkpoints
rebuild rows through the unchanged portable snapshot ABI.

## Snapshot execution choices

The database can select `snapshot_rows` to retain encoded private rows by key.
Concrete writes and rollback invalidate only affected entries; restore starts a
fresh cache. Reuse charges the original value count and maximum depth and retains
byte limits, exact ordering and integrity hashing. It avoids repeating value
encoding while still materializing the complete portable output. It trades retained
memory and cold encoding against repeated checkpoint cost; ordinary encoding stays
available as a whole-plan alternative.

`ink emit-protocol-ir SOURCE -o GRAPH.json` exports the lower-level literal action
control tree, value allocations, root reads/writes, failure sites, ingress/result
ownership and commit/publication stages. This is scheduling/costing input, not
permission to erase operations. The sealed protocol and algebraic proof witnesses
supply admission independently.

## Action-native changes

`changeToken()` enables an auxiliary typed change log and returns an opaque token.
`changesSince(token)` returns `{from,to,changes}`, coalesced by table/key with owned
Option before/after rows. Changes are captured at actual source writes, without
comparing two snapshots. Net no-op cells are omitted; successful no-op actions
still advance the version and retain events. `releaseChangeToken(token)` releases
a token; releasing all tokens disables logging and clears retained rows.

Failed actions discard their log segment. Tokens cannot be read inside a host
transaction. Host rollback and restore invalidate the token lineage; tokens are
not portable checkpoint data. This is a typed logical delta interface, not a
claim of compatibility with another library's patch wire format.

## Required acceptance

- [ ] Source declaration and forged-capability rejection.
- [ ] Exact source-oracle result/error/version/event/snapshot histories.
- [ ] Host rollback, grouped publication, reentry and owned change records.
- [ ] Full-width integers, guard boundaries, sparse fallback, delete and restore.
- [ ] Complete CPU/Wasm parity and actual eligible GPU execution.
- [ ] Independent package checks and whole planner state identities.
- [ ] Matched manual controls, allocation-sensitive workloads and held-out lifecycles.
- [ ] Exact main revisions published for changed packages and distribution.

The action-native change API currently belongs to JavaScript source-state hosts;
definition representations retain their existing state API and now also support
grouped subscriptions. Selecting a source protocol explicitly rejects a definition
representation and unsupported targets. The scalar-column lane is likewise an
explicit JavaScript capability, not an silently omitted cross-target choice.
