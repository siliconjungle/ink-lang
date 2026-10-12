# Incremental operators: delta laws

A keep is defined by recomputation; an implementation may maintain it
incrementally only with a checked proof. Today maintained keeps cover word
sums and counts (filtered, bounded groups, Boolean any/all) over one table.
This page states the delta rules for the broader operators once, as general
laws in Ink's [`law` form](laws-in-source.md), checked by the semantic law
kernel: `knowledge/libraries/incremental-laws.ink`.

```sh
ink emit-laws knowledge/libraries/incremental-laws.ink -o incremental-laws.json
```

## Model: signed collections

A change is a collection with signed multiplicities (a Z-set): insertions
contribute positively, removals negatively, and a replacement is a removal
plus an insertion. Applying a change is appending it. Each law has the form

    op(old ++ delta) == combine(op(old), op(delta))

so maintaining `op` costs the size of the change and the work to combine,
never the size of the collection. Contributions are `Int` (exact), so signs
and cancellation are exact.

## The laws

| Operator | Law | Maintained state | Cost of one change |
|---|---|---|---|
| sum / count over a filter or map | `sum_append`, `sum_split`, `filter_append` | one total | O(1) per changed row |
| group-by sum | `group_sum_append`: per key `k`, `G(xs ++ ys)[k] = G(xs)[k] + G(ys)[k]` | a map from key to total | O(1) per changed row (one map update) |
| group-by count, count-distinct support | `group_count_append` (signed multiplicities per key) | a map from key to count | O(1) per changed row |
| equi-join sum, left side changes | `join_sum_append_left`: `J(xs ++ dxs, ys) = J(xs, ys) + J(dxs, ys)` | the total, plus an index of the right side by join key | O(matching right rows) per changed left row |
| equi-join sum, right side changes | `join_sum_append_right`: `J(xs, ys ++ dys) = J(xs, ys) + J(xs, dys)` | the total, plus an index of the left side by join key | O(matching left rows) per changed right row |
| views over views | `filtered_group_sum_append`: a group-by over a filter, by composing `filter_append` and `group_sum_append` | the downstream view's state only | the downstream delta rule on the upstream delta |

Every law is general: the element types are type parameters, and keys,
amounts, predicates and join weights are function parameters. A program's
keep reaches a law through a concrete instance (`use group_sum_append(...)`),
exactly as `sum_append_u64` instantiates `fold_append` in
`general-laws.ink`. The join laws together give the full bilinear rule
`Δ(A⋈B) = ΔA⋈B + A⋈ΔB + ΔA⋈ΔB` (apply the left rule, then the right rule to
the delta term).

## Not yet proved

- **Count-distinct output.** The multiplicity map is linear (above). The
  number of keys with positive count changes by one exactly where a count
  crosses zero; proving it needs reasoning over a map's key list, which the
  kernel's map semantics do not yet support beyond single keys.
- **Min, max, top-k.** Insertion is `max(old, x)`, but deletion needs an
  ordered multiset, and the laws need order reasoning (transitivity of `<`).
  The kernel decides equalities (normalisation and the polynomial procedure),
  not inequalities. A small linear-arithmetic procedure for `Int` (and
  unsigned words) would close this. Stable bounded top-k already has
  first-order laws in the knowledge database.
- `fold_append` in `general-laws.ink` already covers any associative operation
  with an identity, including max with identity 0 over unsigned words; only
  the instance proofs (identity, associativity) need the order procedure.

## Integrating into keeps

The laws are the proof side. Wiring each operator into maintained keeps uses
the existing pipeline:

1. **Export.** Each keep's query is exported as a small graph of these
   operators (`group_by`, `join`, `filter`, `map`, `sum`), with the source
   terms of keys, amounts and predicates. The view decomposition producer
   already does this for sums and counts.
2. **Instantiate.** The producer instantiates the operator's law for the
   program (`Proof::Use` with types and arguments; assumptions, where present,
   discharged by normalisation) and composes the chain for views over views.
3. **Represent.** Maintained state is a representation: a key-to-total map for
   group-by, a key index for a join side, a multiplicity map for
   count-distinct. Each action that writes the table updates it with the delta
   rule; the representation proof shows the state equals the query after every
   action, as for today's maintained sums.
4. **Select.** The planner prices each representation (memory, write cost,
   read cost) through the existing lifecycle selection, and keeps
   recomputation when it wins.

Steps 3 and 4 run in the first-order representation checker today; the laws
here are stated in the semantic law kernel. Bridging them (or stating
representation obligations in source laws) is the remaining integration
work.
