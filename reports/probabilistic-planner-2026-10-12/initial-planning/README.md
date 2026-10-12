# Earlier planning observations

`planning.json` retains the initial acceptance-only learned ranking experiment,
including its losses. Its planner source is frozen in the sibling
`initial-unbatched/measured-artifacts.tar.gz`. The authenticated old model is
retained here. The final experiment added measured checker-effort prediction and
HNSW hints; it still did not improve selected structural quality.

`planning-concurrent-validation.json` retains an intermediate run overlapping
unit/integration validation. It is excluded from final performance tables.
Final `../planning.json` was rerun with no concurrent validation or benchmark jobs.

`neighbourhood-large-initial.json` retains the initial 100000-vector run. Its
setup field was omitted by a label-handling error; the final large run corrects
that field and repeats the measurement. Zero setup in this initial file must not
be treated as an observation.
