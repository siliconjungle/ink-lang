# Guarded laws: data-dependent premises as runtime tests

On the planning corpus, most checker rejections were premise failures in a
few repeated shapes ([results](../bench/planning-corpus/results-2026-10-13.md)):

- a key field compared with a free variable;
- a range test on a record field;
- the result of an inner `fold_until`.

The premises are about values bound inside a callback, so they hold for some
items and not others. No proof exists at the site. What is missing is a
runtime test, not a fact.

## Construction

For a conditional law `from == to` whose premises are all Bool tests
`c_i == b_i`, and where at least one test mentions a law parameter,
`ink_knowledge/guarded_laws.py` builds an unconditional variant:

```
from == choose(c_1, choose(c_2, to, from), from)      (for b_1 = b_2 = true)
```

The variant's proof:
- splits on each test (`Cases`);
- in the branch where every premise holds, it `Use`s the original law with the
  branch hypotheses as premise proofs;
- in every other branch, normalisation reduces the right side to `from`.

The variant is an ordinary law. The kernel checks it, together with its one
dependency, whenever an application uses it.

## In search

`semantic_search` derives guarded variants for at most 64 eligible
conditional laws whose left side matches the subject. It adds them to the
catalogue as roots.

A guard is not applied again where it would only repeat its own test: at a
site that is, or lies under, a `choose` on the same condition within the same
binder scope. Without this rule, a law whose left side is itself a `choose`
re-matches its own output indefinitely.

## Standing

A guarded program is an ordinary alternative. It adds a test and keeps both
code paths, so whether the specialised branch repays the test depends on the
data. Measured selection, or a validated work model, decides; nothing assumes
the guard pays.

## Tests

- `knowledge/tests/test_guarded_laws.py`:
  - only data-dependent Bool premises are guarded;
  - variants pass `knowledge-check`;
  - a variant with swapped branches is rejected.
- A search smoke test on a conditional law whose premise is a fold step's
  `choose` condition. The guard is correctly never applied: it would only
  duplicate the existing test.
