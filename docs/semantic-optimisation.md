# Composable semantic optimisation

Ink now has a shared, checked selection boundary for executable expressions.
Database laws describe typed parameters, a `from` expression, a `to` expression,
explicit applicability conditions, a proof and exact theorem dependencies.
Matching and cost estimates cannot authorise a replacement.

```sh
ink emit-core program.ink --optimise knowledge/store/snapshot.json -o selected.json
ink run program.ink function arguments.json --optimise knowledge/store/snapshot.json
ink build program.ink --optimise knowledge/store/snapshot.json -o program.o
ink build program.ink --optimise knowledge/store/snapshot.json --target wasm32 --zig zig -o program.wasm
ink build program.ink --optimise knowledge/store/snapshot.json --target webgpu --zig zig -o gpu-bundle
```

`--optimise` runs the independently versioned, untrusted
`ink-planner/plan.py` producer. Supply `--search-tool PATH`
when that checkout is installed elsewhere. `--search-budget N` bounds candidate
checks (default 128; maximum 4096). The database never nominates an executable
script. Without this option, builds retain their existing baseline behaviour.
`--selection PACKAGE.json` replays an explicit package without running search.
Build plans include the package, checked dependency closure, applied laws and
original/selected module identities.

## One executable meaning

`semantic::Term` is an elaboration of the existing typed executable AST, not a
second source language. Its correspondence uses the same type checker as source
execution. Unsuffixed word literals acquire their actual type before matching.
De Bruijn bound indices make alpha-equivalent lambdas identical and simultaneous
substitution avoids capture. Function holes have typed arrow sorts; they can
bind arbitrary closed lambdas, including captures from the application context.

The bridge covers every expression form currently admitted in pure functions:
word and binary32 values, arithmetic/comparisons/Boolean operators, negation,
local bindings, acyclic calls, choose, bounded repeat, vectors, record construction
and fields, map/filter/zip/indexed map, sum/count/foldr, scan/sort and at_or,
quot_or/rem_or. Other existing value types can pass through as opaque typed
parameters and values. Transactions, table mutations, assertions, try, events
and effectful calls are not converted into pure total expressions.

The checker contains fixed operation semantics and general proof rules, not
optimisation patterns. General computation includes beta reduction, checked
source-call unfolding and operational list/loop definitions. Natural count and
list induction support universal theorems; primitive sorts cannot be redefined
by the database. A wrapping-word polynomial equality decision procedure checks
u32/u64/i32 arithmetic modulo their declared width. It checks theorem equality;
it does not search for or install a new implementation. Floating arithmetic does
not enter that procedure. Float sum follows the reference left-to-right order.
Numeric float equality is not admitted as equality of bit patterns.

Symmetry, transitivity, congruence, case splits, scoped hypotheses and checked
lemma instantiation allow proof composition. A theorem can import only its exact
listed dependencies. Induction rejects premises depending on its induction
variable: such premises cannot silently become induction hypotheses about tails
or smaller counts. Checked catalogues are bound to the exact source definition
context in which their proofs were checked.

## Conditions and composition

Conditions are typed equations, including Boolean predicates equal to `true`.
Each application carries a proof for every instantiated condition. The checker
also derives facts from the actual path through choose and short-circuit Boolean
operations. Branch facts apply only at that site. Local lambda parameters become
fresh universal variables during checking and are restored after substitution.
Measurements and observed inputs never supply a premise.

The external search indexes laws by typed root constructor, visits every
subexpression (including lambda bodies), and repeatedly explores resulting
expressions with a bounded beam. Replacement can expose another law; the checked
package records the sequence. Holes match entire complex expressions, not just
source variable names. Premise production can instantiate catalogue lemmas and
compose them through operators, with semantic computation as the fallback.

For example, in a map lambda:

```ink
(x + x + x) * 1 + 0
```

becomes `x * 3` through several independently checked laws. The repeated `x` may
itself be a compound expression. A natural-induction theorem also turns
`repeat(n, x, fn(i) => fn(acc) => acc + k)` into `x + n * k`, for any source-admitted
literal count and wrapping word type. No repeat-add or triple-add case exists in
the compiler or matcher. These are immutable entries addressed by `knowledge/store/snapshot.json`.

Search validates the dependency closure once in a bounded checker session, then
checks each proposed application sequence against the exact original module.
Exhaustion retains the best valid candidate found, or the unchanged original.
This is bounded optimisation, not a guarantee of a global minimum. The current
cost estimate is structural, not a runtime measurement. Physical CPU/GPU choice
remains a separate capability/cost decision.

A knowledge view has bounded active roots/objects (1024), bytes (16 MB), proof work
and dependency depth. A database may contain more material in separately pinned
knowledge views; increasing its contents neither extends proof authority nor
requires a compiler rebuild. The SQLite API discovers a bounded subset and exports its authenticated dependency closure;
the checker loads that view in full. It is not an unbounded online database service.

## Shared execution and routing

`optimisation::CheckedSelection` has private fields and cannot be deserialised.
It owns the exact selected `CheckedModule`. Interpreter execution, C/Wasm
lowering, GPU bundle emission and stateful Rust helper lowering can consume this
witness. CLI preparation uses that same checker before execution or lowering;
it does not ask each backend to reimplement theorem matching.

The source router additionally accepts `ink-proved-source-routing-v1` through
`check_equivalent`, with an authenticated pinned knowledge view and a proof that the reconstructed graph
matches the entry computation. CLI uses `--route-proof EVIDENCE.json` alongside
`--route PACKAGE.json`. Existing literal v1 routing stays unchanged. The general
checker accepts compute-v2 value statements, but the existing mixed route host
ABI still supports its documented v1 subset; unsupported compute routes reject
before emission. Resident v2 GPU pipelines remain available through their
existing API. A semantic proof does not establish backend availability,
transport correctness or profitability.

## Trust and remaining scope

The observation domain is pure total result values, with binary32 bit patterns
in the reference semantics. Resource exhaustion, allocation failures, interpreter
fuel, host traps, timing and backend-specific floating observations are outside
this equivalence. Existing C/Wasm/WGSL/Rust lowering and their toolchains remain
trusted; accepting a source proof does not certify generated instructions or a
GPU driver. Existing GPU floating capability/observation limits still apply.

The new trusted mechanisms are typed term correspondence, capture-safe
substitution, general equality/induction checking, wrapping polynomial equality,
condition scoping and exact reification. Their Rust implementation is tested,
not formally verified. Hashes identify bytes and contexts, not correctness.

Only pure function bodies are selected, including pure helpers used by stateful
programs. State declarations, transaction statements, capability footprints,
event order and storage policies are unchanged. Direct transaction rewrites,
state/representation migration and durable snapshot compatibility still need
trace/refinement evidence through the existing machine interfaces. This work
does not turn those obligations into pure value equalities or remove the
remaining aggregate/representation migration debt.

Validation lives in `tests/semantic_optimisation.rs` and core-only unit tests.
It covers composed nested rewrites, generic loop counts, overflow, collection
laws, branch conditions, capture, context/identity forgery, floats, actual routed
emission and stateful event outcomes.

## Deterministic database queries

`--optimise KNOWLEDGE_DIRECTORY` selects that store's explicitly pinned
`store/snapshot.json`. SQLite discovery filters canonical entries by typed
result sorts before the compositional AST matcher runs. Entry order is stable
by content identity; replay packages contain the exact authenticated closure.
Adding and publishing a law changes candidates without installing an algorithm
or changing compiler rules. The old research directory-scanning implementation
now lives in `ink-planner/research`; its independent query comparisons remain
regression evidence, not the production storage contract.
