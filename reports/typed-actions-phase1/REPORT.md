# Typed ordered action execution

The core retains concrete checked types and ordered action trees, resolved locals,
state/keep/action references, explicit lazy branches and abrupt calls. A private
source-bound witness regenerates and checks artifacts before execution. Reference
execution and the independent Rust lowerer use frozen execution adapters from
that witness; no database optimisation recogniser or proof acceptance rule was
added. The pinned parallel JavaScript/runtime changes are preserved.

## Validation

The independent core passes 22 tests, including bounded unification, contextual
constraints and recursive-type rejection. A fresh copy passes the same tests
offline without the database, planner, runtime or lowering repositories.

The native fixture runs 16 calls each in scanning and maintained implementations,
comparing all 32 outcomes and exact portable snapshots with reference execution.
Independent assertions cover record-field and call-argument order, eager fallback
argument effects, lazy Boolean calls, tentative reads, rollback after ignored or
captured nested errors, discarded constructors and contextual empty callbacks.
An empty sum returned by a nested change now produces the correctly typed zero,
rather than attempting query-only type inference and failing.

Both generated stateful Wasm modules run the same 32 calls in Node/V8, comparing
every outcome and exact snapshot. This is compiled execution; no browser or timing
claim follows. Valid dead statements remain in source order; invalid dead calls
and undeclared event effects now fail checking. Rust warns about an intentionally
retained unreachable return in the test example.

Artifact tests reject altered types, graph references, branches, change/query
roles, schema, semantics, source identities and unknown trust flags. Changing a
pure helper while preserving action syntax also invalidates the artifact. CLI
emission and replay agree; a tampered schema is rejected. The independent Rust
backend builds against the published core revision and checks offline afterward.
The complete combined distribution passes 196 tests. Metadata records source
hashes and pinned repository identities.
The database pin and its 601-entry snapshot are unchanged; earlier mathematical
replay evidence remains archived separately.

## Reproduction

```sh
python3 dev.py test --locked --offline --no-fail-fast
python3 dev.py test --locked --offline --manifest-path core/Cargo.toml
python3 dev.py test --locked --offline --test action_ir
python3 dev.py test --locked --offline --test state_native \
  typed_action_execution_preserves_effect_order_and_contextual_empty_values
node reports/typed-actions-phase1/wasm-replay.mjs
```

The archived native runner, generated native/Wasm source, source program,
requests, expected results, Cargo manifest/lock and compiled modules reproduce
the focused fixture. To rebuild Wasm, copy generated.rs into src/lib.rs in a fresh
project with the archived manifest/lock and build the library offline in release
mode for wasm32-unknown-unknown.

## Remaining boundary

This is a typed ordered tree, not SSA/ANF or a complete effect calculus. Retained
judgments and source reconstruction are trusted checking, not a theorem equating
an arbitrary database interpreter with source execution. The source checker,
unifier, adapters, primitives, lowering and LLVM remain trusted. Legacy maintained
aggregate, bounded-cache and layout authority remains migration debt. The witness
cannot install a stateful replacement or skip journalling. Whole-action logical
execution, primitive correspondence, physical rollback and representation
refinement remain required. No performance improvement is claimed.
