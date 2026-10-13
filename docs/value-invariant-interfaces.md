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

Collection observation syntax resolves in its declaring module before import
graphs and templates are combined. An importer's same-named function cannot
replace the library's invariant predicate. Callback parameters retain their
lexical binding even when a module declares a helper with the same name.

## Abstract record interfaces

`abstract record` hides construction and fields outside the declaring module.
It composes with a value predicate:

```ink
module checked_sequences;
abstract refined record Indexed { items:List<u32>, index:u32, }
 invariant value.index<length(value.items);
fn lookup(value:Indexed,fallback:u32)->u32 {
 return value.items.at_or(value.index,fallback);
}
```

Importers can pass and return this type and call its public operations. Direct
construction or field access rejects, including through type aliases, nested
records, callback bodies, state expressions and contract predicates. Generic
instances retain their declaring module. Callback specialisation preserves both
the library's permitted accesses and the caller's restrictions; moving a lambda
into a library body does not change its origin. Generated source markers avoid
all modules' identifiers and are removed before executable encoding.

Opacity is checked during source assembly. The executable core still describes
the logical record and independently checks every mathematical invariant. Wire
descriptors and snapshots retain the logical schema; source opacity does not
conceal wire fields or authenticate a value merely because it came through an
interface. Public ingress still validates the predicate. Ordinary physical
representation admission remains necessary to change storage.

The existing four database interfaces now use abstract declarations. Their core
image is byte-identical to the preceding public-record version. This establishes
that this source visibility change adds no executable wrapper or runtime check;
it is not a timing claim about alternative algorithms or representations.

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

Equality normalization transports checked facts through typed alias chains,
including callback bindings and projections. An applied equation is removed
while normalizing its replacement, so cyclic or expanding premises cannot
reuse that equation indefinitely; existing proof work and depth limits remain.
No IEEE equality becomes a stronger float-bit equality through this transport.

Read-only action call obligations can use established invocation-boundary
invariants because their checked write footprint is empty. These premises are
separate global observations, so local names cannot reinterpret them. Mutating
actions receive no such state premise for intermediate calls, and keep
initialization cannot assume an invariant before establishing it. This is a
limited stable-state fact transport; general local mutation/frame reasoning
still requires implementation.

## Current evidence and remaining scope

The frozen value-state proof packet contains one pure obligation and eleven state
obligations. Standalone core replay covers commits, abort rollback, invalid input
and invalid checksummed restoration. Distribution tests compare complete replies,
events and snapshots across the ordinary CPU/Wasm hosts and GPU host execution.
The indexed-read plan has a separate native/Rust-Wasm conformance test. Selected
physical-read capabilities remain explicitly unsupported on the other emitters.
Test invocation receipts are recorded in `docs/general-machinery-plan.md`.

The imported abstract-interface fixture additionally carries nine pure and ten
state proofs, with eight pure objects and 55 objects in its first-order closure.
The ordinary database producer authors those proofs and the core replays them.
Long generated nominal names receive bounded descriptive constructor labels in
the action model; the kernel's binder limits are unchanged. Deliberately colliding
source labels cannot collapse the two fixture record sorts. Existing short labels
retain their previous encoding.

The final abstract/module/value integration suites pass on C, Rust, JavaScript,
both Wasm paths and the eligible wgpu host/device legs.

## Callback domains

Pure call obligations now retain the connection between a callback and the fixed
consumer that invokes it. `xs.map(fn(v)=>library.observe(v))` checks against the
actual elements of `xs`, rather than an unrelated arbitrary nominal value.
The checker reconstructs an ordinary Boolean proof goal: a right fold for list
map/filter, indexed map and zip domains, and the selected branch for Option or
Result. Zip checks the actual paired prefix, including unequal-length inputs.
Exact lambda applications substitute their actual argument without capture.
No element predicate follows merely from its nominal type.

Accumulator-dependent callbacks use the original fixed fold direction or bounded
loop semantics. A mathematical Option state carries the original accumulator or
permanent failure. Early-stop loops separately distinguish legitimate stopping
from failure; count zero never evaluates a stop callback. `fold_until` checks the
step on its stopping element, matching its existing fixed semantics. Local
branch premises become conditional predicates, with exact structural equality
for aliases, including raw float bits. These terms are proof obligations only;
they add no runtime validity wrapper or new executable primitive.

The imported composition fixture carries 19 independently replayed pure
obligations and 17 canonical objects. Two Result branches use ordinary exhaustive
variant proofs proposed by the database producer. Raw inputs still undergo their
independent validation, and unsupported inner callback domains retain the
stronger universal obligation. Action bodies now reuse this pure-expression obligation path. State reads outside
callbacks become explicitly typed observations, evaluated by proof-only readonly
queries. Table lookups and readonly action calls retain their original value
meaning; the latter's preconditions remain separate obligations. State invariants
are still supplied only to source actions with an empty write footprint. Captured
immutable input/result facts remain independent of later writes.

The action observation bridge uses ordinary pure-function correspondence instead
of adding callback primitives to the action language. It preserves the eager
fallback of action `unwrap_or` by binding that value before the variant fold;
requirements in the fallback cannot hide behind a `Some` branch. True branch
facts use the same checked assertion interpretation as contract clauses, including
compound guards and the exclusion of scalar IEEE equality from bit equality.
Pure variant constructors also have their existing fixed datatype correspondence
in the action model. None of these proof-only helpers enters executable code.

The standalone and imported abstract action fixtures each replay two pure and 25
state obligations. They exercise observations, commits, ordered events, rollback
and invalid inputs. State proof producers reassociate transitivity chains and
close deep branches as conditional helper theorems under their exact typed
parameters and premises. Every helper and use still replays; the kernel's proof
nesting and canonical-object limits remain unchanged. A 40-step unbalanced proof
rejects at the kernel depth limit, while the reassociated proof checks.

Dependent readonly query calls inside callbacks, conditional query observations,
ownership-bearing accumulators, general fold preservation proofs and direct
pure-loop expressions in actions still need further correspondence work. The
existing stronger obligations remain for unsupported paths; no validity premise
is granted from their nominal types.

This is not the completed abstract-interface request. Interchangeable abstract
implementations and checked owner interfaces still need implementation. Recursive
values containing refinements also need general recursive validator/termination
machinery; invariant-bearing temporary owners currently reject. External input
validation can be expensive (for example, checking the sorted-word predicate
executes sorting). No whole-workload speedup is claimed from proof replay or
conformance. The full storage, termination, local relation, fact transport and
incremental-maintenance requirements remain in the implementation programme.
