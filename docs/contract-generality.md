# Contracts as implementation knowledge

Ink now exports scoped source facts, uses actual invariants to admit physical
representations, and searches for implementations of loose specifications.
These are general checking mechanisms. Producers, algorithms and the 71 new
laws live in the independently pinned knowledge database.

## Facts and composition

`emit-subject` includes `contexts`, indexed by function or action region. Each
site describes its exact child path, fresh parameter environment and equations.
Function `requires`, conjunction components, branch conditions, lexical bindings
and checked pure-call `ensures` can discharge an ordinary database law's premises.
Admission derives the facts again from the actual module; editing a description
cannot grant a fact. A call's postconditions require its real preconditions.
Callback parameters never inherit a lexical let's argument accidentally.

Immutable pure results also carry their aliases and checked postconditions into
action call obligations. State reads and action results are deliberately excluded
from persistent lexical facts. Rebinding removes affected facts, and a binding
that shadows a name used in its initializer is handled conservatively.

These facts do not invent a postcondition proof for a changed helper. Whole-module
checking still verifies every clause and caller after each proposed refinement.

## Valid logical domains

`ink-source-representation-v2` opts into the exact source's invariant domain.
Its `source_domain` flag is bound to the canonical representation entry and
interface. Initialisation, observation, preservation, snapshots and migration
receive constraints derived from the checked source. Action preconditions are
available only for that action's valid boundary inputs. v1 remains the domain
that proves its equations without these additional assumptions.

Restore runs the original logical invariant predicates before calling the
physical encoder. An invariant-based physical query cannot validate its own
assumption. Correctly checksummed invalid logical snapshots are rejected, even
when the selected invariant query is constant. Portable migration retains the
same ingress check and exact logical observations.

Committed invariants need not hold inside a transaction. The example
`invariant-algorithms.ink` temporarily stores duplicates; a nested query observes
`false`, then the action clears the list before committing. The complete source
transition, including nested calls, remains the representation obligation.
Only an outer query on valid committed state becomes constant.

## Loose specifications and bounded search

`producers.contract_candidates` searches result equalities, disjunctive
alternatives, inequality boundaries, typed parameters, literals, named bodies and
type-matching calls to ordinary source functions. Every candidate is checked
against every clause, caller and invariant. Defaults bound search to 32 proposals
per specification and 256 overall; the report records attempts and rejections.
This is bounded witness search, not a complete synthesis decision procedure.

`contract-looseness.ink` demonstrates both acceptable scalar results, an exact
integer bound, a stateful alternative, and eliminating sorting when only list
multiplicities are specified. A sorted-output clause would prohibit that change.
No numerical approximation follows from a multiset contract; float identity
continues to preserve raw bits.

## Proof bank

`knowledge/libraries/contract-algebra.ink` contains 59 laws covering conditional
choices, conjunctions, known callbacks, cardinalities, maps/filters, exact integer
bounds, sorted inputs and observations. Its proof companion supplies ordinary
certificates for declarations marked `provided`.

The multiplicity producer supplies nine universal laws: insertion, sorting and
the whole multiplicity-observer function for u32, u64 and i32. Three composed
laws establish the complete lowered multiset sorting observation. Twenty-four
templates instantiate general source laws for actual program types. Template
membership is authoring data; the concrete proof is replayed before use.

The core adds named function extensionality (`Forall`) and bounded propagation of
equations through premises. Extensionality introduces one fresh typed variable
and checks equality of the applied lambda bodies. It supplies no assumption.
The normalizer retains original premises while deriving consequences. Word
structural equality agrees with word scalar equality; IEEE float equality does
not acquire that rule. Boolean neutral values reduce under the same pure value
semantics. There is no privileged sorting or invariant theorem recognizer.

Binder-aware observation search builds congruence/extensionality certificates
under nested callbacks. Every conversion and law application remains untrusted
until the entire source-bound obligation checks. Canonical immutable closures
retain dependencies and source definition contexts. Published recipes discover
valid-domain layouts and invariant-based query simplifications without adding a
planner algorithm dispatch table.

## Acting on it

From a checked distribution checkout, with its pinned Python packages available:

```sh
python3 -m producers.contract_candidates examples/contract-looseness.ink \
  build/loose-candidates --compiler target/debug/ink

python3 -m producers.contract_proofs examples/invariant-algorithms.ink \
  build/invariant-proofs --compiler target/debug/ink
target/debug/ink emit-action-model examples/invariant-algorithms.ink \
  --contract-proofs build/invariant-proofs/evidence.json -o build/model.json
python3 -m producers.invariant_representations build/model.json \
  --compiler target/debug/ink -o build/invariant-candidates.json
```

Extract a request from `requests`, then use `check-representation` and
`emit-representation` with the original source and its contract evidence.
The automatic planner discovers the same families from its pinned recipe
registry. Correctness permits a candidate; measured comparable lifecycle
evidence determines whether to prefer it.

For source-law authoring and publication from the knowledge checkout:

```sh
python3 -m producers.contract_algebra --compiler /absolute/path/to/ink \
  --output-store /absolute/path/to/knowledge
```

Publication replays source, multiplicity and complete observation proofs. It
refreshes the disposable index before further search; scanning the full
canonical publication repeatedly is unnecessary authoring work.

## Evidence and limits

Core adversarial tests reject unguarded use, false preconditions, capture and
false function equalities. Distribution tests replay loose witnesses and compare
complete compiled values, errors, snapshots and outboxes. Invariant tests cover
nested intermediate state, invalid preconditions, checksummed invalid restores,
and standalone CPU/Wasm/GPU-host emission. Real eligible GPU dispatch is checked
by the mandatory feature-parity gate; recursive state proofs execute on hosts.

Independent Lean evidence covers the explicitly translated domain. First-order
state proofs and generic structural identity that may contain floats are not
silently translated. Tests and a second proof kernel do not establish universal
backend correctness.

`tools/bench_contract_generality.mjs` measures complete bound queries, creation,
replacement, checkpoint and restore separately on emitted baseline and optimised
JavaScript modules. The saved evidence includes checked emission time. A cheaper
query leaves the original ingress and write validations intact; the query timings
alone do not establish whole-workload profitability.
