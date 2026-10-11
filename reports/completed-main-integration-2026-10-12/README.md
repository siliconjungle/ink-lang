# Completed Ink work integration

This audit integrates all completed work identified across the Ink checkouts and
open pull requests: adaptive JavaScript/Wasm/WebGPU execution (`138f9f65`),
Frontier representations (`4747cc68`) and diff benchmarks (`ca8644f9`),
private snapshot sharing (`62f63f63`), composed state optimisation (PR #22,
`f8d0eb31`), indexed sequence trees and continuation frames (remote main
`dfaa35f9`), and generic indexed tables and automatic batching (PR #23,
`d5e76875` and final case compatibility `95319af6`). Original branch histories, source-bound proofs, measurements and
historical snapshots are retained.

`package-audit.json` records the ten independent repositories, their published
main revisions, and ancestry checks for the completed component commits.
Package dependencies use exact published Git revisions. The final checker core
is `03f40b014a1dc44cfeaf387ca3cbe587ee0cd5ba`.

The combined checker accepts both published constructor-case proof formats:
variable substitution with definitional equality, and explicit scrutinee
equalities. It rejects ambiguous or missing subjects and invalid equations.
Canonical knowledge serialization retains existing object identities. Bounded
computation caches charge copying work and do not cache proof authority.

Integration preserves typed and dynamic storage, shared opaque aliases,
continuations, durable nested rollback, compact checked observations, query and
transition exports, source-bound host observers, and both Option operations.

Current source-bound packets are in `knowledge/research/frontier-extensions-current`,
`knowledge/research/scalable-state-current` and
`knowledge/research/composable-state-current`. The combined authenticated catalogue
retains 14,268 objects and earlier name bindings under integration namespaces.
Every node referenced by the active snapshot must exist in the committed
knowledge checkout; CI independently audits this before rebuilding its
disposable index. Historical compiler receipts are preserved as evidence of
those historical runs, never as authority for the current compiler.

Fresh replay checks the same 20 immutable composed choices and fixtures, 204
general mathematical roots, and source-specific mathematics with the rebuilt
compiler. CI installs pinned proof authoring tools and Lean, then independently
checks proofs and literal CPU, both Wasm lowerings, browser JavaScript and actual
GPU dispatch. Local checks and exact receipt hashes are recorded separately.

`adaptive-browser-final.json` records 12 real Chrome/Apple Metal placement
comparisons, overlapping workers, owned inputs/outputs, feedback and recovery
from unavailable devices, invalid shaders and failed workers. Its optional
profile binds emitted code, host, planner, device and observed domains;
profitability evidence does not justify a semantic rewrite. Original indexed
and batching measurements remain in their own report directories.

Dynamic point-update producers explicitly use the legacy fixed-key result
contract when composing cache proofs. The generic proposal API remains separate.

Compact observer projection freshens conflicting lexical binders after inlining
nested components. The checker continues to reject binder shadowing. Fresh
positive proof checks and reauthenticated negative grouped-action tests cover
the integration repairs.

Remaining local validation passes: 10 representation/migration checks, 4 scalable
state checks, the sequence-tree history across native/C/Wasm/JavaScript, and all
6 standalone checks including an independently rerun Lean shared-spine proof.
CI exports the pinned Zig executable under both accepted test variable names.
