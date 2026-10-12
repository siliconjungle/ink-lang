# Contract knowledge generality

This work implements the requested improvements across Ink's semantic core,
knowledge database, and planner. It starts from distribution e61ae630 and its
exact independent package pins. Existing checkouts are untouched.

## Required outcomes

1. Propagate checked preconditions and postconditions through pure calls, lexical
   bindings, and branch scopes. Export actual site facts for external search;
   recheck them locally. Never carry state facts through an unproved mutation.
2. Make source invariants useful for source-bound action refinement and physical
   representation admission. Check the valid logical domain, initialisation,
   future transitions, nested invocation, restore, and migration boundaries.
3. Discover contract witnesses generally: equalities, alternatives, inequalities,
   multiset observations, pure and stateful bodies, named/database algorithms.
   General source/proof machinery grants authority, never a recipe name.
4. Author and publish reusable conditional, cardinality, collection/permutation,
   invariant, and composition laws. Retain exact dependencies and assumption
   discharge. Demonstrate meaningful changes to algorithms and layouts.
5. Validate adversarial rejection, core-only builds, independent package tests,
   complete CPU targets, eligible actual GPU work, independent Lean-supported
   proofs, and end-to-end discovery/replay. Measure separately from correctness.
6. Update source documentation and evidence, publish changed independent packages,
   integrate exact pins, and publish verified distribution main as AGENTS.md asks.

## Progress

- [x] Inspect current code and exact dependency pins.
- [x] Create an isolated distribution worktree and initialise exact submodules.
- [x] Scoped facts and contract composition.
- [x] Invariant-aware refinement and representations.
- [x] General witness discovery and algorithm proposals.
- [x] Reusable proof library and canonical publication.
- [ ] Cross-target, adversarial, discovery/replay, and performance evidence.
- [ ] Documentation, package integration, and publication.

Committed-state invariants need not hold during a transaction. Optimisation may
use one only at a boundary where it is established, or with a checked proof for
the exact intermediate state. Loose contracts preserve every stated observation;
numeric approximation is not implicitly authorised.

## Implemented evidence

- Scoped preconditions, conjunction/branch facts, checked pure postconditions,
  hygienic bindings and action-call composition; IEEE equality does not erase bits.
- Valid-domain representation admission, original logical guards before encoding,
  exact observations and preservation; nested temporary invariant violations remain visible.
- 71 checked algebra/multiplicity/multiset laws and 24 instantiation templates.
- Independent Lean checks of 71 concrete laws; generic potentially floating identity
  and first-order state obligations retain their separate admitted domains.
- Unique-state queries become constant. Sorted-state queries skip repeated sorting
  and read minimum directly, using literal word-sort source correspondence.
- Complete CPU/Wasm comparisons for loose witnesses and both invariant examples.
- Current focused knowledge and planner suites, standalone Rust/JS packages and
  core-only checks pass. Full mandatory target gate and final publication pending.
