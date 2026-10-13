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

With `--certify DIRECTORY`, each unconditional `commute` pair is checked by the
existing whole-action equality machinery. The tool appends a change that calls
both actions and returns both replies in a record, and a twin that makes the same
calls in the opposite order. `knowledge/producers/action_replacement.py`
proposes replacing the first with the second, and `ink check-selection` admits
the replacement only if the transitions are equal for every logical state,
version and argument: the same replies, roots, commit decision and ordered
events. A checked certificate is an ordinary `ink-evidence-v1` selection over
that augmented module.

Measured on small modules (`tools/test_action_algebra.py`):

| Pair | Report | Certificate |
|---|---|---|
| writer of `Rows` and writer of `Other` | commute | checked |
| query of `Rows` and writer of `Other` | commute | checked |
| two emitters of `seen` | conflict | rejected (event order differs) |
| `put(key)` then `erase(key)` | conflict | rejected |
| `put(key)` and `erase(other)` swapped without a key guard | commute_when | rejected (false when the keys coincide) |

The pair action requires the nested changes to share one error type, and the
actions must lie in the transition projection's domain (u64-keyed tables and the
types listed in [action-transitions.md](action-transitions.md)); otherwise the
certificate is reported as unavailable with the reason.

## Limits and next steps

- `commute_when` pairs are not yet certified. Proving them needs table lemmas of
  the form "operations on distinct keys commute" (remove/replace/insert pairs),
  stated once over the abstract row sort like the existing removal laws, and a
  pair action guarded by the key inequality.
- Commuting calls still receive different commit versions in each order. A
  batch or multi-writer contract would have to state which per-call observations
  it preserves; the current sequential host contract preserves all of them.
- Nothing consumes certificates yet. Batching consecutive commuting calls in the
  durable host, or merging independent writers, would need a host contract that
  names the certificate it relies on. Without one, call order stays sequential.
