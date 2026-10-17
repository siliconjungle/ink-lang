# Complete authored-network plan admission

The actual 232-node, 244-parameter authored frozen network has a complete checked
plan: two source-extension batches, 464 helpers, and a whole-action rewrite with
10,120 authenticated proof objects. The normal check-plan command replays all
steps against the exact source and preserves its frozen and learning contracts.

The exact standalone core passes 519 tests across 85 integration targets,
library and doctests in a private checkout/target. Its receipt binds the exact
source, package, tree, archive and complete log. The finite aggregate allowance
is 512,000,000 bytes. Individual entries remain 16,000,000 bytes, with 16,384
entries and unchanged ordinary proof work/depth/type/termination checks. The
complete packet exceeded the former 256,000,000-byte transport boundary.

Decompress plan.json.gz, verify its raw hash in scope.json, then run:

    ink check-plan handoff/functionality-2026-10-17/network/authored-frozen.core.json PLAN --core

Use the recorded compiler source/core package. The packet contains all proof
inputs and needs no installed knowledge catalogue to establish admission.
The source is already retained in Git at the named handoff path. Reproduction
of authoring uses the ordinary knowledge/producers/frozen_composition.py on
that source with the matching compiler and default options.

The authoring receipt records a diagnostic author with immediate Boolean-choice
factoring and explicit closed equations; those generic mechanisms are moved
into the normal producer separately. No producer verdict grants authority:
ordinary complete check-plan replay is the acceptance criterion. The full
runtime history and cross-target validation remain separate. No runtime speed,
automatic profitability or complete programme claim follows from this capsule.
