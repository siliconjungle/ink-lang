# Source-bearing plan transport validation

The exact standalone core package passes all 510 tests in a private source
checkout and target. Its receipt binds the package, committed source, core tree,
archive and complete log. Repeat with `tools/check_core_package.py` using the
root `core-package.json`, a fresh log path and a fresh receipt path.

New checks cover complete plan replay with frozen F32 JSON values, signed zero
and raw NaN bits; source and frozen-row identity; prefix reuse; unchanged integer
plan bytes/identities; and rejection of floats in mathematical knowledge.
Whole-view and selection transport share a finite 256 MB allowance. Individual
entry, proof work, proof depth and entry-count checks remain in force.

This is finite validation of transport and existing admission mechanisms. It does
not establish whole-compiler correctness, runtime speed or admission/execution
of the full-network specialization. See `docs/source-plan-transport.md`.
