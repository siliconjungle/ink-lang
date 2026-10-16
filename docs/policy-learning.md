# Authored rewards and discrete policy learning

Ink has no built-in product objective. The application defines its goal, relevant
context, permitted changes, constraints, observations and acceptance rules.
Engagement, accessibility, energy use or any other goal belongs in that authored
logic. The compiler does not infer a reward from activity. Learning changes
designated state; it does not grant permission to rewrite exact computations.

Differentiable objectives already use `gradient`/JVP and the prepared reverse graph
libraries. `std:policy_gradient` adds ordinary source algorithms for discrete
choices and delayed rewards. It contains no compiler recognizer, platform reward,
environment simulator or hidden random generator.

```ink
import "std:policy_gradient" as rl;
// The application supplies positive masses, their parameter derivatives,
// an allowed-choice mask and a recorded random input in [0,1).
let decision=rl.decide(masses,derivatives,allowed,unit)?;
// Later, an application-defined return and baseline produce a minimizing
// optimizer gradient. Positive advantage favors the sampled choice.
let gradient=rl.reinforce(decision,return_value,baseline)?;
```

These fragments are action/function bodies. See the complete runnable
[`reward-policy.ink`](../examples/reward-policy.ink). Its whole-context mass
function uses ordinary source AD over a four-coordinate parameter record, including
an interaction between signal and urgency. The example's reward function is
deliberately local to that application. Other applications supply other rewards,
models, features, masks and constraints.

## Algorithm and contracts

For nonnegative masses `m_i` over allowed actions, the library computes a
categorical policy `p_i=m_i/sum(m)`. Each derivative row is the application's
`d m_i / d parameters`. The score for the sampled action `a` is
`d m_a / m_a - sum(d m_i)/sum(m_i)`, with masked rows omitted. The returned
minimization gradient is `-(return-baseline)*score`. Existing F32 Adam or an
authored SGD update can consume it. There is no required network architecture or
softmax approximation; any admissible differentiable nonnegative mass function
can supply these inputs.
The allowed-choice mask is held fixed for that estimator; no derivative through
a changing discrete support is implied.

`probabilities(masses,allowed)` exposes the current distribution without training.
`returns(rewards,discount,bootstrap)` computes ordered reward-to-go values from the
last observation backward. `mean_gradient(decisions,return_values,baselines)`
averages their reward-weighted score vectors. This allows an application to
collect an entire trajectory under one policy version before updating it.
Terminal episodes normally use zero bootstrap; truncation and a learned value
baseline remain explicit application choices. For an initial-state discounted
objective, apply the objective's chosen time weighting as well; a discounted
return alone does not define every weighting convention.

`total_gradient` exposes the ordered sum without division. For one return on an
entire sampled computation, `joint_gradient(decisions,return_value,baseline)`
weights that sum, preserving the joint log-probability estimator's scale.
`score_action` evaluates a specified allowed choice at the current policy for
explicit likelihood/elite fitting; it does not authorize off-policy reward reuse.
The [learned-program example](learned-programs.md) combines these operations with
instruction choices, runtime goal changes and checked frozen compilation.

This is an on-policy score-function estimator, following the
[policy-gradient formulation](https://proceedings.neurips.cc/paper/1999/file/464d828b85b0bed98e80ade0a5c43b0f-Paper.pdf)
and [reward-to-go/baseline construction](https://spinningup.openai.com/en/latest/spinningup/rl_intro3.html).
The supplied random inputs must have the sampling distribution intended by the
author. Baselines must be independent of the current sampled action for the usual
unbiased-estimator argument. The library validates numeric domains and shapes;
it cannot prove that supplied derivatives are correct, feedback belongs to a
behavior policy, observations are representative or the reward expresses the
author's real goal. Reusing stale/off-policy trajectories requires an explicitly
implemented correction/algorithm, not merely re-evaluating them at new weights.

Sampling and score arithmetic use a declared F32 algorithm. Masses are divided by
the largest allowed mass before summation to avoid an overflowing mass total.
Sampling uses ascending source choice order and the final positive scaled mass
as fallback when the threshold rounds to the total. Invalid inputs, no positive
allowed mass, probability underflow or nonfinite scores/gradients reject. Tiny
masses can underflow during scaling; this is not an exact-real categorical sampler
or a universally certified unbiased-gradient implementation. Normalization and
derivatives preserve their stated F32 evaluation order.

There are at most 256 choices, 4096 parameters and 65,536 Jacobian elements.
Trajectories have at most 4096 decisions and 65,536 total score elements. These
bound retained data and work counts, not wall-clock deadlines. Arithmetic
overflow rejects, including an overflowing sum before trajectory averaging.

## Application control and continuation

The example's `act(context,unit)` stores a pending decision, context, policy base
version and ticket. `feedback(ticket,return,baseline,rate)` checks that ticket and
version before updating the complete Adam state. Duplicate feedback, stale policy
versions and invalid candidates reject. `cancel` is explicit. `episode` composes
selection and authored simulated feedback; `aborted` demonstrates rollback of the
whole composition, including pending work, optimizer state and events.

Pending decisions and optimizer moments are ordinary logical state. Offline
`ink train`, `build-model`, portable checkpoints and runtime learning therefore
use the same authored actions. Restore can continue between selection and delayed
feedback. Whole-program state restore remains explicit replacement, not live
promotion over newer state. General source sessions can hold trajectories/models
and control work budgets and publication; the example itself retains one pending
decision. No automatic collection, label inference or background training occurs.

Legality stays separate from reward. Choice masks constrain selection; existing
`requires`/`ensures` and explicit validation constrain committed updates. Pure
functions may compute goals, rewards and policies from full explicit context.
Learning actions may change configuration or trigger other learners through their
declared effects. A penalty in a reward is not a hard invariant.

## Evidence and remaining scope

The mandatory `policy_learning` suite checks score vectors against independent
binary64 finite differences, masked/boundary choices, large masses, nonfinite and
subnormal failures, reward-to-go and complete trajectory reduction. The contextual
application learns both opposite preferences above 0.9 and exactly resumes its
whole Adam state. Cross-target execution compares 26 values/outcomes and complete
snapshots across reference, Rust, JavaScript, Wasm and the GPU host, including
delayed feedback, stale versions, candidate-bound rejection and rollback. A separate pure numeric kernel
requires one actual GPU dispatch. Policy training itself executes on CPU hosts.

These checks are not proofs of the AD transform, policy-gradient theorem under all
machine inputs, convergence, generalization, reward quality or generated code.
PPO/off-policy correction, automatic value-network training, general source reverse
AD, frozen specialization, parallel/device training, F64/Pretext fidelity and the
broader Handwired performance target remain required work.

[Retained source, complete checkpoint, trained package and target logs](../reports/policy-learning-2026-10-15/README.md).
