# Prepared pure helpers and neural execution

`examples/prepared-network.ink` exposes ordinary prediction and derivative
functions through `std:neural`. The new sealed partial-call lane carries stable
parameter masks through lazy private helpers. Topology/policy checks can persist
with an immutable graph; changing weights/context/targets still compute fresh
forward values. There is no new neural operation or rewrite recognizer.

The retained [report](../../reports/prepared-helpers-2026-10-16/README.md) compares
prior/new emitted modules from the **same checked executable core**, plus
Handwired's own reference executors with unknown and checked `[0,1]` source ranges.
It includes independent graph and dense-forward controls. Every lane materializes
and consumes complete detached binary32 results: four outputs, or loss/four
outputs/all 244 parameter gradients. Input capture is outside warm timing and
measured separately; there is no state/optimizer/GPU timing claim here.

Run after compilation/tests have finished:

```sh
node --experimental-strip-types bench/prepared-helpers/run.mjs run \
  reports/prepared-helpers-2026-10-16/previous.mjs \
  reports/prepared-helpers-2026-10-16/current.mjs \
  /ABSOLUTE/PATH/handwired/src/runtime/numeric-ui-core.ts \
  /ABSOLUTE/OUTPUT/DIRECTORY
node --expose-gc bench/prepared-helpers/memory.mjs \
  reports/prepared-helpers-2026-10-16/current.mjs /ABSOLUTE/OUTPUT/FILE.json
python3 bench/prepared-helpers/analyse.py reports/prepared-helpers-2026-10-16 --check
```

The measured Node version is 25.3.0 on M4 Pro. Twelve fresh processes cover two
artifacts, development/holdout seeds and three repetitions each. Each process loads
one Ink module, checks all 16 complete cases, warms every eligible lane for 4096
calls and records eleven randomized samples per task/lane. Prediction batches have
1024 calls; derivative batches have 128. Full-output checks run again after each
sample. Inputs/correctness digests must match across artifacts and repetitions.
Paired old/new modules in one VM produced different relative timings in development;
those pilots are excluded from this isolated-artifact matrix. Memory/cold costs use
six additional processes, one module/token each, with three observations/artifact.

To re-emit the baseline, use distribution `f1f1f57` with its exact submodules in a
separate checkout. Emit the report's `source.core.json` with `--core --target
javascript`; current emission uses the same file. Never share Cargo targets across
different core checkouts. The source/receipt, emitted modules, upstream identity,
raw samples, validation logs and byte ledger are retained. The ledger detects
changed bytes; it cannot authenticate measurements or prove a backend.

This is explicit reuse, without automatic selection. The measured ordinary-call
regression, import/cold costs and faster controls remain part of the result.
Whole learning sessions, frozen graph specialization, device execution and broad
Pretext/Freerange/Handwired parity remain open.
