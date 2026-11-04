# Learnable holes

A `learn` hole is an unknown pure function inside ordinary code. You name it,
give its inputs and declare the family of functions training may choose from.
Contracts decide where a hole is allowed: learning may only change behaviour the
authored program leaves open.

```ink
// Discrete hole: only reached where the authored table has no entry.
fn step(s: State, c: Class) -> Step {
  return authored(s, c).unwrap_or(learn recover(s, c): choice<Step>);
}

// Continuous hole: an authored score plus a learned, guarded correction.
fn rank(x: f32) -> f32 ensures result >= 0.0 {
  return x + learn adjust(features(x)): Mlp<2, 4, 1> else 0.0;
}

objective mistakes(cases: List<Case>) -> f32 {
  return foldl(cases, 0.0, fn(k)=>fn(t)=>t + choose(step(k.s, k.c) == k.want, 0.0, 1.0));
}
```

The complete program is [`examples/learn-holes.ink`](../examples/learn-holes.ink);
`tests/learn_holes.rs` is its required conformance suite.

## Syntax

```text
learn NAME(ARG[: Type], ...): choice<T>          [else FALLBACK]
learn NAME(FEATURES): Mlp<INPUTS, HIDDEN.., OUTPUTS> [else FALLBACK]
fn NAME(..) -> T ensures PREDICATE { .. }   // guards holes with `else`
objective NAME(..) -> f32 { .. }            // a pure function; lower is better
```

`learn` in expression position is a hole; `learn change` keeps its existing
meaning. `FALLBACK` binds tightly; parenthesise anything larger than a literal,
name or call.

| Family | Arguments | Result | Parameters |
| --- | --- | --- | --- |
| `choice<T>` | 1–8 values of `Bool` or enums without payloads | `T`, `Bool` or such an enum | One table entry per argument combination (at most 4,096) |
| `Mlp<I, H.., O>` | One `List<f32>` of length `I` | `f32` when `O` is 1, otherwise `List<f32>` | Dense layers, ReLU hidden, linear output (at most 16,384 weights) |

`choice` argument types come from function or query parameters, typed `let`
bindings, or an inline annotation such as `learn pick(e: Kind): choice<Kind>`.
Lambda parameters need the annotation. An untrained `choice` entry selects the
first value of `T`. An untrained `Mlp` has small seeded hidden weights and a
zero output layer, so it returns zero.

## Admission

A hole is admitted in exactly one of two ways. Anything else is a compile error.

**Error path.** The hole is the failure arm of `X.unwrap_or(hole)` or
`X.fold(fn(v)=>.., fn(_)=>hole)`. Wherever `X` succeeds the authored value is
returned and the hole is not evaluated, so every input the authored program
handled keeps its exact result. Learning only changes what used to fail. In pure
functions `unwrap_or(hole)` lowers to that `fold`, so the hole is evaluated lazily.

**Guarded.** The hole has `else FALLBACK` and its enclosing function declares
`ensures PREDICATE` (no parentheses; `result` names the return value). The
function runs with learned output; if the predicate fails it runs again with
every guarded hole replaced by its fallback and returns that authored result,
whether or not it satisfies the predicate. The guard constrains learned output,
not the authored program.

Each hole appears once. Holes cannot appear in generic functions, keeps,
contracts, specifications or invariants, and a function that reaches a hole
cannot be passed as a function value. Holes, guards and objectives are
supported in the root module of a module graph.

These rules grant no equality, approximation, rewrite or profitability
authority. They replace whole-action proof admission for learned parts only;
exact code keeps its existing proof obligations.

## Lowering

Lowering is a source-level desugaring into existing constructs. No
executable-core primitive, backend or semantics version changes, and programs
without holes keep their exact source identity.

| Generated | Purpose |
| --- | --- |
| `record __Learned` | One field per hole (`List<u32>` for `choice`, `List<f32>` for `Mlp`) |
| `trainable state __learned` | Current parameters, with snapshots, rollback and events as usual |
| `fn __hole_NAME` | The family's evaluation over the parameters |
| `query __learn_get`, `learn change __learn_set` | Read and validated write of all parameters |
| `query __objective_NAME` | The objective evaluated against current parameters |
| `fn __guarded_FN` | A guarded function's body with a learned/fallback switch |

Functions that reach a hole gain a trailing `__holes: __Learned` parameter;
queries and changes that reach one read `__learned` once and pass it down.
`contracts.learning.holes` records each hole's family, field, parameter count,
admission and declaration; the checker verifies it against the generated code.

## Training

```sh
ink train examples/learn-holes.ink --objective mistakes --data cases.json -o build/model.snapshot
ink build-model examples/learn-holes.ink build/model.snapshot.trace.json \
  --freeze-roots __learned --target javascript -o build/learn-holes
```

`--data` is the JSON array of the objective's arguments. Every candidate runs
with exact reference execution; a change is kept only if it strictly lowers the
objective. `choice` holes use coordinate search over table entries. `Mlp` holes
use simultaneous-perturbation (SPSA) gradient estimates with Adam steps, which
work for any objective the program can compute. `--holes A,B` restricts
training, `--budget` caps evaluations (default 20,000) and `--seed` fixes the
perturbations. Training is deterministic.

The output snapshot is the starting state plus one `__learn_set` commit, and
`MODEL.snapshot.trace.json` replays exactly that commit, so ordinary
`ink build-model` and `ink verify-model --replay` apply unchanged.

## Frozen and live

- **Frozen:** `--freeze-roots __learned` binds the trained parameters into the
  program and withdraws `__learn_set`. Freezing changes source identity, as it
  does for any frozen root.
- **Live:** leave `__learned` trainable. Applications call `__learn_set` (a
  learn change) to publish new parameters, for example after training on
  feedback with `ink train --restore`. Each update is an ordinary transaction.

## Limits

- Relaxed (soft) execution for gradient training through discrete code is not
  part of this layer; `choice` holes are searched, not differentiated.
- `Mlp` training estimates gradients from objective evaluations; it does not use
  source reverse AD, which requires record parameters and its own domain.
- Inline annotation types, fallbacks and guards may reference root-module and
  local names only.
- Search cost grows with table entries times choices times objective cost.
