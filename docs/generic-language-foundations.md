# Generic language foundations

This implementation adds bounded surface elaboration and fixed value semantics.
It does not give optimisations new authority. Algorithms and rewrite laws live in
`ink-knowledge`; every selected law is checked against the elaborated program.
Target packages emit that checked program literally.

## Ordinary values and syntax

Pure functions now use `Int` arithmetic/conversion, checked word arithmetic,
`Unit`, `String`, enum constants, `Some`/`None`, `Ok`/`Err`, structural equality,
Option/Result maps and `ok_or`. Pure and action conditionals are lazy.
`!condition` means Boolean negation. `~word` means word complement.
List literals evaluate left to right; `[]` requires an expected `List<T>`.

```ink
fn next(x:Int)->Int { return x*x+1; }
fn values()->List<u32> { return [1,2,3]; }
fn selected(c:Bool,x:u32)->u32 { return if c {x+1} else {x}; }
fn increment(x:Result<u32,u32>)->Result<u32,u32> {
    let value:u32=x?;
    return Ok(value+1);
}
```

Pure `?` is supported in a let initializer. Nested propagation in arbitrary pure
expressions remains unsupported. In actions, the existing propagation rules still
apply: an aborted change rolls back writes and staged events. A pure `Err` is a
value. `count` infers exact `Int`; an explicitly expected `u64` remains supported.

Statement `if`, early returns and lexical shadowing work in pure functions.
Branch locals do not leak. Action local shadowing invalidates old presence facts;
state capabilities and import namespaces cannot be shadowed. Expression bindings
inside actions use resolved lexical slots, not a reconstructed evaluator.

## Word operations

`u32`, `u64` and `i32` support `&`, `|`, `^`, `~`, `wrapping_shl`,
`wrapping_shr`, `rotate_left` and `rotate_right`. Shift counts are `u32`, reduced
modulo word width. Signed right shift is arithmetic; rotations operate on bits.
Division and remainder retain total `quot_or` and `rem_or` fallback semantics.

`knowledge/libraries/integers.ink` provides generic `checked_div<T>` and
`checked_rem<T>` returning `Result<T,DivisionError>`. Zero divisors and signed
minimum/-1 overflow are separate errors. These are ordinary definitions using
quotient/remainder identity checks, with no compiler algorithm dispatch.
Unchecked `/` and `%` syntax is not admitted without a safety contract.

## Type and constant parameters

```ink
type Sequence<T> = List<T>;
record Pair<A,B> { left:A, right:B, }
fn identity<T>(x:T)->T { return x; }
fn size<T,const N:u32>(xs:Array<T,N>)->u32 { return N; }
```

Applications require explicit arguments: `identity<u32>(7)`, `Pair<u32,Bool>`.
Aliases are transparent. Type parameters cannot receive constants, and constant
parameters require literal `u32` values or another in-scope constant parameter.
Imports link templates before elaboration. Instantiated bodies receive the normal
value, effect, ownership and termination checks. Unused templates are not
abstractly typechecked; there is no generic trait or dictionary system.

Templates disappear before executable core encoding. Instances have deterministic
names. Work, depth and instance budgets reject recursive aliases, expanding
applications and resource amplification. The checker does not trust a template
merely because its library is pinned.

## Payload enums and matching

```ink
enum Message<T> { Empty, Value(T), Pair(T,T), }
fn total(x:Message<u32>)->u32 {
    return match x {
        Message.Empty => 0,
        Message.Value(v) => v,
        Message.Pair(a,b) => a+b,
    };
}
fn example()->u32 { return total(Message<u32>.Pair(3,4)); }
```

Matching is exhaustive, rejects duplicate arms and checks every payload binder.
It also supports existing fieldless enums, `Bool`, `Option` and `Result`.
Each payload enum is a nominal outer record containing a nested sum of nominal
payload records. This uses existing record and Result machinery, with no new
privileged datatype or optimisation rule. Its portable JSON is the corresponding
`payload` record with nested `Ok`/`Err` values and `item0`, `item1` payload fields;
it is not a new variant-labelled transport format.

Result/Option `fold` selects exactly one typed branch callback. Actions can read
state in these callbacks, but cannot write or emit from a callback. Effect analysis
accounts for both possible branches. Recursive payload datatypes and structural
recursion over them remain outside this bounded record encoding.

## Local mutation and finite iteration

```ink
fn total(xs:List<u32>)->u32 {
    var accumulated:u32=0;
    for item in xs { accumulated=accumulated+item; }
    return accumulated;
}
fn bounded(n:u32)->u32 {
    var x:u32=0;
    while x<n limit 4 { x=x+1; }
    return x;
}
```

`var` requires an explicit type. Assignment elaborates to a new lexical binding;
only mutable locals can be assigned. Pure list loops preserve input order.
Literal `start..end` ranges are half-open, use `u32`, and allow at most 65,536
steps; reversed ranges are empty. Bounded `while` tests its condition before each
step and executes at most its literal limit. Reaching the limit continues with
its current state even if the condition remains true; it is not a termination
claim or an error. Limit zero never executes a step.

Loops carry at most 16 visible mutable locals in a generated record. Buffers and
maps retain affine checking. Loop bodies cannot return or emit. Effectful action
loops remain unsupported; actions can call a pure finite helper.

`foldl` and `foldr` accept independent item and accumulator types, including owned
accumulator state. Their callback order is `fn(item)=>fn(accumulated)=>body`;
`foldl` traverses forward and `foldr` backward. Self recursion also accepts a
lexicographic product of guarded unsigned/list measures in declaration order.
An earlier component must be unchanged or strictly decrease before a later
component can reset. Shadowing cannot reuse a descent fact. Mutual recursion and
arbitrary unproved measures remain rejected.

## Fixed arrays and callbacks

`Array<T,N>` has a static, immutable shape of 0..64 elements, encoded as a checked
record. `array<u32,3>([1,2,3])` checks shape during elaboration. Arrays provide
`len()`, `values()`, `at_or(index,fallback)` and `with(index,value)`; an out-of-range
`with` preserves the original array. Temporary owned storage cannot be an array
element. Physical layout alternatives require ordinary database evidence.

Pure unary function parameters use `fn(T)->U`. A call supplies a literal lambda
or a named pure function. Bounded hygienic specialisation emits ordinary checked
bindings and callbacks; there is no runtime function carrier or indirect call.
Immutable captures are supported. Captured temporary owners, effectful callbacks,
escaping closures and functions returning callable values are rejected.

## External collection libraries and laws

`knowledge/libraries/collections.ink` contains reusable stable sets, map/filter,
reduction, grouping and equijoins. Its `Set<T>` is a library alias for a list, not
an opaque invariant-bearing source type. Set constructors/operations normalise
arbitrary inputs and retain first appearance order. Group order follows the first
appearance of keys; rows retain input order. Joins are left-major then right-major
and preserve the full Cartesian product for duplicate keys. Group keys use the
existing owned-map key contract. These are baseline algorithms, not performance
claims: the set implementation and nested-loop join can be quadratic.

The external finite-list producer publishes 247 ordinary laws for length, count,
lookup and first-nonzero right folds. Proofs use the existing general checker.
Planner selection is replayed locally; corrupted and rehashed false laws reject.
The JavaScript compiler's first-nonzero fold shortcut has been removed.

## Fallible contracts and external theorem authoring

Contracts use ordinary `Result` values and explicit error expressions:

```ink
fn bounded(x:u32)->Result<u32,Error>
    requires(x>0,Error.Input)
    ensures(reply=>reply.fold(fn(v)=>v<10,fn(e)=>true),Error.Output)
    { return Ok(x+1); }
```

Requirements run before the body. Postconditions run after each normal return,
against the complete returned value, including `Err`. Each runs in declaration
order and stops at the first failure. A result is evaluated once. Postconditions
refer to the original declaration parameters even when a body shadows a name.
Contract expressions can read permitted state in actions, but cannot write or
emit. Failed change contracts use ordinary transaction abortion and rollback.
Functions and actions must declare a compatible `Result`; errors and predicates
receive normal type checking. At most 16 clauses are allowed, subject to existing
core depth/work limits. These are explicit runtime validations, not static
refinement types or facts the compiler can silently assume.

External files can author executable laws using the existing `rewrite` form:

```ink
module external;
rewrite cancel(x:Int,y:Int) {
    from (x-y)+y;
    to x;
    proof by normalize;
}
```

`ink emit-laws THEOREMS.ink -o BUNDLE.json` checks the complete proof and emits
canonical entries. `proof by provided` requires `--proofs EVIDENCE.json`, a map
from declaration labels to existing kernel `proof` and `conditions` fields.
`--view DEPENDENCIES.json` imports an authenticated dependency closure. The tool
supports 1..64 laws and standalone pure helper definitions; source imports and
recursive definition contexts remain unsupported. Exact helper meanings are
captured and checked through the ordinary definition-context contract.

`knowledge/producers/source_laws.py` publishes those entries into a snapshot.
Executable application admission continues to reject inline rewrites. A filename,
label, tactic spelling or database membership grants no rewrite authority.
`knowledge/libraries/value-laws.ink` publishes exact-integer cancellation,
doubling and difference-of-squares laws. One bounded polynomial checker handles
exact coefficients and fixed-width modular coefficients. It bounds degree, term
count, coefficient bits and limb work. Exact `Int` arithmetic, conversion, sum
and count have source correspondence; unsupported domains still fail closed.

## Versions, coverage and limits

New fixed value meanings bind executable-core V8 when needed. New action expression
bindings and sum elimination bind typed-actions V3. Existing domains retain their
older markers where their meanings are unchanged. Re-admission derives the marker
from the checked program and rejects downgrades. No proof variant was added.
Fixed primitive meanings/correspondence and the trusted checker implementations
have expanded; this does not establish a verified compiler.

Mandatory foundation and external-library conformance runs compare reference,
C, Rust, JavaScript, C-Wasm and Rust-Wasm. Native GPU-host execution also checks
compiled fallback. Unrestricted GPU coverage still has explicit gaps, and the
all-GPU audit must fail them. Conformance is not a proof of native emission.

This foundation does not implement compact `u8`/`u16`, `i64`, `f64`, packed Bytes,
new scoped borrowing syntax or static refinement types.
Compact carriers and additional borrowing need their own value/ownership, wire
and correspondence contracts. Existing owned buffers already support scoped
exclusive splitting; read traversals retain current borrowing machinery. Arbitrary
partial functions, effectful escaping closures and dependent proof values remain
outside the total fragment. No claim is made that the full design draft is closed.
