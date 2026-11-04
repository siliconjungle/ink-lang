# Mid-level IR

The mid-level IR (`core/src/mir.rs`, format `ink-mir-v1`) sits between
checked programs and their emitters. It is a typed dataflow graph that makes
three things explicit:

- **Effect order:** which nodes must run before which, and why.
- **Laziness:** which nodes run only in some branches.
- **Placement:** where each declaration may run.

Backends can then print it rather than rediscovering structure in the source
tree. The pinned JavaScript lowering already does this for tasks: every
`task` in a module is compiled from its IR graph (see below).

The IR is built from core's own analyses rather than its own guesses:

- **Types** come from the checker. Pure functions use its source inference
  (`check::infer_context`) with the same contextual typing for literals,
  callback parameters and accumulators. Actions, keeps and task steps are
  lowered from the typed action IR (`action_ir::CheckedActions`).
- **Effects** come from the derived action effects
  (`effects::CheckedEffects`). A call to a query or change carries its
  callee's transitive reads, writes and emits. A keep read carries what the
  keep derives from. Table methods write exactly when `effects::TABLE_WRITES`
  says so, the same list the effect analysis uses.

```sh
ink emit-mir SOURCE [--simplify] -o program.mir.json
```

## Shape

Every function, query, change, keep and task becomes a graph, and every graph
has a body region. A region is a list of nodes and an optional result. A node has:

- `op`, which is one of:
  - `param`, `const`;
  - `binary`, `neg`;
  - `call` (a pure user function), `builtin`, `method`;
  - `field`, `record`;
  - `lambda`, `gamma`, `try`, `return`;
  - `read`, `write`, `emit`, `action`, `effect`;
- `inputs`: data dependencies;
- `after`: effect-order dependencies, kept separate from data;
- `regions`: nested regions, for `gamma` branches, `lambda` bodies and effect
  checks and fallbacks;
- `ty`: the value type, where it is known locally.

Ids are unique in a module. A node may use any node defined earlier in its own
region or an enclosing one, and `ink_core::mir::verify` checks exactly that.

## Laziness

`choose`, `&&` and `||` become `gamma` nodes whose branch regions run only
when selected. Callbacks become `lambda` regions. In an action, `return` is a
node that leaves the action. An `if` becomes a `gamma` over its two branches,
lowered once each. The rest of the block follows the `gamma`, ordered after
any `return` inside it. Nothing is duplicated.

## Effects

The IR derives effect order from what each node touches:

- **State:** reads and writes are ordered per state. Reads wait for the last
  write; writes wait for the last write and for every read since.
- **Different states:** reads and writes of different states have no order
  between them.
- **Derived values (keeps):** a read of a keep is a read of every state it
  depends on, transitively.
- **Events:** emits are ordered with other emits of the same event.
- **`?`, `return` and change calls:** each may leave the action, so it is a
  barrier. It waits for every earlier effect, and every later effect waits for
  it.
- **Calls to other actions:** these carry the callee's derived reads, writes
  and emits.

Tasks keep the order their manifest fixes (see [effect tasks](effect-tasks.md)):

- queries, changes and ordered effects follow every earlier step;
- other effects depend only on their data.

A guarded effect carries its reply check and fallback as regions.

Two nodes with no path between them through `inputs` or `after` may run at
the same time. Each graph records a schedule: `depth` is the longest chain in
its body, and `width` is the most nodes of one region that may run together.
In the support-triage task, the customer lookup, the model classification and
the summary have no path between them.

Ink OS uses these facts across apps. Its compiler's `footprints` request
reports each graph's state roots read and written, with keeps resolved to
their roots, and whether a function is pure: no read, write, emit, action or
effect node in any region, and only pure callees. The OS refreshes another
app's read only when a commit writes a root that read depends on. It moves a
consumer's code next to a provider's data only when that code is pure (see
ink-os-platform `docs/cross-app-plans.md`).

## Placement

Placement is derived from effects, most preferred first:

| Graph | Placement |
| --- | --- |
| pure function | client, worker, server |
| query, keep | replica, server |
| change | server |
| task | host |

A query can run on a client against a replica kept current from the commit
log. A change runs where the authoritative state lives. A task runs on the
host that performs its effects.

Each top-level node also records its own `place`, which splits a graph by
where its values become available:
- work that depends only on parameters and constants can run at the caller
  (`client`);
- state reads and writes, `?`, `return`, and everything after them run where
  the state is (`replica` for readonly graphs, `server` for changes);
- in tasks, effects run on the `host`, change calls on the `server` and query
  calls on a `replica`.

Values that flow from client nodes into the others are what a request has to
carry. This is a dependency judgment, not a cost model: it says where work may
run, never that moving it is profitable.

## Passes

`ink_core::mir::simplify`:

- **Merges repeated work:** identical total operations and pure calls on the
  same inputs within one region.
- **Removes unused total operations:** constants, fields, records, negation,
  and arithmetic and comparisons. Ink word arithmetic wraps and has no
  failures.

It never moves work across a branch boundary, never removes calls, effects or
`?`, and never changes effect order.

## Backends as printers

`lowerings/js/src/mir.rs`, in the pinned JavaScript lowering, prints
pure-function graphs as JavaScript:

- one binding per node;
- `if`/`else` for `gamma`;
- curried arrows for `lambda`;
- the compiled JavaScript host's value conventions.

It makes no decisions of its own. Tests check its output against the reference
evaluator on random inputs, before and after `simplify`, for 18 functions:

- wrapping u32 arithmetic, f32 arithmetic and division, records and
  structural equality;
- strings, lists with `foldl`, Option `fold`, enums;
- authored rule chains and learn holes.

### Compiled tasks

`lowerings/js/src/tasks.rs` uses that printer to compile every task in a
module. `ink build --target javascript` adds `export const {tasks,
TaskFailed}` to the module:

- Each top-level node becomes a promise that awaits exactly its `inputs` and
  `after` edges, so independent effects overlap.
- Step expressions and fallbacks run as plain JavaScript, with no round trip
  through generated queries.
- Effect replies still enter Ink through the generated accept query.

Results, traces and the earliest-failure rule match the interpreted host.
`tests/effect_tasks.rs` runs all six recorded scenarios through both and
replays both sets of traces on the reference evaluator. Modules without tasks
emit exactly the same JavaScript as before.

The rest of the JavaScript lowering still emits from source trees. Moving its
specialisations into IR passes is the remaining migration; each moved
specialisation must keep the existing cross-target conformance suites green.

## Trust

The IR is analysis and emission structure. Its passes preserve:

- evaluation order, laziness and effects;
- the ownership rules of the program they came from.

It grants no equality, rewrite, representation or profitability authority.
Algebraic changes still need knowledge proofs, and target choice still needs
evidence.

## Coverage

Every example in `examples/` lowers with no unsupported declarations and
verifies, before and after simplification. A node has no `ty` only when the
checker cannot type it in isolation. This happens with callback parameters of
methods the IR does not know. Printers that need a type fail closed.

## Validation

`tests/mid_level_ir.rs` covers:

- every example lowering and verifying;
- per-state effect order and the `?` barrier;
- a returning branch lowered once, keeps as graphs ordered after the writes
  they read, change calls carrying derived effects, and checker types;
- `&&` laziness;
- independent task effects;
- simplification;
- the printer against the reference evaluator.

`core/tests/mir.rs` checks lowering, verification and forged-edge rejection in
the standalone core.
