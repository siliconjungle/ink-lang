# Relaxed meanings

A program with `choice` holes has an exact meaning once its tables are fixed.
Training needs a second, relaxed meaning: one in which a small change to the
parameters makes a small change to the objective, so it can be followed
downhill. This page defines that meaning and how `ink train --method relaxed`
uses it.

## Definition

Under the exact meaning, entry `e` of a `choice` hole holds one value
`v_e` of the result type, and the program is ordinary Ink.

Under the relaxed meaning, entry `e` holds logits `θ_e`, one per result value,
and denotes the categorical distribution `softmax(θ_e / τ)`. A program with
relaxed holes denotes a distribution over exact programs: draw every entry
independently and run the resulting exact program. An objective `L` lifts to
its expectation:

```
L_relaxed(θ) = E[ L(table) ]   where table_e ~ softmax(θ_e / τ)
```

Some consequences of the definition:

- **It is smooth in θ, even though each program is discrete.**
- **Hardening recovers an exact program.** Taking each entry's most likely
  value gives an exact table. As `τ → 0` the distribution concentrates on
  that table, and the relaxed objective approaches its exact objective.
- **Authored code is never relaxed.** Comparisons, `choose`, folds and all
  other authored operations keep their exact meaning. Only the holes are
  uncertain, so the admission rules for holes (error path or guarded) hold for
  every drawn table.

## Training

`ink train SOURCE --objective NAME --data DATA.json --method relaxed` runs in
three steps:

1. **Relaxed phase**, using up to half the budget:
   - Logits start uniform.
   - Each step draws 8 tables and evaluates each with exact reference
     execution.
   - It estimates `∇ L_relaxed` with the score-function estimator,
     `(L(table) − baseline) · ∇ log p(table)`, using a leave-one-out baseline.
   - Adam takes a step and `τ` anneals from 1 to 0.1.
   - After each step the hardened table is evaluated too.
2. **Selection:** any drawn or hardened table that strictly improves on the
   best exact loss so far is kept.
3. **Polish:** coordinate search and SPSA for `Mlp` holes continue from the
   best exact table, as with `--method coordinate`.

The output is the same as any `ink train` run: one `__learn_set` commit, a
snapshot equal to its replay, and a receipt. The receipt states the method and
`relaxed_steps`. Training is deterministic for a seed.

## Why it helps

Coordinate search changes one entry at a time and keeps strict improvements.
It stops when every single change makes things worse, even if changing
several entries together would help. `examples/relaxed-holes.ink` is the
smallest case:

- The untrained table scores 1.
- Changing either entry alone scores 2.
- Changing both scores 0.

Coordinate search stops at 1. Under the relaxed meaning, the expected
objective decreases as both distributions move towards the better values
together, so the hardened table reaches 0.

## Trust

The relaxed meaning exists only inside the training driver. Nothing relaxed is
compiled, served or used as evidence:

- every evaluated candidate is an exact program;
- the trained artifact is an exact table;
- the result still passes through the ordinary learn change and, when
  published with gates, through [gated edits](learn-rows.md).

The relaxed meaning grants no equality, approximation or profitability
authority.

## Validation

`tests/relaxed_holes.rs` checks:

- relaxed training reaches 0 on the coupled example with three seeds, where
  coordinate search stops at 1;
- the hardened table, snapshot replay equality and determinism;
- relaxed and coordinate training agree on the learn-holes example.

## Limits

- Score-function gradients are noisy. Cost grows with the number of entries
  and with the variance of the objective.
- Entries are independent under the relaxation, so correlations between
  entries are learned only through the objective.
- `Mlp` holes are already continuous and keep their SPSA training.
