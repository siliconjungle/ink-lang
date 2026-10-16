# Guarded specialization lifecycle measurement

```sh
python3 bench/guarded-specialization/run.py --ink target/debug/ink \
  --out build/guarded-lifecycle/cohort-1 --pairs 5
```

This checks the retained source-bound plan before compiling a baseline and guarded
JavaScript image from the same core. Every fresh process checks all 96 finite
reference input combinations and the independent 335-outcome reference history,
including raw float bits, rollback, events and exact portable snapshots.

Twenty-four cases cover matching graphs, early/late mismatches, empty graphs,
three input sizes, persistent serving, short state lifetimes and graph/weight
learning writes at three read-to-write ratios. Timed calls consume complete list
results. All variants use identical iterations and inputs; paired processes
rotate their starting image and reverse alternate pairs. Additional plans can be
included with `--variant NAME=PLAN.json`; each replays against the original core.
Setup, first call, compilation, import, checkpoint/restore and
whole-process peak RSS are retained separately. Restore/checkpoint timings include
the small validation assertions in their loop. The within-process case order is
fixed, so these are workload observations rather than isolated per-case memory or
cold-start estimates. Reference validation precedes timing and warms module code.

Ratios above one favor the guarded image. The driver never publishes a planner
measurement or admits a candidate. Graph/weight writes exercise learning state;
they do not measure gradient descent or another full training algorithm. Native,
GPU and upstream matched-workload performance remain separate requirements.

`emitter-provenance.json` records whether the current guarded image reproduces
the historical report's emitted bytes. A later literal emitter may legitimately
change those bytes: the current acquisition still replays every plan and all
independent reference controls. The archived runner and historical auditor retain
their original exact-compiler reproduction contract. Image equality or a changed
image hash grants no correctness or profitability authority.
