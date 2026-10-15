# Learning from V8

Ink uses V8's optimizer as a source of proposals. The database owns optimization
laws and proof production; the compiler retains general checking and literal
lowering. V8's speculative types, maps, feedback and machine flags supply no
premises. Correctness, source applicability and profitability remain separate.

The upstream source revision is `c4e049d3cbda775e2c3af9410f6e18b18388d68b`.
`bench/v8-learning/upstream-inventory.json` records 607 compiler, Maglev and
supporting source files (18,254,266 bytes). Inventory and search results are not
completed review. The audit ledger records partial reads and outstanding families;
this is an ongoing audit, not a claim that every V8 optimization has been adopted.

Reproduce the source inputs without a complete V8 checkout:

```sh
python3 tools/acquire_v8_optimizer.py build/v8-source
```

The downloader streams the archive and verifies every selected file's bytes
against the inventory. It does not retain the archive or unrelated V8 source.

## Checked word and branch laws

The first family covers compatible bitfield tests, complementary masks,
wrapped-add/subtract/xor comparison cancellation, redundant shift-count masks,
shift distribution over bitwise operations, lossy shift round trips, overflowing
consecutive shifts, repeated branch conditions and shared-condition selects.
There are 80 admitted word/conversion laws out of 82 proposals. The two U64
variable-count combination proposals still exhaust the 15-second authoring
budget. The U32 combinations and multiplication narrowing now replay through
shared circuits. Those two U64 proposals remain unadmitted. A
budget failure does not establish that an equality is false.

Every frozen word law is a normal `ink-conditional-laws-v1` object with a hinted-RUP
bitvector certificate. Shift counts are U32 and reduce modulo the value width,
including counts 32, 64 and UINT32_MAX. Consecutive shifts may discard all bits;
wrapping their combined count without the appropriate premise is invalid.
Bitfield combination requires in-mask expected values and compatible overlap.
Conditions are checked at the exact source site. Branch facts stay inside the
whole source equality; they cannot escape to a sibling branch or later merge.

Authoring runs offline:

```sh
PYTHONPATH=knowledge:planner python3 -m producers.author_word_identities \
  --family v8 --library --compiler target/debug/ink \
  --output-store build/v8-authoring \
  --data knowledge/producers/data/v8-word-laws --seconds 15 \
  --semantics fixed-words-v2 --encoding shared-v2
```

Partial acquisitions preserve previously checked laws. The indexed frozen-library
mechanism separates lightweight pattern metadata from immutable, compressed proof
files. Discovery opens matching proofs only. Index/proof identities and pattern
metadata must agree, and the independent checker still admits every proof and
application. No checker limit was raised to accommodate this family. Arbitrary
packages containing too much proof data still fail the existing resource limits.

The existing generic semantic search consumes the producer through the knowledge
catalogue. No V8 matcher, target-specific rewrite or solver was added to core,
runtime or the backends. Search scores remain unmeasured hypotheses. A checked
alternative does not automatically replace the compiled baseline.

## Evidence and remaining work

Mandatory hardening includes frozen-library integrity, lazy proof loading,
partial-publication preservation, all admitted proofs replayed independently,
missing-condition and tampered-proof rejection, renamed program discovery,
source-identity binding and incorrect shift-mask rejection. Seeded value checks
exercise all proposal templates, including proposals without admitted proofs;
these examples do not substitute for proof.

`proved_refinement_parity` also replays word/conversion laws and literal loop expansions and exact scalar sharing on 333 requests, including
wrapping overflow, oversized counts, both branch directions and overlapping
bitfields. The shared harness compares original reference outcomes and exact
snapshots against generated native, JavaScript and Rust-Wasm execution. CPU
conformance does not establish a speedup or GPU execution coverage.

Evaluate generalization on the unchanged planning corpus, using private knowledge
publications and frozen compiler/producer sources. Record the funnel, failed
premises, shared law use and selection gates; distinguish measured speedups from
proof and conformance. A corpus with no matching word patterns is a useful
negative control, not evidence of broad application gains.

The completed first corpus run compiled all ten unchanged programs. Initial
sources had no direct V8 pattern matches, but generic planning subsequently
admitted `u32/branch_condition_value` for `ast-ancestor`. That program retained
the baseline after the measurement-budget gate. No new V8 law was observed in
multiple held-out programs. Both runs selected one alternative, on different
programs; their time-bounded shared-machine funnel differences are not speedup
evidence. See `bench/v8-learning/corpus-summary.json` for the exact frozen scope.

## Literal loop expansion

`producers.literal_loop_laws` proposes expansion for literal iteration counts
0 through 8 using the existing fixed `repeat` meaning and ordinary `Normalize`
proofs. The proposal bound limits code growth. There is no approximate trip-count
premise or new loop rule in the compiler. A single construction works for words,
lists and declared records, including callbacks capturing surrounding binders.
The normal source checker still enforces ownership, lexical binding and bounds.
Every admitted instance is source-bound before literal emission. Tests reject a
rehashed proof with an incorrect iteration index, retain the configured proposal
bound and compare compiled list/record/captured-callback results across CPU paths.
Profitability remains a separate planner gate.

The audit must continue through the remaining machine reducers, floating point,
branch threading, loop transforms, type/representation analysis, load/store
elimination, escape/allocation analysis, string handling, SIMD, feedback/tiering
and lowering infrastructure. Some mechanisms may already be supplied by Ink's
host Rust/JavaScript/Wasm compilers. Such delegation needs an explicit assessment;
it cannot be inferred from a passing scalar test. Runtime specialization needs
checked guards and exact fallback; speculative V8 observations alone cannot
create unconditional database laws.

## Exact repeated expressions

`producers.common_subexpressions` supplies bounded proposals for explicit sharing
of exact repeated pure scalar terms. Each callback scope is handled separately;
new binders shift surrounding references before replacing occurrences. The
proposal uses existing lambda/application syntax, which emits an ordinary lexical
binding. A whole-function `Normalize` certificate and normal source binding are
required. No hash, occurrence count or savings estimate grants proof authority.
Mutable state reads, allocation identity and alias epochs are not inferred from
V8's representation.

A repeated list-fold workload measured about 1.97 times lower complete JavaScript
call time after sharing. Three fresh Node processes used each of two disjoint
training/holdout input sets, with list lengths 256, 2,048 and 8,192. The existing
measurement adapter validates outcomes and unchanged inputs before and after
timing and consumes complete outputs. The retained source, proof packet, emitted
modules, workload packets and samples are in `bench/v8-learning/sharing`. This
result concerns that workload on Node 26.1.0 on the shared arm64 host; it does not
establish memory costs, other-backend gains or universal profitability.

The second ten-program corpus evaluation compiled all programs and admitted
alternatives; three were selected under existing gates. Only the earlier
`u32/branch_condition_value` word law was attributable to this V8 library, on
`ast-ancestor`; no literal-loop law was observed. All programs exhausted the
quick search budget. It used newer planner/knowledge inputs than the first pair
and cannot isolate their effects. See `bench/v8-learning/corpus-second-summary.json`.

## Versioned scalar proof circuits

The source `BitVector` proof has an optional `semantics` field. Its omitted
default, `opaque-v1`, reconstructs historical source circuits unchanged. The
explicit `fixed-words-v2` mode additionally interprets existing U32/U64 rotate
primitives as fixed modular Boolean circuits. Unknown observations remain
unconstrained atoms. This adds primitive meaning to a general proof procedure;
rotation-recognition patterns remain database objects.

Gate encoding is a separate certificate field. Source circuit replay now honors
the existing `shared-v2` encoding, and the offline certificate producer preserves
it. Defaults still use `literal-v1`. Tests retain legacy wire omission and exact
legacy problem identities, reject substituted source/gate modes, validate rotate
circuits against Rust word operations, and replay all frozen laws independently.
No proof, entry, circuit or resource limit was raised.

Eight shift-to-rotate laws and six widened-comparison contractions now have
independent certificates. OR rotation handles zero effective counts; XOR rotation
requires a checked nonzero effective count. Source-bound compiled checks include
that guard's zero-count branch, counts exceeding word width, multiplication
narrowing and U32 shift combination under its exact fit condition.

Scalar sharing treats each lazy choice/Boolean region separately, as well as
each callback scope. It can share an entire repeated choice in a strict context,
but does not lift a branch's internal work outside its control region. This
keeps optional work inside the source region that demands it.

The broad local check completed all 370 core tests and all 42 hardening tests.
The initial sparse checkout omitted legacy first-order hardening inputs; only
the required 2,537 committed lock/object files (15.2 MB) were restored. Earlier
corpus runs retain their original sparse scope in
`bench/v8-learning/corpus-sparse-scope.json`; they should not be described as full
source-checkout evaluations. Remote CI is tracked separately from these local
results.

## Guarded parameter caches

The late-load-elimination review exposed a gap in database authoring: existing
query-cache proposals required parameterless queries. `producers.parameter_cache`
now specializes one exact tuple of one to four U64/Bool arguments. The emitted
query checks the tuple, uses its maintained reply on a hit, and executes the
original query on every miss. Queries retain the same physical cache after cold
calls. Existing universal relation, preservation, snapshot and migration equations
are checked normally; explicit Boolean splits and scalar equality certificates
justify argument substitution. No source assumption, alias fact or optimization
recognizer was added to core. Compositions with delta repair, compact query
protocols and action replacements currently decline explicitly.

The knowledge recipe supplies at most four boundary/source-literal tuples across
queries. These are bounded discovery hints; they do not assert that arguments are
hot. The command-line author accepts any exact supported tuple with
`--cache-query NAME --cache-arguments '[7,true]' --preserve-cache`.

`bench/v8-learning/parameter-cache` retains a source-bound representation,
independent oracle packets, emitted JavaScript and three fresh-process sample sets
for each split. On its declared read-heavy lifecycle, weighted time improved about
13.2 times in training and 12.3 times on held-out rows/histories. Initialization,
cold queries and writes were slower, so the existing requirement for comparable
lifecycle evidence remains. Weights include module load, initialization with
setup, hot/cold histories, edits, checkpoint and restore. These shared-host Node
26.1.0 measurements establish no universal or native speedup. Separate native,
JavaScript and Rust-Wasm conformance covers hot/cold values, rollback, events,
exhausted counters, portable snapshots, restoration and migration. A rehashed
wrong-argument guard is rejected mathematically.

The frozen fourth corpus run compiled all ten programs, selected alternatives for
three, admitted 37 laws and reused seven across programs. Every program exhausted
its quick search budget. It predates parameter caches and includes the explicitly
materialized legacy hardening inputs; see `corpus-circuits-summary.json`. Search
counts do not isolate runtime gains or close the remaining V8 audit.


A native control of the repeated-fold sharing workload is retained in
`bench/v8-learning/native-sharing`. Three fresh processes per split measured the
complete generated JSON-call ABI, including typed input conversion and complete
output consumption. Aggregate medians were about 1.07 times faster, but one
training process regressed and one held-out process was nearly tied. This does
not establish a robust native gain. Constructor costs were separately observed;
absolute timings must not be compared with the JavaScript trusted-value boundary.
The selected Rust/helper sources, dependency lock, adapter, exact reference inputs
and all samples are retained. No selection threshold was relaxed.

These database alternatives reach compiled programs through a checked selected
plan: `ink compile --optimise KNOWLEDGE ...` searches and applies its normal gates,
while `ink build --selection PACKET ...` can replay an explicit selected equality.
A plain literal `ink build` does not automatically search the new law catalogue.


The fifth frozen corpus run, after guarded parameter-cache authoring, again
compiled ten programs, selected three alternatives, admitted 37 laws and reused
seven across programs. No representation was admitted, and all ten exhausted the
quick search budget. It supplies no broad parameter-cache generalization or V8
runtime speedup claim; the workload-specific cache evidence remains separate.
See `bench/v8-learning/corpus-parameter-summary.json`.

V8's scheduler bounds loop hoisting by the earliest valid schedule position and
requires the original block to execute on every outgoing path. The database's
new `loop_invariants` producer follows the same demand constraint for strict
regions of non-stopping map/filter/left-fold/right-fold callbacks. Scalar work
can move through hygienic lexical binding, with an explicit empty-list guard.
Conditional-only work and early-stopping callbacks are excluded. Existing
source binding and Normalize proofs must accept every whole-function proposal;
there is no new trusted loop rewrite rule. A generic planner extraction fix
preserves local binders inside captured lambda expressions while still rejecting
captures of the pattern's binders.

The retained `bench/v8-learning/loop-invariants` control supplies actual compiled
runtime evidence: three fresh processes per target and disjoint workload split.
An explicit checked captured-fold hoist improved JavaScript nonempty complete
calls about 105x in training and 164x in holdout, and native JSON-call medians
about 1.15x and 1.27x. Every nonempty native process comparison improved; empty
calls were roughly tied. Native includes typed input conversion, so absolute
target times are not comparable. This single workload does not establish broad
language speedups or automatic plan selection. The new mandatory CPU suite
checks 72 cases including raw floating-point boundary values and nested captures;
all 295 planner tests passed after materializing two exact legacy test inputs.

The sixth frozen corpus run compiled all ten unchanged programs, selected three
alternatives, admitted 38 laws and reused seven across programs. All ten exhausted
the quick budget. A separate discovery diagnostic on the exact captured cores
found zero callback-hoisting proposals, so this corpus supplies no cross-program
generalization evidence for the new producer. The direct installed-catalogue
regression fixture independently admits twelve hoisting laws across eleven
functions; it is a purpose-built validation input. See the retained
`corpus-invariants-summary.json` and `corpus-invariants-proposals.json`. Concurrent
database/evidence-gate changes and the binder fix prevent attributing aggregate
corpus count differences to any one change. The default structural model also
ranks the measured guarded hoist worse; addressing that search limitation remains
separate from the explicit selected-plan runtime control.

A follow-up proposal restriction accepts only reviewed numeric/list operation
trees and declines nested string construction or unanalysed source helpers. A
scalar result alone does not establish that its nested work is total: string
concatenation has a fixed U32 length failure boundary. The kernel still replays
the same equality proof. Both the measured proposal and all twelve numeric CPU
fixture proposals are byte-identical after this restriction, and the hardened
72-case CPU suite passes. The frozen corpus above predates this restriction;
post-run discovery on its exact captured cores remains zero for this producer.

The value-numbering pass also informs bounded invocation-local reuse in the
database's authoring normalizer. Exact function/argument/depth keys reuse only
successful results, with a fresh context for each invocation, fresh returned
containers and unchanged lazy/depth behavior. It activates after 32 expansions
to avoid structural-key overhead on small jobs. Three fresh processes show
about 13.1×/22.1× on deliberately repeated helper DAGs; captured obligations are
approximately unchanged, with about 1–2% overhead on the smallest group. These
are authoring measurements, not generated-program or whole-compiler speedups.
All 64 old/new normal forms match; six ordinary Convert theorems replay with
unchanged limits, and a reauthenticated false result is rejected. The 16 focused
regressions and all 301 merged planner tests pass. See
`bench/v8-learning/normalizer` for inputs, raw samples and exact revisions.

At the user's closeout request, the broader audit stops with its explicit partial
and pending family statuses in `bench/v8-learning/audit.json`. The completed
changes and selected evidence are retained; unread paths and unassessed domains
are not claimed as implemented. The new authoring cache is distinct from the
measured native hoisting improvement, and neither establishes a broad speedup
across Ink applications.

The final frozen corpus diagnostic compiles all ten unchanged programs, selects
two alternatives, admits 36 laws and reuses seven across programs, with no
representation admitted. Every quick budget is exhausted. Compiler/planner
changes since the prior run and bounded-search variability prevent attributing
count or elapsed-time differences to authoring reuse. Exact inputs, selected
plans, near misses and context are retained in `corpus-normalizer`; its private
knowledge publications are retired after successful completion.
