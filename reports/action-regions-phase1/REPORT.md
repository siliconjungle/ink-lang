# Source-bound action equality and general laws

Source revision: `bc34a4374ab18d4a2b88bdd377a7afb8712db5e1`.
Core/API dependency: `68f6d2177559c86c5969e6624dba5233a83f6b95`.
Reviewed backend integration: `f7d705712ae8c328741a7b0e7281444bd2142fa7`.
Knowledge: `da3d9610a0b586e673d16012a14b554b8455a0e0`, snapshot
`00bf3ba45124029333e807bc2dac6d9ff2f54b2fcff273ba25faa8a5017c39c9`.
Metadata retains source, compiler and raw evidence hashes.

The existing equality checker now binds database applications to sealed total
pure expression regions in actions and keeps. The unchanged external query
engine discovers 12 composed applications in the fixture, including actual
changes, callbacks and a conditional law justified by a lexical branch fact.
The same pinned input/search budget produces identical proposals; budget zero
retains the original module. Scope/capture, source-context and invented-node
negatives reject. Copied branch facts consume existing work budgets.

The reference execute CLI and independently compiled lowerers consume the private
checked selection witness. Exact schema agreement preserves the original source
checkpoint namespace. A raw selected Program has a distinct namespace; unrelated
sources, corrupt bytes and later independent code changes cannot reuse the witness.
JSON/portable formats are unchanged. This grants no schema evolution.

Claude's general-law kernel was separately reviewed and integrated. Abstract
symbols remain opaque; instances interpret every parameter, match definitions
and prove every assumption. Transitive assumption dependence prevents both
direct escape and circular discharge. The store has 658 entries. All 2,490 old
name targets are preserved; 48 research JSON files and 685 fresh canonical store
JSON files reproduce byte-identically. See the knowledge general-law review.

## Validation

- 241 broad distribution tests pass. Five cases were filtered: the action native
  fixture, three selected-checkpoint fixtures (all run with targets enabled below)
  and the expensive unchanged source-column layout case. The separate native
  row/column continuation and migration test passed in this broad run.
- Seven enabled action/selection tests pass with Zig 0.17 and actual wgpu.
  Thirteen action replies and exact portable checkpoints agree on native C/Rust,
  JavaScript and both Wasm paths through maximal words, callback capture/shadowing,
  failures, sticky nested aborts and original checkpoint restoration. The wgpu
  module executes these actions on its host (zero GPU kernel calls). The separate
  seven-reply selected fixture executes one eligible GPU map and checks durable
  baseline C → selected C → selected Rust continuation and raw namespace rejection.
- The final query/execute test also checks baseline/selected CLI output, exact
  checkpoints and restoration in both directions. Its added guarded-discovery
  assertion passes after the broad run.
- 36 core tests pass offline in a byte-identical copy without the database,
  planner, runtime or lowerers. Eight general-law tests additionally pass through
  a core-only harness; its small verifier delegates to public `library::load`.
  Thirteen general-law/view tests and the real CLI's 46-entry library check pass.
- The final all-target compilation check is warning-free. The already reviewed
  backend suite retains its 523 CPU replies/checkpoints and 103 actual GPU calls;
  its branch CI passed both jobs. These scopes overlap; do not sum their counts.
- The five-variant view-sweep harness passes two small checksum configurations,
  including every timed sample. This dirty-tree, two-round run validates the
  harness only. Its incidental timings are not a performance result. Claude's
  original Linux benchmark remains archived with its own scope and limitations.

Local toolchains are Rust 1.99/LLVM 23.1.1, Node 22.22.1, Apple Clang and the
documented local Zig 0.17 development build. CPU target emission, runtimes and
toolchains remain trusted. Source/selection/script/expected files are retained
under the build fixture directories and uploaded by CI on failure.

## Remaining work

The contextual value bridge does not prove a whole-action logical interpreter,
source/primitive correspondence, physical storage implementations or emitted
machine code. Universal stateful candidates, legacy aggregate/bounded/layout
authority migration, competitive complete execution, guarded profile adaptation,
and the rest of PLAN's production acceptance gates remain active. No new
Hunchroom acceptance or fastest-language claim. Editor support and schema
evolution remain excluded.
