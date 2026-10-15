# Whole-computation learning acceptance

The controller in `examples/differentiable-world.ink` is fitted through twelve
feedback-controlled authored physics steps. The final position/velocity objective
generates its gradients automatically; the update changes only Controller state.
Existing fallible `requires`/`ensures` clauses reject invalid inputs and roll back
illegal candidate weights, including writes and emitted events.

The retained CLI run performs 200 explicit updates on two starting contexts. Their
losses fall from 1 each to approximately .038665 and .038652. A held-out context
falls from .377750 to .014966. This is a designed demonstration, not evidence for
arbitrary tasks, global convergence, collision handling or learned architecture.
The trace, before/after queries, model snapshot and bound receipt are retained.

The dedicated five-test suite includes independent central differences on a
binary32-constant real lift, closed-form collection/nonlinear checks, primal raw-bit
transport (including exceptional F32), hard-policy rejection, source hygiene,
imports, abstraction/refinement rejection, parameter-count limits and rollback.
Twenty-five values/outcomes and exact snapshots match on Rust, JS and Rust-Wasm.
The GPU host confirms two actual dispatches, including a batched gradient through
the authored twelve-step trajectory. Stateful learning actions execute on the host.

`composed-facts-parity.log` additionally retains six existing/extended proof suites,
including 56 source-call-fact cases and their source-bound proof replay. Complete
CI must finish separately before it can be described as green.

The AD transform remains trusted implementation code, and F32 derivative formulas
have no universal certified error bound. See `docs/differentiable-computation.md`.
The context-preparation benchmark deliberately retains a much faster handwritten
derivative control; this acceptance is not Handwired training-performance parity.
