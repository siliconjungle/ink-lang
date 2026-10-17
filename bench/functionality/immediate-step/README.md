# Explicit immediate definitional steps

The matching exact standalone core passes 519 tests across 85 integration targets,
library and doctests in a fresh private checkout and isolated target. The receipt
binds its source, package, core tree, archive and complete log. Reproduce with
`tools/check_core_package.py` and this capsule's `core-package.json`.

`Step(term)` computes one immediate reduction of an existing checked total
definition, constructor case, literal Boolean branch or literal scalar operation.
The author supplies no destination. Input visibility, types, arity and binders
check before reduction; the computed equation checks afterward. Recursive calls
need a literal constructor argument. Capture avoidance and copied-term charging
remain mandatory under the ordinary one-million-work/128-term/32-proof bounds.
The library tests include a large live capture, opaque work order, shadowing,
hidden imports, stuck terms, wrong results and exhausted budgets.

The selected 88-object proof comes from an actual failed network conversion. It
retains dynamic typed captures and the complete error result. Its 1,215,428 raw
bytes replay through ordinary `knowledge-check`. This is a selected conversion,
not the complete network plan or a runtime-performance result.

Decompress each view, compile `input.ink` with `ink emit-core`, then run
`ink knowledge-check INPUT_CORE VIEW`. The positive view must pass. The rehashed
altered error word 110 -> 111 rejects (currently by the ordinary resource bound).
The separate one-object 2+3=6 false result rejects with "inductive proof proves a
different statement". Authentication alone never establishes an equation.
`step-conversion-scope.json` records exact raw hashes, roots and compiler hash.

The retained original generator uses the untrusted knowledge author and its
compressed test fixture; put it at `build/ink-functionality-20261017` in a
distribution containing that producer, with the recorded CLI as `ink-step-frozen`.
Admission of the retained views itself needs only the recorded core and input.
