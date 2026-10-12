# Remove learned search ranking — 2026-10-13

The optional learned proposal-ranking model and checker-effort regression are
removed, together with `ink-fit-search`, `--search-model`, the `learned` strategy
and the former trainer module. Deterministic search remains the default. Seeded
stochastic search retains fixed structural scoring, bounded restarts, diagnostic
traces, independent proof replay and optional compiled scoring.

Parallel and saved-evidence adaptive callers no longer accept or forward a search
model. Old model-bearing profiles fail exact context comparison. Archived learned
strategy evidence cannot select that removed strategy. The historical October 12
measurements and their losses remain intact; current benchmark commands omit the
removed variant and the reporter accepts either historical or current samples.

Real-checker validation also exposed an existing trace bug: generated proposal
views have no `snapshot_id`. Traces now bind the original input catalogue identity
already saved before creating those views.

## Validation

- All 128 planner unit tests pass, including rejection of removed flags and the
  trainer module, fixed-seed replay, shared budgets and stale strategy evidence.
- Actual compiler integration passes synthesized proof replay, rejection of a
  rehashed false theorem, successful parallel worker receipts, shared-budget and
  final replay checks, failed scoring fallback, original-snapshot trace binding,
  and adaptive deterministic fallback without a model.
- Deterministic and seeded stochastic selections are byte-identical to the prior
  planner on a scalar/list fixture. Both packages replay through the real checker.
- Python compilation and Git whitespace checks pass. Compiler/core/lowering
  sources are unchanged; the existing base-distribution checker binary is reused.

Exact package identities, compiler hash, fixture selection hashes and source
fingerprints are in [validation.json](validation.json). This validates the removal
and retained paths; no new speedup or universal backend correctness is claimed.
