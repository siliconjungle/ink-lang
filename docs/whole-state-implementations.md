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

The callback-free preflight path retains the entry boundary check but needs no
in-progress flag writes or cleanup before publication. Bound result-only functions
are emitted separately from full replies. Selected native inline maintenance can
compute scalar keeps in locals, then store the row and install those keeps in one
kernel; all maintained computations precede mutation. Full replies retain the
separate preparation phase before fallible public event copying.
For eligible result-only actions, the compiler embeds that kernel directly in
the action entrypoint, without a separate maintained-kernel call or scratch cells.

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
notifications. `subscribeValues(queries, (first, second, ...) => ...)` has the same
publication grouping with positional owned values. Scalar pairs use retained
consumer slots without allocating tuple payloads; composite and other arities keep
the ordinary ownership path.

Consumer installation and disposal bind per-root publication schedules. A lone
committed scalar pair uses its direct schedule; multiple or unknown consumers keep
the normal queued schedule and value snapshot before delivery. Batching, reentry
and publication budgets are shared by both schedules.

## Event retention choices

`event_columns` retains ordered events without private per-event records.
`event_runs` additionally retains contiguous commit metadata as an exact base and
offsets, falling back to literal commit columns on gaps or repeated commits. It
requires event columns and is an offline plan choice. Position/channel columns,
public owned records, acknowledgement, rollback and portable snapshots retain the
same semantics. Compact commit metadata widens at the checked 53-bit bound.

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

- [x] Source declaration and forged-capability rejection.
- [x] Exact source-oracle result/error/version/event/snapshot histories.
- [x] Host rollback, grouped publication, reentry and owned change records.
- [x] Full-width integers, guard boundaries, sparse fallback, delete and restore.
- [x] Complete CPU/Wasm parity and actual eligible GPU execution.
- [x] Independent package checks and whole planner state identities.
- [x] Matched manual controls, allocation-sensitive workloads and held-out lifecycles.
- [x] Exact main revisions published for changed packages and distribution.

The action-native change API currently belongs to JavaScript source-state hosts;
definition representations retain their existing state API and now also support
grouped subscriptions. Selecting a source protocol explicitly rejects a definition
representation and unsupported targets. The scalar-column lane is likewise an
explicit JavaScript capability, not a silently omitted cross-target choice.

Explicit workflow job additions are retained as a patch in the implementation report
because the configured GitHub credential cannot write workflow files. The existing
mandatory CPU suite inventory includes `state_protocol`.

## Guarded word updates and reusable publication

The maintained-fold recipe offers ordinary and guarded map/dense alternatives.
The guarded update returns the prior total when old and new contributions are
equal. Its database theorem proves the complete identity for arbitrary 64-bit
totals and contributions, including overflow, by a replayed RUP certificate.
`producers.maintained_folds --guarded-update` authors that choice explicitly.
`--guard-zero` additionally skips the redundant subtraction/addition when either
contribution is zero, under a second complete 64-bit proof. Both remain database
alternatives alongside the ordinary update.
This changes no source meaning and grants no compiler arithmetic shortcut.

Preflight actions with one statically known root bind its admitted maintenance
entry and emit its keep installation directly. Grouped committed scalar outputs
read current keep slots without query dispatch. Publication reuses two queues of
subscription slots; a single committed scalar consumer publishes directly.
Both paths preserve installation order, evaluate-before-deliver,
disposal, reentry, listener isolation and nested batch/transaction boundaries.
Changed-output generations prevent stale flags from another root causing work.

Boxed dense prefixes use packed object arrays and direct Number indexes for
checked capacities up to 2^20, with exact sparse fallback for larger word keys.
The index conversion changes no row or arithmetic carrier. Prefix allocation is
a setup/memory cost and remains an offline whole-plan choice.

The protocol also exposes two event/commit storage choices. `event_columns`
retains private parallel columns and materializes owned ordered records only at
public event and snapshot boundaries. `compact_commits` carries the checked
53-bit word guard used by exact-number storage. It permits exact Number commit
metadata below that bound, then widens to BigInt before the next increment.
Versions, event commits and typed change boundaries remain full-width BigInt at
the public API. Restore, acknowledgement, rollback and exhaustion keep their
ordinary contracts. Source values and aggregate arithmetic remain full-width;
this choice only changes private commit metadata. Controllers remain trusted.

Dense preflight entries retain their checked lookup slot until commit, avoiding
another key conversion and membership probe. Bound committed scalar reads use
emitted fixed keep indexes while retaining the busy-state boundary.

Offline state acquisition now alternates isolated candidate states within each
fresh process. The installed `ink_knowledge/state-selection.json` policy requires
at least three processes and nine rounds per repeated phase. The minimum weighted
lifecycle gain (10% by default) must hold in every paired process, using the sum
of weighted phase medians, including module load, setup, checkpoint and restore.
This replaces independent phase-extrema comparison for freshly acquired state
histories; historical or unpaired costs cannot authorize that switch. A frozen
winner still needs independent holdout acceptance. This is an empirical
profitability policy, not a statistical confidence interval or proof. Shared
process RSS includes all candidate states and is a conservative memory bound.
