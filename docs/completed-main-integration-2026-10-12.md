# Completed work on main

This integration brings the finished voxel, codec and ECS compiler work into the
distribution's `main`, together with the completed work found by auditing the other
Ink branches:

- Source-bound point dependencies, cache repairs and bulk buffer semantics.
- General final-use ownership and the real upstream workload comparisons.
- Checked direct buffers, scalar columns, read bounds, unchanged fields and fusion.
- The generic Wasm read allocation fix and retained Frontier comparison evidence.
- Signal retention, adaptive/probabilistic planning and measured GPU comparisons.
- Database-authored refinements, observed usage planning and resource admission.

The independently versioned knowledge, planner, native support, lowering and runtime
repositories publish their combined changes on `main`. Exact revisions are recorded
in `docs/evidence/completed-main-integration-2026-10-12.json`. Their standalone
manifests pin core revision `7e15268be35430f5bf310cf191dc4645f54e16ad`, an ancestor of
the final distribution main, so core does not depend on a circular final pin update.

The database merge retains the union of the authenticated catalogues: 24,780 entries
and 7,142 discovery names. It preserves the direct/scoped buffer alternatives under
one recipe identity and the cardinality/resource recipes. Publication extension
preserves existing discovery names. Historical proof and benchmark bytes remain
unchanged; this integration does not turn historical measurements into measurements
of the combined compiler.

The overlapping Rust collector changes preserve both checked column carriers and
proved capacity reservations. Selected column maps retain their existing field
proofs; reserved collectors still return the selected output carrier. Physical
capabilities and the generated native read allocation guard now run in CI, with
eligible GPU execution checked in the GPU job.

All 36 local distribution branches were audited. The old unsquashed generic-language
and composable-state development histories were superseded by PR18/PR21 and later
constructor-case integration; their features are already present in main. The audit
records these separately from branches whose complete heads are ancestors of main.

`AGENTS.md` now requires completed, validated work to be merged and published on main
in the distribution and every changed independent package repository. Completion
reports must identify the verified main revision.

Local validation passed the complete core and native-support suites, standalone
package tests, 85 planner tests, 16 runtime host tests, and combined state/ownership
regressions. The required-target run checks C, Rust, JavaScript and both Wasm lanes,
plus actual eligible GPU execution. Its refinement check exposed an ordered-array
transport mismatch in the test helper; the corrected rerun passed. Both receipts
are retained, and this case is now included in GPU CI.
