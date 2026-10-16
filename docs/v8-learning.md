# Learning from V8

Ink uses V8's optimizer as a source of proposals. The database owns optimization
laws and proof production; the compiler retains general checking and literal
lowering. V8's speculative types, maps, feedback and machine flags supply no
premises. Correctness, source applicability and profitability remain separate.

The upstream source revision is `c4e049d3cbda775e2c3af9410f6e18b18388d68b`.
`bench/v8-learning/upstream-inventory.json` records 609 compiler, Maglev and
supporting source files (18,261,223 bytes), including the explicitly followed
division-by-constant dependency. Inventory and search results are not
completed review. The [complete source checklist](../bench/v8-learning/coverage.md)
shows checked and unchecked files. Regenerate it with `python3 tools/v8_audit_status.py
--output bench/v8-learning/coverage.md`; this verifies every cached source hash and
recorded line range. The audit ledger records partial reads and outstanding families;
this is an ongoing audit, not a claim that every V8 optimization has been adopted.
Current receipts cover 177 full files and four partial files, with 428 unread;
all 22 optimizer-family assessments remain partial.

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
There are now 83 admitted word/conversion laws out of 85 proposals, including
three whole-branch range/conversion laws added in the resumed audit. The two U64
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

The resumed V8 pass makes structural branch prices sensitive to scoped empty
extents. The database declares the policy, and the planner prices the condition
once plus maximum arm work, shifting local extent hypotheses through binders.
They never become checker premises. A matched old-price control selects no
hoists; current default semantic discovery checks and selects fold/map/filter
hoists. The original single-fold source/target prices change from 2602/2916 to
2602/314. These are relative search scores, not timings.

Official native whole-call acquisition on the three-callback control measures
1.22x/1.29x nonempty median gains in its first training/holdout cohort, but the
unchanged training extrema guard retains baseline. One later exploratory
control doubles both dimensions with fresh seeds: 1.44x/1.87x clears the same
guard in both splits. All input sets are disjoint, and the rejected cohort is
retained. This is a two-candidate resident-call objective (work weight 10000,
empty weight 1); build/setup costs are separately recorded and no broad
application gain is established. Full quick recipe search still covers two of
three callback functions and retains baseline without evidence. An eager-wave
prototype did not improve that real control and is excluded.

All 347 planner tests and five merged knowledge tests pass. The mandatory CPU
suite now also runs default-discovery regression checks, and all 94 reference,
Rust, JavaScript and Rust-Wasm cases match, including exact snapshots and raw
floating boundaries. The frozen corpus compiles ten programs, admits 24 laws,
reuses six across programs and admits no representation; no alternative clears
the robust measured lifecycle guard, and every quick budget exhausts. Compiler,
catalogue and execution changes since the prior day prevent causal comparisons
to earlier corpus counts. See `bench/v8-learning/branch-cardinality` and
`corpus-branch-cardinality-summary.json` for exact revisions, inputs and limits.

## Range-guided representation reuse

The complete V8 representation changer and Maglev truncation review reinforced
that an equal physical representation does not remove a stronger check, and that
lossy conversion reuse needs complete input-domain evidence. Ink's unsigned
proposal analysis now uses its branch-local ranges to remove lossless U64/U32
round trips. Bounds on wrapped sums stay attached to those sums. Three reusable
whole-branch laws have ordinary independently replayed bitvector certificates.
No new checker pattern, primitive, floating-point rule or type assumption was
added. See [proofs and measurements](../bench/v8-learning/range-conversions/README.md).

The 88-case required CPU comparison and related knowledge regressions pass.
The current tiny complete-call measurements retain the baseline on JavaScript
and native: no robust speedup was observed. Normal semantic discovery finds all
three forms with 128 checks, while the 32-check control composes only two; the
production search budget and profitability guard remain unchanged. The frozen
corpus evaluation is recorded separately with its exact input context.

## Exact F32 source circuits

The explicit `fixed-scalars-v3` source circuit mode extends `fixed-words-v2`
with existing F32 raw bit casts, payload-preserving sign negation, classification
and six IEEE comparisons. It uses the low 32 bits of the general word circuit.
Source F32 equation endpoints compare stored bits; a source `binary:==` on F32
instead uses IEEE equality, including unordered NaNs and equal signed zeroes.
Unsupported floating arithmetic remains an unconstrained observation. No rounded
addition, reassociation, NaN canonicalization or range assumption is introduced.
F64 proof terms still reject, including closed nested terms in dead branches.
Legacy modes keep their circuit identities, and all modes require ordinary RUP
replay with existing budgets.

The knowledge database supplies fifteen portable laws for bit round trips,
double negation, classification and self comparisons. The always-false strict
comparisons retain operand evaluation through an ordinary bound application.
Source matching and a correct CNF hash do not replace a refutation: mode
substitution, forged NaN reflexivity and erased payload claims reject.
`core/tests/f32_bit_circuits.rs`, the independent binary32 gate oracle,
`knowledge/tests/test_v8_float_laws.py` and the required F32 refinement parity
suite cover these boundaries. Detailed acquisition scope, measurements and
validation receipts live in `bench/v8-learning/f32-bits`.

The required device validation also exposed a literal GPU typing bug: direct
collection shaders re-inferred number-only callback branches as U64 despite a
checked U32 result. The GPU emitter now carries the checked element carrier
through callbacks, helpers, choices and carrier-preserving collection operations;
map input and output carriers remain distinct. Shader validation covers U32,
I32, U64 and F32 contexts. This is literal backend correctness support, with no
new source rewrite or profitability authority. Actual selected F32 bit-copy and
classification kernels preserve all tested payloads and gradual-underflow bits.

## Strict source-call unfolding

V8's TurboFan and Maglev inliners reuse already-evaluated argument nodes and
preserve their control/effect context. Ink's database unfolding producer now
represents the complete argument interface with typed lexical bindings, once
in declaration order, including unused arguments and repeated U64/composite
values. Binding a selected scalar subset is insufficient to preserve the full
call interface. Lazy caller arms keep their own bindings inside their branches.
The proposal still needs an ordinary checked source equality and measured
profitability; there is no carrier whitelist or inlining theorem in the compiler.

General Normalize checking compares fixed lexical beta steps before descending
into unrelated helper computation. This validates curried-to-sequential binding
reification without expanding a large unchanged argument. Capture-avoiding
substitution and existing shared work/depth limits still apply; validation runs
before that comparison, including fail-closed nested F64 terms. The independent
package test checks identical proof work for 1,000- and 65,536-step helper
arguments. This does not raise budgets, change certificate identities or prove
backend correctness.

The required strict-inlining suite covers wrapping U64 boundaries, mixed unused
arguments, callback capture, caller-arm laziness and exact F32 payload copies.
Its actual device validation also exercises literal U32/U64 conversions, now
emitted through the existing packed two-lane GPU ABI. Widening writes a zero high
word; narrowing selects the low word. These fixed primitive mappings grant no
range, check-removal or profitable-selection authority. Detailed evidence and
scope are retained in `bench/v8-learning/strict-inlining`.

Combined knowledge integration also includes the concurrently published generic
first-order call-exposure strategy. It preserves a reusable call on one side
while trying at most sixteen existing fixed head reductions on the other, then
compares every argument through ordinary congruence. The call name stops search;
it grants no equality. This subsumes the overlapping local closed-control probe,
which is retired. Existing definition typing/termination, shared work/depth
bounds and ordinary proof replay remain mandatory. Unknown branches and changed
captures are not erased. The frozen corpus and lifecycle controls above predate
this final integration strategy; their exact contexts remain separately recorded.

## Signed words and checked integer division

V8's machine reducer and division-by-constant helpers separate signed/unsigned
widths, rounding toward zero, power-of-two sign/bias corrections and multiply-high
reciprocal algorithms. Its total machine divide-by-zero and overflowing signed
division results differ from Ink's `quot_or`/`rem_or`: both Ink operations select
their lazy default for zero divisors and I32 MIN/-1. Transplanting the raw V8
identity would lose that source behavior. The dependency header/implementation
outside the initial inventory are now explicitly acquired and reviewed.

The `fixed-scalars-v4` source proof mode reconstructs I32 wrapping arithmetic,
signed comparison, arithmetic right shifts and existing rotations, plus checked
U32/U64/I32 quotient/remainder. A fixed general restoring divider supplies raw
machine results; an explicit source guard selects the default. No constant-divisor
rewrite, coefficient table or solver is embedded in core. Existing source modes,
CNF identities and executable-core meanings remain unchanged; F64 proof terms
still reject, including closed nested terms. Independent gate tests exercise both
encodings with high input bits, zero divisors, signed overflow and random pairs.

Generic source word extensionality admits an equality only when bounded checked
masks cover every bit of its U32/I32/U64 endpoints. Each part proves the complete
masked endpoints with ordinary existing proof rules. Copies, context validation,
RUP work and depth share the existing budgets; zero/out-of-width masks, missing
coverage, incorrect high bits and unsupported carriers reject. No individual
mask or correct digest is an equality fact. This lets external proof authoring
split difficult obligations without raising compiler limits or adding an
optimization-specific theorem.

The database owns sign-fill, strict zero/self cases, guarded minus-one/minimum
divisors and power-of-two quotient/remainder proposals. Typed lexical bindings
retain unused and repeated strict operands; defaults stay inside their original
exceptional arms. Every frozen entry replays an ordinary certificate, including
inside callbacks and ordinary helper contexts. Unadmitted authoring attempts
remain outside discovery. Structural discovery and measured implementation
selection remain separate gates.

`tests/support/integer_division.rs` is part of the mandatory refinement suite.
It compares 150 complete CPU/Wasm/JavaScript values and snapshots, plus native
GPU-host results and 90 actual device dispatches. The related knowledge suite
checks all proposed formulas and strict/lazy evaluation traces independently,
replays frozen proofs, rejects a rehashed false overflow claim and observes
unused/repeated helper work with bounded reference execution. Detailed source
pins, corpus context, authoring outcomes and lifecycle controls live under
`bench/v8-learning/integer-division`; conformance supplies no profitability fact.

## Frozen-library discovery dispatch

Temporary generic constructor/operator buckets now filter exact-sort subject sites
before the ordinary matcher. On all ten retained subjects and three libraries,
exact matching calls fall from 111,086 to 310 with identical labels, proof identities
and order. Three fresh-process controls report 55.486 to 33.443 ms for the median
of process sums of lookup medians, including metadata reading and bucket creation
but excluding proof loading/admission. This is a lookup improvement; no whole
compiler or runtime speedup follows. Ten frozen programs compile and admit
alternatives; 24 laws are observed, six reused, and every final selection gate
retains the baseline pending measurement evidence. See
[controls and validation](../bench/v8-learning/head-discovery/README.md).

## Ordinary proof graph compaction

The optional untrusted author now factors reusable root units, inlines sole-use
unit lemmas only after strict hint propagation, and trims the dependency graph.
All 98 existing word/F32 laws replay. Forty-three word certificates shrink while
their statements and meanings stay identical: total raw law bytes fall from
34,374,885 to 30,066,164, and gzip proof bytes from 7,705,664 to 7,454,657.
Each replacement also reduces the independent replay-work estimate. The kernel
still reconstructs and replays the ordinary certificate under unchanged limits.

Three fresh-process paired controls over the same 43 statements give 9.3403 to
7.7330 seconds for the median of process median complete checker-call sums.
They include process/read/hash/admission/replay and share the host with the corpus;
this is a checker-batch improvement, not a compiler or compiled-program speedup.
The selected conditional U64 pilot also shrinks from 3,193,378 to 113,209 bytes,
but all three outstanding unconditional U64 laws remain excluded. See
[inputs, controls and exact scope](../bench/v8-learning/rup-compaction/README.md).

The required post-compaction frozen corpus passes all ten programs and admits
alternatives for each: 24 laws observed, six reused, zero alternatives selected.
Every final gate requires measurement evidence; all quick budgets expire.
Its 51.422-second median is unpaired shared-host diagnostic data, not a causal
compiler/runtime comparison. The terminal source-context check passes.


The explicit device-calibration companion now measures checked equality plans on
one observed physical browser GPU. For the pre-existing U64 quotient-by-eight
rewrite, the distribution-source `e62614e3` image measured held-out complete warm
calls at 6.2775 ms before and 0.7075 ms after the rewrite (three fresh processes;
median paired ratio 8.9576). The older pinned compiler cohort measured 2.710 to
0.685625 ms. Browser execution assets match byte-for-byte across cohorts, so
these timings do not establish a compiler-version change. See
`bench/v8-learning/device-calibration` for source/oracle/holdout and counter
controls. This workload demonstrates explicit compiled GPU rewrite benefit;
complete lifecycle/CPU placement and general Ink speed remain unestablished.
The database retains 24 timing-only observations with unknown whole-browser
memory and exact original contexts; automatic selection/cache behavior is unchanged.
A bounded browser-host budget reserves normal owned-process shutdown time and
retires profiles only after observed exit. Generic Maglev phi representation
selection has also been fully read: all-use demand, widening, preserved guards,
loop retagging and hole/NaN contracts are recorded without importing speculative
narrowing or deoptimization as Ink equality authority.

The simplified-lowering verifier source/header are fully read as well. Its
separate type/truncation reasoning, context-specific machine constants and
nontruncated return/deopt boundaries are relevant design constraints. Its long
explicit list of unsupported operators prevents treating the verifier as a full
lowering correctness proof. The audit now records 130 full files, three partial
and 476 unread; all 22 optimization families remain partial.


Full simplified-lowering implementation/header review now records the complete
truncation/retyping/lowering pipeline and its guarded error, float, BigInt, FFI
and GC boundaries. The queue stands at 132 full files, three partial and 474
unread; every family remains partial. Dynamic guarded power-of-two remainders
remain distinct from the already proved constant-divisor catalogue.

A generic bounded lossless RUP hint transport now checks every reference through
the same propagation rules and shared budgets, preserving legacy plain bytes and
their direct replay path. An untrusted Boolean cover builder assembles the retained
conditional U64 self-quotient cells into a complete ordinary Cases proof. Its law
shrinks from 23,762,435 to 8,305,056 bytes and passes existing limits; corrupted and
rehashed changed-result objects reject. The database now admits 338 of 340 integer
proposals, preserving all 337 preceding identities. Package, runtime-performance
and corpus integration validation is still in progress for this batch.


## Lossless proof transport and wide self division

Bounded signed-delta hint streams now use the same strict propagation and work
budgets as legacy arrays, which retain their direct replay path and wire bytes.
An untrusted Boolean-cover author composes the retained U64 self-quotient cases
with ordinary exhaustive Cases. Complete proof bytes shrink from 23,762,435 to
8,305,056, fitting the unchanged 16 MB object limit; 338 of 340 integer proposals
now admit with all prior 337 identities unchanged. Two U64 remainder goals remain
unadmitted. Core and its exact standalone package each pass 470 tests. Four
rehashed malformed/future/ambiguous/source-result controls reject, and source
application retains repeated strict work and lazy defaults. LRAT export handles
both formats independently; external checker binaries were not configured.

The same fifteen admitted control statements pass all 945 fresh checker calls.
Three alternating blocks have median-of-block batch times 8.629 s for the pinned
legacy compiler, 8.514 s for current plain arrays and 3.973 s for current packed
hints. Reading/hashing/admission/replay are included; no whole-compiler gain is
inferred. Exact inputs and images stay immutable throughout the measurement.

An explicit source-checked GPU self-quotient fold reduces held-out warm async
complete-call medians from 3.090 to 0.609 ms, with median paired ratio 5.203 across
three fresh browser processes. Every process passes the unchanged 10% extrema
guard. Full U64 outputs and actual device dispatch/readback are checked. JS/native
complete-call cohorts retain the baseline under that guard. This does not change
automatic placement or establish whole-browser memory/cold or broad application
gains. Exact source, plans, generated assets, requests, raw replies and proof
receipts are retained in `bench/v8-learning/hint-transport`.


The required stable-context frozen corpus compiles all ten programs and admits
alternatives for each. It observes 22 old law identities, six reused across
programs, with no new self-quotient attribution. No alternative/representation is
selected; all ten end at measurement evidence and exhaust quick budgets. No
near-miss reason is recorded. The 50.725 s median excludes private publication
preparation and is not a causal comparison with the prior 51.422 s unpaired run.


Concurrent producer work is preserved in the merged knowledge pin. Its separate
frozen cohort compiles all ten programs, observes 24 old laws/six reused and
selects none, with a stable terminal context. The original and merged cohorts
remain distinct. Final merged CLI validation passes nine planner cache/CLI tests,
two trained-plan tests across five interfaces (143 reference cases and exact
snapshots), four exact original self-quotient oracles and eight actual GPU calls.
Both complete generated GPU artifact trees match the measured cohort byte for
byte; no timing context or automatic selection authority is transferred.
Current-core CI receipt checks now remain separate from historical package/test
records, which keep their original source identities.


## Established equalities and remaining U64 remainders

Generic database authoring now discharges explicit scalar equality facts through
existing Congruence/AssertEquality rules. Reusing already checked quotient
witnesses admits both previously missing U64 remainder proposals as self-contained
ordinary proofs. All 340 integer proposals now admit; the prior 338 proof
identities stay unchanged. No core, circuit, source meaning, budget or selection
policy changes. See `bench/v8-learning/remainder-facts` for exact reproduction.

Complete-call CPU controls retain the baseline under the existing uncertainty
guard. Explicit GPU holdout medians are 4.693 to 0.602 ms, paired median ratio
7.479 over three fresh processes, with actual dispatch/readback and exact source
oracles. This narrow two-law fold result does not establish automatic placement,
cold latency or a broad application speedup.

Fourteen knowledge regressions pass, including all340 integer laws and new
strictness/laziness/full-width/false-premise controls. Fresh authoring reproduces
both proof identities. The final stable frozen corpus compiles all ten programs,
observes24 old laws/six reused and selects none; all measurement gates/budgets
remain conservative. No new remainder-law attribution occurs. The52.6435s median
is an unpaired shared-host observation, not a causal speedup.36 exact timing
rows publish without changing the proof snapshot or policy.
