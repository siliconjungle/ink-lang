# Ordinary defaults on the held-out corpus (2026-10-14)

This tests Priority 7's gate directly. Each program is compiled with no inputs,
workload or profile at all: `ink_planner.compiled_planning` with only
`--source`, `--target javascript` and `--planning-effort balanced`. The
default selection then acquires its own bounded synthetic typed probes
(`knowledge/ink_knowledge/automatic-selection.json`). Next, the selection and
the unplanned baseline are timed on each program's 24 **evaluation** inputs.
Those inputs never reach selection, and no program-specific input is supplied.

```sh
python3 bench/planning-corpus/measured.py --compiler target/release/ink --defaults -o build/defaults
```

[Full table](defaults-2026-10-14/report.md) · [records](defaults-2026-10-14/records.json)

| Program | Default selection | Held-out geomean | Robust gains / losses |
|---|---|---:|---:|
| drawing-hit | rewrite, rewrite | 6.92× | 18 / 1 |
| spatial-collision | rewrite | 2.41× | 6 / 0 |
| sequence-every | rewrite, physical | 2.31× | 6 / 1 |
| ast-ancestor | rewrite, physical | 1.53× | 3 / 0 |
| index-membership | rewrite | 1.51× | 3 / 0 |
| compact-set | rewrite | 1.30× | 12 / 0 |
| text-lines | baseline | 1.00× | – |
| particle-step | baseline | 1.00× | – |
| bulk-update | baseline | 1.00× | – |
| incremental-distinct | baseline | 1.00× | – |
| **all 10** | **6 selected** | **1.61×** | **48 / 2** |

A cell is a robust gain or loss when its 95% bootstrap interval excludes 1 and
the effect is at least 5%. Planning took 18–79 s per program (median 64 s),
including probe acquisition.

## Findings

- **Defaults now improve unseen programs on unseen inputs.** Six of ten
  programs select an alternative with no supplied evidence. Every selected
  program is faster on held-out inputs, and the four that kept their baseline
  are unchanged by construction.
- **Both losses are empty inputs.** `drawing-hit` and `sequence-every` are
  about 5–6% slower at size 0 (`0-adversarial`). No loss appears at any
  non-empty size.
- **The earlier false positive is gone.** Under development-input selection,
  sequence-every chose a plan that was 3% faster on two inputs and slower on
  held-out ones. The default probes span four sizes and six distributions, and
  now pick a plan that is 2.31× faster on held-out inputs.
- **Why four programs keep their baseline.** The guard requires a robust 5%
  gain on the probes:
  - incremental-distinct's one shortlisted alternative (of 511 admitted)
    measured 0.99× of baseline time, with an upper bound of 1.01;
  - text-lines measured 0.99× (upper bound 1.14);
  - every particle-step and bulk-update alternative was slower than its
    baseline (1.00×–1.91× of baseline time).

## Limits

- Ten small programs, JavaScript only, one 2-vCPU Linux sandbox. Some
  programs were evaluated while unrelated builds ran; paired, interleaved
  sampling reduces but does not remove that noise.
- Synthetic probes are workload proposals, not observed usage. They are bounded
  to four sizes up to 2,048 items, while held-out inputs reach 16,381.
- Three programs were rerun after fixing a corpus-tool bug. Private knowledge
  copies hard-linked the SQLite index, so one evaluation's observations leaked
  into the shared checkout and crashed later runs of the same program. Copies
  now duplicate mutable index files (`ink_planner.corpus.private_copy`).
