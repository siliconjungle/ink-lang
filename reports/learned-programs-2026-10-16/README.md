# Learned instruction programs: complete objectives and checked compilation

The example learns a 32-operation instruction sequence from output targets,
then freezes that structure and compiles it with ordinary database proofs.
Continuous weights, goals, optimizer state and ordinary live inputs remain
available. This is an authored finite program grammar. The full Handwired,
Pretext and Freerange capability/performance programme remains open.

## Learning result and control

The four instruction positions independently choose identity, scale, bias or
ReLU; the motif repeats eight times. All 256 motifs are available. The objective
runs the entire candidate on seven authored examples, adds an instruction-count
preference, and accepts a better candidate. The trace supplies targets and random
inputs, with no instruction answer. Its 384 search steps follow initialization,
coefficient setup and target setup: 387 authored observations in total.

Source AD supplies the categorical mass derivatives. The generic library now has
`joint_gradient`, `total_gradient` and `score_action`; the existing mean retains
its ordered sum and final division. The example combines a bounded authored
reward with explicit elite likelihood fitting at the current policy. That fitting
is a supervised objective, not off-policy REINFORCE.

An independent F32 instruction evaluator enumerates all motifs. Eleven match
the seven target outputs bit for bit. Their initially uniform probability is
4.296875%; the trained policy gives them about 85.1614% probability when stored
F32 masses are normalized in binary64. The selected motif is Bias/Scale/Identity/ReLU,
with zero squared error on these samples and 24 nonidentity operations. Its
objective is approximately 0.000024 at the authored penalty.

This is one grammar, workload and seed, with no held-out accuracy claim or
convergence proof. `diagnostics/` retains the first 96-step acquisition, its own
complete source core and checkpoint: it found a matching sample but reduced the
proposal mass to about 2.84%. The subsequent run changes both the algorithm and
training budget; these are not a controlled algorithm comparison.

The permanent regression checks exact complete-state split resume, runtime
episodes after restore, nested rollback, invalid sampling inputs, versioned
retargeting and optimizer reset. A target-changing action can trigger another
learner's initialization. The source owns all goals, constraints and scheduling.

## Proof and implementation boundary

Freezing `Structure` binds its exact rows into executable meaning and withdraws
`episode`/`aborted`. Weights, policy, target and live state remain. Typed scalar
helpers specialize closed instruction traversals; residual typed helpers keep
open workload traversal behind pure function boundaries. Prefix equations and
ordinary generalized induction handle fixed, unused and reordered captures.
Complete proofs cover the loss query, retargeting and optimizer initialization,
including errors, events and transaction behavior.

Result-valued inlining retains its complete contextual type and ordered dynamic
arguments. Case congruence proves scrutinees equal before sharing payloads.
Unconditional sub-equations become reusable lemmas under the existing kernel
depth limit. Introduced field/signature sorts are explicit imports. No checker
or authoring budget is increased; producer caches and source hashes confer no
equality authority.

Existing integer-to-F32 operations now have fixed mathematical counterparts for
U32, U64 and I32. An integer-only nearest-even oracle checks boundaries and 1,024
additional words, including signed and low-word interpretation. Source/action
checks preserve conversion effects and rollback. Authenticated false accumulator,
scope and rounding claims reject for proof reasons, with their complete views
and actual diagnostics in `negative-controls/`.

The standalone package `69980ec3664a7d702a5fc6108c969f1584995ee7` contains the exact
core tree `ba3249174bc751058f8bb9a2faed2d787e93d5d0` from committed source
`f23244b0777d772905ae7fa73b4005c7197824c0`. Its private checkout and target pass
466 tests. The integrated suites pass 13 frozen-state tests and six policy tests;
19 focused knowledge tests pass. The historical reward checkpoint rejects after
its source changes; the test re-executes the archived observations on current
source instead of changing a checkpoint header. The first failure is retained.

The adaptive browser history has 27 comparisons and one actual GPU control call.
The frozen history has 72 comparisons and eleven actual specialized GPU calls,
covering eleven raw F32 classes. Both compare JavaScript, Rust/Wasm and the GPU
host, including full values, errors, ordered events and exact checkpoints.
Learning actions execute on CPU hosts. The complete initialized JavaScript
packages and both browser histories are archived.

A fresh private build of committed distribution source
`a76708440e15159b6268e7e7d34079a7cb052ecd`, with the recorded independent package
pins, reproduces 20 recorded core/checkpoint/proof/JavaScript images. It trains,
freezes and verifies both baseline and selected builds. This covers the learned
fixture; it is not a whole-compiler, ABI, toolchain, driver or AD correctness
proof. The recorded working compiler also included an unrelated local query
syntax edit; that edit is excluded from the committed private build. Exact image
reproduction establishes the stated fixture comparison, not every program.

## Performance, including the regression

Six fresh Node 25.3.0 processes on Apple M4 Pro alternate baseline/selected order.
Each phase has five warm samples. These are complete bound queries with result
consumption, explicit weight/goal updates where stated, event acknowledgement
and matching final checkpoint hashes. Baseline and selected start from the same
learned frozen checkpoint. Source checking, training and proof construction are
outside the serving samples. All raw samples are retained.

| Complete request | Baseline ns | Selected ns | Paired geometric baseline/selected |
| --- | ---: | ---: | ---: |
| Serve | 244.20 | 177.37 | 1.386× |
| Serve, weight update every 16 requests | 309.30 | 235.55 | 1.316× |
| Loss over the retained seven-row workload | 1,521.05 | 1,486.81 | 1.031× |
| Loss, two-row goal reset every 64 requests | 748.01 | 875.20 | 0.855× |

The selected goal-reset workload is about 17% slower. The ordinary loss change
is small. These results do not justify automatic profitable selection. The final
six-pair acquisition follows completion of the study's builds and planner corpus;
an earlier six-pair acquisition overlapped them and is retained separately under
`performance/contended/`. No exclusive-machine, cold-filesystem or upstream
performance-parity claim follows.

Median import/create/first-bound-call diagnostics in microseconds are
13,578/5,233/263 for baseline and 13,630/5,623/267 for selected. The emitted source
modules are 807,307 versus 831,143 bytes. Artifact inventories total 1,304,706
versus 9,158,410 bytes, including proof and diagnostic files. These are file-byte
totals; runtime heap and transfer costs require separate measurements.

The explicit source proposal currently also expands some already-constant
initialization work. `experimental/` retains an investigated variant that
preserves calls without newly fixed arguments. It checks a seven-helper plan of
about 1.5 MB instead of the default nine-helper plan of about 3.8 MB, and matches
51 complete JavaScript observations/checkpoints. It is an experimental authoring
script, outside the published default producer and the private image comparison.
Broader target/performance validation and proof-package duplication remain next
work; the prototype is not an automatic selection rule.

## Frozen planning corpus

The merged source/catalogue run compiles all ten frozen programs and admits a
rewrite alternative for every one. Fifty-four laws are admitted, seven across
multiple programs; no physical representation is admitted. No alternative is
selected: every final gate is `measurement_budget`. Nine searches stop at their
planning time budget. Median recorded planning time is 93.197 seconds.

Near misses include 2,198 rejected premises and 795 rejected closures. The
archive retains per-program attribution, input sources/cores, plans, driver log,
full funnel and shapes. This producer remains explicit rather than default
discovery, so the corpus evaluates the merged general catalogue and supplies no
held-out performance claim for this learned example. The corpus uses its own
recorded copied working-compiler hash. The initial disk-copy failure and the
interim run stopped to reconcile upstream changes are retained as diagnostics.

## Reproduction

```sh
ink build-model examples/learned-program.ink examples/learned-program-training.json \
  --freeze-roots Structure --target javascript -o build/learned-baseline
ink build-model examples/learned-program.ink examples/learned-program-training.json \
  --freeze-roots Structure --specialize-frozen --target javascript \
  -o build/learned-selected
ink verify-model build/learned-selected --replay
node bench/learned-program/sample.mjs build/learned-baseline build/learned-selected
python3 reports/learned-programs-2026-10-16/audit.py --ink target/debug/ink
```

The source snapshots, package pins, private build log, exact artifact inventories,
negative controls, browser binaries/sources and raw measurements are bound by
`metadata.json`. Automatic planner profitability, learned representations,
general graph/tape specialization, device training and the full upstream
programme remain required work.
