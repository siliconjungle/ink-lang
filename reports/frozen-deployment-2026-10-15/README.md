# Explicit immutable deployment

This milestone freezes authored degrees of freedom after training. It does not
establish a neural throughput improvement or complete the Handwired, Pretext and
Freerange programme.

`build-model --freeze` freezes declared trainable roots; `--freeze-roots` selects
other or fewer roots. The new source binds typed rows and withdraws writers and
their callers. All retained capabilities and invariants still check. A complete
checkpoint is rebound to the new source without changing its logical payload.
An adaptive checkpoint cannot silently restore to the different frozen source.

## Retained artifact

`neural/` is an executable JavaScript package for the 244-parameter ReGLU example.
It resumes six frames from the earlier six-frame Adam checkpoint, then freezes
`Architecture`, `Optimizer` and `Control`. Its training checkpoint exactly matches
the earlier twelve-frame checkpoint. Both Adam moments, model/control state,
commit version and pending events remain present.

`script.json`, `reference.json` and `cases.json` retain full model/control reads,
prediction and objective results. The generated package matches every result and
the exact deployment checkpoint, rejects its withdrawn writer and original-source
checkpoint, and starts independent fresh instances. `verification.json` records
successful reference training replay and mandatory source-restriction replay.

The restriction is not inferred from file hashes. The mandatory integration tests
change compiled fixed data, deployment commit version and removed-action metadata;
even after recomputing the inventory hashes, verification rejects each artifact.

## Validation and scope

- Exact standalone published core package: **403 tests**, independent of backend
  and knowledge checkouts. Six immutable-state tests cover raw float bits,
  initialization, nominal/state invariants, transport, restore and a checked
  constant-lookup equality with wrong/missing-premise rejection.
- Thirty integration tests: 29 in the recovered learning/module/package run plus
  one neural/reward-model freezing test. The frozen suite covers four tests in
  total. Nine frozen values/outcomes and exact snapshots agree across reference,
  Rust, JavaScript, Rust/Wasm and native GPU-host execution; one separate eligible
  numeric call actually executes on GPU. Three forged fixed-table restores reject
  on reference, JavaScript, native Rust and Wasm. The native GPU conformance helper
  does not run those rejected-restore script entries.
- Partial freezing retains another learner and its exact updates. Full neural and
  reward models preserve their complete optimizer/control payloads and predictions.
  Deep recursive values, wide words, nominal IDs, hostile record field names,
  empty fixed tables and raw NaN/signed-zero/subnormal values are covered.
- Independent package checks: Rust 20 unit tests, JavaScript one, runtime two;
  GPU and Wasm standalone library compilation succeeds (zero library tests).
  Feature inventory and four partition-audit tests cover 46 mandatory CPU suites.

The first full integration rerun was interrupted by disk exhaustion: an incorrect
full-distribution core pin recursively fetched its large submodules. This was
corrected using the repository's exact core-only package workflow. Disposable
dependency/test caches were removed and the full run passed. The failed log is
retained as `interrupted-regression.log`; `regression.log` is the successful rerun.

Validation used a local working tree containing an unrelated, uncommitted query
parser edit. Its diff identity is recorded in metadata and the edit is excluded
from this publication. The separately published exact core tree passed all 403
tests without that edit. Hosted integration CI remains a separate release gate.

No optimization law or catalogue snapshot changed. Fixed-root equalities derive
from checked source semantics, the absence of writer capabilities and checked
restore. The checker, source correspondence, emitters, codecs, toolchains and
drivers remain trusted implementation code. No convergence, universal error,
artifact-authenticity or whole-compiler proof follows from these tests.

Automatic neural/arithmetic specialization, prepared fallback elimination, source
reverse AD, parallel/device training, F64 layout fidelity and broad measured
performance remain required work. Immutable state supplies facts and restricts
behavior; it does not by itself make evaluation faster.

Run `python3 reports/frozen-deployment-2026-10-15/audit.py --compiler target/debug/ink`
to audit the retained files and replay ordinary semantic artifact verification.
