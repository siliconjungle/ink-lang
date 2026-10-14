# Offline compiler learning

Ink can use LLVM and word-value analysis to propose reusable equalities. These
tools run offline. They do not add LLVM to the runtime, change fixed backend
selection, or grant a rewrite authority based on a compiler's reputation.

The current bridge accepts straight-line U32, U64 and Bool expressions. Exported
arithmetic wraps; shift counts are explicitly masked before LLVM sees them. The
importer rejects memory, arbitrary calls, control-flow graphs, undef, poison and
unsupported instructions. Imported LLVM flags are discarded. The reconstructed
total Ink expression must pass the ordinary source-bound bitvector obligation,
SAT/RUP certificate construction, and `knowledge-check`. Single-function
discovery also checks the resulting selection against the exact input core.

## Reusable rules and discovery

`knowledge/producers/word_identities.py` describes 52 conditional and unconditional
U32/U64 rules. Their frozen proofs are distributed as compressed producer data
and canonical knowledge entries. Compilation discovers matching rules and checks
their conditions; it does not invoke a solver or LLVM to author new proofs.

`knowledge/producers/word_facts.py` tracks known zero/one bits and unsigned
intervals. It handles wrapping carry/borrow, shared operands, product suffixes,
modular variable shifts, comparisons and branch joins. Facts only propose
alternatives. They are not static assumptions obtained from contracts, and they
cannot bypass the equality checker. Correlation reasoning relies on equality of
pure semantic expressions. Unknown operations lose information.


`analyse_candidates` returns facts and proposals in one synchronous discovery
query, avoiding a second traversal of the root. Reuse is bounded to 2,048
non-leaf entries, 16,384 node/scope references and a conservative 1 MiB record
charge (not an RSS limit). Each key binds the exact source node and branch
scope; strong references prevent identity reuse. Cache hits charge the original
logical node visits and relative depth, so reuse cannot bypass analysis limits.
The query clears all records on success or failure. The streaming `candidates`
API retains no memo across yields. Callers must not mutate input during a
synchronous query. These facts remain untrusted; each rewrite still needs proof.

Run a single discovery from an already checked core:

```sh
PYTHONPATH=knowledge:planner python3 -m ink_planner.llvm_learning \
  --compiler /absolute/path/to/ink --clang /absolute/path/to/clang \
  --core program.core.json --function entry --output-store learned \
  --seconds 5 -o discovery/selection.json
```

Use `--proposal-engine facts` without `--clang` for word analysis proposals.
The selected proposal is a candidate for measurement, not automatic runtime
selection. An unchanged LLVM result publishes no identity law. Existing output
evidence is not overwritten; an existing destination store is extended.

For generated development inputs:

```sh
PYTHONPATH=knowledge:planner python3 -m ink_planner.llvm_corpus \
  --compiler /absolute/path/to/ink --clang /absolute/path/to/clang \
  --seed 831731 --count 32 --depth 4 --seconds 5 \
  --output-store learned -o discovery/generated-831731
```

Programs and their seed are saved before querying LLVM. The batch records checked,
unchanged, unsupported, duplicate and unproved proposals. It preserves before/after
IR, checker receipts, exact authoring Python sources, compiler and clang hashes,
and Python/solver version information. Source changes during acquisition prevent
publication. This is not a complete OS/dependency image. The audited upstream LLVM
revision and the executing compiler version are separate provenance fields in an
experiment; they must not be conflated.

The `--seconds` budget covers SAT solving and certificate hint construction for
each proposal. Core obligation generation and replay have separate subprocess
timeouts. A difficult proposal is recorded as unproved; it is never admitted due
to a timeout. No timeout is evidence that an equality is false.

## Profitability and generalisation

A proved equality establishes neither a speedup nor broad applicability. Evaluate
canonical database changes with `ink_planner.corpus` on the frozen planning corpus
and private knowledge copies. Preserve the exact compiler executable and planner
sources for the entire run. The corpus checks its context before programs and at
completion; rebuilding a compiler at the same path invalidates the experiment.

Measure generated artifacts separately, with comparable inputs, boundaries,
fixed backends, consumed outputs, warmup and repeated browser processes. Report
unchanged controls and regressions. Generated discovery inputs and hand-chosen
scalar examples are development evidence, not held-out application results.

The initial scalar browser experiment found approximately 1.18–1.25x speedups for
three rewrites, with an unchanged shift control near 1.00x. It measured exported
JavaScript functions on a shared machine, including harness loads/calls/checksums.
It does not establish a general gain over Rust or an application-wide speedup.
The full-codebase audit remains ongoing; this document does not claim exhaustive
LLVM coverage or complete adoption of beneficial techniques.

## Regression coverage

The mandatory `hardening` test
`llvm_learning_and_incremental_knowledge_remain_checked` runs real LLVM/checker
integration, frozen-rule replay, tampered-proof and missing-premise rejection,
generated acquisition with append preservation, authoring provenance and deadline
tests, conservative bit-analysis checks, snapshot/dependency admission regressions,
cache invalidation and cost-model regressions. These tests do not prove the whole
compiler or the external analysis correct.

Collection-analysis regressions retain dependencies through `let` bindings and
respect nested callback shadowing. The existing type-parametric pipeline template
path is also checked with record/scalar carriers, different accumulator types,
captured values and colliding source names; removing a filter predicate from the
proved result must fail admission. This uses the existing database template,
not an additional compiler fusion recogniser.

Offline cost-profile fitting allows only declared workload features to vary
within one compiled-scope/backend/boundary model. Program, plan, entry set, target
provenance, distribution, concurrency and other shape metadata must match.
Backend-specific drivers and toolchains remain separate cohorts. These checks
prevent pooling incomparable observations; they do not establish model accuracy,
cross-backend fairness or a performance improvement.

`tools/audit_coverage.py` inventories every tracked blob at pinned revisions and
records exact read ranges separately from review notes and evidence. Inventory,
search matches and partial reads do not count as completed file reviews.
Reports recheck complete read coverage and evidence hashes; deleted or modified
evidence does not count. To audit an updated distribution while retaining the
original inventory:

```sh
python3 tools/audit_coverage.py --db previous.sqlite advance current.sqlite \
  --revision ink=HEAD
```

The destination must be new. The command inventories every tracked file and
recurses through the new submodule pins. Other top-level repositories retain their
existing revision unless explicitly overridden. Read ranges and valid reviews
carry only across identical repository names, paths, Git blobs and file modes.
Changed, added and renamed files require new review; removed files remain in the
previous snapshot. The new database records each carried file's original revision.
Carried credit means its content was reviewed, not that its interaction with new
dependencies has been revalidated. Reports identify their exact pinned scope.

Joint-feature applicability now uses exact offline convex-hull construction in
`planner/ink_planner/joint_domain.py`. New fitted profiles carry per-backend
integer halfspaces and affine equalities. The shared ABI evaluates those saved
constraints exactly in Rust and Wasm; unsupported candidates are unpriced, and
a missing supported CPU estimate retains the baseline. No runtime measurement,
training or hull search is introduced. Synthetic diagonal and triangular examples,
independent two-/three-dimensional geometric oracles, five-dimensional fixtures
and adjacent-float boundary tests cover the mechanism. These checks limit joint
extrapolation within the declared features; they do not establish timing accuracy,
held-out performance or completeness of the feature set.
