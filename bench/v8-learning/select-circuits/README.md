# Versioned conditional circuits and smaller checked proofs

`shared-select-v3` extends fixed Boolean circuit construction with exact
conditional-gate reuse, negated-condition normalization and constant-arm
reductions. It has a separate CNF identity. The invocation-local tables contain
complete literal tuples; no hash, matcher, profile or source-pattern catalogue
grants equality. Existing variable, clause, step and replay-work limits remain
unchanged. The old literal-v1 and shared-v2 circuit identities stay pinned.

The V8 starting points are its composed machine simplification/value numbering
phase and graph-local side tables. Ink applies exact reuse inside one total
Boolean problem. Source equations, solver search and certificate-size decisions
remain in the independently pinned knowledge package.

All eighteen existing count equations were independently re-proved and replayed
under the new encoding. Their aggregate CNFs shrink from 8,712 variables and
28,829 clauses to 7,003 and 18,262. Certificates do not improve uniformly: using
all new proofs would take 219,604 canonical bytes versus the old 297,075. Keeping
the smaller checked certificate per unchanged equation instead takes 208,862
bytes, a 29.7% reduction: nine new certificates and nine retained shared-v2 proofs.
A smaller CNF does not establish a smaller certificate or faster replay.

The actual source-selection packet drops from 218,219 to 166,730 bytes. It still
checks fourteen applications, all 21 original reference calls in each source
lane, and strict evaluation-budget controls. All 26 emitted JavaScript and
Rust-Wasm source/manifests are byte-identical to the retained count cohort. No
runtime measurements are relabelled or repeated as a new speed claim. The
historical JavaScript count result remains scoped to its development workload;
see [its evidence](../counts/README.md).

The exact 232-file standalone core package
`f625b7b6928d8535fba74390ad70d9a4eab5f710`, tree
`39a70aa9bff9ad92abfb00c27ef158aa7be4c5f9`, passes all 503 tests in a fresh
private checkout and isolated target, with example builds and doctests. This
includes exhaustive Boolean/constant conditional assignments, legacy identities,
wrong-encoding and work-limit controls, and all three count carriers. Four
knowledge tests cover the mixed bank, real source applications, strictness,
rehashed false goals with their actual encoding, and function specialization.
Historical count and near-limit quotient plans replay unchanged.

All five lowering/runtime repositories publish matching full dependency pins;
metadata and locked fetch pass, including refreshed tracked locks. Their emitter
and runtime source bodies are unchanged. The final compiler image is byte-identical
to the development image; source and dependency contexts remain separately bound.
The separate frozen ten-program evaluation finishes with terminal zero and an
unchanged context: all ten compile, 25 laws admit, six are reused across programs,
and zero alternatives are selected. No current count law or semantic-entry
identity is attributed. Shared-host time-bounded timings do not establish causal
compiler acceleration or generalization from these proofs.
All 647 retained legacy first-order seeds also pass the full seed/mutation harness
on the final kernel in the declared minimal fixture workspace. These finite
checks do not prove the compiler, lowerers, ABI or toolchain correct.

A separate V8-inspired generation-stamped assignment scratch prototype returns
identical proof hints. Three fresh processes with eleven alternating paired
rounds show before/after ratios of 0.996, 0.993 and 0.992 for complete cold helper
construction and all eighteen retained hint traces. Every 10% extrema guard fails;
the producer keeps its existing dictionary implementation. These are component
measurements, excluding SAT solving and kernel replay; memory and concurrent host
load are unknown. Six canonical observations store these exact external Python
component timings with distinct program/invocation hashes and an external backend
label. They do not claim checked Ink source/plans or supply runtime evidence.
The proof snapshot, source fingerprints and selection policy stay unchanged.
The selected comparison inputs and raw reports are retained.

The selected capsule omits private stores, temporary source checkouts, targets
and failed insight-only search scratch. Git retains exact source history.
`reprove.py` regenerates the paired obligations from the full baseline knowledge
revision and needs only the declared source core, compiler and current producer
modules. Every proposed certificate still needs ordinary replay. The coverage
ledger continues to distinguish source reads from applicability and implementation;
all twenty-two review families remain partial.

From the repository root, `PYTHONPATH=knowledge:planner python3
bench/v8-learning/select-circuits/audit.py` authenticates both capsules and reads
back the six component observations. Add `--compiler /path/to/ink --scratch
/fresh/replay` for ordinary mixed/V3 law and source-plan checks, or
`--materialize /fresh/inputs` to reconstruct only the declared selected inputs.

After all required workers finished, 221 exact owned generated paths retired
with zero blocked paths or deletion errors. Retained compilers and both capsules
still audit successfully. The free-space reserve remains below 100 GB; shared
Cargo/reuse caches, protected or unclassified inputs and other agents stay
untouched. The cleanup receipt does not attribute concurrent free-space changes
to this campaign.
