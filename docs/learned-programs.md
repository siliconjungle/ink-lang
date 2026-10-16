# Learning instruction structure, then compiling it

[`learned-program.ink`](../examples/learned-program.ink) learns the instruction
choices of a computation from an application-defined objective. Its candidate is
a four-instruction motif repeated eight times. Each position can independently
choose identity, scaling, bias or ReLU: all 256 motifs remain available. Scale
and bias are separately trainable state. This is a finite authored program
grammar, not an automatic translation of arbitrary applications into networks.

The objective runs the entire 32-instruction candidate on the authored workload,
then combines mean squared output error with an instruction-count penalty. The
penalty is a preference; it is not a measured latency model. The source supplies
the targets, legal coefficient ranges, random inputs, update rate, acceptance
rule and target version. Ink supplies no product objective. A changing objective
does not waive a hard invariant or the planner's evidence requirements.

```ink
trainable state Structure:Table<u64,List<Op>>=Table.empty();
trainable state Weights:Table<u64,Coefficients>=Table.empty();
trainable state Policy:Table<u64,learning.Adam>=Table.empty();
trainable state Target:Table<u64,Goal>=Table.empty();

adaptive query serve(input:f32)->f32 reads(Structure,Weights,Live) {
 return evaluate(Structure.get(0).unwrap_or([]),
  Weights.get(0).unwrap_or(Coefficients{scale:0.75,bias:0.25}),input)
  +Live.get(0).unwrap_or(0.0);
}
```

This excerpt uses the declarations and imports in the complete example. No new
surface syntax is required: the same trainable state and authored learning
actions can hold instruction choices, continuous parameters, optimizer state or
the goal itself.

## Full-computation scores and explicit fitting

`std:policy_gradient` exposes these distinct operations:

| Call | Meaning |
| --- | --- |
| `decide(masses,derivatives,allowed,unit)` | Sample one allowed choice and return its current probability and score vector |
| `reinforce(decision,return_value,baseline)` | Negative advantage times one decision's score, for a minimizing optimizer |
| `joint_gradient(decisions,return_value,baseline)` | Apply one whole-computation return to the ordered sum of conditional decision scores |
| `total_gradient(decisions,return_values,baselines)` | Ordered sum with explicit per-decision returns and baselines |
| `mean_gradient(decisions,return_values,baselines)` | That same sum divided by the decision count |
| `score_action(masses,derivatives,allowed,action)` | Score a specified allowed action at the current policy without sampling |

The F32 implementation forms each negative-advantage-weighted score vector and
then adds those vectors in source order. It does not reassociate multiplication
by summing unweighted scores first. The mean divides that completed sum once.

The log probability of a sampled computation is the sum of its conditional
decision log probabilities. For one whole-computation return, summing those
scores expresses the joint estimator; averaging changes its scale with the
number of choices. For a branching computation, the application must supply the
conditional distribution at each actual decision, not independent scores for
unvisited branches. Existing shape, finite-value, support and bounded-work checks
apply to all three reductions.

The example initially samples using an authored bounded reward. Once it has a
complete accepted program, it explicitly fits that program's likelihood at the
current policy using `score_action`, then applies Adam. This elite-distillation
step is supervised fitting to the selected candidate, not off-policy REINFORCE.
Rescoring an old choice does not make arbitrary old reward feedback on-policy;
an off-policy algorithm still needs its own correction and assumptions. See
[policy learning](policy-learning.md) for F32 sampling and estimator limits.

## Training times and runtime control

```sh
ink train examples/learned-program.ink examples/learned-program-training.json \
  -o build/learned-program.snapshot
ink build-model examples/learned-program.ink examples/learned-program-training.json \
  --freeze-roots Structure --specialize-frozen --target javascript \
  -o build/learned-program
ink verify-model build/learned-program --replay
```

The recorded trace supplies output targets and random inputs, not an instruction
answer. It performs 384 search updates. `train --restore` resumes the complete
logical state, including both Adam moments, decay powers, steps and events.
An unfrozen application invokes `episode` during runtime using the same source
algorithm. A caller controls when to train, pause, resume or retarget; there is
no implicit background worker.

`retarget` validates an expected goal version and the new workload, increments
the version and calls the other learner's `initialize` action to reset its
optimizer. Existing instruction choices are rescored under the new objective.
Stale versions, invalid random inputs and invalid candidate coefficients reject.
`aborted` demonstrates rollback of a nested complete search update, including
optimizer moments, instruction changes and emitted events.

## Freezing and proof-backed specialization

Freezing `Structure` binds the exact learned instruction rows into executable
meaning and withdraws its writers. `Weights`, `Policy`, `Target` and ordinary
`Live` state remain available; weight changes, goal changes and live inputs still
execute after compilation. An application that must continue changing instruction
structure should retain an unfrozen runtime or explicitly build a new restricted
artifact. Freezing is an API restriction with a new source identity.

The knowledge producer proposes typed scalar helpers for the closed instruction
sequence and typed residual helpers for open workload traversals. Ordinary prefix
equations and generalized induction establish correspondence through fixed,
unused or reordered captures. Complete action proofs include the loss query,
retargeting, optimizer initialization, errors and events. Result-valued helper
inlining preserves complete types and strict argument evaluation. Case proofs
first establish equal scrutinees before sharing payload variables. Factored
lemmas fit the existing checker limits; no resource budget is increased and no
producer hash or cached verdict authorizes a rewrite.

Closed scalar computations can now become exact constants, including the
instruction counter in this example. The untrusted producer evaluates binary32
operations with integer arithmetic, preserving rounding, signed zero and NaN
rules; the ordinary checker independently establishes every proposed result.
Dynamic weights, inputs and arithmetic retain their original operation order.
Long closed traversals use balanced helper definitions as proof witnesses even
when the executable action no longer calls those helpers. Short traversals can
use ordinary conversion. Already literal library initializers are kept behind
their existing function boundaries when no newly known argument justifies
expansion; this avoids duplicating unchanged code in multiple callers.

Trained artifacts keep the complete checked package once in `selection.json`.
The generated descriptor binds those exact bytes through a fixed local
`specialization_package` reference. Verification replays the package, checks the
source, evidence and initial state, and rejects alternate paths or ambiguous
embedded packages. This reduces duplicate proof storage; it grants no new
rewrite authority and makes no runtime-memory claim.

This is explicit checked specialization. It does not prove that the selected
layout is profitable or change automatic planner selection. State and learning
actions execute on CPU hosts. Eligible pure specialized numeric roots can run
on WebGPU; that does not establish GPU training or arbitrary device execution.

## Evidence and limits

On the retained seed and seven authored input/target pairs, 11 of 256 motifs
match all target output bits. Their probability under an initially uniform
policy is 4.296875%; after training it is approximately 85.16%. This diagnostic
enumerates the finite grammar and normalizes stored F32 masses in binary64.
It is not a convergence guarantee, an exact machine-sampler probability proof,
or a held-out generalization result. The selected program has zero squared error
on those seven samples and 24 nonidentity instructions, for an objective near
`0.000024` with the authored penalty.

The permanent `frozen_state` regression independently evaluates all 256 motifs,
checks exact full-state split resume, runs runtime adaptation and rollback, then
replays the complete frozen plan. Cross-target checks cover reference, Rust,
JavaScript, Wasm and the GPU host, with actual device work on the specialized
pure root. These establish finite implementation conformance, not correctness of
the whole compiler, AD transform, learning algorithm or toolchain.

General learned representations, broader graph/tape specialization, learned goal
policies with admitted profitability evidence, parallel/device training and the
full upstream performance targets remain part of the
[Handwired](handwired-integration.md) and
[Pretext/Freerange](chenglou-optimisation-programme.md) programmes.
