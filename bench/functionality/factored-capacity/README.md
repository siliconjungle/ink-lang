# Individually bounded proof view capacity

The exact standalone core passes 516 tests across 85 integration targets,
library tests and doctests in a fresh private checkout and isolated target.
The receipt binds source/package, core tree, archive and complete log. Repeat
with `tools/check_core_package.py` and this capsule's package receipt.

A complete authored network proposal exhausted the former 8,192-entry closure
ceiling after its proof was factored into smaller ordinary lemmas. Views now
allow 16,384 objects/roots. Aggregate bytes remain 256,000,000, individual entries
16,000,000, ordinary proof work one million, term depth 128 and proof depth 32.
Every hash, dependency, type, termination argument and equality still checks.
The view/definition boundary tests also exercise the enlarged finite bound.

The compressed view contains 9,000 distinct literal reflexivity theorems and
their authentication witnesses. Its raw hash and compiler hashes are in
`capacity-9000-scope.json`. Decompress it, emit core from `input.ink`, and run
ordinary `ink knowledge-check`. The current checker replays all 9,000 entries;
the prior checker rejects the view size. The rehashed changed theorem changes
8999's claimed endpoint to 9000 and rejects because its proof establishes a
different statement. Authentication does not establish equality.

The exact original generator/control driver is retained. To repeat that driver,
place it at `build/ink-functionality-20261017/check_factored_capacity.py` in a
distribution checkout. Build the recorded prior/current distributions and place
their CLIs beside it as `ink-validation-frozen` and `ink-capacity-frozen`.
It uses only a temporary private store and the local knowledge source; its
producer-side capacity is set to 16,384 to construct the input. The compiler
remains the sole admission authority. It emits all control receipts and the
compressed positive input.

This validates generic capacity and rejection boundaries. It does not establish
complete network plan admission, runtime speed, or whole-compiler correctness.
The larger network still requires complete replay and cross-target execution.
