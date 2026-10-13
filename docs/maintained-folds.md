# Maintained folds, lean actions and subscriptions

Ink can now admit a source keep as a maintained fold through a commutative group.
The knowledge database supplies the row contribution, combination, inverse and
identity, together with proofs. The JavaScript source-state emitter executes those
checked definitions and updates auxiliary folds at concrete cell mutations.

## Admission and scope

A `maintained` step in an `ink-compiled-plan-v1` packet carries
`ink-maintained-fold-v1`. Admission binds the complete source module and its exact
derived keep observation. For each keep the checker regenerates eight obligations:

1. The source keep equals the fixed fold for every row sequence.
2. The identity is a left identity.
3. Combination is associative.
4. Combination is commutative.
5. The inverse cancels a value.
6. Inserting a cell adjusts the fold by its contribution.
7. Deleting a cell removes its contribution.
8. Replacing a cell removes the old contribution and adds the new one.

The factorisation includes arbitrary row order and duplicate rows. Native source
tables implement the original ordered, unique map contract; portable ingress
rejects duplicate or unordered keys. The per-cell laws and commutativity license
maintenance independently of a cell's position. Neither a schema name, a source
hash, an observed range nor a producer pattern establishes any of these equations.

The capability accepts closed U64 or Bool group definitions, arbitrary supported
row/key codecs, up to 64 independent views, and multiple source tables. Each view
currently factors through one table. Products compose at the runtime boundary.
The installed producer authors wrapping U64 sums, counts, filtered contributions
and mapped contributions such as weighted totals. Its word-key and algebraic
tactic limits are reported as declines. Other group definitions require their own
proofs. IEEE floating addition, minimum and other non-invertible aggregates cannot
use this capability without a different valid representation.

The compiler emits the admitted contribution/group bodies literally. It does not
recognise aggregate function names or install a backend-authored replacement.
The fixed native cell/fold controller, ownership codecs, source table primitives,
target compiler and generated JavaScript remain trusted implementations. These
proofs establish the mathematical factorisation and cell equations; they are not
a formal proof of the emitted runtime or a compiler-correctness theorem.

Auxiliary values are rebuilt from validated rows at restore, never accepted from
snapshot bytes. Failed actions restore cached before-images; host rollback restores
the original caches and cells. Every version and ordered event is retained.
Checkpoint bytes and source/schema identity are unchanged, allowing portable
baseline-to-selected migration at a transaction boundary.

## Native definitions and whole actions

A view may supply `update: {function, proof}`. The kernel checks the function's
three-scalar signature and its equality to `combine(combine(total,inverse(old)),new)`
for arbitrary scalar arguments. `contribution_choice: {function, proof}` similarly
checks a complete key/row contribution against the original factorised function.
Missing choices retain the original definitions; forged choices reject admission.
The producer authors wrapping replacement arithmetic and ordinary word-law
simplifications, including zero multiplication in counts, through row cases and
Boolean branch proofs. No algebraic matcher in the backend grants these changes.

JavaScript has a bounded native lane for scalar definitions and source record/vector
fields. It emits literal calls, branches and arithmetic on the actual source
carriers, removing private constructor codecs and recursion wrappers. Unused opaque
fields need no codec; inspecting unsupported or recursive carriers declines to the
ordinary literal lane. Checked record elisions are reflected in field access.
Modular arithmetic regions carry bounded BigInt representatives (at most 256 bits)
and normalize before comparisons, division, branch/output boundaries or excessive
intermediate growth. This is trusted primitive lowering, not a compiler-correctness
proof. Native cell preparation is emitted per root, with one insertion/deletion/
replacement branch and fixed view sites; partially native roots retain the loop.

The installed `cell_actions` and `early_return` recipes propose one upsert for an
explicit contains/replace/insert branch, and move parameter-dependent returns ahead
of prior statements. The existing whole-action checker must prove every action's
result, error, state, commitment, version and event observations for arbitrary
initial states. These are proposals, never permissions from a syntactic pattern.
An earlier competing failure rejects a move. Resource exhaustion is outside the
existing whole-action equality domain. Ordinary induction lemmas bridge equivalent
generated definitions when lexical allocation renames helpers used by unchanged
queries; identities themselves grant no equality authority.

## Map and bounded array storage

`physical.dense_prefixes` specifies sorted, unique table/capacity pairs. Capacities
are bounded at 1,048,576 and apply to U32/U64 keys. Keys within the prefix use array
slots; every other valid key uses an exact map fallback. This is one fixed storage
implementation. It never infers a source range from a profile, silently narrows
keys or changes the meaning of a key outside the proposed range.

Emission currently supports maintained source folds and dense prefixes on
JavaScript. Other target APIs explicitly reject those choices. Their ordinary
source implementations remain available; the planner must select a compatible
packet. This does not claim device execution of maintained state.

## Lean action machinery

The core derives a conservative maximum number of individual cell writes from
checked action trees. Branches, nested actions and argument evaluation are included;
unbounded bulk writes decline the single-cell bound.

Outside an existing host transaction, actions with at most one cell write stage
that cell and install it only after successful result conversion, domain checks
and commit-sequence checks. Reads within the action see the staged value.
Aborts discard it. Auxiliary maintenance is deferred until a keep is read or the
action succeeds; staged keep reads use private scalar scratch without changing the
committed caches. Aborted paths that never read a keep perform no maintenance.
This avoids a write-and-undo journal and aggregate before-images on this path. Multi-cell actions retain
the existing journal. Owned inputs/results, fuel, versions and events remain.
Non-Result action bodies omit the domain-error catch wrapper. Typed bound calls
use fixed-arity factories, and invocation
contexts and scalar cache before-image storage are reused.
Bound changes without preconditions capture parameters into lexical locals and
call their action directly, without argument arrays, spread invocation or action-kind
dispatch. Preconditions retain the ordinary evaluation path. Fixed table primitives
take typed arguments directly. The first emitted event uses scalar staging slots;
additional events preserve their ordered staging array. Parameterless subscriptions
use direct readonly calls, and immutable scalar publication skips redundant codecs.
Fresh flat result containers may cross directly when every child is an immutable
native scalar. Stored composites, nested containers, exact Int and float-bit
carriers retain their ownership/conversion codecs. This is a conservative checked
shape fact, not a caller promise about aliasing.

No new transaction syntax is necessary for a source action: an existing `change`
that calls several nested changes already provides one atomic source boundary and
one commit. The host adds a synchronous convenience boundary:

```js
state.transaction(s => {
  s.invoke('debit', [account, amount]);
  s.invoke('credit', [other, amount]);
});
```

A failed change or thrown error rolls the whole callback back, even if the
callback ignores a returned Err. Successful individual calls retain their version
and event identities. Existing manual begin/commit/rollback methods remain
available. Async callbacks are rejected; the API is a synchronous host boundary.

## Compiled subscriptions

```js
const close = state.subscribe('total_query', [], total => consume(total));
state.batch(() => {
  put(1n, 7n, true, false);
  put(2n, 9n, true, false);
});
close();
```

Dependencies are compiled from checked transitive table reads, including query
preconditions. They are conservative table edges, not a dynamic per-key/per-field
graph. Only affected queries are evaluated. Compiled type equality cuts off
unchanged outputs, preserving full integer and float-bit observations.
Subscriber parameters and callback results are owned. Disposal is idempotent.

Notifications follow successful commits. A batch combines publications without
rolling back its committed actions; a transaction defers them until commit and
publishes none on rollback. Restore holds publication until its asynchronous
boundary finishes, including when it fails. Subscription creation requires a
transaction boundary. Ordinary state and checked representations expose the same
API, so selection preserves this host interface.

Affected query values are collected before consumers run. Reentrant writes are
published in subsequent passes, with a 1,024-pass budget. Listener errors do not
roll back a committed action or prevent other consumers from running; retrieve
them with `takeSubscriptionErrors()`, or provide `onError` at subscription time.
This is a state host lifecycle and does not add UI or DOM semantics.

## General offline selection

`producers.maintained_folds` is registered as an ordinary external recipe. It
proposes map and bounded-prefix alternatives. Fresh whole-chain replay is mandatory.
The planner distinguishes their admitted package identities from the baseline.

A schema-2 measurement workload supplies source setup calls, complete histories
and explicit lifecycle weights. Phases include `module_load`, `initialise`,
`history`, `checkpoint` and `restore`. Each history starts from the same portable
source snapshot outside its timed window; its timing includes the whole history
and full observation consumption. Calls use a shared prebound typed API.

The independent source evaluator supplies every result/error, version, ordered
event and portable snapshot. Candidates must match before and after measurement
and must not mutate captured inputs. Each candidate runs in separate fresh Node
processes. Memory is the conservative whole-process peak RSS, including the
measurement adapter. Cold setup and restore can change which candidate wins.
Absent comparable evidence retains the baseline.

Training and held-out histories may share parameterless reads and initialisation,
but complete transition histories must differ. The holdout only accepts or rejects
the frozen winner. Existing empirical gain/sample guards and exact provenance
remain in force. No profitability probes or algorithm search run in application
invocations. Supplied state histories are required; synthetic pure probes do not
stand in for application state lifecycles.

See `examples/maintained-ledger.ink` for independent tables, weighted and filtered
keeps, nested failure and observations inside actions. See `tests/maintained_state.rs`
and `tests/signals_state.rs` for source-oracle histories, forged-proof rejection,
wraparound, commit exhaustion, rollback, ownership and subscription coverage.
