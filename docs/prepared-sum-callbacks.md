# Preparation through optional and result callbacks

Sealed JavaScript preparation now enters `Option.fold`, `Option.map`,
`Result.fold`, `Result.map` and `Result.map_err` callbacks. Immutable lexical
captures keep their field provenance inside the selected arm. This extends the
[sequential callback](prepared-loop-callbacks.md) mechanism without new syntax.

```ink
module optional_index;
fn member(keys:List<u32>,query:u32)->Bool {
    let index:Map<u32,Bool>=foldr(keys,Map.empty(),fn(k)=>fn(m)=>m.set(k,true));
    return index.contains(query);
}
fn selected(keys:List<u32>,query:Option<u32>)->Bool {
    return query.fold(fn(q)=>member(keys,q),fn(unit)=>false);
}
fn captured(keys:Option<List<u32>>,query:u32)->Bool {
    return keys.fold(fn(xs)=>member(xs,query),fn(unit)=>false);
}
```

Binding `selected`'s keys permits one readonly index to persist while the optional
query changes. `None` constructs no index; the first reached `Some` constructs
it, and later queries reuse it. Different syntactic arms retain separate helpers.
The complete sum receiver executes once before its branch. Unvisited arms remain
lazy, and thrown computations retry rather than becoming successful cached values.
An ordinary source `Err` remains an ordinary value.

## Captured payloads and changing computation

A captured complete immutable sum also fixes its selected payload. For example:

```javascript
const entry = model.compiledValues.captured;
const keys = entry.params[0].capture({Some:[1,2,3]});
const token = model.prepareCompiled('captured', [[0,keys]]);
const query = entry.params[1].capture(7);
const answer = entry.result.materialize(model.callPreparedCompiled(token, [query]));
```

The payload's stability can cross ordinary forwarding helpers. In contrast, an
uncaptured sum keeps its payload dynamic; binding only the query does not fix a
changing list inside `Some`. Changing weights, features and context require fresh
outputs and derivatives. The `None` callback's Unit argument is constant at that
branch. Loop elements, indices and carried state remain dynamic even for a fixed
collection: different iterations are different evaluations.

This is literal execution support over sealed snapshots. It does not freeze
trainable source state, authenticate an opaque graph or authorize an algebraic
replacement. Stateful learning does not implicitly acquire this pure-call lane.
Mutable/owned payloads, results and captured owners retain ordinary execution and
existing loan checks. Checked private sum spines use their existing view/constructor
operations; public schemas, exact transport bytes and record layout authority do
not change. `ok_or` retains its ordinary strict default evaluation.

## Bounded work selection

The optional analysis discovers up to 64 sufficient captured-input conditions,
with 512 visits and depth 32. Core typed lexical traversal classifies source sum
sites; its separate module walk is bounded by 200,000 nodes and 4,096 per body.
Unknown or exhausted analyses lose optional preparation, preserving source calls.
Existing sixteen-level helper, binding, ownership and emitted-source limits apply.

Tiny immutable aliases, literals and field reads remain direct reads. A bounded
structural work estimate considers collection work, larger helper computations
(32 visited nodes) and larger record construction (four fields) for retention.
This estimate grants neither a source fact nor measured profitability. It can
miss opportunities or lose on short lifetimes. Factory-local policy tests share
immutable results. If the captured mask cannot reuse discovered work, the factory
uses its ordinary function; delegated sites retain a direct ordinary call when
preparation is unavailable, out of depth or unhelpful under that policy. No source
values, guards, application actions or profitability probes run to make that choice.

## Validation and performance scope

The standalone `prepared_sums` regression compares 111 independent-reference
cases through 6,660 prepared calls across ordinary/checked-flat sum carriers and
native/bit F32 storage. It covers changing variants and payloads, nested sums,
partial record captures, raw floating-point values, strict defaults, preconditions,
failure retry and owned-buffer results. Source-map initialization counters are
separate from the physical sum view's bookkeeping allocations. Existing codec,
transaction, ownership and callback checks remain required.

A distribution fixture additionally compares 112 reference observations across
native, JavaScript, Rust-Wasm and the native GPU host, with one actual numeric
device control. CPU hosts compare exact snapshots, and a further 672 prepared
calls reuse those results. Four binary64 and two source-reverse integration tests
also pass with required Wasm and GPU controls. These are tested domains, not a
proof of the complete implementation.

The [matched study](../reports/prepared-sums-2026-10-16/README.md) retains large
membership/group/coefficient gains across sum arms, alongside cold/setup/memory
costs and an observed 3–4% complex-text regression. Complete text and neural
histories remain separate controls. Enabling callback
traversal does not by itself establish upstream performance parity, whole-source
specialization or automatic application-wide differentiation. The full
[three-project programme](chenglou-optimisation-programme.md) remains active.
