# Ink Language Specification Draft

**Draft 0.1 — implementation notes updated 10 October 2026**

This language describes data, permitted changes, and required results. Its compiler may change algorithms, storage layouts and execution schedules when it can establish that observable behaviour is preserved. A growing database distributes reusable transformations together with machine-checkable proofs. Local measurements help select the implementations that actually perform well.

The performance ambition is to compete with expert implementations on specified workloads and hardware, then extend that coverage. No language can promise to be the fastest on every program. The engineering objective is to remove avoidable work, approach hardware limits on the remaining work, and make improvements reusable.

This is the full design draft for Ink. The compiler implements the subset described in [STATUS.md](../STATUS.md); the draft is not a claim that every feature below exists. The executable core contract below describes the current shared representation. The `ink` command is primary; `lang` remains a compatibility command for archived experiments.

## Implemented architecture

The semantic core owns `core/src`: types, executable semantics, reference
execution and general evidence checking. It builds independently. The
`ink-lang` distribution assembles pinned repositories:

| Package | Responsibility |
| --- | --- |
| [ink-knowledge](https://github.com/siliconjungle/ink-knowledge) | Immutable entries, authenticated snapshots, typed discovery and performance observations |
| [ink-planner](https://github.com/siliconjungle/ink-planner) | Bounded compositional search, applicability proofs and plan selection |
| [ink-runtime](https://github.com/siliconjungle/ink-runtime) | Checked-graph execution, host ABIs, scheduling, profiling, bundle assembly and pure fallback |
| [Lowerings](backend-packages.md) | C/Rust/Wasm/JavaScript target emission and WGSL/WebGPU/wgpu device operations |

Each canonical knowledge entry has a content identity, kind, semantics version,
exact dependencies, typed interface and payload. SQLite is a rebuildable
index/cache for types, operations, effects, conditions and membership witnesses.
It grants no proof authority. Bounded exported views carry selected roots, their
exact dependency closure and Merkle membership proofs against a pinned snapshot.
New entries can become search candidates without changing compiler rules.

Pure selection uses `ink-evidence-v1`; it binds the exact input program,
authenticated knowledge view and ordered applications with premise proofs.
`--selection` replays those bytes without a live database. Routing equivalence
uses the same knowledge/evidence interface. Performance observations are separate
immutable objects matched by program/plan, hardware, driver, toolchain, backend,
bridge and workload. Costs cannot supply mathematical premises.

Scalar/inductive mathematics and executable laws use the common registry entry
boundary. Specialised maintenance/machine proof obligations remain explicit
mathematical domains; arbitrary entry kinds do not grant executable authority.
Historical experiment fixtures live under `knowledge/research`, outside production
discovery. General stateful replacement and migration remain unfinished.

JavaScript lowering emits ES modules while preserving Ink's core types, wrapping
integers and binary32 operation order. The initial target supports pure numeric,
Bool, vector, record and list functions. Browser runtime selection compares
JavaScript, Wasm and WebGPU whole execution costs; stateful JavaScript execution
and per-stage adaptive placement remain unfinished. See [JavaScript target](javascript-backend.md).

C/Rust toolchains produce native machine code and Wasm. The GPU package emits
WGSL and operates WebGPU/wgpu devices; runtime assembles artifacts with compiled
CPU fallback and owns browser/native scheduling. Supported host pipelines retain
GPU arrays across steps and iterations. Checked pure source graphs mix CPU/GPU
stages, but general proved resident-buffer routing is unfinished.

The proof checker is written in Rust; Lean is separate research tooling.
The checker, correspondence bridges, emitted C/Rust/JavaScript/WGSL, toolchains, runtime
adapters and GPU drivers remain trusted implementations. This draft does not
claim end-to-end verified machine code. See [the repository contract](repository-architecture.md).

## Executable core versions

Legacy programs use `ink-executable-core-v1` and retain their canonical identities.
Pure compute extensions use `ink-executable-core-v2`; the checker determines the
version from the actual types and operations and rejects a falsely tagged input.
Both use the same bounded typed AST. This is separate from the full design below.

`ink-executable-core-v1` fixes the first checked program format. Its declarations
live in `core/src/core.rs`, independently of the source parser. Parsing, type/effect
checking, the reference runtimes, proof correspondence and native lowering use
these same Program/Type/Expr/Statement structures. Source names and lexical
scopes remain explicit; this is a checked typed AST, not SSA or a complete
ownership calculus. Local types can be inferred rather than stored on every node.

A module contains `schema: 1`, `semantics: "ink-executable-core-v1"` and `program`.
Program fields are module, functions, rules, ids, records, enums, states, keeps,
events and actions. `rules` is reserved and must be empty: inline proof-authoring
instructions do not belong to executable IR. Unknown fields, unresolved declared
types, incompatible versions, unsafe identifiers and failed type/effect/dependency
checks are rejected. A checked-module witness exposes immutable program data;
deserialising an ordinary Program does not create that witness.

The canonical identity is SHA-256 of compact UTF-8 JSON in declaration-field
order, with named maps ordered by key and sequence order preserved. Whitespace
and incoming JSON property order are discarded before hashing. This identifies
an exact versioned program, not its equivalence class: renaming a binder may
change its identity. No source locations or optimisation selection enter it.
The current wire representation is fixed by the Rust/Serde definitions and
pinned toolchain; cross-language encoders need to reproduce that encoding.

Ingress is bounded to 16 MB, 1,024 top-level declarations, 128 parameters or
record fields, 100,000 structural steps and depth 32. Identifiers are ASCII
letters/digits/underscore, begin with a letter or underscore, and have at most
128 bytes. Individual string literals have at most one million UTF-8 bytes.
These bounds control acceptance work; they are not a process-memory guarantee.

The executable semantic commitments are:

| Construct | Meaning and current boundary |
| --- | --- |
| Values | Bool, Unit, strings, bounded u32/u64, exact Int, finite lists, Option/Result, nominal 128-bit IDs, records and nullary enums. Declared signatures and state schemas have concrete types. |
| Variables and bindings | Lexical immutable bindings, with shadowing scoped to lambdas/blocks. No observable pointer identity or shared mutable references. A general borrowing/ownership language remains proposed. |
| Arithmetic | Ordinary u32/u64 `+ - *` wraps at the declared width; Int arithmetic is exact. `checked_add/sub/mul` returns Result with Overflow on failure. Pure word literals use an expected word type and otherwise default to u64; stateful literal operands use their expected integer type. Out-of-range fixed-width literals are rejected. |
| Evaluation | Operands/arguments evaluate in source order. `&&`, `||` and pure `choose` evaluate only the selected continuation. There is no permission to reorder effects merely because final values agree. |
| Pure collections | Ordered map and filter preserve element order; sum uses the checked modular u32/u64 element width, count returns u64, and foldr visits the finite list right-to-left. Pure calls are acyclic; escaping first-class closures/general recursion are not supported. |
| Stateful tables and keeps | Tables are logical keyed collections. Reads inside a change observe earlier tentative writes. Derived values must match recomputation. Physical storage and caches are not logical state. |
| Changes | An outer successful change returning Ok commits once, including an otherwise empty change. Err, `?`, nested failed changes and host execution errors roll back tentative writes and discard transaction events. Nested failure poisons its enclosing change even if the Result is ignored. |
| Queries | Declared reads only; queries publish no events and do not advance the committed version. |
| Events | Successful commits append events in emission order, identified by commit and position. Aborts preserve the previous outbox. Host acknowledgement removes an acknowledged prefix without changing logical table contents. |
| Commit exhaustion | A change cannot wrap the commit sequence. Exhaustion rolls back and returns a host error. |
| Snapshots | Transaction-boundary logical tables, committed version and pending ordered events; physical caches are rebuilt. Existing snapshot identities/codecs remain unchanged by the core-file split. No captured call stack, schema migration or durable crash recovery is implied. |

Pure and stateful collection APIs currently have different result typing where
specified by their checkers: stateful count is exact Int, and stateful sum follows
the element integer type. An unsupported cross-fragment operation must be rejected
or diagnosed; this contract does not silently claim the full draft's coverage.
`core/src/eval.rs` and `core/src/stateful.rs` are the executable reference definitions;
`core/src/check.rs` and `core/src/statecheck.rs` define current admission and effects.
Their Rust implementations have not been formally verified.

Reference and generated stateful execution share the fixed change-boundary
primitives in `core/src/transaction.rs`. Canonical database decision laws can be
bound to a checked source change through exact definition checking. This covers
the commit decision, with explicit domain-error precedence and word exhaustion;
it does not certify the action body or physical rollback and enables no shortcut.
See [the boundary and remaining correspondence work](change-boundary-correspondence.md).

Pure mathematical replacement proofs preserve total values. They exclude host
resource exhaustion, allocation/OOM and native trap traces. Stateful replacement
admission must separately cover return values/errors, future state, tentative
reads, aborts, versions, event order and snapshots; pure equality cannot authorise
it. Code generation, allocation primitives, generated C/Rust, LLVM and host ABIs
remain explicit trusted components. Lean research is external to core admission.

```sh
ink emit-core program.ink -o core.json
ink check-core core.json
ink run core.json function arguments.json --core
ink emit-state core.json --core -o generated-state
```

The richer type system, general ownership/arenas, foreign effects, concurrency,
durability and migration in the design below remain subsequent milestones.
A new executable operation or changed meaning requires an explicit core-version
and correspondence decision; a new equivalent implementation belongs in knowledge.

### Implemented pure compute v2

The extension adds wrapping i32, portable f32, numeric vectors/records, pure local
bindings, multiple array inputs and array outputs. Safe indexed reads use
`at_or`; `repeat` has a literal bound no greater than 65,536. Map, indexed map,
zip, ordered CPU reductions and integer scan/sort have reference and compiled
implementations. Typed host pipelines can keep GPU arrays resident across steps
and iterations. See [the compute contract](gpu-compute.md) for exact operations,
packed ABI, capability limits, fallback and reproduction.

Portable GPU f32 follows WGSL-permitted evaluation behaviour, including rounding,
fusion and subnormal differences. CPU/GPU bit identity and float-dependent branch
agreement are not promised. Exact IEEE behaviour requires CPU execution. Tests
and profiles do not establish stronger floating-point equivalence.

The existing mathematical replacement language does not admit the new compute
forms. `ink-literal-source-routing-v1` admits deterministic v1 pure calls only:
the checked graph must reconstruct the original entry expression. External
knowledge production may share identical calls and rank complete-cost plans;
the core checks typed source equality and knows no target or cost model. Browser
and native backends can execute admitted v1 CPU/GPU graphs with scalar host
results. The explicit v2 resident pipeline API has a separate host contract;
it is not yet a proved source replacement. See [source routing](source-routing.md).

## 1 Design commitments

1. Program meaning is independent of physical representation wherever the programmer has not explicitly requested a particular representation.
2. Persistent state changes through named atomic transactions. Pure computations and temporary local mutation remain available.
3. Derived values specify what must stay correct. They do not prescribe whether to recompute, cache, index or maintain incrementally.
4. Proofs and contracts are native language concepts. Developers do not need to write a separate Lean program.
5. Optimisation proposals may come from compiler passes, search, solvers, humans or AI. Acceptance depends on checked evidence.
6. Correctness evidence and performance evidence are separate records.
7. Programs run without a network connection or background optimiser. Adaptation is an optional execution mode.
8. Native machine code and WebAssembly share the same logical semantics, subject to declared host capabilities.
9. Durable execution uses explicit state and checkpoint boundaries. It does not require recording every temporary memory write.
10. A program may combine execution domains. CPU/GPU placement and explicit bridges belong to the execution plan; transfer, conversion, allocation and synchronisation costs matter alongside computation. General mixed-target execution remains implementation work.
11. Compilation exposes its actual verification boundary. A checked high-level rewrite does not establish correctness of an unverified backend.

The first language is a compact general computational core with strong support for collections and stateful applications. Distributed consistency, automatic CRDT construction, arbitrary live stack migration and general GPU compilation are later extensions.

## 2 A complete small application

This application maintains inventory and a derived total. Quantities use bounded integers, while the logical total uses exact mathematical integers. The compiler may use a fixed-width accumulator only after establishing a sufficient bound.

```text
module inventory;

id ItemId;

record Item {
    name: String,
    stock: u32,
}

enum Error {
    Missing,
    AlreadyExists,
    Overflow,
}

record StockChanged {
    item: ItemId,
    before: u32,
    after: u32,
}

state Items: Table<ItemId, Item> = Table.empty();
event stock_changed: StockChanged;

keep total_units: Int =
    sum(Items.values().map(fn(item) => Int(item.stock)));

change create(id: ItemId, name: String, stock: u32)
    -> Result<Unit, Error>
    writes(Items)
{
    if Items.contains(id) {
        return Err(Error.AlreadyExists);
    }
    Items.insert(id, Item { name: name, stock: stock });
    return Ok(());
}

change restock(id: ItemId, amount: u32)
    -> Result<Unit, Error>
    writes(Items)
    emits(stock_changed)
{
    let item = Items.get(id).ok_or(Error.Missing)?;
    let next = checked_add(item.stock, amount)
        .map_err(fn(_) => Error.Overflow)?;

    Items.replace(id, Item { name: item.name, stock: next });
    emit stock_changed(StockChanged {
        item: id,
        before: item.stock,
        after: next,
    });
    return Ok(());
}

query stock_of(id: ItemId) -> Option<u32>
    reads(Items)
{
    return Items.get(id).map(fn(item) => item.stock);
}

query total() -> Int reads(total_units) {
    return total_units;
}
```

Every accepted change commits atomically. Returning `Err` aborts all writes and staged events. Missing-key and arithmetic errors are ordinary values, not undefined behaviour. Queries observe a consistent committed version.

A baseline implementation can recalculate the total from the table. A more capable compiler can maintain it using `Int(next) - Int(previous)`. Both must return identical logical results. Keeping an index or choosing packed storage must not change the application’s API.

The language core does not automatically assign IDs. Hosts supply validated IDs, or a later library generates them from an explicit counter or recorded random input.

## 3 Values and types

Types are static. Generic code is checked before specialisation. Local type inference is permitted; public declaration signatures are explicit.

| Type family | Meaning |
| --- | --- |
| `Unit`, `Bool` | Unit value and Boolean values |
| `u8/u16/u32/u64`, `i8/i16/i32/i64` | Fixed-width integers |
| `Int`, `Nat` | Exact arbitrary-precision integers and nonnegative integers |
| `f32`, `f64` | Floating-point values with specified operations |
| `String`, `Bytes` | Immutable UTF-8 text and immutable bytes |
| `Option<T>`, `Result<T,E>` | Explicit absence and recoverable failure |
| `List<T>`, `Array<T,N>` | Ordered collections; an array has a static length |
| `Set<T>`, `Map<K,V>`, `Table<K,V>` | Finite collections with value semantics |
| Records and enums | Named product and tagged union types |
| `Id` declarations | Nominal 128-bit identifiers with no address semantics |
| `Buffer<T>` | An owned mutable temporary sequence |
| `Prop`, `Proof<P>` | Logical propositions and erased proof evidence |

Collections require the appropriate equality and ordering interfaces. User-defined equality and ordering must be total; ordered-key interfaces include checked consistency laws. The first implementation supports built-in key types and products of those types.

A record is a logical value. Its fields have no observable byte offsets unless it participates in an explicit foreign interface. Equality compares logical content. IDs remain stable when storage moves.

```text
record Point {
    x: f64,
    y: f64,
}

enum Shape {
    Circle(Point, f64),
    Rectangle(Point, Point),
}

type SmallCount = { n: u32 where n <= 65535 };
```

A refinement type adds a proposition to a base type. Construction requires a proof, or a runtime validation that returns `Result`. An unknown property cannot be assumed merely because previous inputs satisfied it.

Fixed-width `+`, `-` and `*` have modular two’s-complement semantics. This deliberate rule is part of the type definition and is consistent across targets. Applications that must reject overflow use `checked_add`, `checked_sub` and `checked_mul`. There is no implicit conversion between fixed-width integers, floating point and exact integers; explicit lossless constructors such as `Int(x)` are permitted. Narrowing conversions return `Result`.

Integer division, remainder and variable shifts use checked library operations. Division by zero and signed minimum divided by minus one return errors. Ordinary integer division rounds toward zero; remainder follows that convention.

Exact arithmetic costs whatever its representation requires. The optimiser may specialise it to bounded machine arithmetic only with a proof or a guard and exact fallback.

Floating-point operations preserve the specified rounding, signed-zero and infinity behaviour. The portable profile canonicalises NaNs and exposes no floating-point exception flags. Contraction into fused operations and reassociation require separate permission: they are not generally exact rewrites. Approximate arithmetic is a future, explicitly different contract with a numerical error bound; it must not enter an exact-equivalence class.

## 4 Functions and local computation

`fn` defines pure computation. A function cannot read global state, obtain the clock, perform I/O or emit an event. It receives all inputs explicitly.

```text
fn square(x: Int) -> Int {
    return x * x;
}

fn apply_twice<T>(f: fn(T) -> T, x: T) -> T {
    return f(f(x));
}
```

Statements end with semicolons. Braces delimit blocks. `let` creates an immutable binding and `var` creates a mutable local binding. Expressions evaluate left to right unless a semantics-preserving transformation changes their execution. Calls are eager. Logical `&&` and `||` short-circuit.

```text
fn sum_copy(xs: List<Int>) -> Int {
    var result = 0;
    for x in xs {
        result = result + x;
    }
    return result;
}
```

`if`, `match`, bounded `for`, tuples, lambdas and exhaustive enum matching form the basic control language. A block returns through explicit `return`. `?` exits its containing `Result`-returning declaration with Err. A query or
Result-valued keep returns that Err as an ordinary value: reading/calling it does
not automatically abort a change. A caller can apply `?` to propagate it.
Nested change errors still poison the transaction even when discarded. Host
execution failures propagate and require rollback.

The checked total fragment accepts structural recursion and recursion with a proved decreasing measure. Unrestricted recursion and `while` require `partial fn`. Partial functions may diverge and cannot be invoked during type checking or proof reduction. They are excluded from transactions and maintained queries in the initial version. External drivers may call them.

Unrestricted computation is therefore possible without treating every computation as a terminating proof. Optimising partial functions requires reasoning that preserves termination or divergence as well as their results.

A `Buffer<T>` can be mutated locally under unique ownership. Borrowing permits multiple read-only references or one exclusive mutable reference. Borrowed references cannot escape their owner, enter durable state or survive a transaction boundary. Converting a buffer into an immutable collection consumes the owner. Ownership checking permits in-place execution without making machine addresses observable.

The initial memory model is single-threaded abstract execution. Parallel execution is an implementation choice requiring a proof of independence or a valid reduction law. Arbitrary shared mutable references are absent.

## 5 State and changes

A `state` declaration creates a logical state root with a pure initial value. Multiple roots can participate in one transaction. State is persistent across calls; durability across crashes depends on the selected host storage mode.

`change` declarations are atomic state transitions. Their `writes` capability includes read access to those roots. `reads` lists additional read-only roots and derived values. `emits` lists event channels. The compiler rejects accesses outside the declared capability set.

Inside a change, reads observe its own earlier writes. A successful return is `Ok(value)`; an `Err(error)` return discards every tentative write and event. Failed changes expose their returned error but no intermediate state.

For a state S and input x, the reference semantics are:

```text
change(S, x) =
    Commit(S_next, result, ordered_events)
    or Abort(error)
```

At the public boundary, changes execute in an explicit input sequence. An implementation may overlap their work, but results, state and events must match that sequence. The first runtime uses one writer per application instance. Later conflict detection must preserve the same contract.

Table key order is unsigned numeric order for unsigned integers and IDs, signed numeric order for signed integers, bytewise UTF-8 order for strings, and lexicographic order for tuple keys. The initial profile rejects floating-point keys. Table operations have these meanings:

- `get(key)` returns an optional logical value.
- `contains(key)` tests membership.
- `insert(key,value)` requires absence.
- `replace(key,value)` requires presence.
- `remove(key)` returns and removes an optional value.

The compiler either proves the precondition for insert or replace, as in the application example, or requires the fallible `try_insert` or `try_replace` variant. Values obtained from a table are logical snapshots. An implementation may borrow internally when doing so preserves their semantics.

Nested change calls participate in the caller’s transaction; they do not commit independently. They require compatible effects. A nested `Err` marks the whole transaction aborted and propagates to the public boundary; it cannot be caught to resume that transaction. Ordinary pure `Result` values remain catchable. There are no savepoints in the first version.

Each committed transaction has a monotonically increasing local sequence number. Logical deltas contain root IDs, keys, and before/after values. They describe committed changes, not every intermediate assignment. Several writes to one key may collapse into one delta if no specified observer can distinguish the intermediate writes.

A delta is typed and tied to a base version. Applying a stale delta returns a version conflict. Composition is defined for consecutive compatible versions. Deltas are not automatically commutative, reversible or suitable for replica merging. Those properties require separate laws and protocols.

## 6 Derived computation and incremental execution

`keep name: T = expression;` defines a derived value over state or other keeps. Dependency cycles are rejected in the initial version.

A keep behaves as if evaluated from the current logical state whenever observed. It must be total and free of external effects. It can use exact arithmetic, total collection operations and explicitly handled errors. The compiler must reject an unhandled failing operation in a keep.

No specific implementation is promised. Valid implementations include recomputation, lazy evaluation, memoisation, maintained aggregates, indexes and combinations selected by workload. A keep read inside a transaction must reflect tentative writes; deferring maintenance is allowed only if the read is still correct.

The reference semantics of table `values()` enumerate values in ascending key order. Order-sensitive operations preserve that order. A compiler may choose unordered storage and bypass sorting for an order-insensitive use when a proof permits it. List traversal always preserves list order. Sets have no user-controlled order; their reference enumeration uses the element’s canonical total order.

For a query Q, an incremental implementation must satisfy:

```text
maintain(Q(S), delta, auxiliary_state)
    produces Q(apply(S, delta))
```

Its auxiliary state must also satisfy an invariant sufficient for all future allowed updates. Matching today’s answer alone is insufficient.

Standard total operators include `map`, `filter`, `fold`, `sum`, `count`, `group_by` and equijoins. Operator definitions specify duplicate handling and order. A `Table` has unique keys; a `List` preserves duplicate entries; grouped lists preserve source order. A join emits matches in lexicographic source-key order unless an enclosing operator makes that order unobservable.

The first implementation supports map, filter, exact sum and count. Grouping and joins extend the same semantics later. Arbitrary dynamic dependencies do not imply a fast incremental implementation: the baseline can always recompute a supported total query.

The incremental architecture draws on work such as [DBSP](https://arxiv.org/abs/2203.16684), which develops an algebraic approach to incremental view maintenance. This language additionally makes persistent application state and proof-bearing implementation selection explicit design concerns.

## 7 Effects and the outside world

`event channel: Payload;` declares a typed output channel. `emit channel(value);` stages an event inside a transaction. Events appear after successful commit in their specified order.

Time, randomness, network responses and user input enter as explicit values supplied to a change. Recording those inputs makes replay deterministic. No hidden clock or randomness is available to pure computation.

External drivers receive events and perform I/O. A durable host can place events in an outbox committed atomically with state. Each event receives an identity derived from application instance, commit sequence and event position. Delivery may be retried. Exactly-once external side effects require cooperation from the receiver, such as deduplication; the language does not manufacture that guarantee.

A query returns a value from one committed snapshot. Queries never mutate durable state or emit events. Transparent caches may change physical memory without changing logical observations.

Cancellation, storage failure and resource exhaustion are host failures with separately specified handling. A host failure reported while committing cannot be acknowledged as a successful commit. An optimisation may avoid a resource failure by using fewer resources. Logical equivalence omits ordinary differences in elapsed time and resource consumption; explicit resource or real-time contracts need additional proofs or deployment checks.

## 8 Built-in proofs and contracts

The language has a proof fragment sharing its values, types and names. A proposition describes a property; a proof is a value establishing it. Proofs have no computational effect after erasure.

```text
theorem int_add_zero(x: Int): x + 0 == x
    by normalize;

theorem swap_int_add(x: Int, y: Int): x + y == y + x
    by arithmetic;
```

`normalize` and `arithmetic` are proof-search commands, not trusted declarations. They must produce a proof term or certificate accepted by the checker. Search failure means “not established,” not “false.” A solver response containing only “valid” is insufficient.

Functions may declare preconditions and postconditions:

```text
fn increment_small(x: u32) -> u32
    requires x < 100;
    ensures result == x + 1;
    ensures result <= 100;
{
    return x + 1;
}
```

A caller must establish `requires` statically or use an explicit checked wrapper. Ingress data is validated rather than granted unchecked assumptions. The body must establish every `ensures` clause. The compiler does not silently insert a runtime assertion and label the declaration proved.

The initial logical foundation is an established dependent type theory with predicative universes, inductive types, equality, dependent functions and structurally terminating definitions. The project must fix its precise inference and reduction rules before implementation claims of soundness. The language will not define a new logic through informal rewrite conventions.

The proof kernel performs a small set of checks: well-formed types, proof-term typing, definitional equality, positivity of inductive definitions and permitted recursion. Mathematical integers and bitvectors must have definitions or verified decision procedures; adding a fast built-in evaluator also adds a proof obligation or an explicitly disclosed trust dependency.

User tactics, AI agents and external solvers remain outside the trusted kernel. The initial tactic language supports introductions, application of existing theorems, equality rewriting, case splits, structural induction and certified arithmetic. Advanced users can supply explicit proof terms. No `admit`, unrestricted `axiom` or unchecked solver result is accepted in release proof packages.

General recursion cannot inhabit the proof fragment. Otherwise a nonterminating expression could masquerade as a proof of an arbitrary proposition.

This architecture follows the small-kernel pattern described in [Lean’s proof-checking model](https://lean-lang.org/faq/). The proposed language owns its proof syntax and integration. Lean or another prover may help audit the kernel or develop external certificates, but is not a required user-facing language.

## 9 Three distinct verification claims

A build manifest must report these separately:

| Claim | Required evidence |
| --- | --- |
| Program properties | Proofs that selected contracts and invariants hold |
| Transformation correctness | Proofs that proposed implementations preserve the required semantics |
| Executable correctness | Evidence that lowering, code generation and relevant runtime behaviour preserve those semantics |

The first release aims for checked language-level transformations and contracts. LLVM, the runtime, foreign functions and host storage remain in its declared trusted base. It must not describe that mode as end-to-end verified execution.

A later release may validate individual lowerings or adopt verified compilation paths. This requires formal models for the actual intermediate representations and target semantics. Checking an LLVM rewrite alone does not verify instruction selection, linking, system libraries or the operating system.

[CompCert](https://compcert.org/man/manual001.html) is a concrete reference for semantic-preservation proofs spanning a source language and assembly-level target. Its approach illustrates the scale and scope of the stronger claim.

A type-safe program does not automatically satisfy its business rules. A proved business rule does not automatically imply the selected implementation is fast. A proof is only as relevant as the statement and assumptions it actually establishes.

## 10 Defining optimisation rules

A rewrite relates two expressions under explicit conditions. Its binders are universally quantified; matching substitutes typed program expressions for them.

```text
rewrite add_zero(x: Int) {
    from x + 0;
    to x;
    proof by normalize;
}

rewrite map_fusion<A, B, C>(
    xs: List<A>,
    f: fn(A) -> B,
    g: fn(B) -> C
) {
    from xs.map(f).map(g);
    to xs.map(fn(x) => g(f(x)));
    proof by induction xs;
}
```

Function types in these rules are pure and total. The fusion theorem concerns logical lists and excludes foreign effects. Its usefulness depends on whether the old implementation allocated an intermediate list; the theorem itself promises no speedup.

A conditional rule adds `requires proposition;`. The optimiser must discharge the proposition at each use. Substitution avoids variable capture and preserves ownership and effects. Rewrite orientation influences search but does not change the meaning of its equality certificate.

Algebraic rewrites are one class of optimisation. Changing a representation requires an abstraction relation; maintaining a derived query requires a state-transition simulation. Those use implementation packages, not a misleading expression-equality shortcut.

An implementation package has typed fields with this proposed authoring form:

```text
implementation cached_sum for SumMachine {
    representation = CachedSumState;
    abstraction = cached_sum_relation;
    initialise = cached_sum_init;
    step = cached_sum_step;
    observe = cached_sum_observe;
    certificate = cached_sum_correct;
}
```

The referenced declarations define the actual representation, functions, relation and theorem. A package is accepted only if those definitions type-check and the certificate has the required simulation type. This example describes the registration syntax; the names are not pre-existing built-ins.

## 11 What a representation proof must establish

Let S be logical state, P physical state, and R(S,P) the abstraction relation. A valid implementation package establishes:

1. Initialisation creates a physical state related to the logical initial state.
2. Every public query returns the same specified result for related states.
3. Every allowed change produces matching success or failure results and matching ordered events.
4. A successful physical step produces a state related to the next logical state.
5. An aborted step leaves the previously committed state and event stream unchanged.
6. The relation is maintained for every future permitted change, not just the training workload.
7. Required termination properties are preserved.

For a cached sum, R says that the physical table denotes the logical table and the cache equals the exact logical sum. The proof must cover insertion, replacement, removal and transaction abort, plus any query that can observe tentative writes.

A physical operation may correspond to several logical steps or vice versa. General simulation certificates require an appropriate progress argument so an implementation cannot introduce infinite invisible work.

Live migration has an additional requirement: the old and new physical states at the switching boundary must denote the same logical state. Pending events, commit sequence, logical IDs and outstanding snapshot readers must remain valid.

A simple migration proof can proceed by decoding the old state and encoding the new state. A faster direct migration needs evidence that the direct operation agrees with that composition. Neither method may depend on unproved properties inferred from a profile.

## 12 The optimisation knowledge database

The database stores reusable knowledge as immutable, content-addressed objects. The compiler and the database have independent versions. Updating knowledge can improve generated programs without changing the compiler executable.

| Object | Essential contents |
| --- | --- |
| Semantic definition | Canonical typed definition, dependency identities and semantics version |
| Theorem | Proposition, checked proof object, dependencies and allowed assumptions |
| Rewrite | Typed match pattern, alternative, side conditions and theorem reference |
| Implementation | Logical interface, physical representation, algorithms, abstraction relation and certificate |
| Measurement | Candidate identity, target, workload description, toolchain, metrics and uncertainty |
| Selection plan | Chosen implementations, discharged conditions, transformation chain and backend settings |

Hashing gives identity to canonical objects, not a proof that two different objects are equivalent. Renaming local binders and removing presentation metadata may be part of canonicalisation. Cross-definition semantic equivalence always requires evidence.

The same definition object cannot change meaning when a package name is repointed. Package names resolve through a lockfile to immutable identities. A theorem depends on the exact semantic definitions it references.

The database has local, project, organisation and optionally public layers. Offline compilation uses locally available objects. Connecting a registry is an explicit project configuration, and a build can pin a registry snapshot.

Downloading an object does not authorise code execution during compilation. A package’s proof certificate is checked locally before use. Imported tactics or search plugins run under resource limits and cannot expand the allowed axiom set.

Retrieval proceeds by semantic version, types, operators, effects, relevant algebraic properties and target support. It then ranks a bounded subset using previous usefulness and available search budget. It does not load every known theorem into every compilation.

Deduplication, subsumption and rule-set minimisation matter as much as accumulation. [Ruler](https://arxiv.org/abs/2108.10436) studies the synthesis and reduction of useful rewrite sets, including the difficulty of large redundant rule collections.

A growing database is therefore a growing opportunity set, not a guarantee of monotonically improving performance.

## 13 Search and implementation selection

The compiler retains the original baseline implementation as a candidate. It searches a bounded space of alternatives, proves their applicability, estimates cost and optionally benchmarks finalists.

Equality saturation may represent many equivalent pure expressions in an e-graph before choosing one. [egg](https://arxiv.org/abs/2004.03082) provides an established implementation approach. Side conditions and stateful simulation obligations still need explicit handling; placing expressions in an e-graph does not itself establish that a user-supplied rule is sound.

The primary optimisation levels are:

- Eliminate work through algebra, incremental maintenance and algorithm selection.
- Reduce data movement through layout selection, compression, fusion and locality.
- Reduce allocation through ownership, regions and reusable buffers.
- Exploit parallelism through independent batches, vector instructions and valid reduction trees.
- Specialise code for shapes, key distributions and target features.
- Improve instruction scheduling and register use in the backend.

The cost objective is configurable: latency, throughput, memory, energy or a constrained combination. A speed optimisation may be unacceptable if it exceeds a memory limit. A rule’s correctness is portable within its semantics; its profitability is conditional on workload and target.

The selector accounts for expected future savings against compilation, proof checking, migration, guard and monitoring costs. It reports assumptions rather than presenting a cost-model prediction as a theorem.

Measurements include warmup, variance, data distributions, target features, compiler settings and full query/update costs. Stored results guide search; local measurements take precedence when environments differ.

Optimiser search uses bounded CPU time, memory and candidate counts. Exhausting the budget falls back to the best accepted candidate. Failure to find a proof leaves the existing implementation intact. A candidate proved correct but measured slower remains knowledge without becoming the selected implementation.

## 14 Runtime adaptation

Static mode compiles and selects implementations before execution. Adaptive mode can propose replacements while a program runs.

```text
Observe a bounded workload sample
    → retrieve or propose candidates
    → establish applicability
    → check correctness evidence
    → compile candidates
    → measure safely
    → migrate at a transaction boundary
    → monitor performance
```

AI may participate in proposing code, invariants and proofs. It is absent from the ordinary execution path and cannot approve its own proposal.

Speculative profiling facts are never silently promoted to language invariants. For example, packing values into 16 bits requires either a maintained bound or a guarded implementation with a valid fallback. The guard runs before unsafe assumptions are used. Guard failure must preserve current logical state and select a correct path.

Benchmarking uses snapshots or synthetic inputs. External effects are suppressed during candidate trials. Trials cannot duplicate real event delivery or modify authoritative state.

Hot replacement occurs after a committed transaction and before the next one. The first adaptive runtime pauses writes during migration. It retains the old representation until no reader needs it or uses versioned snapshots. Concurrent lock-free migration is a later feature requiring its own memory and correctness model.

Performance regression can trigger another migration to a previous implementation. This is not an application-state rollback: all committed user changes must remain present. The reverse migration or logical reconstruction must be valid.

Selection uses a minimum expected benefit, a cooldown and a migration budget to avoid oscillating between implementations. No claim of permanent global optimality is made.

## 15 Serialisation and recovery

Persistent execution consists of logical state, program identity, schema identity, commit position, explicit pending work and effect-delivery metadata. Native machine addresses and arbitrary call stacks are not the durable representation.

The first runtime supports checkpoints between transactions. A long-running task that must survive restart is written as an explicit state machine whose progress is stored in state. Suspending arbitrary functions transparently is a later language transformation.

The portable snapshot format is versioned and canonical:

- Header with format and language-semantics versions.
- Program and schema content identities.
- Logical state roots encoded with schema-defined field order.
- Fixed-width integers in little-endian order; exact integers in a canonical length-prefixed signed format.
- Length-prefixed UTF-8 strings and bytes.
- Tables and maps ordered by canonical key order.
- Explicit enum tags defined by schema identity.
- Commit sequence, pending durable jobs, outbox entries and delivery acknowledgements.
- Integrity checks and lengths sufficient to reject malformed input.

Canonical encoding is a logical interchange format, not a requirement to retain that layout in memory. Compression wraps the canonical payload with an identified codec. Fast physical checkpoints are permitted as a target-specific cache when they include enough compatibility information and a valid decoding path.

In durable mode, the host records a committed logical delta and its ordered events atomically before acknowledging the commit. A checkpoint records a complete committed version; recovery loads it and replays later committed deltas. Incomplete records are rejected according to the host’s storage protocol. This protocol and its implementation belong to the trust boundary.

Ordinary in-memory mode performs no mandatory disk I/O. Durability therefore has a measurable cost selected by the application rather than attached to every temporary operation.

Application schema changes use explicit, versioned migration functions. An application upgrade may intentionally change behaviour and is not labelled a semantics-preserving optimisation. A schema migration must satisfy the declared data-conversion contract and preserve required identity and outbox information.

## 16 Software as a database

The program store contains canonical typed definitions, schemas, transformations, proof dependencies, selected plans and version history. State storage contains application state and optional workload observations. They can share infrastructure without making every executable instruction a database query.

Source files are an editable projection of program definitions. Parsing and elaboration produce canonical objects; name bindings point to those objects. The first implementation uses ordinary files plus a local object store. A database-native editor is optional.

Code edits create new objects. Incremental compilation invalidates only dependencies affected by changed identities or contracts. Reusing a proof requires that its exact dependencies remain available and compatible.

Closures may be persisted only when their code identity is stable and every captured value has a persistent schema. Captured host handles and borrows are forbidden. The initial language keeps closures temporary; persistent callbacks use an explicit enum and serialisable arguments.

State, code and proof history can be queried by developer tools, but the optimiser’s internal representation is not automatically observable by application programs. Exposing exact layout through reflection would constrain future representation changes.

The language’s connection between data and computation is structural: operations are typed objects with dependencies and laws, and changes are first-class inputs to maintained computation. It does not claim every data value is executable code or every transformation is reversible.

## 17 Compiler architecture and implementation language

The initial compiler, proof-object reader and runtime are written in Rust. This choice affects implementation reliability and compilation performance; it does not bound the speed of generated programs by that of a typical Rust program.

The intended full pipeline is:

```text
Source modules
    → parsing and name resolution
    → type, ownership and effect checking
    → contract elaboration and proof obligations
    → canonical semantic graph
    → bounded optimisation using checked knowledge
    → explicit algorithms and representations
    → loops, buffers and primitive operations
    → LLVM IR
    → target object code and linking
```

The semantic graph retains collections, state roots, changes, effects, invariants and query dependencies until the relevant high-level optimisations finish. Lowering too early would discard the information needed for algorithm and representation selection.

Every accepted high-level transformation records its premises and proof dependency. The build manifest reports the final verified stage and all later trusted components.

LLVM supplies initial code generation for native targets and WebAssembly. A custom backend is justified only by demonstrated limitations. MLIR may later support structured loop and vector transformations; it is not required to validate the first prototype.

The executable implementation currently emits C or Rust through the independent
backend packages and invokes existing toolchains. Its core format is a bounded
typed AST, not the complete semantic graph, ownership system or proof-authoring
surface shown in this proposed pipeline.

The baseline must generate ordinary efficient loops, direct calls, contiguous buffers where suitable, and predictable allocation. It must remain useful when the knowledge database is small. Proof search is not an excuse for a weak baseline.

Foreign kernels may be called through explicit interfaces. Their declared contracts are external assumptions until separately justified. Binding a fast assembly routine does not automatically place it inside the formally verified subset.

## 18 Native and WebAssembly execution

Native targets initially include ARM64 and x86-64. Target feature selection is explicit; portable binaries use supported baseline features or guarded dispatch. Specialised code cannot execute on an incompatible processor.

The WebAssembly target produces a module with a small host interface for initialisation, change submission, queries, snapshot import/export and event draining. The logical API is identical to native execution.

A proposed host ABI consists of:

```text
init(program_config_bytes) -> instance
apply(instance, change_id, encoded_arguments) -> encoded_result
query(instance, query_id, encoded_arguments) -> encoded_result
checkpoint(instance) -> encoded_snapshot
restore(encoded_snapshot) -> instance
drain_events(instance) -> encoded_events
close(instance)
```

These are conceptual typed entry points. The first binary ABI lowers byte buffers to explicit pointer/length pairs in linear memory, with matching allocate/free exports and versioned message schemas. It must define ownership and bounds checks before implementation.

LLVM’s toolchain supports Wasm object production and linking through [LLD](https://lld.llvm.org/WebAssembly.html). Wasm SIMD offers a vector execution path, with target-dependent restrictions documented by [Emscripten](https://emscripten.org/docs/porting/simd.html). Native and Wasm backends need separate performance tuning.

Browsers provide the storage and event adapters. A durable commit is acknowledged only after the chosen browser storage adapter completes its required persistence operation. Available persistence guarantees must be stated by that adapter.

Most proof search can happen on the developer machine or build server. Shipping an optimiser to the browser is optional. A later browser adaptive runtime can compile or receive new Wasm kernels and switch them through a stable state ABI at safe boundaries, where host policies permit dynamic module compilation.

WebAssembly is the browser CPU target. Browser GPU execution requires a separate WebGPU/shader path and different scheduling and data-transfer decisions. General GPU execution is outside the initial conformance profile.

## 19 Packages and developer commands

Modules use explicit imports:

```text
module app.inventory;
import core.collections.{Table, List};
import core.arithmetic.{checked_add};
```

The initial prelude exposes the built-in types in section 3, `Some`, `None`, `Ok`, `Err`, `sum`, `count` and the checked integer arithmetic functions. It also exposes `Table.empty` and the standard methods used by the inventory example. Other names require imports. Public exports use `pub`. Import cycles between computational definitions are rejected unless they form an explicitly checked mutually recursive group; proof-dependency cycles cannot establish new facts.

A project manifest specifies language version, target profiles, dependencies, allowed foreign assumptions, optimisation policy and registry configuration. A lockfile pins semantic objects, proof packages, compiler, backend and target settings.

Proposed commands:

```text
lang check
lang prove
lang build --target native --mode static
lang build --target wasm --mode static
lang run --mode adaptive
lang explain total_units
lang knowledge import ./verified-package
lang knowledge verify
lang snapshot inspect ./checkpoint
lang benchmark ./workloads
```

`check` reports types, effects, ownership and unresolved contracts. `prove` runs permitted proof search and checks its products. `build` never converts an unresolved obligation into an assumption. A failed optional optimisation falls back; a failed required program contract fails the build.

`explain` identifies the original computation, selected implementation, discharged conditions, certificate identities, expected cost and remaining trust boundary. It must be possible to understand why the compiler made a decision.

Reproducible static builds pin the selected plan as well as the knowledge snapshot. A fresh benchmark can make a different choice despite identical source. Adaptive runs record a plan-change history and are not described as bit-for-bit reproducible executions.

## 20 Surface grammar

This grammar defines the principal declaration and statement forms. Lexical details use UTF-8 source, ASCII identifiers initially, decimal/hexadecimal numeric literals, quoted escaped strings, `//` comments and non-nesting `/* ... */` comments. Identifiers are case-sensitive. Unrecognised syntax is an error.

```text
module        = "module" path ";" { import | declaration } ;
import        = "import" path [ "." "{" name { "," name } "}" ] ";" ;

declaration   = [ "pub" ] (
                  id_decl | record_decl | enum_decl | alias_decl
                | fn_decl | state_decl | event_decl | keep_decl
                | query_decl | change_decl | theorem_decl
                | rewrite_decl | implementation_decl
                ) ;

id_decl       = "id" name ";" ;
record_decl   = "record" name [ generics ] "{"
                  { name ":" type "," } "}" ;
enum_decl     = "enum" name [ generics ] "{"
                  { name [ "(" type_list ")" ] "," } "}" ;
alias_decl    = "type" name [ generics ] "=" type ";" ;

fn_decl       = [ "partial" ] "fn" name [ generics ]
                  "(" parameters ")" "->" type
                  { contract } block ;
query_decl    = "query" name "(" parameters ")" "->" type
                  { capability } block ;
change_decl   = "change" name "(" parameters ")" "->" result_type
                  { capability } { contract } block ;

capability    = ("reads" | "writes" | "emits") "(" names ")" ;
contract      = ("requires" | "ensures") proposition ";" ;
state_decl    = "state" name ":" type "=" expression ";" ;
event_decl    = "event" name ":" type ";" ;
keep_decl     = "keep" name ":" type "=" expression ";" ;

theorem_decl  = "theorem" name [ generics ] "(" parameters ")"
                  ":" proposition "by" proof_script ";" ;
rewrite_decl  = "rewrite" name [ generics ] "(" parameters ")" "{"
                  { "requires" proposition ";" }
                  "from" expression ";"
                  "to" expression ";"
                  "proof" "by" proof_script ";" "}" ;
implementation_decl
              = "implementation" name "for" path "{"
                  "representation" "=" path ";"
                  "abstraction" "=" path ";"
                  "initialise" "=" path ";"
                  "step" "=" path ";"
                  "observe" "=" path ";"
                  "certificate" "=" path ";" "}" ;

block         = "{" { statement } "}" ;
statement     = ("let" | "var") name [ ":" type ] "=" expression ";"
              | lvalue "=" expression ";"
              | "return" expression ";"
              | "emit" name "(" expression ")" ";"
              | "if" expression block [ "else" block ]
              | "for" name "in" expression block
              | "while" expression block
              | expression ";" ;

type          = path [ "<" type_argument { "," type_argument } ">" ]
              | "fn" "(" type_list ")" "->" type
              | "{" name ":" type "where" proposition "}"
              | "(" type_list ")" ;
```

Expressions include literals, names, field access, calls, method calls, record construction, enum construction, tuple/list construction, lambdas, `match`, unary operators, binary operators and postfix `?`. Type arguments can be types or permitted compile-time constants such as array lengths.

From strongest to weakest, precedence is: member/call/index/postfix `?`; unary `!` and negation; multiplication; addition/subtraction; ordered comparisons; equality/inequality; `&&`; `||`. Arithmetic associates left. Chained comparisons are rejected. Parentheses override precedence. Assignment is a statement. Fixed-integer division and shifts use named operations as specified above.

Integer literals use an expected numeric type when available and otherwise default to `Int`. Floating literals default to `f64`. Literals outside a fixed type’s range are rejected; they do not silently wrap. Generic inference must be unambiguous.

Proof expressions add universal/existential quantification, implication and logical conjunction/disjunction. A proof-position equality is a proposition; an executable equality comparison returns a Boolean. Elaboration distinguishes the two contexts explicitly.

This grammar is an implementation-facing outline of the proposed surface. A parser release must publish its full machine-readable grammar, including pattern and proof-term productions, and ambiguity tests. The kernel calculus and certificate binary format are separate specifications required before a conforming verifier can be released.

## 21 Performance evaluation

The benchmark suite compares complete implementations of the same semantics. It includes expert C/C++ and Rust baselines, and established specialised systems where relevant. A naive rescan baseline is insufficient evidence of a language-level performance lead.

Required workload families include:

- Flat array transformations with fusion opportunities.
- Aggregations over small and large batches.
- State updates with maintained totals and filters.
- Read-heavy versus write-heavy indexed lookups.
- Skewed and changing key distributions.
- Small requests where runtime overhead dominates.
- Large working sets where memory bandwidth dominates.
- Cases where incremental maintenance costs more than recomputation.
- Native and Wasm versions of equivalent applications.
- Workloads with and without durable commits.

Reports include end-to-end latency, throughput, peak memory, allocation, compilation time, proof-checking time, adaptation overhead and migration pauses. Cold and warm execution are reported separately. Durability and correctness settings match between systems.

Holdout workloads and distribution shifts test whether local learning generalises. The runtime must remain correct when all performance assumptions fail. Performance regressions are bugs in selection or implementation, not proof failures unless behaviour also changes.

The criterion for success is a measured advantage on declared workload classes at a stated total cost. “Fastest language” is a research ambition, never an unqualified benchmark conclusion.

## 22 Implementation stages and acceptance

| Stage | Deliverable | Acceptance condition |
| --- | --- | --- |
| Semantic baseline | Parser, type/effect checker, interpreter, tables and transactions | Executable examples have unambiguous results and abort/event behaviour |
| Proof core | Fixed logic, small kernel, theorem objects, contract checking | Invalid certificates and illicit assumptions are rejected |
| Static native compiler | Rust implementation, LLVM output, efficient baseline | Compiled and interpreted semantics agree on systematic validation suites |
| Initial knowledge store | Immutable rules, local import, pinned dependencies | Imported rules are checked and demonstrably change eligible compilation plans |
| Incremental execution | Proved sum/count maintenance and basic fusion | Certificates cover all supported update and error paths |
| Persistence and Wasm | Logical snapshots, recovery, host ABI, browser example | Native-to-Wasm state round trips preserve logical observations |
| Adaptive runtime | Profiling, bounded search, safe migration, rollback of implementation choice | Distribution shifts preserve behaviour and adaptation costs are measured |
| Expanded search | Representation synthesis, richer operators, shared registry | New knowledge improves selected workloads without widening the trust policy |
| Deeper verification | Lowering/runtime models and checked executable paths | Stronger claims are supported by an explicit end-to-end argument |

Interpreter comparison, fuzzing and benchmarks are valuable engineering checks. They are not substitutes for the proofs promised by a verified mode.

The first convincing demonstration is one application with a scan implementation and a checked maintained implementation. Importing a proof package changes the selected plan; both implementations produce the same queries and events; a checkpoint moves between them; performance is measured against a manually maintained baseline. This directly tests the language’s central proposition before building a large ecosystem.

## 23 Decisions to settle before implementation

The draft makes concrete choices for state, effects, arithmetic, ordering and proof acceptance. Several substantial specifications still require dedicated work:

- The exact kernel calculus, its metatheory and the validation strategy for its implementation.
- The full executable grammar and proof-term encoding.
- Canonical semantic-object and snapshot byte encodings, including schema evolution.
- A formal simulation interface covering transactions, errors, events and termination.
- Runtime storage protocols for each durability adapter.
- The stable native/Wasm host ABI and ownership of exchanged buffers.
- The first transformation vocabulary and target cost model.
- Which portions of lowering and runtime are trusted in each released verification profile.

These are implementation gates rather than reasons to postpone a reference interpreter. The interpreter, kernel and initial sum-maintenance certificate should evolve together so disagreements between intuitive syntax and precise semantics appear early.

The project should preserve Frontier’s useful direction—explicit changes, adaptive execution and inspectable state—while keeping the initial semantic core small. The central product is a language whose compiler can acquire new, checkable implementation knowledge and apply it without changing what a program means.

## 24 A worked optimisation certificate

Consider a logical table of signed integer weights. Its query returns the exact sum of all values. An update sets one key to a new value. This example uses mathematical integers throughout, so modular overflow cannot invalidate subtraction.

Let `rows` be a finite map, `k` a key and `v` the replacement value. Define `old(rows,k)` as the existing value or zero when absent. The reusable theorem is:

```text
sum_values(set(rows, k, v))
    == sum_values(rows) - old(rows, k) + v
```

The library establishes this theorem from finite-map update and exact-integer addition laws. An absent key and a present key are separate cases. An implementation cannot replace exact arithmetic with bounded arithmetic by appealing to this theorem alone.

The logical and physical machines are:

```text
Logical state:
    rows

Physical state:
    rows
    cached_total

Abstraction relation:
    physical.rows == logical.rows
    physical.cached_total == sum_values(logical.rows)

Logical step set(k, v):
    rows := set(rows, k, v)

Physical step set(k, v):
    previous := old(rows, k)
    rows := set(rows, k, v)
    cached_total := cached_total - previous + v
```

Substituting the abstraction relation into the physical update gives:

```text
new_cached_total
    == old_sum - previous + v
    == sum_values(new_rows)
```

That establishes preservation of the relation for this step. Initialisation calculates the total once, and query equivalence follows directly from the relation. Deletion needs its own step theorem. Batches compose these steps. Transaction abort requires that neither table nor cache become committed.

The same proof is reusable for many applications because it quantifies over arbitrary finite maps, keys and integer values. Package metadata can index it under finite maps, exact sums and set operations.

A profile may reveal that maintained sums are beneficial for frequent queries and small updates. If updates dominate and queries are rare, recomputation or lazy maintenance may be preferable. That performance choice does not alter the proof.

To run the physical cache in a machine integer, a second package can establish a bound on every intermediate result, or use checked arithmetic with a fallback that retains the correct exact result. The proof database composes these facts; it cannot discard the extra arithmetic obligation.

## 25 Reference execution rules and proof object interface

The reference interpreter evaluates pure expressions over an environment of typed values. A transaction adds a working state copied logically from the committed state, a staged event list, and a return status. The copy need not be physical.

```text
Begin(S):
    working := S
    events := []

Write(root, key, value):
    update working only

Read(root, key):
    read working for a change
    read the selected committed snapshot for a query

Emit(channel, value):
    append to staged events

Return Ok(value):
    commit working and events atomically
    return value with the new commit position

Return Err(error):
    discard working and events
    return error with the unchanged committed state
```

A change calling another change shares the same working state and staged events. There is no independently observable nested commit. A keep is evaluated against the same working or committed state as its reader. A durable adapter must make the commit durable before acknowledging it according to its advertised storage contract.

For a total pure expression, equivalence means equal returned values under all allowed inputs. For a state machine, equivalence means matching query results, commit/abort results, public commit positions and ordered event traces for every allowed input sequence. Physical caches, layouts, proof objects, allocation patterns and ordinary timing are outside that observation interface.

The first proof-object interface accepts a typed abstract syntax tree with these families:

| Proof term | Purpose |
| --- | --- |
| Bound variable and theorem reference | Use a local premise or an exact dependency |
| Lambda and application | Introduce or eliminate a universally quantified statement or implication |
| Constructor and eliminator | Build and reason about an inductive type |
| Equality reflexivity and transport | Establish definitional equality and replace equals |
| Universe and dependent function | Describe typed quantification |
| Verified decision certificate | Invoke a specified checker whose soundness theorem connects its accepted certificate to the proposition |

Reflexivity accepts expressions equal by the kernel’s terminating reduction rules. Equality transport substitutes only along a checked equality proof. Induction uses the eliminator of an accepted inductive definition, not an arbitrary recursive function.

The external proof-script grammar is a producer of these objects:

```text
proof_script = tactic { "," tactic } ;
tactic       = "normalize"
             | "arithmetic"
             | "intro" names
             | "exact" proof_expression
             | "apply" path
             | "rewrite" path
             | "cases" name
             | "induction" name ;
```

The named scripts in earlier examples are requests to the elaborator. For an implementation to accept them, it must actually construct a checked object. No example grants a theorem by the spelling of its tactic.

Proofs are erased only when they do not determine runtime data. The type system prevents programs from inspecting proof identity. Erasure, equality transport and refinement elimination need explicit rules in the fixed core calculus. A core implementation must publish those rules and its tests alongside the checker.

This interface makes the architecture implementable in stages without claiming the kernel has already been proved sound. The first supported proof vocabulary can be small; unsupported certificates are rejected, and unsupported optional optimisations retain the baseline.
