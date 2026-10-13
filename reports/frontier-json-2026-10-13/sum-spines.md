# Private sum carrier work

Nested source sums can now have database-proved private tag/payload layouts.
The generic source codecs retain opaque leaves; authoring and site proposals
live in knowledge, and unsupported targets reject the layout. This is a staged
implementation report, not a claim that Ink beats Frontier across all metrics.

The source/carrier checks require both closed ordinary equality proofs.
The executable fixture tests every proposed site and the combined layout,
composed with a private record layout. It covers callbacks between differently
represented sums, exact integers, raw float bits, recursive leaves, destination
outputs, shared state replies, invalid inputs, input/output resource charges,
binary requests and outputs, nested failures, events, versions, host rollback,
checkpoint limits and byte-exact restore across layouts. Rehashed false proofs
and unsupported backend requests reject. Publication happens only after every
authored codec proof replays.

Validation: 67 core unit tests, the JavaScript package suite, five JSON tooling
tests across all mandatory CPU targets, two maintained-state tests and eight
signal/state tests passed. The knowledge producer and record-composition tests
also passed. These tests do not constitute whole-compiler correctness proofs.

Processes 272 and 273 are single-process diagnostics of intermediate emitters.
Process 273 showed about 24 microseconds for captured edit plus owned output,
against Frontier's 102 microseconds, and about 100 versus 126 microseconds with
capture/clone included. The inputs have different validation contracts. These
numbers are not paired causal evidence, and later sharing corrections changed
the emitter. Their exact modules, plan and runner are archived in
`artifacts/sum-spines`; no automatic selection follows from these observations.

Processes 274–276 compare the corrected emitter with a record-only control in
the same process, rotating all lanes. Full outputs, detachment and exact
portable/compact bytes agree before timing. Both modules and the runner are
hashed and archived. Severe shared-host load, low free disk space and concurrent
validation affected this cohort; even Frontier controls moved several-fold.
`sum-spine-noisy-controls-274-276.json` explicitly rejects this cohort as
profitability evidence. All results, including regressions, remain retained.

The paired harness now accepts a fourth positional argument containing a
comparison module. It measures capture, private calls, complete owned outputs,
logical calls and encoded output with the same controls and resource semantics.
Cold imports and codec factories remain diagnostics; module load order can
affect those phases. Private and encoded outputs are separate boundaries with
no matched Frontier speed claim.

Remaining work includes reliable lifecycle and retained-memory measurements,
selection from observed usage, JSON text conversion, small state operations and
the arbitrary snapshot-diff comparison. The sum layout also retains some
temporary views and existing children needed for shared state replies.
