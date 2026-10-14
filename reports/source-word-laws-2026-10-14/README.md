# Source word laws and scalar sharing

This report evaluates fixed corpus sources against distribution
`6c6ce85764e8f2e8146ce1f6a41677db815c7ff1` and independent knowledge
`36b2faab6bffbcbe7f15e0b00926f1d4bad1f2da`. The compiler was frozen before the
run. Each program received a private knowledge copy; the runner verified that
its execution context remained unchanged. `context.json` binds the compiler,
producer sources, planner, manifest and knowledge snapshot.

All ten programs compile and admit alternatives; two select an alternative.
Thirty-five laws occur in admitted candidate plans, six across multiple programs.
The new Boolean-choice word certificate is reused in `text-lines` and
`bulk-update`, where the baseline remains selected. No maintained representation
is admitted. Eight programs finish at the measurement-budget gate. Candidate
admission is not a runtime speed claim.

The report records 2,127 closure rejections and 2,527 unmet-premise rejections.
These are search observations, not new premises. The semantic-laws recipe
accounts for 56.3% of recorded recipe time. Reported per-program seconds time the
planning subprocess, excluding private-store construction, attribution and cleanup.

The earlier scalar-sharing corpus used a different planner context. Its one
selected alternative versus this run's two cannot be attributed to word laws
alone. See `word-attribution.json` for exact certificate entry identities.

The unchanged lexer experiment in `bench/lexer-word/results.json` separately
shows mixed profitability across input distributions. The explicit scanner in
`bench/lexer-runs` is a different algorithm and has no universal replacement proof.
ECS sharing measurements are in `bench/ecs-lifecycle/scalar-sharing-final-results.json`.

Local release validation passes eight physical integration tests across C,
Rust, JavaScript, both Wasm targets and eligible native GPU work; browser word
validation passes 37 comparisons including 11 actual WebGPU calls. Two
distribution installation tests and 13 focused knowledge tests pass. These are
conformance results, not a proof of backend correctness or a claim that every
repository CI job has completed.

Publication incorporates newer unrelated knowledge state-protocol proposals and
the Frontier measurement report after this run. Preserve this provenance when
comparing against a later main revision.
