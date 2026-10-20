# JavaScript call boundaries and prepared destinations

Ink emits fixed-arity representation adapters for scalar-result public calls,
owned calls and destination calls at ordinary exact arity. Collection/record-returning
public calls keep the established compact adapter after a fresh Chrome process
exceeded the forecast regression budget with the broader specialization.
Inputs convert once, from left to right, before the original contract check and
body. Ordinary and owned calls keep their existing result representations.
Entries requiring no conversion or contract remain direct functions. Unusual
arity retains the previous variadic path. Tables exceeding 262,144 adapter bytes
retain compact generic adapters; this optional mechanism does not raise source
admission limits.

A single scalar conversion cannot revisit an input object. That path omits
conversion memo allocation. Multiple converted object inputs and converted composites
retain an invocation-local, schema-specific memo, including repeated tagged
float inputs. No mutable host object is retained across calls.

## Explicit prepared output storage

```javascript
const codec = module.compiledValues.shift;
const captured = codec.params[0].capture(hostValues);
const prepared = module.prepareCompiled('shift', [[0, captured]]);
const amount = codec.params[1].capture(0.25);
const destination = new Float32Array(hostValues.length);
const count = module.callPreparedCompiledInto(prepared, [amount], destination);
```

This extends existing sealed-value preparation. Bound and changing arguments
remain module-owned typed handles; mutable original host inputs are never
retained. Binding validation, invariant guarantees and declared preconditions
follow `callPreparedCompiled`. Contracts run before destination writes.

The caller supplies sufficiently large, disjoint storage, as for `functionsInto`.
Only the first returned `count` elements are written; the tail is untouched.
This trusted destination interface has no wire/materialization resource budget.
It is synchronous and writes are not transactional: an exception from a
destination setter can leave partial output. Arbitrary setters and capacity are
not validated. Use the bounded codec interfaces for untrusted transport.

The destination uses ordinary JavaScript public values: finite float values are
Numbers, while nonfinite float values retain exact bit tags. A typed numeric
array is appropriate when its elements fit that representation. Use an ordinary
Array when preserving tagged nonfinite results or structured elements.
`compiledValues.result.materialize` keeps its existing canonical bit-tag format.

For eligible terminal scalar-list stages whose preparation retains no lexical
computation, the existing destination emitter writes directly without allocating
a result list or result handle. Unsupported terminal forms retain the ordinary
result-list fallback. Residual bodies keep their existing successful-value caches and
copy final elements. Structured elements are deeply detached, including nested
lists and tags. Mutating a destination cannot change retained inputs, cached
values or earlier returned results. There is no new memo table or retained
scratch pool. Intermediate stages and residual result lists may still allocate.

This also avoids constructing canonical float-tag records only to materialize
their numeric values at the destination. Records returned by source helpers may
still exist before detachment; public output records remain necessary. No
arithmetic, loop ordering, equality, source identity or planner authority changes.

## Validation and measurements

`lowerings/js/tests/call_boundaries.rs` compares complete results against the
independent reference evaluator in native F32, captured F32, bit-carrier F32 and
binary64 modes. It covers NaN payloads, signed zero, nested output mutation,
foreign handles/tokens, changing inputs, contracts, retry, destination tails,
typed arrays, retained residual indexes and compact-adapter fallback. A separate
allocation probe checks the terminal scalar-list result array is absent. A
separate four-mode regression verifies that private copier symbols cannot rename
source field/type names containing `__ownedValue`; helper namespaces are assigned
as symbols rather than text replacements inside emitted code or schemas.

The public [complete-call corpus](../bench/functionality/call-boundaries/README.md)
measures ordinary scalar/list/record calls, reusable public destinations, prepared
destinations and capture/preparation included in the timed interval. Its source
is authored in Ink and does not depend on an application repository.
Node 22.22.1, Node 26.1.0 and real Chrome remain separate gates. Conformance is
finite validation, not a proof of emitted code or V8 correctness.
