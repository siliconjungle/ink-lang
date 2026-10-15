# Preparation across pure helpers

An explicit sealed JavaScript partial call can now retain stable work inside
ordinary helper calls. Capturing a network fixes its immutable graph; weights,
context and training targets can continue to change. No new Ink keyword is needed.
The source [example](../examples/prepared-network.ink) uses ordinary functions:

```ink
module prepared_network;
import "std:neural" as nn;
fn predict(network:nn.Network,weights:List<f32>,context:List<f32>)->Result<List<f32>,String>{
 return nn.predict(network,weights,context);
}
```

After `ink build examples/prepared-network.ink --target javascript -o model.mjs`,
use the existing sealed value interface:

```javascript
const entry = model.compiledValues.predict;
const graph = entry.params[0].capture(network);
const prepared = model.prepareCompiled('predict', [[0, graph]]);
// Capture changing weights/context at their own update frequency.
const output = model.callPreparedCompiled(prepared, [weightsHandle, contextHandle]);
const detached = entry.result.materialize(output);
```

The source network constructor is `model.functions.network()`. Its successful
`Ok` result is ordinary host data that can be captured by the graph parameter
codec. Every handle/token belongs to that emitted module. Capture validates and
detaches host data; materialization returns detached data. Capturing a mutable
optimizer's current weight list does not make future versions visible through
that old handle: capture the new weights after an accepted update.

## What is retained

Each syntactic helper-call site lazily creates a private residual helper. A bound
parameter mask is derived from lexical dependencies, including transitive aliases
and expressions. It asserts stability within that token, not validity of arbitrary
graph data. Actual arguments execute once in their source order before the callee.
A stable successful Boolean check or readonly lexical value can persist. A source
`Result.Err` is an ordinary value; a thrown failure never completes a cache entry.
Branches and sum callbacks remain lazy. Entry preconditions run before caches.

This makes topology validation execute once per graph-bound prediction token.
The first valid-shape call still validates every graph edge/root. A forged graph
still returns the original error, with the same ordering relative to input/target
shape errors. Every changed input computes fresh primal values and derivatives;
the feature does not authenticate or reuse a caller-supplied forward tape.

There is no global memo table, runtime profitability probe, source rewrite law or
neural-network recognizer. The same mechanism works through ordinary prepared
lookup helpers. Pure inputs never become uniquely owned because a call is being
prepared. Owned temporaries can be retained only under the existing readonly-loan
check; dynamic consuming updates rebuild them. Helper parameters/results containing
owned Buffer/Map storage use ordinary calls.

## Bounds, scope and evidence

Each residual body has bounded source work, depth, binding count and emitted size.
A helper path prepares at most sixteen levels before using ordinary calls; helper
factories are created only at visited call sites. Missing/oversized/recursive
factories retain the literal implementation. Metadata reports retained bindings,
delegated calls and fallback reasons. Collection callback bodies and arbitrary
nested expression shapes do not acquire automatic interprocedural preparation.

This is an explicit JavaScript pure-call capability. Stateful action/query calls
still use their existing preparation/keep machinery; this milestone does not
silently install these private helpers into a mutable learning session. Native,
Wasm/device preparation, automatic staging, graph unrolling, source reverse AD and
F64/complete Pretext fidelity remain separate work. The emitter, dependency/loan
analyses, value boundary and JavaScript engine remain trusted.

The mandatory tests compare complete results with the independent evaluator for
ordinary helper graphs, aliases, errors, changing parameters, malformed networks,
NaNs and signed zero. Instrumented diagnostics check one topology validation per
token and output/input isolation; timings use unmodified modules. The
[retained lifecycle study](../reports/prepared-helpers-2026-10-16/README.md) includes
Handwired's own executors and faster direct/dense controls. Reuse alone does not
authorize automatic selection or establish whole-application performance.
