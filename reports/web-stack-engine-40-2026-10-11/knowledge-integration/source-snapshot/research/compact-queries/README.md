# Compact query transitions

`app.ink` is unchanged across `previous.json` and `cached.json`. Both cached
representations preserve caches on aborts and unrelated writes, and compose the
canonical whole-action removal-idempotence law. The new candidate changes only
query intermediates. `direct.json` and `migration.json` supply its direct tuple
endpoint and a universally checked conversion. Logical portable snapshots also
allow generic migration between the old and new cached representations.

`producers/representations.py --cache-query zero --preserve-cache --compact-queries`
emits these query definitions. The cached query's original observation already
contains its cached reply and logical post-state; next-state reconstruction uses
those fields, so it needs no auxiliary carrier. Ordinary queries carry only the
cached reply and original source observation. Uncached tuple layouts use the
original observation directly. Complete observation, decoding, initialisation,
future-action relations and migration still require the existing universal proofs.
The source query's reply cannot be invented: a well-hashed false cached reply
fails mathematical equality checking. Neither names nor the producer grant authority.

The option supports ordinary direct unchanged-state observations and the existing
parameterless direct cached-query example. Unsupported source projection or
unproved claims fail closed. It can be used without a cache or without change-boundary
cache maintenance; `--rebuild-queries` is a conflicting comparison mode.
This is an authoring option, with no Ink syntax, core rule or backend change.

These frozen requests pin snapshot `0bd600c1b820898e6a96a17588c66d1bfb33d2d9328d94660a8b0173e846df79` with 845 entries. Older
snapshots and requests remain replayable. State-reusing direct switches between
these cached candidates are in `../layout-switch`. SQLite remains a disposable index.
`observations.json` lists 60 immutable timing evidence IDs under
`store/observations`. They pin source, representation, exact workload and fused
versus three-call transport. Peak memory is explicitly unknown (`null`), never
silently zero; evidence import does not change the mathematical snapshot.

In the distribution's `reports/compact-query-performance`, three-call query
latency falls by roughly 22–24% at 48 rows. Fused calls are a few percent slower
in these trials, so selection stays explicit and depends on the executor/workload.
Correctness proofs do not incorporate these measurements. Full-state final
transport and resource checks remain; no constant-time or large-table claim is made.

From ink-lang:

```sh
ink check-representation knowledge/research/compact-queries/app.ink \
  knowledge/research/compact-queries/cached.json
ink check-migration knowledge/research/compact-queries/app.ink \
  knowledge/research/compact-queries/direct.json \
  knowledge/research/compact-queries/cached.json \
  knowledge/research/compact-queries/migration.json
ink execute-representation knowledge/research/compact-queries/app.ink \
  knowledge/research/compact-queries/cached.json \
  knowledge/research/cache-maintenance/calls.json
```

Use `Store.observations(program, [previous_id, cached_id], target, workload)`
with the exact target/workload from an evidence object to retrieve comparable
samples. Different executors are not comparable targets. These are representation
cost observations; recording them does not implement automatic representation
selection in the routing planner.
