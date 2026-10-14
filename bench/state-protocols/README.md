# Whole state implementations

`prepare.py --compiler /absolute/ink -o /absolute/output` freshly replays the
original source/action/fold proofs and composes database-owned protocol and column
choices. No profile supplies proof premises. The original source core and explicit
allocation/read/write/failure/publication graph are retained with every artifact.

Use `bench/signals-state/maintained-bench.mjs` with `grouped_subscriptions:true`.
This compares one Ink tuple subscription with one Preact effect, alongside the
manual full-width U64 control with failure, version and event bookkeeping.

The hot control matches that action/observation contract. General host transaction
and portable snapshot functionality is independently validated and measured through
planner lifecycle workloads; its cold cost is not silently included in one lane.
Run multiple fresh processes, retain raw samples, and report each phase separately.
