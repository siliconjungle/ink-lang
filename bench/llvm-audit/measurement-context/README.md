# Execution-context-bound offline selection (F076)

The old adapter gave normal Node and `NODE_OPTIONS=--jitless` the same observation
target and selected-plan cache key. Native optimisation flags and worker settings
also aliased; Node heap changes separated cache options but not observation targets.
The actual old-planner integration reproduced the bad warm-cache hit.

The planner now records known execution controls and actual tool bytes, uses one
Node command builder, binds bounded native configuration lookup, and keeps one
frozen execution binding through candidate publication. Both acquisition paths
recheck their context before storing observations. Complete proof replay remains
mandatory on cache hits. See the pinned planner's `docs/measurement-context.md`.
This adds cost provenance, not a runtime adaptive strategy or rewrite authority.

Local validation on the integrated source: 82 focused tests; two automatic
Rust/JavaScript/Rust-Wasm tests with required Wasm enabled; one upstream hoisting
cross-target test; actual normal/jitless/warm/restored cache switching with 24
held-out calls and corrupt-proof recovery; and an actual five-phase state
lifecycle with rollback, events and exact portable snapshots. The publication-race
regression passes with a frozen binding and fails when old choices are re-keyed
with changed host settings. Four CI partition checks and workflow parsing pass.

Frozen before/after corpus: 10/10 compile in both, seven laws reused across programs,
45 versus 44 laws admitted and two versus three alternatives selected. Median
reported planning/capture totals were 18.673 versus 17.708 seconds; wall totals
721.879 versus 643.705 seconds. Searches hit time limits and share machine resources.
These differences do not establish speed or generalisation gains. The controlled
comparison precedes the upstream binder/hoisting integration; that combined source
has separate focused and cross-target validation. Knowledge copies are private.

An additional broad source-contract run was stopped incomplete after 29:11 in an
unchanged expensive proof-generation case, with 13/14 tests completed. It is not a
passing full-suite result. Current relevant checks completed separately. Remote CI
must finish green before this release can be called verified.

The file audit separately completed all 83 pinned LLVM Analysis/MemorySSA fixtures,
and fully read CaptureTracking plus Ink's last-use analysis. LLVM tests were not
executed. Recorded context is not hermetic attestation, and this fix establishes no
runtime speedup. Historical browser timings remain under their original pins.

`validation.json` retains exact tested pins, test/log hashes, raw per-program
comparison summaries and limitations. The user-facing outputs retain the actual
integration receipts and complete corpus records. No historical costs are relabelled.
