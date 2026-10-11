# Database-defined point-query maintenance

The database can now propose incremental maintenance for a parameterless query
that reads a fixed u64 key. `--cache-query zero --preserve-cache --delta-query`
on `knowledge/producers/representations.py` uses the untrusted
`point_delta.py` authoring tactic. Successful same-key remove and replace chains
predict the new cached Option from the old cached reply and action arguments.
Aborts, host failures and unrelated changes retain the old reply. Unsupported
insertions or dynamic-key updates refresh from the logical post-state.

The source action still supplies its complete observation: reply, commit flag,
version, logical post-state and staged events. Ordinary database definitions
carry the old/predicted reply to the update function. Database-supplied induction,
Boolean split, substitution and definitional-equality proofs establish all future
action observations and representation relations. Producer analysis is not an
accepted correctness premise. No compiler recognises this optimisation and no
proof-kernel rule or source syntax was added.

Frozen direct, refresh and delta requests live in
`knowledge/research/point-delta`. The refresh-to-delta bridge reuses identical
physical state; refresh-to-direct uses a proved decode/encode conversion. Both
bridges are checked against the exact endpoint closures. `Session` switches at
transaction boundaries, preserving portable logical snapshots and pending events.
The producer's `--via-logical` bridge option is an authoring convenience, not
unchecked migration authority.

Stateful correspondence also now represents List values using an ordinary
Nil/Cons datatype, including lists nested in supported records/results/events.
Fixed list count and u64 sum project to recursive first-order functions. Runtime
codecs preserve list elements, enforce the existing nesting bound and cap lengths
at 4096. Exact Int, u32/i32, binary32, fixed vectors, nominal stored equality and
filtered keeps are now also projected under the scope in
[database representations](database-representations.md). Iterative native transport
retains explicit bounds; representation execution may fail safely for values
accepted by the source interpreter.

Native tests compare reference, fused native and three-call execution over future
updates, query histories, aborts, errors, events, restoration, migrations and
exhaustion. List tests compare native and reference results and byte-identical
snapshots, including overflow and list-valued events.

The new delta candidate is slower on the measured small fixture. It is retained
as a proved candidate, not made the default. External selection measures setup,
checking, execution, teardown, memory and exact migration costs before choosing.
See [the measurements](../reports/incremental-maintenance-selection/README.md).
The database now also contains universally checked filtered u64 sum/count
maintenance across insertion, replacement and removal. It accounts for duplicate
keys without assuming a unique/sorted-key invariant. Rollback, overflow, portable
restore and direct/generic migration remain checked and exercised. Frozen
requests live in `knowledge/research/filtered-aggregate`; the untrusted producer
is `knowledge/producers/aggregate_delta.py`. All seven representation routes
share source-oracle conformance, with recursive state executing in GPU host lanes.

This closes filtered additive aggregates for the admitted table domain. Indexed
physical tables, other reducers/key domains and efficient general aggregates
remain open. Complete Session write transport still traverses logical state;
compiled standalone calls have a separate caller-trusted contract. Profitability
is workload-specific: retain direct execution when cache maintenance costs more
than the reads it saves. See [scaling results](../reports/representation-scaling/README.md).
