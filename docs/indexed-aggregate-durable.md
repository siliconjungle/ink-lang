# Indexed cached tables and durable operations

The database now contains source-bound ordered sequence trees with key ranges,
height metadata and cached filtered word sum/count. Insertion uses rotations;
lookup, replacement and removal prune subtrees outside the requested key's range.
Smart constructors maintain metadata along the edited paths. Queries read the
cached aggregate. The checked representation preserves arbitrary logical row
order and duplicate keys, first-match lookup, all-match replacement/removal,
wrapping u64 arithmetic and source insertion order. Sorted/unique native table
checkpoints are a subset of that proved domain.

The whole-action admission relates the physical tree to the logical table and
requires repaired metadata. Initialisation establishes both relations; every
source action preserves both. Observation equality includes replies, domain and
host errors, events, commit flags and versions. A preserved relation and universal
observation equality justify future calls. No tree or aggregate rule is a kernel
primitive. See `knowledge/producers/indexed_aggregate.py`, its whole-action
producer, the pinned `knowledge/research/indexed-aggregate/request.json`, and the
admission receipt in `reports/indexed-aggregate-durable/`.

This producer currently covers the admitted one-table word aggregate example:
`put`, `erase`, `total_query` and `count_query`. It rejects nested table mutations
rather than claiming a composed lemma. Additional actions and predicates require
new source-bound proposals. No new application syntax was introduced. Removal
leaves empty branches, so sparsity and historical height can accumulate until an
explicit checkpoint restore rebuilds the tree. Functional rotation correctness
and metadata are proved; a universal asymptotic height bound is not claimed.
Recursive representations execute on GPU hosts, not device kernels.

The generic compiler changes are bounded proof-computation reuse, a proof-context
capacity consistent with authenticated bundle limits, reuse of an already
admitted context, and constructor demand projection. The standalone host consumes
logical post-state separately through `next` and checkpoints, so its observer can
omit that unused field without flattening the tree on each call. The projection
accepts typed closed constants and uses capture-avoiding substitution. The full
observation remains the object of source admission. There is no aggregate-specific
compiler shortcut or runtime proof evaluator.

Database `state-laws/*` entries provide product-field frame laws, preservation of
arbitrary views depending only on an unchanged field, disjoint-write commutation,
and a grouped traversal retaining both the first edit's intermediate rows and the
second edit's final rows. Abstract edit functions make these laws reusable.
Preserving intermediate results lets a subsequent checked action proof retain
reads, errors, events and rollback decisions; it does not grant unconditional
fusion of effectful actions. These are database foundations for future proposals,
not an assertion that every source action now automatically batches writes.

Durable hosts append a deterministic compiled operation with its retry receipt,
between periodic portable checkpoints. Retained ordinary journals or immutable
physical roots avoid full-state copies. State, events and retry receipts recover
atomically; queries and unsuccessful domain actions append receipts without
replaying their source calls. Acknowledgements share the retained boundary.
Native, JavaScript and optional Wasm ABI-v1 transaction hooks are available.
Legacy adapters retain checkpoint/restore fallback. See the durability report for
wire limits, crash behavior, compatibility and measured host costs.

The existing external database implementation selector compares ordinary source,
direct linked-list and indexed packages. Measurements bind candidate content,
compiler bytes, emission lane, hardware and workload. Admission, compilation,
initialisation, checkpoint teardown, action mix and portable migration costs are
included when relevant. Both JavaScript and native Rust retain ordinary source for
the short profile and select indexed storage for the read-heavy profile. Selection
receipts are replayed through actual emission; there is no new selector or live
profitability probe. See [measurements and reproduction](../reports/indexed-aggregate-durable/AGGREGATES.md).

Integration includes the language-foundations and storage revision `3e826cd2`. Its source
identity differs while this example's complete action projection is identical.
Existing mathematical objects are reused only after ordinary universal replay.
The same external rebind procedure repairs 21 existing fixture bindings and checks
all their obligations, without changing their mathematical objects. Historical
immutable snapshots and observations remain available under their original pins.

Merge integration also retains the compatible knowledge publication `711938bf`.
Both immutable catalogues are preserved in a combined discovery snapshot. Nine
additional storage fixtures replay against the identical current action projection;
the four measured selection receipts still replay against their original pins.
