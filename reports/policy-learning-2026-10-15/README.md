# Authored objectives and discrete policies

The new ordinary source library `std:policy_gradient` supplies categorical
score-function gradients, allowed-action masks, reward-to-go and mean trajectory
gradients. Applications own masses/derivatives, context, random inputs, rewards,
baselines, constraints and update/publication rules. The compiler has no built-in
engagement or other product objective. See [interfaces and limits](../../docs/policy-learning.md).

Four mandatory tests pass in `conformance.log`. Score vectors are compared with
independent binary64 finite differences of normalized masses. Boundary sampling,
masked large masses, overflowing mass totals, derivative/shape rejection,
NaN/infinity/subnormal failures, returns and trajectory reduction are exercised.
Twenty-two cross-target values/outcomes and exact snapshots match on reference,
Rust, JavaScript, Rust-Wasm and the GPU host. They include pending delayed feedback,
duplicate/stale feedback rejection, candidate-bound rejection and rollback. `gpu-receipts.json` includes one
actual unrelated eligible numeric dispatch; policy training runs on CPU hosts.

The application uses source AD over a whole-context policy, four parameters and
complete F32 Adam state. Twenty deterministic epochs (160 updates) learn opposite
preferences in two contexts. Ten epochs plus an exact complete-state resume match
the uninterrupted checkpoint. `predictions.json` records trained compiled JavaScript
probabilities: 0.9873738884925842 for the negative-signal preference and
0.9873063564300537 for the positive-signal preference. These are designed training
contexts, not a held-out statistical generalization claim.

`trained/` is a complete unchanged adaptive build-stage package. Its factory's
checkpoint exactly matches `complete.snapshot`. It captures the checked module,
training trace, receipt, generated entry and host helpers. Reproduce verification:

```sh
ink verify-model reports/policy-learning-2026-10-15/trained --replay
python3 reports/policy-learning-2026-10-15/audit.py
INK_PARITY_REQUIRE_ALL=1 INK_TEST_WASM=1 INK_TEST_WGPU=1 \
    cargo test --locked --test policy_learning -- --nocapture
```

`metadata.json` binds every retained file, the knowledge revision and unchanged
canonical snapshot. `corpus-report.json` records the frozen planning-corpus funnel,
timeouts, near misses and cross-program law reuse. This source-library addition
does not change canonical laws or install automatic implementation selection.
Local validation includes the pre-existing unpublished semi/anti-join parser change
in core/src/syntax/query.rs; this work does not modify or publish it. These programs
do not use those forms. Clean pinned CI remains the full-revision gate.

The preceding adaptive-build CI run `38727340337` found a GPU fixture setup failure:
its generated lock selected `equivalent 1.0.3`, while only the older template's
dependencies had been fetched before an offline build. The fixture now fetches its
actual package lock and builds with both `--locked` and `--offline`, retaining all
GPU/state assertions. `trained-gpu-dependency.log` records that regression check.

F32 sampling/score arithmetic is a declared numerical algorithm, not an exact-real
sampling or universally unbiased-gradient proof. Correct derivatives, an appropriate
random source, on-policy collection and action-independent baselines belong to the
author's estimator contract. Typed snapshots and file digests do not prove feedback
authenticity. There is no convergence, reward-quality, machine-code-correctness or
throughput ranking claim. PPO/off-policy correction, frozen specialization,
parallel/device learning, faithful F64/Pretext and the broader Handwired performance
requirement remain open.
