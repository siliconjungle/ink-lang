# Learning through authored computation

A trainable declaration identifies what may change. An objective can now run a
model through authored helper functions, structured state and bounded loops before
measuring the final outcome. Ink generates directional derivatives through that
entire supported pure computation; update rules no longer need handwritten
per-parameter derivatives.

The runnable [world/controller example](../examples/differentiable-world.ink) uses:

```ink
fn objective(w:Weights,c:Context)->f32 {
    let final=trajectory(w,c);
    let error=final.position-c.target;
    return error*error+0.05*final.velocity*final.velocity;
}
fn derivatives(w:Weights,c:Context)->Weights {
    return gradient(objective,w,c);
}
```

`trajectory` executes twelve feedback-controlled physics steps. The control law
reads the current simulated world; authored transition rules update position and
velocity. Gradients flow through those rules and all twelve steps into controller
parameters. Training changes the controller state, while the authored rules stay
fixed. The same mechanism can fit physical parameters instead, if those parameters
are the explicitly designated inputs. It does not infer a model architecture or
choose a loss from application activity.

## Degrees of freedom and existing contracts

| Declaration/interface | What it permits or constrains |
| --- | --- |
| `trainable state` and `learn change` | Which persistent data learning may update |
| Objective's first parameter | Which scalar/record input coordinates receive derivatives |
| Other objective parameters | Explicit immutable context, including relevant application state |
| Existing `requires` / `ensures` | Runtime admission and legal committed outcomes; failure rolls back writes/events |
| `gradient_piecewise` / `jvp_piecewise` | Derivative convention for the branch actually executed, with zero sensitivity through supported hard scalar conversions |
| Existing `spec` / `approximates` | Permitted observable variation for a replacement, still requiring ordinary checked refinement |

These contracts compose. The example's learning action uses an existing `ensures`
clause to keep weights in bounds. A large finite training input produces an illegal
candidate, and the entire update—including emitted feedback—is rolled back. Loss
penalties do not replace that legality boundary. Learning new application behaviour
and selecting faster implementations remain distinct uses of the available freedom.
Training samples alone never authorize an approximate replacement of exact code.

## Source interfaces

* `gradient(objective, parameters, context...)` returns the same plain record/F32
  shape as `parameters`, containing its partial derivatives.
* `jvp(objective, parameters, direction, context...)` returns one directional
  derivative. `direction` has the parameter's shape.
* `linearize(objective, parameters, direction, context...)` returns a generated
  record with `.value` and `.tangent`. Its value follows the authored forward path.
* The explicit `_piecewise` variants admit supported numeric comparisons,
  active-branch routing, rounding and hard scalar conversions. Smooth forms reject
  these operations with a diagnostic rather than silently introducing a convention.

The objective is a literal named pure function returning F32. Its first parameter
is F32 or a finite nested plain record of F32. Up to 32 scalar coordinates are
supported for a complete gradient. Context can contain supported plain records,
scalar controls and numeric lists. Aliases/imports resolve before differentiation;
generated names avoid lexical/global collisions. Source AD requests disappear into
ordinary checked helpers and records; raw executable IR cannot introduce an
unlowered AD call. User-defined functions with the same names retain normal meaning.

Current propagation supports F32 addition/subtraction/multiplication/division,
negation and square root; named nonrecursive helpers; lexical bindings/records;
lists, map/filter/lookup/concatenation; sum/folds; and bounded `repeat`. Callbacks
keep their ordinary iteration order, captures and lazy branch semantics. Immutable
context is seeded/prepared once per complete gradient request. All basis
directions travel through one primal execution, with no retained cross-call cache.
Each lane retains its scalar JVP operation order, including nonfinite arithmetic;
zero tangents do not authorize discarding a multiplication by infinity.

Abstract/refined records require an explicit plain numeric view for this first AD
domain. Direct effects, recursive calls/record shapes, owned buffers/maps, vectors,
optional context seeding and unsupported operations fail explicitly. Stateful
application data enters through declared reads and explicit objective arguments.
This does not differentiate through arbitrary I/O, database transactions or device
drivers. Fixed scalar input types do not become trainable by appearing in context.

## Mathematical and implementation scope

The generated computation applies chain rules to a **real arithmetic lift** of
supported arithmetic along the executed path and evaluates those derivative
formulas in F32. It is not the mathematical derivative of discrete IEEE rounding,
and it does not certify a numerical error bound. Constants denote their stored
binary32 values. Overflow, nonfinite values and singular points can make generated
derivatives nonfinite; training must validate resulting updates. Square root at
zero and division by zero do not acquire a useful gradient from this interface.

Piecewise differentiation does not supply a direction across a collision, change
of membership, rounding boundary or other discrete switch. At a tie, the authored
predicate selects the branch convention. There is no implicit straight-through
estimator, soft relaxation, search or reinforcement-learning policy. Those need
separate explicit interfaces and acceptance work.

This implementation uses forward-mode propagation. A full gradient batches its
basis directions through a single primal pass; tangent work and storage still
scale with parameter count. JVP/linearize retain a single explicit direction.
Generated wide arithmetic uses lexical bindings, and ordinary JavaScript local
storage/carrier bookkeeping avoids unnecessary temporary records and repeated
Number/tag conversions without changing any F32 arithmetic operation.

The [retained comparison](../bench/batched-differentiation/README.md) improves the
large polynomial gradient from 18.779 to 8.985 ms in fresh held-out JavaScript
processes. An authored derivative remains about 9× faster. This is one workload,
not broad training-performance or Handwired parity. Source [reverse differentiation](source-reverse-differentiation.md) now adds a
bounded tape for larger dynamic parameter lists. Larger model libraries, sparse
tangent analysis and frozen-weight specialization remain open.

Two [database equations](../knowledge/libraries/differential-batching-admission.json)
prove that batched and separate-direction results agree for specific polynomial
and nonlinear kernels using ordinary normalization and portable exact definition
contexts. They cover all typed inputs of those definitions, including exceptional
F32 values, rather than only sampled inputs. Changed helper definitions cannot
reuse an old law at a source application, even if the source hash is refreshed.
These equations compare two generated implementations; they do not prove that
the shared differentiation formulas are correct derivatives, generalize to every
objective, or certify emitted machine code. The generic offline authoring tool is
`knowledge/producers/function_correspondence.py`; signatures and function names
select proposed equations but never establish them or select profitable code.

Source differentiation and its translation remain trusted implementation code.
Normal type/effect/ownership/resource checks validate generated helpers; they do
not prove the AD transform correct. Tests use an independent numerical oracle,
closed-form derivatives, exact forward-value comparisons, source/module adversarial
cases and complete compiled-target execution. Derivatives do not gain rewrite,
approximation, range-fact or profitability authority merely by being generated.


For larger explicitly constructed models, [reverse graph learning](reverse-learning.md)
now supplies an independently authored ordered VJP algorithm over dynamic lists.
It supports the 244-parameter ReGLU example without the source full-gradient's
32-coordinate limit. This is a separate graph interface; arbitrary source
functions do not automatically acquire reverse-mode differentiation.

For source objectives beyond 32 coordinates, use [reverse source differentiation](source-reverse-differentiation.md). It follows authored helpers and loops with an explicit node budget and zero-cotangent policy; the graph-library interface remains separately available.
