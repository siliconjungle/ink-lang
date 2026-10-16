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

## Records with fixed and changing fields

Preparation also carries field-level provenance through immutable record
construction, projections and bounded nonrecursive helper returns. A record can
combine captured model topology, coefficients or text data with a changing query
without making every field dynamic:

```ink
record Context { keys:List<u32>, query:u32, }
fn lookup(c:Context)->Bool {
    let index:Map<u32,Bool>=foldr(c.keys,Map.empty(),fn(k)=>fn(m)=>m.set(k,true));
    return index.contains(c.query);
}
fn run(keys:List<u32>,query:u32)->Bool {
    let context=Context{keys:keys,query:query};
    return lookup(context);
}
```

Binding `run`'s keys allows the helper's readonly index to persist while queries
change. Nested records and forwarding helpers preserve the same distinction.
This is internal execution bookkeeping; there is no new source annotation or
permission to mutate captured data. Changing weights or application inputs remain
dynamic even when they share a record with fixed topology.

A returned value's field dependencies do not describe all work needed to produce
it. A constructor's unused fields, a helper's unused arguments and its checks
still execute at their original positions. A projection of a dynamic call cannot
cache away that call. Conditional/opaque record computations conservatively keep
their complete dependencies. Failed work retries; branches stay lazy. The bounded
summary examines at most 512 nodes and 32 levels, with at most 64 fields per
literal record and 128 input-path dependencies. Expanded alias summaries are
also capped at 512 nodes; repeated private mask expressions share factory-local
constants within the existing generated-source limit. Exhaustion loses optional
preparation rather than source evaluation. Existing helper-depth, ownership,
source-size and iteration rules still apply.

`lowerings/js/tests/prepared_fields.rs` checks 50 independent-reference cases
through 750 prepared calls, nested helpers/loops, changing record selection,
shadowing, raw binary64 values, dynamic discarded work, preconditions and thrown
failure retry. Allocation instrumentation verifies one index construction across
changing queries. This mechanism check does not establish performance parity. The
[matched record study](../reports/prepared-fields-2026-10-16/README.md) records
membership, grouped-aggregate and coefficient-table gains against the prior
emitter, including cold/setup/memory and shorter-warm-up regressions. Complete
text and neural controls still expose the existing upstream performance gaps.

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
