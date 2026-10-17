# Stable action correspondence validation

The exact committed standalone core package passes 509 tests in a fresh private
checkout and target, including all 85 integration targets, library tests,
example compilation and doctests. The receipt binds the package, distribution
source, core tree, archive and complete test log. This is finite implementation
validation, not proof of the compiler or toolchain.

Recheck the package/source tree binding and repeat the private validation:

```sh
CARGO_BUILD_JOBS=2 CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0 CARGO_INCREMENTAL=0 \
  python3 tools/check_core_package.py core-package.json \
  --log build/structural-core.log --receipt build/structural-core.json
```

Use the local Cargo source-preflight entry point where configured. The original
private validation prepared its exact temporary core manifest before Cargo;
no Git dependencies or extra source configuration were required.

The new projection has stable lexical binders and minimal dependency imports.
Long authenticated theorem DAGs import iteratively; adjacent recursive steps
retain the existing bounded checked conversion. Negative controls include
rehashing a false theorem, changing source or projection mode, and an incorrect
recursive accumulator. See `docs/structural-action-correspondence.md`.

This capsule does not establish admission of the 232-node network or runtime
speed. Those remain separate complete-plan and execution checks.
