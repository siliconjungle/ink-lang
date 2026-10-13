# Measured selection on the held-out corpus (2026-10-13)

Before this work, every corpus program kept its baseline: no admitted
alternative had comparable evidence ([earlier results](results-2026-10-13.md)).
`measured.py` closes that gap. For each program it:
1. builds a workload from the **development** inputs only;
2. lets the ordinary compiled planner time every admitted candidate on them
   and select through the lifecycle rank and its bootstrap guard;
3. times the selection against the baseline on the 24 **evaluation** inputs,
   which never reach selection, using paired, interleaved samples
   (`evaluate.mjs`).

A cell is a robust gain or loss when its 95% bootstrap interval excludes 1
and the effect is at least 5%.

## Three runs

| Run | What changed | Programs selected | Held-out geomean vs same-compiler baseline | Robust gains / losses |
|---|---|---:|---:|---:|
| [1](measured-2026-10-13/report.md) | measured selection only | 3 / 10 | 1.311× | 49 / 4 |
| [2](measured-after-fixes-2026-10-13/report.md) | core refuses representations of stateless modules | 4 / 10 | 1.288× | 52 / 0 |
| [3](measured-final-2026-10-13/report.md) | plus order analysis, guarded laws, in-place appends | 5 / 10 | 1.289× | 39 / 8 |

**Run 1.** 30–56% of each program's candidates could not be timed. They were
plans with a representation step for a program with no state, and on
JavaScript such a plan emits a state module with no pure entry. The core now
refuses them, and the adapter reports the reason instead of failing on a
missing property. Run 2 timed every candidate.

**Run 3.** This run also times each program against the **previous default**:
the unchanged source compiled, without a plan, by the compiler from before
this work. That comparison is the end-to-end before/after.

| Program | Selected | Versus previous default | Gains / losses |
|---|---|---:|---:|
| incremental-distinct | baseline (now with in-place appends) | 10.02× | 17 / 1 |
| spatial-collision | rewrite, properties | 3.75× | 18 / 0 |
| drawing-hit | rewrite, properties | 2.72× | 18 / 0 |
| compact-set | rewrite | 1.58× | 17 / 1 |
| index-membership | rewrite, properties | 1.51× | 3 / 0 |
| bulk-update | baseline | 1.02× | 0 / 1 |
| particle-step | baseline | 1.02× | 0 / 0 |
| text-lines | baseline | 1.01× | 0 / 0 |
| ast-ancestor | baseline | 0.99× | 0 / 1 |
| sequence-every | properties, properties | 0.97× | 0 / 2 |
| **all 10** | | **1.73×** | **73 / 6** |

## Losses and noise

- **sequence-every.** The guard accepted a plan only 3% faster on the two
  development inputs (31 and 257 items). On held-out inputs it is about 6%
  slower at 7 items and neutral elsewhere. A minimum-gain margin of 5%
  (`--min-gain`) would have rejected it. The default stays at 0; changing it
  after seeing held-out results would leak them into the protocol.
- **compact-set.** The selected rewrite is about 5% slower on 7-item inputs
  and 1.3–1.6× faster on larger ones.
- **Noise floor.** ast-ancestor and bulk-update emit byte-identical
  JavaScript before and after, yet each shows one "robust loss" (0.82× and
  0.85×), and ast-ancestor's geomean is 0.987×. About 1 cell in 100 is a false
  alarm, and whole-program differences under about 2% are noise.
- **Selection varies between runs.** drawing-hit and spatial-collision chose
  different, similarly fast plans in different runs (2.6–3.1× and 2.5–3.7× on
  held-out inputs). Their development inputs separate the plans by only a few
  percent.

## What this does not show

- Ten small programs. The 24 evaluation inputs per program span sizes 0 to
  16,381 and six distributions, but they are generated data.
- JavaScript on one machine. C timings for the in-place change are in
  [in-place-reuse.md](../../docs/in-place-reuse.md).
- Selection without timings: see the
  [work model](../../planner/docs/work-model.md), which validated on a single
  held-out pick.

## Reproduce

```sh
python3 bench/planning-corpus/measured.py --compiler target/release/ink \
  --reference-compiler OLD/ink --work -o build/measured
python3 bench/planning-corpus/work_model.py build/measured -o build/work-model
```
