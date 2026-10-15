# Preparation through sequential callbacks

Sealed JavaScript partial calls now carry lexical stability through sequential
value callbacks and strict subexpressions. Helpers can prepare an immutable index,
table or schema once while loop elements, indices, accumulated values and later
invocation arguments continue to change. No source keyword is added.

```ink
module batch;
fn member(keys:List<u32>,query:u32)->Bool {
    let index:Map<u32,Bool>=foldr(keys,Map.empty(),fn(k)=>fn(m)=>m.set(k,true));
    return index.contains(query);
}
fn batch(keys:List<u32>,queries:List<u32>)->List<Bool> {
    return queries.map(fn(query)=>member(keys,query));
}
```

After compiling to JavaScript, bind only the immutable keys:

```javascript
const entry = model.compiledValues.batch;
const keys = entry.params[0].capture([1, 2, 3]);
const prepared = model.prepareCompiled('batch', [[0, keys]]);
const queries = entry.params[1].capture([7, 2, 9]);
const answer = entry.result.materialize(model.callPreparedCompiled(prepared, [queries]));
```

The index is built lazily at the first reached helper call and reused through
that token. An empty query list constructs no index. A token binds captured
values, not live mutable fields: new keys need a new capture and token. Public
results remain detached; neither inputs nor retained intermediates gain unique
storage through preparation. Changing model weights/context still computes fresh
neural primals and derivatives.

## Execution boundaries

`map`, `map_indexed`, `filter`, `foldl`, `foldr`, `fold_until` and `repeat_until`
can propagate stable lexical captures. Loop arguments are always dynamic even
when the input collection is fixed. Nested callbacks and shadowing preserve that
rule. Different syntactic helper sites retain independent state; no cache is
keyed only by a function name or by an iteration's apparent value.

Strict arithmetic, constructors, field/record expressions and supported strict
calls can reach prepared helpers. Every operand still executes once in source
order. Short-circuit Boolean operations retain their lazy branches. Sum callbacks
retain ordinary lazy execution where residual traversal is unsupported.
`repeat_until` tests before stepping; `fold_until` evaluates its test, executes
that iteration's step and only then stops. Thrown work is retried.

Owned loop state, captured mutable owners, parallel callbacks and unsupported
forms retain ordinary execution and existing loan/ownership checks. Existing
factory depth, source and binding limits still apply. A bounded opportunity scan
(512 visits, depth 32) avoids wrappers with no discovered reusable work. Unknown
means ordinary execution. This scan grants no equality fact, validity assumption
or profitable automatic selection.

## Evidence and limits

The standalone regression compares 147 reference cases through 1,510 prepared
calls under each F32 carrier (native numbers and stored bits), including nonfinite
values, dynamic keys, iteration state, shadowing, laziness, early-stop order,
detached outputs and failed-work retry. The full standalone JavaScript suite and
complete learning/binary64/text target histories validate the implementation.
Neural probes instrument both ordinary and residual invocation bodies; factory
creation itself is not a topology validation.

[Matched measurements](../reports/prepared-loops-2026-10-16/README.md) retain large
gains for repeated membership, grouped aggregates and coefficient tables, while
small inputs and other workloads can regress. Construction/capture, first calls,
retained memory, ordinary calls and faster direct/Handwired/Pretext controls are
reported separately. These results do not establish universal upstream parity,
source-wide reverse AD, full Pretext, device training or a cost-based staging
policy. The [complete programme](chenglou-optimisation-programme.md) remains open.
