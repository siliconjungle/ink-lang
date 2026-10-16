# Complete neural action projection

The staged 244-parameter neural example now exports all six actions as a complete
standalone mathematical model, including mutable optimizer/control state and its
frozen architecture domain. The model contains 316 checked definitions and
5,073,076 canonical bytes. These are proof-data sizes, not execution timings.

Transparent lexical helpers, dependency-ordered source functions and shared branch
suffixes avoid duplicating large continuation trees. The extension also supplies
fixed binary32-to-word and pure paired-list/sum callback correspondence. Every
retained definition still uses the ordinary typing and termination checks. The
construction budgets and remaining trust boundary are described in
[the implementation guide](../../docs/modular-action-projection.md).

`private-core-validation.json` records all 224 source file hashes, commands and
13 successful phases: library checks, all 80 integration targets, example builds
and doctests. The retained logs contain 480 passing tests. Compilation used a
private checkout and private target directory; completed package outputs were
cleaned between batches to bound disk consumption. The package tree was compared
file by file with that tested source. The unrelated working-tree query syntax
edit was excluded. This is finite implementation evidence.

The neural regression runs on the ordinary Rust test stack and replays the
complete serialized model's declaration context. Earlier development encountered
disk exhaustion and a nested-elaboration stack overflow; those attempts were not
passing validation. Preparing bounded source bodies before dependency-ordered
lowering corrected the reproduced stack failure. The final full run follows the
final bound-accounting and observation/hygiene changes.

`retained-proof-replay.log` checks the frozen inputs and source-bound selections
from the baseline, previous and selected artifacts in
[the earlier learned-computation report](../closed-learned-computations-2026-10-17/README.md).
The earlier report retains the complete archives and their manifests. The first
development harness mistakenly compared the original training source against the
frozen compiled input; the corrected harness uses `compiled.core.json` as input
and `selected.core.json` as the expected output when present. It does not claim
complete training-artifact verification. `replay.rs` retains the corrected harness.

`neural-model.json.gz` contains the complete canonical model. `model-export.log`
and `summary.json` bind its exact bytes to the source fixture retained in the
published core package. `manifest.json` detects evidence-file drift; it grants no
semantic or rewrite authority. Run `python3 reports/modular-action-projection-2026-10-17/audit.py`
to check these receipt relationships.

This change does not select or execute a faster graph. Graph/code specialization,
learned representations, arbitrary-goal profitable planning, device training and
the complete Handwired/Pretext/Freerange performance programme remain open. The
source-to-proof translator, checker implementation, generated code and toolchain
remain trusted; these checks do not establish compiler correctness.
