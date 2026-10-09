# Exact integers and finite-sum maintenance

This is a mathematical proof package for migrating aggregate authority out of the compiler. The unchanged generic kernel checks 35 immutable objects: 12 datatype/function definitions and 23 theorems. No exact-integer primitive, ring axiom, polynomial normaliser, solver or aggregate-specific proof rule was added to the kernel.

```sh
target/release/ink verify-library knowledge/exact-integers/lock.json
python3 tools/integer_proofs.py build/exact-integers-replay
python3 dev.py test --test exact_integers
```

Natural numbers have Zero/Successor constructors. Integers have Zero/Positive(n)/Negative(n), denoting 0, n+1 and -(n+1). Structurally terminating definitions implement successor, predecessor, negation, repeated steps, addition and subtraction. Induction proves inverse, cancellation, commutativity and associativity laws; later theorems reuse those checked identities.

Integer lists and a tail-first exact sum then establish these equations for arbitrary finite prefixes/suffixes and arbitrary signed old/new values:

```text
before  = prefix ++ [old] ++ suffix
after   = prefix ++ [new] ++ suffix
removed = prefix ++ suffix

sum(before) - old + new = sum(after)
sum(before) - old       = sum(removed)
sum(removed) + new      = sum(after)
```

The proofs do not depend on sampled inputs, a machine width, a table size or nonnegative weights. The compiler checks datatype definitions, structural termination, explicit imports and each exact theorem statement. Names and hashes provide identity; they provide no unproved arithmetic assumptions.

Importing this mathematical package alone does **not authorise source or stateful transformations**. The separate [exact maintenance bridge](../exact-maintenance/README.md) now checks actual candidate update expressions against these definitions/proofs before runtime or native cache selection. The native/reference runtime still uses BigInt. The unary constructors are proof data, not a proposed runtime representation. Evaluation of concrete large unary values is limited by the kernel's normalisation budgets; the universally quantified induction proofs do not enumerate them.

The bridge pins these exact definitions and checks candidate arithmetic. Actual row projection, table changes and the transactional cache protocol remain trusted. General transaction refinement must also cover abort, tentative queries, versions, ordered events and future updates. The Rust kernel remains trusted and has not been mechanically proved correct. See [the original foundation verification](../../reports/exact-sum-proof-foundation/REPORT.md).
