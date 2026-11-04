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
| `a == b`, `a != b`, `!a` | ReGLU gate `relu(a) · b` elementwise, then a sum; against a constant, one affine read |
| `a && b`, `a \|\| b` | `t = relu(a) · b`, one ReGLU gate; or is `a + b − t` |
| `choose(c, x, y)` | `relu(c) · x + relu(¬c) · y`, two gates; a constant branch is affine in `c` |
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

Constant operands fold out of gates: equality against a literal reads one
coordinate, and a constant branch of `choose` or `Option` scales affinely. On
the crossing controller this removed about a tenth of the nodes and weights.

## Training through the circuit

```sh
ink train-circuit SOURCE FUNCTION --data EXAMPLES.json [--epochs N] [--seed N] -o EDIT.json
ink gate-edit SOURCE EDIT.json --objective NAME --data HELDOUT.json -o MODEL.snapshot
```

`train-circuit` fits learn-hole tables by gradient descent through the whole
circuit of `FUNCTION`, authored parts included:

- Each table entry becomes a softmax over its result values. Every other
  weight stays fixed.
- On soft values the authored gates compute the multilinear extension of the
  authored code (`relu(a) · b` is `a · b` for values in [0, 1]). This is the
  [relaxed meaning](relaxed-meanings.md) extended through authored code.
- `EXAMPLES.json` lists `{"args": [...], "want": value}` for the function. The
  loss is the squared distance between outputs and the wanted one-hots.
- Distributions start uniform. Adam steps while the softmax temperature
  anneals from 1 to 0.1.
- After each epoch, entries the loss depends on harden to their most likely
  value; entries no example reaches keep their current value. The hardened
  table with the most exactly correct examples is kept.

The output is an [edit](learn-rows.md), not a model. `ink gate-edit` admits it
only if the exact objective improves.

`examples/circuit-training.ink` is a case where gradients through authored
code are needed. A routing table is supervised only through
`consistent(c, s)`, which requires the circle and star entries of each
colour and size to agree on a non-Reject bin. Starting from the untrained
table:

| Method | Result on the 12 cases | Exact evaluations |
| --- | --- | --- |
| Coordinate search | stops at 9 mistakes; no single entry change helps | 145 |
| Relaxed, score function | 0 mistakes | about 2,100 |
| Circuit gradient, seeds 1–5 | 0 mistakes in 17–20 epochs | one forward and backward pass per example per epoch |

In each run exactly the 18 reachable entries change, and the gate admits the
edit (9 → 0). These are small, controlled measurements, not claims about
other problems.

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

## Limits

- **Only finite types.** Exactness does not extend to f32 code, for two
  reasons:
  - A comparison such as `x > c` is a step function. A ReLU network is
    continuous, so it can only approximate a step, never equal it.
  - Each Ink f32 operation rounds once. A ReLU identity such as
    `max(a, b) = b + relu(a − b)` rounds twice, so it can differ from Ink's
    result in the last bit.

  An exact float target therefore needs comparison nodes and per-operation
  rounding, which makes it an ordinary instruction set rather than a ReLU
  network. Circuits stay a finite-domain target.
- **Indicator layers grow with the product of argument domain sizes.** Weights
  stay linear in the size of the table the hole already has.
- **The check is exhaustive and bounded to 65,536 inputs.**
