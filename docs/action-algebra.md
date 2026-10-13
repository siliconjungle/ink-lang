# Action algebra: which calls commute

A stateful Ink module is a set of actions applied in an explicit sequence. Many
useful optimisations and designs depend on how two calls combine:

- calls that commute can be reordered, batched across calls, or run by
  independent writers;
- calls whose writes fall on different keys commute whenever the keys differ;
- calls that emit events, or that read what another writes, make their order
  observable.

`tools/action_algebra.py` reports this structure for a module. It does not add
syntax or a CRDT model; a replicated data type is an ordinary Ink program, and
the same report applies to it.

```sh
python3 tools/action_algebra.py --compiler target/release/ink --source examples/grouped-state.ink
python3 tools/action_algebra.py --compiler target/release/ink --source app.ink --certify build/commutation
```

## Analysis

The report applies Bernstein's conditions to the compiler's source-bound point
accesses (`emit-access`, re-derived by `check-access`) and declared events
(`emit-effects`). For every pair of actions, including an action paired with a
second call of itself:

| Relation | Meaning |
|---|---|
| `commute` | No root is written by one call and read or written by the other, and at most one call emits events. |
| `commute_when` | Every conflict is between point accesses of the same root, so the calls commute when the listed keys differ, for example `erase.key != put.key`. Input guards on an access are kept in the condition. |
| `conflict` | A whole-root access (a scan, a state-derived key), equal constant keys, or two ordered event streams make call order observable. |

For `examples/grouped-state.ink`, `put` and `erase` commute when their keys
differ, two `put` calls commute when their keys differ, and the `total` scan
conflicts with both writers. In `examples/action-transitions.ink` both writers
emit `seen`, so their order is observable through the event stream even when the
keys differ.

This analysis has the same standing as the access descriptions it reads: it is a
search and design aid. It does not establish commutation and grants no
reordering, batching, merge or parallel-execution authority.

## Checked certificates

With `--certify DIRECTORY`, every `commute` and `commute_when` pair is checked
by the existing whole-action equality machinery:
- The tool appends a change that calls both actions and returns both replies
  in a record, and a twin that makes the same calls in the opposite order.
- `knowledge/producers/action_replacement.py` proposes replacing the first
  with the second.
- `ink check-selection` admits the replacement only if the transitions are
  equal for every logical state, version and argument: the same replies,
  roots, commit decision and ordered events.

A checked certificate is an ordinary `ink-evidence-v1` selection over that
augmented module, and it states unconditional commutation. For a
`commute_when` pair it is therefore stronger than the analysis.

Two table lemmas, stated once over an abstract row sort
(`state-calculus/remove_remove_commute` and `remove_replace_commute`), let the
producer put both orders into one canonical form: removals innermost, in key
order. Both lemmas hold for every row list, sorted or not, and for equal keys.

Measured on small modules (`tools/test_action_algebra.py`):

| Pair | Report | Certificate |
|---|---|---|
| writer of `Rows` and writer of `Other` | commute | checked |
| query of `Rows` and writer of `Other` | commute | checked |
| two `erase(key)` calls | commute_when | **checked, unconditionally** (removals commute even for equal keys) |
| two emitters of `seen` | conflict | rejected (event order differs) |
| `put(key)` and `put(other)` | commute_when | rejected unconditionally; **checked when keys differ** |
| `erase(key)` and `put(other)` | commute_when | rejected unconditionally; **checked when keys differ** |
| `get(key)` and `put(other)` | commute_when | **checked when keys differ** |

## Conditional certificates on sorted tables

When the unconditional certificate fails and every conflict compares two plain
parameters, `--certify` asks for the conditional fact instead. The twin runs
the swapped order only when the keys differ:

```ink
change __pair(first_key:u64, second_key:u64, second_value:u64)->... {
  if first_key != second_key { let second=put(second_key,second_value); let first=erase(first_key); return Ok(...); }
  let first=erase(first_key); let second=put(second_key,second_value); return Ok(...);
}
```

Equality with the unswapped pair is exactly "the two calls commute when their
keys differ". That fact is false on arbitrary row lists. Removing key `a` and
inserting key `b` lands `b` in a different place on `[(5,_),(0,_)]`, depending
on order. It is true on every state a source table can reach, because source
tables are ordered maps.

The checker states this domain as a **checked invariant**, not an axiom
(`core/src/action_model/sorted.rs`, `ink-sorted-tables-v1`):

1. From the projection it derives `sorted` and `above(rows, bound)` per table.
   They use the table's own insertion order, so they cannot disagree with it.
2. It checks that every table of the initial state (empty) is sorted, by
   computation.
3. It checks one supplied proof per original action and table. Each proves
   that, from a state whose tables are all sorted, both observation
   constructors (`Reply` and `Host`) return a sorted table.
4. Only then does it check each action equality with "every table is sorted"
   as hypotheses.

The selected actions equal the original ones on sorted states, so they
preserve the invariant too. Restored states satisfy it because portable
snapshot decoding rejects duplicate or unordered keys, under the same order.

The proofs come from `knowledge/producers/sorted_rows.py`. It uses 26 general
laws published in `state-calculus`, stated over word-keyed rows with abstract
values and reaching programs only through `Proof::Instance`:

- preservation under remove, replace and insert of an absent key;
- remove/insert commutation on sorted rows;
- insert/insert, replace/insert and replace/replace commutation of different
  keys, on any rows;
- lookups past writes of other keys;
- bit-blasted word facts.

The producer's search normalises, rewrites with hypotheses and laws, and splits
on conditions. The kernel replays every step.

On the module in `tests/sorted_tables.rs` (two tables), these pairs are all
**checked when keys differ**: `put`/`put`, `erase`/`put`, `get`/`put`,
`erase`/`get` and `erase`/`erase`. Each takes 10 s – 2 min, including the
proof search. The test also shows the checker rejects the certificate when:

- the invariant is removed;
- a preservation proof is replaced;
- one action's proofs are dropped;
- the swap runs without the key guard.

## Limits and next steps

- **Only word keys.** The general laws cover `u64`/`u32` keys ordered by `<`.
  Other key types get the derived predicates and the invariant check, but no
  laws, so their equalities are proved only where no law is needed.
- **Plain parameter keys only.** A conflict on a computed key, or one
  guarded by another condition, is not attempted conditionally.
- **Search cost.** Proofs carry the normalised transition at every rewrite
  (0.8–2.9 MB per pair here). Larger actions may hit the checker's
  16 MB input limit before they hit a proof failure.
- **Commit versions still differ.** Commuting calls still receive different
  commit versions in each order. A batch or multi-writer contract would have
  to state which per-call observations it preserves; the current sequential
  host contract preserves all of them.
- **Nothing consumes certificates yet.** Batching consecutive commuting calls
  in the durable host, or merging independent writers, would need a host
  contract that names the certificate it relies on. Without one, call order
  stays sequential.
