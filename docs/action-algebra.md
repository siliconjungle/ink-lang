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
| `put(key)` and `put(other)` | commute_when | rejected (see below) |
| `erase(key)` and a presence-guarded `set(other)` | commute_when | rejected (see below) |

## Limits and next steps

- **Conditional pairs are not certified.** Pairs that commute only when their
  keys differ need two more pieces, and their certificate would state the
  conditional fact:
  - a pair action guarded by the key test;
  - leaf rewriting under that branch's hypothesis. This means rewriting lookups
    through another key's update (the published `lookup_general_remove` and
    `lookup_general_replace` give `get(remove(r,k),q) = choose(q==k, none,
    get(r,q))`), then discharging `q==k` from the hypothesis. That needs a
    symmetric word-inequality lemma, because the hypothesis and the lemma may
    compare the keys in opposite orders.

  The producer has neither yet.
- **Inserts cannot be certified at all without a checker change.** Insertion
  is sorted, and on an unsorted row list two inserts of distinct keys produce
  different lists in each order. Since the checker quantifies over every
  logical state, including unsorted ones that no source table can reach,
  `put`/`put` and `put`/`erase` are false over that domain. Certifying them
  needs the transition checker to assume the projection's own well-formedness
  (strictly sorted keys). That would be a checked invariant of the projection,
  not a new axiom, and it is a core change in its own right.
- **Commit versions still differ.** Commuting calls still receive different
  commit versions in each order. A batch or multi-writer contract would have
  to state which per-call observations it preserves; the current sequential
  host contract preserves all of them.
- **Nothing consumes certificates yet.** Batching consecutive commuting calls
  in the durable host, or merging independent writers, would need a host
  contract that names the certificate it relies on. Without one, call order
  stays sequential.
