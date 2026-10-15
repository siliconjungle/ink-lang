# Initial explicit-learning acceptance

`examples/adaptive-layout.ink` fits an interaction model to four contextual
observations: (width,length) = (0,0),(1,0),(0,1),(1,1), with targets .2,.7,.7,.2.
The target is not representable by additive terms alone. The test checks these
and held-out contexts (.5,.5) and (.25,.75), within .002 of the independently
specified bilinear target. It also fits twice and checks identical snapshots.
This is a designed capability demonstration, not evidence of generalization to
real user preferences, a convergence theorem or a performance benchmark.

Retained `training-trace.json` and model snapshot/receipt come from the offline
CLI test. Reproduce with `ink train examples/adaptive-layout.ink TRACE -o SNAPSHOT`.
The model is a full portable logical checkpoint, including training events.

`parity.log` records the required-target five-test suite. `gpu-receipts.json`
records the 24 online replies, including one actual eligible GPU kernel. Training
and stateful actions execute on the host; this does not claim GPU training.
Snapshots/events/errors and rollback after writes and emission are compared
against the independent reference. Imports/generics, metadata forgery and offline
admission failures are tested separately. Full-suite CI status must be checked
independently of these local receipts.

The value-state rerun uses ordinary `Model` reads and `Model=next` assignments.
It elaborates to exactly the same checked module and model snapshot as the
explicit table version, with all five tests and 24 cross-target replies passing.
