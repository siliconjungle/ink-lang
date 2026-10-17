# Packet envelope validation

The exact standalone core package passes all 513 tests across 85
integration targets, library tests and doctests, in a fresh private checkout
and isolated target. The receipt binds its committed source and package, core
tree, archive and complete log. Repeat with `tools/check_core_package.py` and
this capsule's `core-package.json`, using fresh output paths.

Regressions replay a valid deep payload inside a larger plan, reject overdeep
fields/envelopes and trailing bytes, retain literal JSON private-token keys and
explicit incoming request fields, and preserve frozen finite JSON floats through
pure-function replacement. Existing knowledge canonicalization, type checking,
source correspondence and proof replay remain mandatory.

The packet decoder scans the bounded complete envelope before disabling serde's
default recursion limit. Every embedded payload/source JSON field retains its
independent bound. See `docs/source-plan-transport.md` for the actual limits.
This finite validation does not establish whole-compiler correctness, runtime
speed or admission of the complete network specialization.
