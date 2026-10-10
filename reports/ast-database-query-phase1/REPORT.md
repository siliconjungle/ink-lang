# Deterministic database discovery and AST queries

Individual database entries can now enable checked rewrites without editing an
index or adding a rule to the compiler. Discovery, pattern filtering, search and
cost estimates live in `ink-knowledge`; the core still checks the actual typed
source, admitted laws and each proposed replacement. `--optimise` accepts a
database directory as well as the existing catalogue file.

The general typed matcher uses a bounded assembled view of conditional law
entries. Standalone `objects/<id>.json` laws become rewrite roots; existing inline
catalogues retain their explicit root sets and private supporting lemmas. Entry
and root ordering is deterministic. Presentation whitespace and JSON field order
do not change selection. Rust checks the typed canonical identities: Python JSON
sorting does not establish those identities or theorem validity. Receipts pin the
database view, external producer and compiler; selections replay offline.

The older first-order scalar producer also supports directory discovery. It
filters theorem patterns by AST shape, traverses source declarations and ASTs in
fixed order, and restarts after strict node-count decreases. It freezes only the
selected dependency closure. This restart/strict-decrease policy describes that
older producer, not the general matcher's bounded beam search.

## Validation

- `full-tests.log`: 171 distribution tests pass. `core-tests.log`: 11 independent
  offline core tests pass.
- `query-tests.log`: three Python tests pass, including 256 randomly generated
  scalar AST comparisons against exhaustive rule matching. Query filtering
  preserves the resulting expression, proof and used laws.
- Four integration tests cover adding entries under one unchanged compiler,
  repeated metavariables, typed applicability, Boolean branch conditions,
  exhausted search, relocated databases, JSON presentation, offline replay after
  deleting discovery inputs, and both well-hashed false proofs and changed
  supported objects. The final focused log is `integration-tests.log`.
- `integration-tests-before.log` preserves an earlier failed test: its mutation
  replaced a supported object with incompatible `{}`, which correctly took the
  incompatible-format fallback. The fixture now changes a supported object while
  retaining its filename; it is rejected. This failure did not admit a false proof.
- The archived first-order experiment discovered 560 unique compatible entries,
  found 23 eligible scalar rules, selected four laws and froze 13 objects.
  Repeated production gave identical core, lock, replacement, snapshot, receipt
  and C bytes. Two strict Clang builds each passed 2,560 independent native oracle
  checks, for 5,120 total. This early experiment used the predecessor release
  compiler identified by its receipt; the final integration suite uses the
  current distribution and broader semantic core.
- The current general typed experiment admits 42 laws, composes six applications
  and reduces the structural estimate from 163 to 50. Repeated selections and
  receipts are identical. The generated C passes 1,029 independent u32 oracle
  checks including an empty input, overflow boundaries and a 1,025-element list.
- `site-build.log`: TypeScript, all four FreeRange helpers and the Pages build
  pass. The prose now describes the implemented discovery path.

## Boundaries

No new core checking rules or semantic laws were added by this discovery change.
The distribution CLI selects an external directory-query mode; that is convenience
machinery, not proof authority. Compatible proof formats can coexist in the same
database. Unsupported formats are not silently given theorem authority.

This is bounded local discovery, not an arbitrarily large indexed database. The
general active view is capped at 1,024 entries and 16 MB; discovery is bounded by
file count and total bytes. General selected-only view projection, persistent
indexing and measured candidate ranking remain work. Structural estimates and
fewer AST nodes are not measured runtime speedups.

Complete source-action, physical representation, abort, event, commit, snapshot
and migration preservation remain separate production gates. These tests do not
certify LLVM, C/Rust lowering or emitted machine code, and establish no new Rust,
GPU or universal-performance claim.
