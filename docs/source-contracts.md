# Source specifications, invariants and implementation refinement

Ink can describe the behavior an implementation must preserve independently of
its algorithm. These declarations create proof obligations. They are never
trusted assumptions supplied by the programmer or by a database entry.

```ink
spec fn copy(xs:List<u32>)->List<u32>
  ensures result == xs;
implementation mapped for copy { return xs.map(fn(x)=>x+0); }
implementation direct for copy { return xs; }
```

The first implementation supplies the initial body of `copy`. Both named
implementations remain callable and both must satisfy every clause. A database
selection can replace the specification's body after proving the complete
resulting module. Ordinary functions retain their exact meaning.

## Clauses and state

```ink
private state Current:u64=0;
invariant Current == 0;
spec change reset(n:u64)->Unit reads(Current) writes(Current)
  requires n == 0;
  ensures Current == n;
  ensures before(Current) == 0;
implementation store for reset { Current=n; return (); }
```

- `spec fn`, `spec query` and `spec change` declare parameters, result type and,
  for actions, the existing read/write/event capabilities. At least one
  `ensures` clause and one implementation are required. Write the specification
  before its implementations.
- `requires predicate;` is a static precondition. Source callers must prove it.
  Public checked value/JSON hosts validate it before execution and reject false
  preconditions with `contract precondition failed`. Existing caller-trusted
  native typed/packed ABIs retain their input-contract responsibility.
- `ensures predicate;` is a postcondition. `result` denotes the returned value;
  action state references observe the resulting committed state. Clauses apply
  to returned `Err` values too, with the original rolled-back state. Host failure
  is handled by the existing transaction rollback contract.
- `before(expression)` in an action postcondition observes the action's input
  state and original arguments. It cannot use `result`, another `before`, or
  capture a mutable Table/Buffer handle. Read a value such as table membership,
  a row, or a value-state list instead.
- `invariant predicate;` must hold initially and after every public action,
  including ordinary changes and named implementations. Temporary intermediate
  states within a change need not satisfy it. Portable and JSON snapshot ingress
  validates invariants before publishing the restored instance.
- `private state` blocks access to that root from importing source modules.
  Privacy is a source interface property, not snapshot encryption. Immutable
  value state (including records and lists) has transactional assignment syntax;
  it elaborates to a single-key table with the declared initial value.
- A change returning a non-`Result` type commits on normal return, including
  `None`, `false` and `Unit`. A `Result` change commits on `Ok` and rolls back on
  `Err`. Nested changes, events and commit-version exhaustion keep the existing
  transaction rules. A non-`Result` change cannot propagate an abort.

Generic specifications and nonescaping pure callbacks specialize into ordinary
checked clauses, just like existing generic functions. Fallible runtime
`requires(predicate,error)` and `ensures(result=>predicate,error)` remain runtime
validations with their original lazy evaluation and explicit errors.

## Exact collection observations

`multiset(xs)` describes the finite bag of list elements. Within a bag equality
or inequality, `singleton(x)` adds one occurrence and `+` adds multiplicities:

```ink
multiset(after) == multiset(before) + singleton(item)
```

`unique(xs)`, `unique_ids(records)` and `unique_by(xs,fn(x)=>key)` return Boolean
predicates. The last two apply uniqueness to the `.id` field or explicit key.
These are ordinary exact list computations available in executable code and law
statements. Each bag input is evaluated once; counts use arbitrary-size `Int`.
Element identity is structural, including raw floating-point bits: positive and
negative zero differ; identical NaN bit patterns count as the same element.
Scalar `f32 ==` still has IEEE numeric equality, including nonreflexive NaN.

These observations grant exactly the flexibility stated in a contract. A bag
postcondition can permit a different order while preserving multiplicities.
Every other clause still applies.
[The state example](../examples/state-contracts.ink) combines a private list,
a unique-ID invariant, guarded replacement and multiset queries. A specification deliberately leaves behavior
unconstrained where no clause restricts it; `emits` restricts event channels,
not the exact event history. Current postconditions observe returned values and
state. Preserve an exact event history through the existing whole-action equality
proof route when it is part of the required behavior. Unique IDs can justify an optimisation only
when an ordinary proof connects uniqueness to that transformation.

## Proofs and the independent database

```sh
ink emit-contract-obligations examples/source-contracts.ink -o obligations.json
PYTHONPATH=knowledge python3 -m producers.contract_proofs \
  examples/source-contracts.ink build/contracts --compiler target/debug/ink
ink check-contracts examples/source-contracts.ink \
  --contract-proofs build/contracts/evidence.json
ink build examples/source-contracts.ink --target javascript \
  --contract-proofs build/contracts/evidence.json -o build/contracts-js
```

The exporter derives obligations from the actual typed bodies. Pure obligations
use the semantic equality kernel. State obligations use the fixed action
transition projection and the first-order inductive kernel, including original
and resulting state, rollback and observations. Evidence binds the exact module
and `ink-contracts-v1` semantics. New modules use executable-core V10; modules
without the new features retain their existing identities.

The knowledge producer proposes normalization, hypothesis, constructor-case and
induction proofs and replays them through `check-contract-proof-stream`. Its
`--export-obligations FILE.json` option exports goals from the same immutable
context before the ready frame. This avoids deriving the goals again in a
separate export process; derivation order, exact source identity, definition
context and state obligations are preserved. Editing that exported file cannot
alter the checker's goals. Every proposed proof and dependency bundle still
replays independently, and final module or refinement admission remains required.
The single-request `check-contract-proof` endpoint remains available.
Alpha-equivalent generated
traversals are connected by ordinary induction theorems; their names never
stand in for a proof. Accepted pure
laws and state theorems are canonical database objects with explicit dependency
closures. Their hashes and names confer no authority. Automatic proof search is
bounded and incomplete; an unsuccessful search requires another ordinary proof,
not an unchecked annotation. State predicates are limited to observations the
existing action projection can represent; unsupported observations fail closed.

The optimisation producer currently proposes pure-function witnesses of
`ensures result == expression`:

```sh
PYTHONPATH=knowledge python3 -m producers.contract_candidates \
  examples/contract-optimisations.ink build/contract-candidates \
  --compiler target/debug/ink
```

The examples eliminate a zero-valued scan, an identity map, a redundant sort
under a sortedness precondition, and a repeated uniqueness scan under a unique-ID
precondition. Public validation remains in measured calls; internally established
facts do not require a second scan. The source library `knowledge/libraries/contract-laws.ink` also publishes bag
multiplicity and conditional laws under `contract-laws/` database names.
These are reusable checked laws, including
`contracts.unique-id-check-erasure`, rather than compiler-recognized patterns.

A candidate embeds replacement bodies plus checked contract evidence in the
normal implementation database protocol. The `contract-witnesses` recipe makes
these proposals discoverable by the planner. Refinement accepts both pure expression bodies and action statement bodies and
rechecks all named implementations, callers and invariants of the selected module.
Automatic candidate discovery currently searches the pure-function witness form;
action candidates require explicitly supplied bodies and ordinary state evidence. This permits
behavioral refinement without pretending that two allowed outputs are exactly
equal. Layout changes still use the separate representation/codec proof system.

Pure law contexts contain only definitions actually used by the law, so primitive
collection laws can transfer to other modules without new helper certificates.
Correctness evidence and profitability observations remain separate: absent
comparable measurements, the planner retains the baseline.

## Targets and trust

C, Rust, JavaScript, C-Wasm and Rust-Wasm use the same admitted core and literal
lowering. JavaScript destination-buffer calls also check public preconditions.
GPU hosts execute stateful contracts on the host. Eligible unguarded pure
computations still dispatch; compute pipelines requiring public precondition
checks currently use the CPU host, and `gpu-required` reports that limitation.
Low-level caller-trusted packed calls are not validation boundaries.

The mandatory `source_contracts` suite checks replies, rejected calls, events,
rollback, exact snapshots, forged-but-checksummed invariant violations and
selected alternatives across complete CPU targets. Kernel and module tests check
false proofs, stale evidence, metadata tampering, generic clauses, float equality
and private imports. Tests establish conformance evidence, not a proof of backend
or driver correctness. Benchmarks report whole-call timings separately from
proof checking, compilation and setup.

The [implementation and validation report](../reports/source-contracts-2026-10-12/README.md)
records canonical proof identities, cross-target receipts and complete-call
measurements for the four optimisation examples.
