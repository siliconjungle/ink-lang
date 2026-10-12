# Source-derived point dependencies

Ink can describe point accesses from existing checked actions without new source
syntax. `emit-access` records reads/writes of a table key, stable input guards,
and explicit whole-root fallbacks. `check-access` recomputes the entire description
against the original checked source and resolved action trees. Modified keys,
conditions, missing accesses and stale source identities are rejected.

```sh
ink emit-access examples/access-point-cache.ink -o access.json
ink check-access examples/access-point-cache.ink access.json
```

The description follows lexical aliases, typed pure helpers, record fields and
transitive action calls. Parameters have positional identity in the outer action;
shadowing cannot change an earlier alias. Symbolic arithmetic retains its word
width. Conditions are input-only: state-derived predicates are not carried across
writes. Return branches retain their complementary input guard for continuing
code. Literal lazy branches omit their unreachable reads.

Collection scans/bulk operations, state-derived keys and unsupported symbolic
expressions use whole-root descriptions with reasons. Callback-dependent keys
also widen. The analysis conservatively includes possible accesses before failure;
it does not claim they commit. It can retain accesses after a potentially failing
call, and does not yet use relational path facts to eliminate them. Work, depth,
symbol size, entry count and artifact bytes are bounded. Over-complex symbolic
expressions widen; exhausted global analysis limits fail instead of publishing
a partial description. Points describe logical key operations, not physical
addresses or index traversal. They do not establish operation commutativity.

## First consumer: point-cache candidates

The planner's ordinary offline implementation discovery now also proposes up to
two parameterless fixed-u64 raw-get caches from these descriptions. Precise point
writes propose guarded maintenance: other-key writes retain the cached value;
supported same-key writes repair it or refresh. Whole-root and unknown-key writes
keep the exact refresh path. The discovery receipt explains each action's choice.
Aliases and nested helpers require no cache-specific source annotations.

The producer lives in `ink-knowledge/producers/access_cache.py`. It composes the
existing ordinary key-locality induction, Boolean and bitvector proofs. Access
metadata is only a search hint, never a proof premise. The representation checker
still requires universal encoding, decoding, complete action observations and
all-future relation preservation. Replies, rollback, committed versions and
ordered events retain their original semantics.

To reproduce a proposal manually (using the pinned Python SAT dependency described
in installation/CI):

```sh
ink emit-action-model examples/access-point-cache.ink -o model.json
INK_COMPILER=/absolute/path/to/ink PYTHONPATH=knowledge \
  python3 -m producers.access_cache model.json --access access.json \
  --query watched -o request.json
ink check-representation examples/access-point-cache.ink request.json
```

Automatic candidates enter the existing lifecycle measurement ranking. Missing
comparable evidence retains the baseline. A correct candidate is not assumed
faster. Proof production/checking, construction, compilation and steady execution
are separate costs.

## Trust and limits

Source typing, elaboration and access analysis are trusted implementations; the
artifact check binds their result, not a formal proof of analysis soundness.
Descriptions cannot authorize reordering, parallel scheduling, distributed merge,
journal removal or unchecked retention. The first consumer supports the existing
u64 key-locality proof domain and fails closed for unsupported source/query shapes.
Parameterized/mapped query discovery, field/range conflict scheduling and CRDT contracts
remain separate work. The original coarse effect artifact is unchanged.

`core/tests/access.rs` covers aliases, helper substitution, input guards, shadowing,
numeric widths, scans, callbacks, state-derived fallbacks and forged descriptions.
The `access_guided_point_cache` representation conformance fixture exercises
same/other keys, helper/record arguments, events, aborts, dynamic-key fallback,
bulk refresh, portable restore and version exhaustion on emitted target programs.

`tools/check_access_cache.py --planner` independently replays automatic candidate
discovery, rejects a forged access artifact and a fully reauthenticated false
cache-retention implementation, and runs a matched JavaScript workload. It saves
raw timing samples, preparation/checkpoint phases and instrumented watched-key
lookup frames separately. Instrumentation is excluded from timing samples.

The historical `knowledge/tests/test_dynamic_point.py` frozen-byte comparison
currently fails on the pinned knowledge baseline as well as this change. Replaying
that baseline producer and the modified producer against its same frozen model
produces byte-for-byte identical proposals. The archived direct/delta requests
already differ from those proposals; they were not regenerated in this work.
