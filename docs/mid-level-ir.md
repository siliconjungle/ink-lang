# Mid-level IR

The mid-level IR (`core/src/mir.rs`, format `ink-mir-v1`) sits between
checked programs and their emitters. It is a typed dataflow graph that makes
three things explicit:

- **Effect order:** which nodes must run before which, and why.
- **Laziness:** which nodes run only in some branches.
- **Placement:** where each declaration may run.

Backends can then print it rather than rediscovering structure in the source
tree.

```sh
ink emit-mir SOURCE [--simplify] -o program.mir.json
```

## Shape

Every function, query, change and task becomes a graph, and every graph has a
body region. A region is a list of nodes and an optional result. A node has:

- `op`, which is one of:
  - `param`, `const`;
  - `binary`, `neg`;
  - `call` (a pure user function), `builtin`, `method`;
  - `field`, `record`;
  - `lambda`, `gamma`, `try`;
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
when selected. Callbacks become `lambda` regions. In an action, an `if` whose
branches may `return` takes the rest of the block into each branch, so every
region ends with its result and no control flow is implicit.

## Effects

The IR derives effect order from what each node touches:

- **State:** reads and writes are ordered per state. Reads wait for the last
  write; writes wait for the last write and for every read since.
- **Different states:** reads and writes of different states have no order
  between them.
- **Derived values (keeps):** a read of a keep is a read of every state it
  depends on, transitively.
- **Events:** emits are ordered with other emits of the same event.
- **`?`:** may leave the action, so it is a barrier. It waits for every
  earlier effect, and every later effect waits for it.
- **Calls to other actions:** these carry the callee's declared reads, writes
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

## Placement

Placement is derived from effects, most preferred first:

| Graph | Placement |
| --- | --- |
| pure function | client, worker, server |
| query | replica, server |
| change | server |
| task | host |

A query can run on a client against a replica kept current from the commit
log. A change runs where the authoritative state lives. A task runs on the
host that performs its effects, and its steps take their own graph's
placement. Splitting a graph across places is future work.

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

`src/mir_js.rs` prints pure-function graphs as JavaScript:

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

It is a demonstration that backends can be printers over this IR. It does not
replace the pinned JavaScript lowering. Moving that lowering's specialisations
into IR passes is the next step.

## Trust

The IR is analysis and emission structure. Its passes preserve:

- evaluation order, laziness and effects;
- the ownership rules of the program they came from.

It grants no equality, rewrite, representation or profitability authority.
Algebraic changes still need knowledge proofs, and target choice still needs
evidence.

## Coverage

Every example in `examples/` lowers with no unsupported declarations and
verifies, before and after simplification. Locally inferred types are
best-effort: a node whose type depends on context it cannot see has no `ty`,
and printers that need one fail closed.

## Validation

`tests/mid_level_ir.rs` covers:

- every example lowering and verifying;
- per-state effect order and the `?` barrier;
- `&&` laziness;
- independent task effects;
- simplification;
- the printer against the reference evaluator.

`core/tests/mir.rs` checks lowering, verification and forged-edge rejection in
the standalone core.
