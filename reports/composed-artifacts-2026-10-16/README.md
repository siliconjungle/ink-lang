# Initialized composed model artifacts

`build-model --specialize-frozen` now publishes longer closed computations as
initialized artifacts. The untrusted knowledge driver selects bounded helper
composition when it proposes helpers and direct specialization otherwise. Both
paths replay ordinary proofs before publication. Verification repeats every
extension and complete action rewrite even without training replay, checks the
selected source and compiled plan binding, and retains the original restricted
checkpoint namespace.

The 128-operation trace configures its sequence and initial weights; it does not
learn the sequence or establish convergence. The action history then retunes
live weights, including failed updates, changes application state and serves
signed zeros, subnormals, finite extremes, infinities and NaN payloads. Artifacts
start from the complete trained checkpoint; fresh instances restart from that
seed and explicit continuation restores preserve complete state.

JavaScript and Wasm compare every reply and checkpoint. Native and Rust projects
compare every reply and the final checkpoint. Browser replay exercises complete
JavaScript/CPU/GPU-host histories, fresh seeded instances and a separate real
numeric device dispatch. Training and stateful serving remain CPU computation.
Composed WebGPU packages include compiled CPU Wasm fallbacks in their inventory.
The requested Cargo executable is propagated through nested fallback compilation.

All six trained-build tests pass after composed fallback packaging; the focused
five-target case passes again after the final explicit-toolchain API change.
Eighteen frozen knowledge tests pass. The earlier twelve frozen-state tests also
pass with mandatory Wasm/GPU coverage. The initial combined run's retained log
contains a fixture failure: Wasm reports `unknown action` without JavaScript's
additional action name. The assertion was corrected, and both final test logs
pass. Rehashed damaged action proofs, extension bindings, missing whole-action
rewrites and emitted plan bindings are rejected by verification.

The report ledger and audit bind the exact artifacts, history, source revision,
package pins, test logs and fresh committed compiler reproduction. The earlier
[composition study](../frozen-composition-2026-10-16/README.md) contains warm
performance measurements. This packaging change adds no new speedup claim;
code size, startup costs, broader capture/graph support and automatic profitability
remain open. Physical/routing steps beyond extension/rewrite plans reject in
this initialized adapter. Implementation code and toolchains remain trusted.

Run `python3 audit.py` for the retained image/inventory audit. Add
`--ink /absolute/path/to/ink` to replay restriction, every plan proof and training
for all five artifacts, or `--chrome /absolute/path/to/Chrome` to repeat the
initialized browser history against the retained compiled bundle.
