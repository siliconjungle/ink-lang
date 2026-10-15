# Prepared reverse graphs and learned models

Ink now provides three authored knowledge libraries: `std:autodiff` describes and
prepares a graph and accumulates an ordered vector–Jacobian product (VJP);
`std:neural` constructs ReGLU networks; `std:learning` supplies explicit F32 Adam
state. They are ordinary checked Ink source, not compiler recognizers or an
implicit replacement of `gradient`. The runnable [model](../examples/neural-adaptive.ink)
has ten context features, two hidden layers of six units, four outputs and 244
trainable parameters. All 244 derivatives are checked against an independent dense
network finite-difference oracle.

```ink
module model;
import "std:neural" as nn;
import "std:autodiff" as ad;
fn build()->Result<nn.Network,String> {
    return nn.network(10,[6,6],4,10000);
}
fn derivatives(model:nn.Network,weights:List<f32>,context:List<f32>,target:List<f32>)
    ->Result<ad.Loss,String> {
    return nn.mse_gradient(model,weights,context,target);
}
```

Construct the network once and reuse its immutable structure with changing
weights and complete explicit context. Every derivative request computes fresh
forward values; changing weights cannot accidentally reuse an old tape. Fused
affine/ReGLU nodes express the network's chosen arithmetic directly: bias is the
first term, each product and addition rounds to F32, and no multiply-add contraction
or reassociation is granted. This model uses 232 graph operations. Dynamic hidden
widths and parameter lists do not inherit source `gradient`'s 32-coordinate limit.
Capacity is explicit; network construction rejects bounds above one million wires.
This is not automatic reverse differentiation of arbitrary source functions.

## Graph preparation and reverse policy

`ad.prepare(inputs,nodes,roots,maximum)` first checks capacity, every original edge
and every root. Edges must point to earlier wires. It then retains the selected
roots' dependency closure and renumbers operations, retaining all source positions.
Duplicate roots and repeated/aliased edges accumulate in deterministic order.
Construction drops unreachable graph operations; it does not authorize eliminating
errors or effects from arbitrary source programs. A prepared record is source
opaque, but opacity is not authenticated ABI input. Execution checks topology and
shape again, including forged wire indices.

The graph supports constants, add/subtract/multiply/divide, square root, negate,
ReLU, a hard step, affine sums, ReGLU, selection and indexed reads. VJP takes one
cotangent per selected root and returns source gradients. Mean squared error
computes output seeds and reuses its single forward evaluation.

| Policy | Meaning |
| --- | --- |
| `ad.smooth()` | Reject ReLU/ReGLU, selection, hard steps and indexed backward reads |
| `ad.piecewise()` | ReLU slope zero at its corner; route selection to the executed branch; zero hard-step and index sensitivity |
| `BooleanGradient.StraightThrough` | Explicit estimator passing the hard step's cotangent to its input |
| `IndexGradient.BackwardDifference` | Explicit index estimator `read(floor(i)) - read(floor(i)-1)`, using the declared zero/clamp edge rules |
| `ZeroCotangent.Propagate` | Evaluate backward arithmetic even for a zero cotangent |
| `ZeroCotangent.Stop` | Explicitly stop inactive reverse work, including singular/nonfinite arithmetic it would otherwise visit |

`ad.sparse_piecewise()` selects the last policy with piecewise/zero hard gradients;
`std:neural` uses it explicitly. At `sqrt(0)` with zero seed, propagation produces
NaN while stopping yields zero. These are different authored conventions, not an
implicit zero-times-infinity optimization. Policy admission checks the retained
graph even if a seed is zero. Nonfinite forward gather indices reject.

Selection tests whether its gate is positive and gives the gate zero sensitivity;
it is not Handwired's continuous interpolation-select macro. The hard-step and
backward-index choices are estimators, not smooth derivatives of discrete choices.
All chain rules describe a real arithmetic lift evaluated in F32, not derivatives
of IEEE rounding. Nonfinite or singular values remain possible.

`ad.accumulate` validates topology and supplied-value/seed shapes but does not
establish that supplied primal values came from forward execution. `reverse_values`
is the underlying low-level accumulation algorithm. Use `vjp` or `mse` to bind
reverse values to a fresh forward run. No serialized forward tape is trusted as
such a binding.

## Optimizer, acceptance and recovery

Adam's weights, two moments, bias-correction powers and step count are explicit
state. Rates, decay, epsilon and optional stable global norm clipping are authored
configuration. Inputs and candidate state must be finite and shape consistent;
invalid updates return errors. Candidate legality remains the application's
`requires`/`ensures` responsibility. F32 moments deliberately differ from
Handwired's binary64 Adam arithmetic; bit parity with that optimizer is not claimed.

The full example holds context/target constant for a frame of two to twenty steps.
It accepts an improved objective and raises the rate modestly; on a loss increase
or invalid candidate it retains weights **and both moments**, lowers the rate and
emits explicit feedback. That backtracking is itself a committed control update.
An outer action failure instead rolls back weights, moments, rate, counters and
emitted events together. A single step is excluded to avoid repeatedly restoring
momentum that needs a second step to turn around.

`ink train SOURCE TRACE.json --restore prior.snapshot -o next.snapshot` resumes
complete logical state, validates its exact source identity and binds both input
and output checkpoints in the receipt. The reference test compares twelve frames
with six frames plus a checkpoint/resume for exact state equality. It verifies
loss reduction, more than 32 changed coordinates and failed-action rollback.

## Implementation and evidence scope

The independent evaluator now captures only free lexical values and copies only
the requested field/index of an immutable lexical value. It still charges actual
copies and expression work and retains recursion/fuel limits. These mechanisms
apply to ordinary code and prepared layouts too. Nonescaping callbacks can borrow
an owned temporary only when the general affine analysis proves readonly use.

The mandatory `reverse_learning` suite covers malformed graphs, policies and
singular points, repeated edges/roots, all 244 dense-network derivatives, an
independent F32 Adam oracle, full-state resume and compiled values/errors/events/
exact snapshots. Reverse graph execution and learning currently run on CPU hosts.
An independent numeric kernel requires an actual GPU dispatch in full-target
validation; that does not establish device reverse-graph or optimizer execution.

[The matched benchmark](../bench/reverse-learning/README.md) compares complete
outputs, loss and 244 gradients against Handwired's own reference executor and an
independent graph interpreter. Performance and remaining gaps are reported there.
The libraries and their tests are not a general AD correctness proof, a compiler
proof, a convergence guarantee or a certified approximation contract. The broader
[three-project programme](chenglou-optimisation-programme.md) remains open.

Typed callback elaboration also required regenerating the existing generic-library
contract packet. All 23 obligations replayed through the normal producer/checker;
14 previously unpublished canonical objects were added to the pinned database.
They establish those specific library contracts under the new source context,
not the correctness of the general AD transform. Old source-bound packets remain
rejected. [Publication record](../knowledge/store/typed-callback-contracts-publication.json).
