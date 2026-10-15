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

`abstract record` restricts construction and field access to the declaring module,
including after generic specialisation and callback inlining. It can carry a
checked predicate with `abstract refined record`. Callers use public operations;
wire input still needs ordinary validation. See [checked value interfaces](value-invariant-interfaces.md)
for source visibility, inferred guarantees and the remaining implementation scope.

## Record updates and callbacks

Record updates use `Pair<T>{..base,right:value}`. The base must be first and
appear once; override fields must be declared and distinct. A computed base is
evaluated once before overrides, which run in written order. A variable base
projects only retained fields, so an overridden affine field may already have
been consumed. Ordinary type and ownership checks reject duplicated owners or
a base of a different nominal type. Updates elaborate to existing typed lexical
bindings, field projections and record constructors; no new core operation or
optimisation authority is introduced.

Executable callbacks accept `fn(a,b)=>a+b` and signatures `fn(T,T)->T`, as do
external laws. They elaborate to existing curried lambdas. Callback templates
check every argument and the final result, preserve lexical capture and evaluate
arguments once in written order. Callback values remain nonescaping, with no
runtime closure carrier; higher-order inputs and callable values inside returned
collections remain unsupported. Template callback arity is bounded at sixteen.

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
accounts for both possible branches. Payload enums may contain recursive values through guarded nominal fields,
including Lists; the JSON knowledge library uses this ordinary encoding.
General structural self-recursion over payload enums remains unsupported;
list/word measures and explicitly bounded traversals retain their existing checks.

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

External files author laws in Ink's one law form, `law`, which adds type
parameters, function parameters, conditions, quantified assumptions and proof
tactics (see [laws in source](laws-in-source.md)). The concrete `rewrite` form
remains its special case:

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
and correspondence contracts. Existing owned buffers support scoped exclusive
splitting; native and JavaScript
partitions now share bounded disjoint ranges. Splitting and rejoining adjacent
ranges does not copy elements. Growth detaches a partial range before writing
outside it; materialising a remaining range can still copy. Read traversals retain
current borrowing machinery. Opaque native handles use internal shared storage,
while typed owners retain direct vectors until partitioned. Emitted ownership
support lives in ink-native-support, independently of the reference evaluator.
Arbitrary
partial functions, effectful escaping closures and dependent proof values remain
outside the total fragment. No claim is made that the full design draft is closed.


## Read-only native callback and helper loans

Rust and Rust/Wasm can use admitted lexical read capabilities to borrow immutable
fold rows. The row and accumulator have independent ownership modes: a reference
is sufficient for field observations, while the accumulator remains owned. A
whole row passed or returned by value still becomes an owned copy. Nested
callbacks retain the loan without moving their outer captures.

The same capability can select private helper implementations with borrowed
immutable aggregate parameters. Public typed and wire entry points keep their
owning signatures. Lexical arguments rooted in immutable values can use these
helpers; computed arguments and projections out of affine owners retain owning
calls. Live loans prevent another argument from moving their immutable root.
Recursive helpers retain their original tail-loop interface. Parallel callbacks
have distinct generated task identities for the two implementations, while
bounds and column obligations retain the original source function identity.

These are literal access and ownership choices under the existing physical-plan
contract. There is no new source syntax, primitive or equality rule. The normal
knowledge recipes propose read capabilities and offline measurements choose among
replayed plans. Clone-count tests cover field observations, owned accumulators,
nested captures, whole-value escape, repeated arguments, computed arguments and
moving an affine owner after reading one of its fields. Mandatory CPU tests also
cover values, events, errors, rollback and portable snapshots.


## Final field ownership

General lexical final-use analysis tracks record paths independently. Literal
Rust and Rust/Wasm emission can transfer a final immutable field from its owned
record without cloning other fields. Later overlapping projections or whole
record reads prevent the transfer; callback captures retain sharing. Actual
borrowed parameters and pending call loans retain copying on value escape.
Permission to borrow an earlier observation does not itself keep a loan alive.
There is no new source syntax or database equality rule. Clone-count tests cover
checked read plans, disjoint vector transfers, repeated reads and captures;
mandatory CPU parity also covers errors, events, rollback and portable snapshots.


## Declared record values and proof discovery

The semantic kernel can now prove exhaustive reconstruction of a nonempty
record from the same stable lexical value, including nested field paths and
callback binders. It checks the declared field names, arity, nominal sort and
identical receivers. Swapping fields, changing a value or mixing roots does
not establish identity. This extends checking of the existing record meanings;
source transformations remain database proposals requiring independent replay.
There is no source syntax or wire-format change.

Discovery now records and rejects individually oversized proposals while
retaining unrelated proposals within the unchanged canonical limits. Discovery
still cannot certify a false equation. Semantic search also reuses exact JSON
bytes of immutable function bodies with bounded eviction, preserving candidate
identities. The large CRDT source consequently reaches actual kernel checks
within the same search budget; this is not itself a native performance claim.

The library's fold-product theorem shares traversal of arbitrary input elements
with two independent u64 accumulators, and the identical-guard theorems remove
redundant pure branch tests. Their negative variants fail kernel checking.
Polymorphic record applications inside law authoring remain a separate gap;
these component theorems do not establish the CRDT or interval-tree refinements.


Checked record-reconstruction replacements have been exercised across C, Rust,
JavaScript and both Wasm backends. Reference comparisons also cover events,
errors, rollback and exact portable snapshots. Selected runtimes use the existing
input-source layout binding through `Runtime::new_selected`; ordinary construction
from a different rewritten program intentionally has a different source identity.
This preserves the snapshot contract rather than ignoring header differences.


## Database field helper projection

The `frame-projection` recipe discovers small mutators whose returned record
changes one field and forwards the other fields unchanged. It creates an ordinary
source helper receiving the fields it uses, and rebuilds the caller's record
around that result. Exact source equality, including guard case proofs, is
required after conservative extension admission. No compiler feature recognises
a tree or CRDT. Computed owners, shadowed owners, unsupported callbacks and
observations of another affine field are outside this bounded producer family.

The recipe rejects a rehashed false conclusion, and checked source replacements
preserve C/Rust/JavaScript/both-Wasm values, events, error rollback and exact
original snapshots. Full CRDT-source helper proposals also replay independently.
Offline search measures eligible alternatives; the first helper-only acquisition
selected the previous physical plan, so conformance alone establishes no speedup.

## Source-derived scalar circuit proofs

The semantic law kernel accepts a `BitVector` proof with selected condition
indices and a hinted-RUP certificate. It validates typed endpoints, expands
ordinary source definitions, reconstructs the circuit, and replays every hint.
The existing circuit verifier supplies the trust boundary; no solver runs in the
compiler. Changing a conclusion or function body and recomputing hashes does not
establish equality.

Unsigned u32/u64 arithmetic, comparisons, bit operations, casts, wrapping shifts,
and Boolean conditions are supported. U32 calculations retain their 32-bit
wrapping semantics through explicit masks. Repeated scalar observations share an
input only when their complete typed terms agree; distinct observations are
unconstrained. Signed, floating and collection endpoints are rejected. Circuit
construction and replay share a separate 20-million-operation budget across a
complete catalogue check, alongside the existing semantic traversal budget.

`ink law-bitvector-obligation SOURCE LAW_NAME -o CNF.json` exports an **unproved**
obligation and its condition count. It grants no rewrite authority. The generic
`tools/source_bitvector_laws.py` searches for certificates externally and invokes
`emit-laws --proofs` for admission. Existing `proof by provided` syntax is used;
executable source syntax and executable-core meanings are unchanged. The Rust
semantic `Budget` struct now also carries the circuit work counter.

Nine checked scalar components cover source packing/extraction functions,
namespace separation, bounded increments, field observations, masked branch
elimination, wrapping shift counts and XOR cancellation. Their separate proof
store is `libraries/proofs/scalar-source-bits`. These functions and scalar laws
do not certify whole CRDT implementations or maintained sequence representations.
False conclusions, altered definitions, missing conditions, corrupted hints and
exhausted circuit budgets are rejected. A checked branch elimination preserves
all five CPU target values, events, rollback and exact original snapshots.

The registered `bit-guards` knowledge recipe now discovers constant guards in
ordinary source functions and callbacks. It opens surrounding binders as explicit
quantified parameters, proposes true/false scalar obligations, obtains external
RUP certificates and supplies source-bound replacement packages. No profile or
application name becomes a premise. Unknown guards and unsupported signed
conditions remain unchanged. Rehashed corrupted hints fail independent replay.

The general `semantic-bitvector-obligation SOURCE GOAL.json --core -o CNF.json`
command exports typed obligations from a checked executable core; it grants no
equality authority. The ordinary compiled planner discovers and selects this
recipe using comparable measurements on a u32 callback fixture. Its JavaScript
measurement adapter deliberately declines u64 JSON transfer; that fixture's
initial u64 measurement request was rejected and replaced with supported calls.
Direct and selected five-target conformance still cover unsigned scalar inputs,
callback fields, events, rollback and exact original snapshots.

The owned semantic model also accepts `Buffer.append` with another buffer of the
same element type. Its frozen meaning is ordered list concatenation, including
opaque buffer parameters. This is proof support for an existing primitive;
runtime syntax, serialization and primitive behavior are unchanged. Ordinary
database laws express append/decode consequences. The core rejects reversed,
dropped or mismatched input claims, and checked replacement passes all five CPU
targets with event, error, rollback and original-snapshot comparisons.

`tools/source_fold_observer.py` authors ordinary source-bound induction proofs for
two-argument state transitions. A nested record observation can preserve its
initial value or decode an owned buffer into a logical append fold. Transition
choice, field paths and the proposed equation are untrusted; normalization must
establish the base and step, and generalized induction fixes the immediate tail
as the recursive argument. Noncommuting transitions and freshly rehashed false
conclusions are rejected. The tool needs no new compiler primitive or proof rule.
Its checked U32 row-builder applications cover arbitrarily long input lists;
they do not establish complete container lookup/bounds or CRDT refinement. The
tool is not yet an automatically discovered planner recipe.

The further ordinary authoring tool `tools/source_fold_commutation.py` handles a
source decoder and physical/logical state transitions, including a changed state
type or decoder composition after each step. Its generalized induction still
requires source normalization to establish step commutation. Arbitrary decoder
names grant no assumptions. `tools/source_bitvector_goals.py` exports named typed
scalar goals over an existing checked core, binds imported definitions and
replays all conditions and RUP certificates before publishing. This needs no
external-law import syntax or new compiler rule. Imported-source overflow
controls fail without their conditions. Neither tool is a planner recipe yet.

`tools/source_field_preservation.py` authors source-bound field preservation
claims with bounded exhaustive Boolean cases. Untrusted beta reduction finds
guards; the existing source/Boolean checker must prove every branch. A field
changed on one branch or a rehashed false conclusion is rejected. The tool needs
no compiler rule and is not registered as a planner recipe yet.

Finite `for` and bounded `while` now carry only outer mutable locals referenced
or assigned by their hygienically renamed bodies. While conditions also contribute
references. Shared lexical free-variable analysis respects lambda/let shadowing;
assignment markers retain exact targets. Readonly owners remain in the carrier
when used across iterations, while unused or shadowed moved owners are excluded.
The 16-local carrier limit applies after this analysis. Existing syntax and fixed
IR/primitive meanings are unchanged; genuine uses after a move remain rejected.
Tests cover sequential owner phases, shadowed items/locals/callbacks, nested loops,
condition-only and assignment-only uses, and exact events/rollback/snapshots on
all five CPU targets. Full core and broader generic-library checks pass, including
real eligible GPU dispatch. New elaboration changes source image identities and
requires freshly checked planning rather than stale plan reuse.

Portable definition bodies also accept a flat postorder term tree. The fixed
decoder reconstructs the existing typed term; it rejects forward references,
cycles, reused children, unreachable nodes, more than 100,000 nodes and term depth
over 128. Inline bodies retain their original encoding and identities. Large
new contexts can use flat transport while retaining the canonical object-depth
and context-byte limits. Source correspondence still compares the reconstructed
body exactly; transport hashes grant no equality authority. Authoring and planner
prefilter support live outside core and remain untrusted.

Semantic validation uses an explicit postorder worklist, preserving binder scopes,
operator checks and the existing work/depth limits. This fixes a stack overflow
exposed by deep valid definitions during selection. Proof normalization exposes
function, beta and field heads before traversing unused pure arguments or
unobserved record fields; successive head reductions are iterative and retain
their depth/work accounting. Existing premises and fixed elimination meanings
justify the reductions. Tests reject incorrect fields, changed definitions,
invalid binders and excess depth. A selected flat-context rewrite passes all five
CPU backends with values, events, errors, rollback and exact original snapshots.
No new source syntax, executable primitive or CRDT-specific rule is introduced.

A new generic indexed-repeat frame theorem is stored in
`knowledge/libraries/proofs/repeat-source-frames`. It proves observer preservation
for every natural repeat count only under a universally quantified step
preservation assumption. A concrete source instance discharges that assumption
with the checked cross-measure step tree-preservation law. Rehashed variants
that omit either the assumption or its concrete proof fail admission. This does
not establish stopping-loop behavior or the query's rank result.

Induction now also admits U32/U64. Its base is zero; its successor case receives
the exact premise `previous < MAX` and an IH about that immediate predecessor.
Generalized parameters remain universally quantified, but the recursive count
cannot be chosen by an IH instance. The guard exists only in the successor
branch. Premises depending on a quantified variable and nonfresh binders still
reject. Signed-word induction is unsupported.

External law authoring accepts `zero` and `succ(previous)` cases, with the guard
available as `successor_bound`. See `knowledge/libraries/word-induction-laws.ink`.
This extends proof syntax; executable application syntax and primitives are
unchanged. The source declarations grant no rewrite authority.

`Proof::Unfold` checks one exact outermost computation: lambda application,
literal choice, a checked source function, or the fixed stopping-loop meanings.
The symbolic `until.from` equation retains count-zero and stop guards, word
decrement and wrapping index increment. The next recursion stays opaque until
the proof explicitly unfolds it. No recursive normalization behavior or
work/depth limit changes. Unknown computations and changed endpoints reject.

`knowledge/libraries/proofs/word-loop-frames` contains checked generic observer
theorems for arbitrary U32 stopping counts, assuming every indexed step
preserves the observer. Generalized index and state cover the recursive case.
`cross-measure-word-frame` discharges that assumption with the actual source
step tree-preservation law. It proves tree preservation under arbitrary stop
callbacks, not the query's rank result, maintained-tree invariant or whole CRDT
refinement. Rehashed missing-assumption and missing-instance-proof entries
reach the kernel and reject. Literal zero/early-stop/wrapping-index cases agree
with the earlier normalization. Full core, five CPU context and generic library
validation pass; eligible native GPU calls execute in the focused library test.


### Readonly stopping predicates and small helper discovery

Rust emission now derives separate lexical loan facts for the item and state of
`fold_until`. A readonly scalar projection from an owned accumulator needs no
whole-buffer copy. The stop still observes the old accumulator, the terminal
item's step executes, and only then does iteration end. The affine checker now
rejects consuming that accumulator in the stop callback, as it already does for
`repeat_until`; freezing or mutating the owner there previously exposed an
alias/copy mismatch across execution paths. No source syntax or fixed loop
meaning changes. Nested owners, captured limits, empty inputs, early stopping,
wrapping arithmetic and rejection paths have independent tests; all five CPU
paths preserve portable snapshots for admitted programs.

The knowledge recipe `small-carrier-inline` proposes bounded unfolding of small
source helpers with large record or collection carriers. Type widths and static
call counts order untrusted proposals. Each equality binds actual checked source
definitions and each application replays in the kernel. There is no function-name
list or native inline attribute. Callback binders and owned carriers pass source
admission and five-target conformance; a rehashed false body fails normalisation.
Profitability remains a separate measurement gate. Search receipts now record
unfinished recipe families when a state/proof limit closes an expansion early.


Exact `Unfold` now also projects a declared field from its checked record
constructor. It returns the exact selected argument without normalising that
argument or any sibling. A full-range literal stopping loop demonstrates the
bounded step; changing the selected field or the actual declaration order
rejects the proof. The existing primitive record meaning and proof budgets are
unchanged. Full core tests and five-target source-inlining conformance pass.

`tools/source_pair_equality.py` authors paired pure-function equalities by small
source unfolds, beta reductions, projections, congruence and explicit Boolean
cases. Shared callees stay opaque during authoring. Every generated proof and
complete definition context still replays independently. Renamed parameters and
record wrappers pass; a changed result rejects without publishing a proof store.
The tool does not supply a caller simulation or maintained representation proof.
# Completed synchronous callback loans

Lexical final-use analysis now ends capture loans after direct callbacks of
fixed `repeat`, `repeat_until`, `foldl`, `foldr`, `fold_until` and `parallel_map`
calls return. Captured values cannot move inside repeated callbacks or while
sibling arguments are evaluated. Unknown closure lifetimes remain conservative.
Later owning record projections may transfer their fields when no live loan
remains. This changes literal ownership emission without changing syntax,
primitive meaning, source identity or rewrite authority.

Analysis tests cover nested loops, earlier accumulator reads, later whole-record
and disjoint-field moves, shadowing and persistent unknown closures. The
`capture_end_moves` fixture checks values, wrapping arithmetic, events and failed
action rollback on C, Rust, JavaScript, C-Wasm and Rust-Wasm. Removing generated
copies is mechanism evidence; whole-workload profitability is measured separately.

### Deferred additive updates as ordinary library knowledge

`deferred_measure_updates.ink` is an optional software library over the measured
sequence. It accumulates same-leaf weight changes, updates item weights immediately
and flushes ancestor measures before structural changes or observation. Its
current component arithmetic law in `deferred-modular-deltas` proves universal
u32 delta composition through the existing normalizer. No deferred-update opcode
or domain recognizer was added to the compiler. Exact-image randomized and
mandatory CPU checks pass; maintained-tree and observation-boundary proofs remain
necessary for automatic source replacement. The CRDT integration is undergoing
normal planner acquisition, with performance evidence still pending.

The external `fold-projection-laws.ink` law generalizes loop-carrier reduction: projecting a physical ordered fold equals a fold over projected state only with a checked step simulation for every item/state. Generalized list induction checks the law, a concrete ignored-field carrier instance passes, and missing-assumption/cross-coupled transition variants reject. It is published separately under `libraries/proofs/fold-projection`. Actual stopping-loop source bindings require their own simulation and stop conditions; this introduces no compiler recognizer.

`libraries/proofs/until-projection` now checks a universal projection theorem for indexed `until.from` loops, with arbitrary u32 count and wrapping initial index. Required assumptions separately establish every projected transition and equality of physical/reduced stop tests. Generalized word induction uses exact outer Unfold and branch cases; no checker limit changes. Portable replay passes and removing either assumption from a valid rehashed theorem rejects (0.200s). A prefix-style source induction was rejected and retained under `build/crdt/repeat-projection-prefix-rejected.ink`; the admitted theorem follows the actual forward loop recursion. Concrete source projection still needs both assumptions and its owner codec.

General zero-work range laws are published under `libraries/proofs/bulk-zero-ranges`: zero-count `copy_within` and `fill_range` preserve arbitrary element lists at arbitrary source/destination/start positions. Ordinary Normalize checks both; changing count to one rejects (0.022s). Full append-copy-truncate bulk overwrite equality remains unadmitted; the first empty-overwrite induction attempt is retained outside the catalogue.

`history-buffer-laws.ink` checks the general append accumulator decoder: freezing a Buffer push-fold equals a List singleton-concat fold for arbitrary element type, initial buffer and input list. The proof uses generalized list induction and the checked push decoder `e5d575...`; accumulator equality is `63bb8ebb5c0136b575b7e43a0a9daa3748e2b212f54ab3228af9efd6f8ae5813`, under optional `libraries/proofs/history-buffer`. Missing or reversed appends reject (0.042s). This is reusable accumulation knowledge, not a CRDT-specific compiler rewrite or a proof of the guarded duplicate/merge loop.

General Rust snapshot emission now uses a type-directed direct writer for finite ordinary schemas, backed by ink-native-support. Fixed portable bytes and budgets retain the independent shared codec meaning; recursive/physical-column schemas fall back. There is no CRDT recognition, syntax or proof-authority change. Exact five-target and hostile-budget checks plus actual device regression gates pass; restore still constructs JSON and remains an independent performance target.


Nonescaping callback templates may capture an owned temporary for checked readonly
observations. The general affine analysis must establish the loan; consuming,
mutating or escaping a captured owner still rejects. Collection and borrowed-range
callbacks receive their lexical parameter types before payload matching is
elaborated. These are general source mechanisms used by prepared reverse graphs.
