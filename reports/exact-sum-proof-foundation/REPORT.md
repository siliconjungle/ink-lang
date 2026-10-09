# Exact-sum proof foundation

An unchanged Ink compiler now checks an externally produced exact-integer model, its additive group laws, and insert/replace/remove sum equations for an element at any position in a finite list. This supplies mathematical evidence needed to replace the existing aggregate checker's built-in polynomial/schema authority. It does not yet install a stateful implementation or demonstrate a runtime gain.

## Checked package

`knowledge/exact-integers` contains 35 immutable objects: 12 datatype/function definitions and 23 theorems. The model represents natural numbers by Zero/Successor and signed integers canonically by Zero/Positive(n)/Negative(n), denoting 0/(n+1)/-(n+1). Structurally terminating definitions supply successor, predecessor, negation, repeated steps, addition and subtraction.

The external producer builds proofs from the existing kernel's general rules: datatype induction, definitional computation, congruence, reflexivity, symmetry, transitivity and checked theorem application. There is no ring axiom or aggregate proof instruction. Inverse laws prove cancellation; reusable commutativity/associativity proofs establish finite-sum decomposition around an arbitrary row. Sum insertion, replacement and removal then reuse those lemmas. Every equality is universally quantified over its declared datatype parameters; sampling is not its justification.

The compiler SHA-256 remains `e5a175c282b1f0e619bf5f1b6e48b844eb81e25c26b367ce6b2854501d193bbb`, the same binary used for the preceding arithmetic benchmark. The producer verifies each new root immediately. A fresh deterministic replay regenerated the exact same 35 names, identities and object bytes. Explicit direct imports are enforced even when a type/theorem exists in a checked transitive closure.

## Validation and checking cost

- The complete Rust suite passes 57 tests; its terminal output is preserved in `tests.log`.
- New model evaluation checks 1,323 signed integer/repeated-step results against independent `num_bigint::BigInt` calculations, including both crossings of zero. The fixtures are bounded (-10..10 and 0..8 repeated steps); the theorem proofs themselves are not bounded to these values.
- 225 prefix/suffix/old/new fixtures exercise insertion, replacement and removal equations, including empty lists, duplicates and negative values. Model sums also agree with independent BigInt folds.
- A content-rehashed false theorem is rejected by proof checking. Removing an explicitly used associativity theorem from direct imports also fails. A hidden datatype dependency cannot be silently used as a direct import.
- The complete 35-object package imports in **6.09 ms median** over seven fresh processes with a warm filesystem on the Apple M4 Pro. These wall times include startup, loading, dependency/type/termination checking and all proofs. Raw samples and source hashes are in `verification.json`. This is checking cost, not application execution performance.

## Boundary and next work

No compiler core source changed for these definitions/theorems. The unary constructors are a mathematical model held in the database; the runtime continues to use BigInt. Evaluating huge concrete unary values is constrained by the kernel's traversal/depth budgets, while universal induction avoids enumeration.

Source correspondence remains unfinished. A checked import must establish that these exact definitions model source Int operations and that actual row-local table updates correspond to the finite-list changes proved here. It must validate the precise candidate update expressions and scope. Whole transaction/representation refinement additionally needs abort, errors, tentative queries, versions, ordered events and all future changes. The current legacy polynomial/schema paths remain present; these new proofs alone do not remove their authority.

The Rust kernel and its definitional interpreter remain trusted implementations. There is no end-to-end compiler/runtime verification claim, new C/C++/Rust speed claim or claim that the full language is complete.

```sh
python3 tools/integer_proofs.py build/exact-integers-replay
target/release/ink verify-library knowledge/exact-integers/lock.json
python3 dev.py test
```
