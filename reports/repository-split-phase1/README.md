# Compiler / knowledge repository separation

The authoritative catalogue now lives in `siliconjungle/ink-knowledge`, pinned
by the compiler's `knowledge` submodule. Catalogue history was extracted through
core commit `c1b4035`; all 1,807 existing package files were preserved exactly.
Sixteen untrusted proof producers and the Lean research source moved with it.
Historical benchmark reports retain their original archived inputs.

Validation passed:

- All compiler binaries build offline without a knowledge directory. The
  isolated compiler checks the inventory source, emits the pure baseline and
  executes the reference scan benchmark without imported knowledge.
- That isolated compiler loads and applies two scalar rules from a temporary
  package outside the compiler checkout; its binary identity stays unchanged.
- Zero, one and two database rules change generated code under an unchanged
  compiler, with 60 independently checked native results.
- All 19 indexed primary mathematical libraries pass the supplied checker.
- Both moved search producers reproduce every package file byte for byte under
  the preserved compiler, and the earlier kernel accepts their libraries.
- The complete Rust suite passes 96 tests without warnings.

`verification.json` records exact revision and content identities. The raw logs
and JSON outputs are adjacent. Reproduce with `git submodule update --init
knowledge`, `python3 dev.py test`, `python3 knowledge/tools/catalogue.py verify
--compiler target/debug/ink`, `python3 tools/check_database.py --output
build/NEW`, and the search audit's documented preserved compiler/PySAT inputs.

This establishes repository independence, not a complete small-core compiler.
Legacy polynomial/aggregate checking, bounded-cache analysis and layout-specific
lowering remain migration debt. The generic replacement interface, a frozen
semantic IR, full transaction/native correspondence, proof-checker soundness,
adaptive selection and durability are still production roadmap work. These
checks do not establish a new runtime speedup.
