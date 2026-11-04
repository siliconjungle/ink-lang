# The circuit target

`ink emit-circuit` lowers an Ink function over finite types into an exact
neural circuit: affine layers, ReLU and ReGLU-style gates. The compiler then
checks it against the reference evaluator on every input. Authored rules and
learned tables end up in one network, and a learned table is visible as
weights.

```sh
ink emit-circuit examples/circuit-target.ink next [--restore MODEL.snapshot] -o next.circuit.json
```

The output (`ink-circuit-v1`) records:

- the parameters and their values;
- the result values;
- the nodes and the output node;
- one entry per learn hole, naming its lookup layer.

## What lowers

Supported types are those with finitely many values: `Bool`, enums without
payloads, and `Option` of those. Each value is a one-hot vector.

| Source | Circuit |
| --- | --- |
| parameter | input one-hot |
| `Enum.Variant`, `true`, `None` | constant one-hot |
| `a == b`, `a != b`, `!a` | ReGLU gate `relu(a) · b` elementwise, then a sum |
| `a && b`, `a \|\| b` | `t = relu(a + b − 1)`; or is `a + b − t` |
| `choose(c, x, y)` | `relu(c) · x + relu(¬c) · y`, two gates |
| `Some(x)` | affine shift into the option's one-hot |
| `o.fold(fn(v) => A, fn(_) => B)`, `o.unwrap_or(B)` | payload slice for `v`; gated sum of both arms |
| `let`, calls to pure functions | bound values, inlined bodies |
| `learn h(args): choice<T>` | lookup layer (below) |

`if` statements in pure functions already elaborate to `choose`, so authored
rule chains lower directly. Every intermediate value is 0, 1 or a small
integer, so f32 evaluation is exact. The network is a fixed function, not an
approximation.

### Learn holes as lookup layers

A `choice` hole with argument domains `D1 … Dn` becomes two layers:

1. An entry indicator `h_t = relu(Σ_i x_i[t_i] − (n − 1))` for each table
   entry `t`. It is 1 exactly when every argument matches.
2. An output affine layer with one weight `[value, t, 1]` per entry.

That second layer's weights are the table. Entry `t` of the layer is row `t`
of `ink learn-rows`, keyed by the same argument values. Parameters can be
trained as a table, edited as rows through a [gate](learn-rows.md), or read
and written as circuit weights. All three are the same data.

## Checking

Lowering does not rely on trust in the compiler:

- `emit-circuit` enumerates the whole input domain, up to 65,536 inputs.
- It evaluates the circuit in f32 and the function with the reference
  evaluator.
- It fails if any output is not exactly the one-hot of the reference result.

A hole's parameters come from the initial state or `--restore`.

Unsupported constructs fail closed with a diagnostic. These include:

- f32, word and string types;
- lists and records;
- `Mlp` holes;
- functions whose domain is too large to check exhaustively.

## JavaScript hosts

`runtime/hosts/circuit.mjs` evaluates circuits:

```js
import {loadCircuit} from 'ink-runtime/hosts/circuit.mjs';
const next = loadCircuit(JSON.parse(text));
next.call('Light.Red', 'Timer.Expired', 'Sensor.Clear');      // 'Light.Red'
next.batch(inputs);                                              // one pass for many inputs
next.table('override');                                          // hole rows from weights
next.setTable('override', [{key: [...], value: 'Light.Walk'}]); // write rows as weights
```

`batch` evaluates many inputs in one pass over dense `Float32Array` blocks,
the same shape as a batched matrix multiply. Writing weights changes only that
circuit object. The exhaustive check covers circuits as emitted. To publish a
changed table, edit the program's rows (`ink gate-edit`) and emit again.

## Trust

A circuit is another literal lowering of a checked program, verified on its
whole finite domain. It grants no equality, rewrite or profitability
authority. It does not claim that a circuit is faster than the compiled CPU
code; that needs measurement like any other target choice.

## Validation

`tests/circuit_target.rs` covers:

- the crossing controller (`examples/circuit-target.ink`) under several
  tables;
- that lookup-layer weights equal the hole's rows;
- that a changed weight on a reachable row is detected, while a row the
  authored rules cover has no effect;
- that unsupported programs are rejected;
- that the JavaScript host agrees with the reference evaluator before and
  after writing a row as weights.

`runtime/tests/circuit.mjs` covers batching and weight rows.

## Limits and next steps

- Only finite types are supported. The natural next domain is piecewise-linear
  f32 code (`max`, `min`, comparisons with constants, affine arithmetic).
  ReLU circuits represent it exactly, but checking it needs interval or SMT
  arguments instead of enumeration.
- Indicator layers grow with the product of argument domain sizes. Structured
  encodings (factorised indicators, shared prefixes) can reduce them.
- Circuits are not yet differentiable training targets. Holes are trained as
  tables (including [relaxed](relaxed-meanings.md) training) and re-emitted.
