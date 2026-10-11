# Database-defined point-query maintenance

The database can now propose incremental maintenance for a parameterless query
that reads a fixed u64 key. `--cache-query zero --preserve-cache --delta-query`
on `knowledge/producers/representations.py` uses the untrusted
`point_delta.py` authoring tactic. Successful same-key remove and replace chains
predict the new cached Option from the old cached reply and action arguments.
Aborts, host failures and unrelated changes retain the old reply. Unsupported
insertions refresh from the logical post-state in that original tactic.

`--dynamic-delta` additionally proves guarded dynamic-key remove and replace
maintenance, and skips insertion refresh when its key differs from the fixed
query key. Same-key insertions retain exact refresh. Branching upserts, chained
updates, aborts and host failures participate in the universal equations.
The proof producer targets `u64` keys and rejects other key domains explicitly.
Frozen requests and a reauthenticated false-guard regression live in
`knowledge/research/dynamic-point`.

Point maintenance also lifts through a total, presence-preserving `Option.map`,
such as `Rows.get(0).map(fn(row)=>row.amount)`. The physical cache stores the
projected Option rather than the whole record. Ordinary Option induction and
conditional congruence transport the already proved remove/replace/insert laws;
replacement computes the projection from the new row without scanning the table.
The authoring tactic rejects a mapper that captures additional state. Ordinary
mapped reads can still capture query arguments. `examples/frontier-field-cache.ink`
exercises an unread-field change, absence, overflow, aborts, staged record events,
restoration and captured query arguments. This is a field projection capability;
it is not general dependency fusion or automatic field-change invalidation.

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
at 4096. This does not admit all numerical domains, exact Int or keeps. Native
transport retains its stricter dispatcher bounds; representation execution may
fail safely for values accepted by the source interpreter.

Native tests compare reference, fused native and three-call execution over future
updates, query histories, aborts, errors, events, restoration, migrations and
exhaustion. List tests compare native and reference results and byte-identical
snapshots, including overflow and list-valued events.

The new delta candidate is slower on the measured small fixture. It is retained
as a proved candidate, not made the default. External selection measures setup,
checking, execution, teardown, memory and exact migration costs before choosing.
See [the measurements](../reports/incremental-maintenance-selection/README.md).
Independent admitted representations can now be composed with
`knowledge/producers/representation_product.py`, choosing an observation
component for each source action and preserving every component relation.
`knowledge/research/product-caches` contains two dynamic point caches and both
migration directions. The general decode/encode bridge producer now transports
arbitrary target relations through their checked initialization equations.
Composition can duplicate work and storage; measurement must justify selection.
Shared dependency fusion, field-sensitive invalidation, general grouped and
ordered maintenance, and additional physical layouts remain further work.

The Frontier extension additionally proves preservation of a mapped field cache
when a replacement retains its actual projection. A label-only change in
`frontier-field-sensitive.ink` therefore retains the cached amount. This tactic
currently needs a fixed key and a mapper without additional captured state;
other updates use exact repair or refresh. Products can use `--shared` to consume
one complete observation for all maintainers, while retaining every independently
checked component relation. This shares computation, not necessarily root storage.
See `knowledge/research/frontier-extensions/fields` and `shared` for frozen proof
requests and checked migrations, and the Frontier report for lifecycle costs.
