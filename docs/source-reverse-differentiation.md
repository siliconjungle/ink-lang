# Reverse differentiation of authored computation

`reverse_gradient` follows an ordinary pure source objective through named helpers,
structured context and loops. It returns partial derivatives for an F32/F64 parameter
or nested plain records and dynamic lists of the same scalar precision. Unlike the forward full-gradient
interface, it does not impose a 32-coordinate shape limit.

```ink
fn objective(weights:List<f32>,context:Context)->f32 {
    let prediction=sum(weights.zip(context.features,fn(w)=>fn(x)=>w*x));
    let error=prediction-context.target;
    return error*error;
}
fn derivatives(weights:List<f32>,context:Context)->Result<List<f32>,String> {
    return reverse_gradient(objective,weights,4096,true,context);
}
```

The complete [64-parameter learner](../examples/source-reverse-learning.ink) uses
ordinary source update rules, `learn change`, declared state access, events and a
committed-weight constraint. The same objective and update action can be used by
pre-compilation replay, a build-stage training package, an adaptive runtime call
or an authored continuous-learning controller. The compiler does not choose an
objective, reward, publication schedule or optimizer.

## Interfaces and evaluation

* `reverse_gradient(objective, parameters, maximum, stopZero, context...)` returns
  `Result<parameter shape,String>`.
* `reverse_linearize` accepts the same arguments and returns a Result containing
  a generated record with `.value` and `.gradient`.
* `_piecewise` variants explicitly admit numeric decisions and the supported
  zero-sensitivity convention through hard scalar primitives.

`maximum` is the authored tape-node capacity, at most one million. Parameter
coordinates and tracked arithmetic consume nodes; untracked constant computation
does not. Exhaustion returns `Err`, never a partial gradient. An enclosing
fallible learning action can propagate that failure and retain its transaction.
Each invocation gets a fresh owned tape. No primal values or gradients survive
across invocations as a hidden cache.

One forward execution records operations. One descending reverse traversal adds
cotangents to their inputs in fixed order, including repeated input edges. A
final projection reconstructs the parameter shape. All derivative arithmetic uses
the objective's F32/F64 precision. This is a real-arithmetic lift in that precision, not a derivative of IEEE
rounding, and reverse results need not be bit-equal to forward-mode derivatives.

`stopZero=true` skips a node with a zero cotangent. `false` evaluates its chain
rule even when that multiplies zero by infinity and produces NaN. This policy is
explicit and tested; it does not grant algebraic rewriting or an approximation
contract. Singularities and overflow can still produce unusable updates. The
application's existing constraints govern what may commit.

Supported source includes arithmetic, square root, named nonrecursive helpers,
lexical bindings, plain records, list map/filter/indexed map/zip/lookup/concatenation,
sum, left/right folds, fixed repeat and both early-stop forms. Optional/result
context supports constructors, map/map_err, fold and strict `ok_or`. Branches and
lookup defaults stay lazy. `repeat_until` tests before its step; `fold_until`
performs its terminal item's step after testing its old state. Parameter shapes
remain homogeneous F32/F64 plain records/lists; optional context is not optional trainable shape.

Pure proof preconditions cannot silently disappear: reverse translation currently
rejects an objective/helper with such requirements. Checked fallible source
interfaces keep their explicit branch behavior. Abstract/refined parameters need
a plain numeric view. Recursive shapes/call graphs, mixed-precision trainable shapes, owned
source values (including temporary buffers/maps) and unsupported operations reject explicitly. Effectful
application state must enter the pure objective through declared reads and
explicit immutable arguments.

## Ownership, checks and execution targets

A variant fold selects one arm and runs it once. When it returns an owned carrier,
that arm may consume captured temporary storage. Plain-valued observations retain
readonly captures, including source contract checks. A move in either arm
invalidates the outer owner. Repeated
callbacks and borrowed stop/range callbacks retain their capture restrictions;
this is a general ownership fact, not an AD-specific exemption.

Source requests elaborate into ordinary checked records/functions and fixed
owned-buffer operations. Raw executable-core input cannot introduce an unlowered
AD intrinsic. Existing source identities are unchanged when the new form is absent.
The transform, tape helpers and ownership checker remain trusted implementation;
normal type/effect/ownership checks and tests do not prove the transform correct.
No equality law, narrowing permission or profitability fact follows from AD.

The standalone tests include analytic gradients for 100 coordinates, nested shapes,
helper/context reuse, zip truncation, exact primal bits, lazy defaults, nonfinite
zero-cotangent policies, capacity errors, terminal-step contracts and precondition
rejection. Distribution conformance compares the complete 64-parameter training
history, events, failures and portable checkpoints across compiled targets.
Tape execution uses CPU support. An eligible numeric kernel in that same history
requires actual GPU dispatch; host fallback is not device tape training.

This removes a source-gradient size bottleneck. It does not establish Handwired
performance parity. Device training, broader source/contract transport, frozen
arithmetic/graph specialization, measured staging and complete Pretext/Freerange
acceptance remain work toward the full programme.


## Binary64 source learning

An F64 objective uses binary64 parameters, primals, tape fields, cotangents and
optimizer updates. The bundled tape implementation is instantiated structurally
in the selected precision; source F32 literals and contexts are not reinterpreted.
Each precision has independent hygienic helper/carrier names and the existing
finite expansion budget. Tape capacity, fixed accumulation order, stopZero,
terminal-step conventions and per-call ownership keep their existing meanings.

The [F64 learner](../examples/source-reverse-learning-f64.ink) uses 64 coordinates
and the same offline/runtime learning and checkpoint APIs as the F32 example.
The required `source_reverse` suite includes both examples, exact raw binary64
primal bits and forward/JVP controls. CPU learning and a separate eligible F32
dispatch remain distinct; this adds no device training or F64 shader arithmetic.
