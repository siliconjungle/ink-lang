# Prepare defaults while retaining mutable state

A value-state initializer can now refer to an explicitly declared `keep` whose
complete dependency closure is independent of state and action calls:

```ink
module prepared_default;
keep Seed:List<u32>=[2,3];
trainable state Model:List<u32>=Seed;
query read()->List<u32> reads(Model){return Model;}
learn change replace(xs:List<u32>)->Result<Unit,String> writes(Model){
    Model=xs;return Ok(());
}
```

This composes existing language forms. `Seed` is prepared computation; `Model`
remains mutable, with ordinary learning capabilities, transactions and recovery.
A declared read/write of the value cell includes its state-independent initial
value dependency. It grants no additional read or write of another state root.

The frontend checks free variables and follows transitive keep dependencies under
a bounded work budget. Mutable roots, action/query calls inside the prepared
closure and cycles reject. Pure functions still undergo ordinary typing, purity,
precondition and termination checks. A name or source hash supplies no authority.
Existing initializers that do not refer to keeps retain their ordinary admission
and call-capability checks.

## Scope and execution

Elaboration puts the complete prepared initializer in a fresh keep scope, then
uses the existing strict single-cell fallback. The fresh name avoids source
binders and declarations, including callback parameters. Action/specification
interfaces carry the derived read capability consistently. The ordinary checker
still validates the resulting module and effect graph.

Compiled JavaScript, Rust and Rust/Wasm reuse the existing immutable keep support.
Public values remain detached, failed actions preserve logical state, and explicit
restore rebuilds private caches lazily. Kept defaults are excluded from portable
checkpoints. Source Result Err values are ordinary values; thrown failures are
not cached. Owned Buffer/Map descendants retain their existing exclusions.

The fallback remains strict: the first read after restore can prepare the default
even when the cell already contains a newer value. Later reads reuse it. Retaining
an otherwise unused default costs memory; native owned clones also have a cost.
This is authored reuse, without an automatic profitable-staging decision, lazy
fallback rewrite, approximation or frozen-weight specialization.

Previously admitted sources without keep-dependent initializers acquire no new
keeps or capabilities. Newly admitted sources have their own checked source
identity; checkpoints cannot silently cross that identity boundary.

The [staged neural example](../examples/staged-neural.ink) composes prepared
architecture/default optimizer values with mutable weights, Adam moments and
training controls. The [structured default example](../examples/prepared-defaults.ink)
shares a recursive immutable seed across independent mutable cells. These are
ordinary source mechanisms, without a neural-network or datatype-name matcher.

Core admission tests cover transitive mutable dependencies, action calls, cycles,
wrong types, preconditions, lexical capture, generated-name collisions, invariants,
existing query defaults and specification interfaces. Cross-target model/default
histories additionally compare values, errors, events and complete checkpoints.
These checks strengthen implementation evidence; they do not prove the elaborator,
checker, backend, toolchain or AD transform correct.
