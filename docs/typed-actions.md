# Typed actions and source identity

Ink now retains a typed, ordered representation of each checked action and keep.
This is fixed language elaboration, not a database optimisation catalogue.
`ink emit-actions SOURCE -o ACTIONS.json` exports it; `ink check-actions SOURCE
ACTIONS.json` checks the artifact against the complete checked source module.

The representation resolves locals to slots, record fields to declared field
indices, and state, keep and action references to module indices. Every value
and callback has a concrete type. Calls and record fields retain source evaluation
order. Lazy `&&`, `||`, branches, `?`, query calls and sticky-error change calls
are distinct nodes. Unreachable statements remain in the tree and must still
satisfy source typing and declared effect permissions.

The private CheckedActions witness can only be produced by elaboration or bounded
replay. Replay regenerates the representation and compares canonical bytes; it
never executes an untrusted supplied graph. The identity includes schema,
semantics and the complete checked module identity. Changing a helper, state
schema or unused source declaration changes that identity. Source reconstruction
is checked against the original syntax before making the witness.

Typing judgments come from the existing source checker. A general unifier resolves
contextual constructor types and empty callbacks, then defaults unconstrained
numeric types to u64 and unobserved constructor payloads to Unit. It rejects
inconsistent and recursive types. Elaboration shares a 100,000-node/instruction
budget across bodies; each body’s type solving has a two-million-step budget and 128-level
resolution limit. Source nesting and 16 MiB artifact limits still apply.

## Execution and trust

Lowerers can consume an execution adapter generated
from the witness. It reconstructs source-shaped expressions with explicit inferred
let types and retains expression type judgments in a frozen tree. Those transient
addresses are never serialized or used as proof identities. Original module
identity and snapshot schema remain unchanged. Generated Rust gives discarded
values an explicit type, including constructor payloads that Rust cannot otherwise
infer. Typed empty sums work even when their argument calls a change.

The source adapter and direct interpreter, source checker, type solver, primitive runtime, Rust lowering,
LLVM and host remain trusted implementations. This is an ordered typed tree,
not SSA, ANF, a complete effect calculus or a formal refinement theorem. Legacy
aggregate/bounded/layout authority has not moved into database entries through
this change. It adds no proof kernel acceptance rule and enables no transaction
replacement on the strength of matching syntax alone.

A restricted [whole-action logical model](action-transitions.md) now binds the
actual typed bodies to reads, statement writes, ordered events, returns and
transaction rollback, including total word/Boolean/record helpers. Database
equivalences can replace complete actions in that domain. Nested actions,
expression effects and abrupt `?` exits still need logical correspondence;
physical representations, restoration and profitability require separate
obligations. Direct baseline execution supports more than this proof domain.

See reports/typed-actions-phase1 for validation, including concrete order and
rollback assertions and exact snapshots for native and compiled Wasm execution.

## Direct reference execution

The reference runtime now executes the sealed `Body` node and instruction
trees directly. Calls, table roots, keeps, record fields and locals use their
resolved indices; literal types come from each checked node. Each invocation
has a slot frame. Callback parameter slots are restored on success, domain
exit and host failure. Branch-local slots cannot alias an outer binding.

Operands, fields and call arguments execute in source order. Boolean branches
remain lazy; `ok_or` evaluates its fallback eagerly. Query and Result-valued
keep errors remain local values. Failed nested changes remain sticky. The
existing table primitive, undo journal, event staging, commit boundary and
snapshot codec are shared with the transitional aggregate projection path.

`CheckedActions.execution()` remains available to lowerers as a checked source
adapter with resolved types. Reference actions and keeps no longer consume
that adapter or its transient expression-address table. Canonical source, typed
action and snapshot identities are unchanged.

Legacy maintained-row projections still use the source-expression evaluator
and specialised aggregate admission. This execution change does not retire
that optimisation authority or prove a source-to-logic interpreter, all-future
stateful replacement, native storage correspondence or physical rollback.
The elaborator, direct interpreter and primitive implementations remain
trusted. Matching executions are validation evidence, not universal proofs.

## Table resources

`Table<K,V>` describes a declared state root, not a first-class value. Tables
cannot be returned, copied into locals/keeps/records/events, nested as table
payloads or passed as parameters. Read and write capabilities authorise literal
root receivers such as `Rows.get(key)` and `Rows.values()`. Values produced by
those operations are ordinary values. A callback-local name that shadows a root
is resolved as its local slot, not as a capability. Unsupported resource escapes
now fail at admission instead of failing later during execution. This fixes an
accepted-but-unexecutable source shape without adding an optimisation rule.
