# Shared substitution-name validation

The exact standalone core passes all 516 tests across 85 integration
targets, library tests and doctests in a fresh private checkout and isolated
target. Its receipt binds committed source/package, core tree, archive and log.
Repeat with `tools/check_core_package.py` and this capsule's `core-package.json`.

Capture-avoiding substitution now scans the borrowed source/replacement names
once when a binder needs them and reserves fresh names across that walk. Actual
inserted-term copies still consume work. Tests preserve shadowing, simultaneous
insertion, free names and rejection on exhausted work. No cache or proof verdict
survives a substitution. The one-million-step proof allowance and all existing
proof/term depth bounds remain unchanged.

The selected 67-object prefix proof from the authored network is compressed in
`proof-view.json.gz`. Its uncompressed hash/root are in `proof-scope.json`.
Decompress to a temporary file, then run `ink knowledge-check` with the recorded
input module and that view. The retained stdout records successful ordinary
replay. The prior package failed this equation even with the four-million-step
control patch; its rejection log and exact one-line patch are retained. Rebuild
that package privately with the patch to repeat the bounded negative control.

This is a universal mathematical equation over its declared definitions. It does
not establish complete network action/plan admission, compiled execution, runtime
speed or whole-compiler correctness. Source correspondence and complete replay
remain separate required gates. See `docs/structural-conversion.md`.
