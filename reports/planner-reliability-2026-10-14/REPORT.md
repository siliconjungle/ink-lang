# Checked planner selection — 14 October 2026

Automatic maintained-fold selection now completes under the same 30-second
checker deadline that previously left only the baseline. This follow-up changes
checking and offline search; it does not add another runtime speed claim against
signals, Frontier, or UI frameworks.

Maintained admission no longer authenticates and clones the same bundle before
the definition checker authenticates it again. Prefix caching now covers the
existing 128 MB admission allowance rather than silently excluding proofs larger
than 16 MB. Sealed maintained witnesses and packets are immutable shared values.
Canonical prefix bytes and the original checked module still bind reuse. Changed
membership forces admission again; a rejected continuation retains the previous
witness. Fresh final replay remains mandatory.

The planner distinguishes a checker deadline from mathematical rejection. It
reports unchecked edges, continues other proposals, and never caches a selection
whose candidate checks timed out. Three regression tests cover continuation after
a deadline, subprocess timeouts, and preventing an incomplete baseline cache.

## Measurements

The optimized validation compiler uses opt-level 2, 16 codegen units, no LTO and
two build jobs. These command-local flags do not change production Cargo profiles.
The exact configuration and compiler hash accompany the artifacts. Fresh replay
of the 17 MB filtered proof took 2.75 seconds; repeated and dense continuations
took 2.49–3.55 seconds and reused one admitted step. The previous debug replay took
31.70 seconds. This comparison includes the build-mode change: it does not isolate
the source optimization or establish a universal speed ratio. Serialization and
target emission still account for substantial continuation work.

All state measurements use independent source results, events, versions and exact
portable snapshots, three fresh processes per candidate, explicit module/setup/
update/abort/checkpoint/restore weights, and separate held-out histories. These
are workload-weighted lifecycle estimates, not raw hot-action nanoseconds.

| Search | Admitted states | Unchecked checks | Training cost / literal baseline | Held-out cost / literal baseline | Selected |
|---|---:|---:|---:|---:|---|
| Filtered, maintenance registry | 4 | 0 | 0.205 | 0.288 | maintained, dense 256 |
| Two-table weighted ledger, maintenance registry | 4 | 0 | 0.150 | 0.235 | maintained, dense 4096 |
| Filtered, full installed registry | 16 | 0 | 0.277 | 0.271 | maintained, dense 256 |

All frozen winners pass the held-out rejection gate. The ledger holdout includes
wrapping multiplication, nested rollback, deletion and keys outside the selected
dense range. Maintenance-only searches reach their fixed point in 36.68 and
30.51 seconds. Full-registry search checks 17 proposals and stops at its configured
16-state bound after 87.31 seconds; no global-optimum or exhaustive-search claim
follows. Publication, calibration and final replay add time beyond search.

## Frozen corpus and validation

The unchanged frozen subset `sequence-every`, `index-membership` and
`incremental-distinct` all compile through the ordinary default registry. The
first two select alternatives under default synthetic probe policy; the third
retains its baseline. All quick searches stop at their time bound. Five laws are
admitted across the subset, with no one law admitted in multiple programs. This
is bounded selection evidence, not broad cross-program reuse or an independent
held-out profitability result for those pure programs. The complete funnel and
near-miss report are included.

All 180 planner tests pass with the integrated knowledge revision. Maintained
conformance checks the large packet, changed membership, forged obligations,
invalid physical continuations, prefix reuse, ownership, wrapping, failures,
staged observations and portable restore. The transport/default-normalization
test passes. Mandatory source-controller parity matches C, Rust, JavaScript and
both Wasm backends, including exact snapshots, and executes one actual GPU call.

The original action-specialization report remains the runtime performance
comparison. Manual signals still leads its matched hot-action control. These
results close the demonstrated admission/selection timeout gap; arbitrary
workloads may still need more search, applicable laws, or comparable measurements.

Compressed selected plans, exact receipts, generated artifacts, workload inputs,
compiler configuration, revision pins, raw validation logs and hashes accompany
this report. Mathematical admission does not prove compiler/controller correctness.
