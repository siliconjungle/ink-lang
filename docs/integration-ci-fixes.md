# Proposal receipts and browser fixture integration

The integration CI run for distribution main `58f66cfa` exposed two independent
failures. Cold automatic proposals reached receipt publication, then canonical
serialization rejected floating-point recipe durations. The browser conformance
job also consumed contract fixture manifests without generating those fixtures.

The active planner now emits `elapsed_seconds` as a decimal string, matching its
other canonical timing receipts. Successful completion and timeout tests both
exercise canonical serialization. The knowledge format still rejects floating
numbers in mathematical objects; search, checking and profitability rules retain
their meanings.

The browser job now runs the source-contract fixture suite with its configured
Zig compiler before transport preparation. It retains mandatory manifests and
source-identity comparisons instead of skipping missing fixtures.

Local validation:

- Twelve scheduler/planning tests pass, including fair streams and cleanup.
- Cold automatic discovery checks proposals, selects grouped/indexed/baseline
  plans from comparable observations, replays the selected plan and preserves
  fallback for an unmeasured target. Its policy costs are synthetic.
- The complete lifecycle/memory selector checks all 41 source-bound candidates.
- Indexed and nominal-key corruption tests still reject rehashed false proofs.
- All eight source-contract tests pass on reference, C, Rust, JavaScript and both
  Wasm backends, including snapshots, errors and transaction rollback.
- Numeric and parallel fixture preparation passes; all eleven CPU/GPU fixture
  source identities match.
- Actual browser replay passes 649 comparisons and 145 GPU calls on Chrome 154.

The distribution pins planner main `1af022087cd14de18e5a98bb3d9fbf64efe4c095`.
The frozen E1 machinery archive, source programs, measurements and evidence
manifest remain unchanged. This repair makes no new performance claim.
