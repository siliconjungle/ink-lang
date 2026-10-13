# Checked value invariants: implementation foundation

Immutable nominal records can carry predicates that every checked value of that
type must satisfy. The predicate is ordinary Ink computation, not a recognized
collection kind or a trusted annotation.

```ink
refined record Indexed { items:List<u32>, index:u32, }
 invariant value.index<length(value.items);

fn lookup(value:Indexed,fallback:u32)->u32 {
 return value.items.at_or(value.index,fallback);
}
```

The surface elaborator derives construction, input and output obligations from
the actual record declarations and signatures. Construction uses an authenticated
ordinary constructor and must establish its predicate. Field arguments retain
their original evaluation order, including action calls and staged events.
Derived contracts do not turn an exact ordinary function into a loosely specified
implementation interface. Explicit `spec` declarations retain that role.

Generic declarations specialize hygienically. Nested immutable records, lists,
Option and Result values participate in validation; an outer tag or typed element
descriptor does not grant an element's invariant. List validators traverse without
allocating an intermediate invalid-element list. Their input is raw: they never
assume the very invariant they validate. Core admission reconstructs the exact
constructor, validator, inferred contracts and state guards and rejects altered
metadata or raw construction outside those authenticated bodies.

Checked public value/JSON entry points validate the predicates. Checked internal
calls discharge the same requirements statically. Existing caller-trusted native
typed/packed entry points keep their input-contract responsibility. Portable
snapshot ingress validates the logical predicates, including snapshots with a
valid checksum but invalid contents. The mechanism binds executable-core V11;
modules without value invariants retain their previous semantic version.

## One guarantee, multiple consumers

The predicate in the example reaches both scoped semantic-law application and
source-bound physical bounds obligations. The latter do not accept a predicate
name as permission: the database supplies a RUP certificate for the actual read
under the exact input premises. `core/tests/fixtures/invariant-indexed.plan.json`
admits `lookup` and declines `other`, whose unrelated index has no such guarantee.
Rehashing the certificate for the other read fails checking.

`knowledge/libraries/invariant-values.ink` supplies unique collections, sorted
words, bounded indices and indices tied to immutable sequences. The established
facts producer turns exported checked equations into ordinary conditional laws.
Each law retains its exact premise, lexical parameters and only reachable source
definitions and schemas; unrelated declarations do not enlarge its context.

State preservation uses ordinary first-order induction and scalar certificates.
The contract producer can strengthen a residual recursive-helper proposition
inside a separate conditional theorem. Its guard retains the dependent validity
condition, while fixed premises are independent of the induction variable. The
producer may propose that theorem; core replay establishes it. No original-state
validity premise is silently reused for a different recursive tail.

## Current evidence and remaining scope

The frozen value-state proof packet contains one pure obligation and eleven state
obligations. Standalone core replay covers commits, abort rollback, invalid input
and invalid checksummed restoration. Distribution tests compare complete replies,
events and snapshots across the ordinary CPU/Wasm hosts and GPU host execution.
The indexed-read plan has a separate native/Rust-Wasm conformance test. Selected
physical-read capabilities remain explicitly unsupported on the other emitters.
Test invocation receipts are recorded in `docs/general-machinery-plan.md`.

This is the invariant foundation, not the completed abstract-interface request.
Record fields remain visible. Representation opacity, interchangeable abstract
implementations and checked owner interfaces still need implementation. Recursive
values containing refinements also need general recursive validator/termination
machinery; invariant-bearing temporary owners currently reject. External input
validation can be expensive (for example, checking the sorted-word predicate
executes sorting). No whole-workload speedup is claimed from proof replay or
conformance. The full storage, termination, local relation, fact transport and
incremental-maintenance requirements remain in the implementation programme.
