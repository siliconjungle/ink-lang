# Planning corpus

A fixed set of programs for measuring whether installed knowledge improves
programs it was not written for. `corpus.json` pins each source by SHA-256.

**Policy.** A program enters the corpus before any law aimed at it is authored.
Later knowledge is evaluated on it unchanged. A program used to author or repair
a law moves to a development split; it is never silently edited. The ten
`heldout/` programs are the frozen sources of
`reports/knowledge-growth-2026-10-13` (partial ports of lodash, TypeScript,
VS Code, tldraw, RBush, gl-matrix and RxJS kernels).

## Running

```sh
PYTHONPATH=planner:knowledge python3 -m ink_planner.corpus \
  --manifest bench/planning-corpus/corpus.json --compiler target/release/ink \
  --knowledge-root knowledge --planning-effort balanced -o build/planning-corpus
```

Each program is compiled by the ordinary compiled planner against a private,
hard-linked copy of the knowledge root, because compilation publishes admitted
candidates into the store it is given. `report.md` and `report.json` record:

- **Headline:** programs with an admitted rewrite alternative, programs whose
  default build selected an alternative, laws admitted in two or more programs,
  median planning time, and stops caused by the time budget.
- **Per-program funnel:** semantic matches, checker admissions, rejections and
  unchecked matches; admitted states by kind; and the last selection gate.
- **Near misses:** checker rejection gates, failed premise shapes (law
  parameters erased) and the same premises as instantiated in each program.
- **Planning time by recipe**, summed over the corpus.
- **Attribution:** which knowledge entries each program's admitted candidates
  applied, so reuse across programs is visible.

`--report-only` re-aggregates existing records; `--programs a,b` reruns a subset.
Everything in the report is an observation of untrusted search and recorded
selection, never proof, applicability or profitability authority.

## Results

- [results-2026-10-13.md](results-2026-10-13.md): planning funnel and near misses.
- [results-measured-2026-10-13.md](results-measured-2026-10-13.md): selection
  from development inputs, timed on held-out inputs.
- [results-defaults-2026-10-14.md](results-defaults-2026-10-14.md): the ordinary
  default compile with no supplied inputs, timed on held-out inputs
  (`measured.py --defaults`).
