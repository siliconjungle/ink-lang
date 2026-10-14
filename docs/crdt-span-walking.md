# Compressed positional history in ordinary Ink source

`knowledge/libraries/span_event_graph.ink` implements a positional text history
with the same batch input type as `batched_event_graph.ink`. It is a source
alternative under validation, not a checked database rewrite of the scalar
walker. The compiler does not recognise text histories or these module names.

The concurrent implementation stores one causal node per complete batch.
Insertion runs carry an identity interval, two anchors, payload offset, length,
insertion visibility, active delete count and permanent deletion flag. A general
weighted sequence measures both raw character extent and current visible extent.
A general interval index locates external identities without a map entry for
each character. Positional edits split runs only where their metadata diverges.
Recorded batch transitions refer to identity ranges, so subsequent splits do not
invalidate their targets. Retreat and advance toggle runs rather than expanding
the history into character events.

The DAG component is now `causal_workspace.ink`. Single-parent nodes store a
scalar parent and chain base; only multi-parent nodes retain a frontier list.
Each query uses epoch-tagged dense visitation flags and retained heap buffers.
The text walker consumes range buffers in place and returns them to the next
query. Epoch rollover clears the tags before restarting at generation one.
Invalid frontiers do not contaminate a later valid query. This implementation
remains ordinary source and needs the complete DAG refinement proof.

Permanent deletion and temporary causal-view deletion are distinct. Retreating
a delete decrements the temporary count, allowing positions to be interpreted
in an earlier view; it does not resurrect that character in the final union.
Insertion visibility also remains separate from both deletion fields. Insertion
affinity uses the previous visible character and next causally present raw
character, including tombstones. Concurrent integration uses the scalar walker's
identity tie rule, including counters for branches authored by the same actor.

The compressed DAG currently requires parent references to batch endpoints.
`eligible` checks this applicability condition. Interior frontiers retain the
existing scalar implementation. The direct `walked` entry requires endpoint
frontiers; it reports an error for an unresolved dependency. Removing this
restriction needs causal-span splitting, not an assumption that every public
history already satisfies it. The existing linear batch implementation remains
the sequential path.

The refinement obligations for planner admission are broader than test parity:

- Decoding a run yields consecutive identities with implicit predecessor anchors,
  a constant right anchor, contiguous payload, and uniform visibility metadata.
- Splitting preserves this decoded sequence, all identity lookups, raw/live
  measures and previously recorded transition targets.
- Bulk insertion agrees with scalar integration of its complete chain, including
  inactive concurrent siblings and same-actor identity ordering.
- A ranged delete records exactly the currently visible targets. Toggling a
  recorded range agrees with toggling each scalar event, including overlapping
  deletes and fragmented runs.
- Collapsing an internal batch chain preserves causal difference at endpoint
  frontiers. Applicability failure preserves the scalar path and its errors.
- Final materialisation decodes the union's permanent deletions, rather than
  whichever temporary view happened to be visited last.

The general chunk transition laws in the knowledge repository can support the
composition step once the concrete transition/decoder preservation relation is
proved. They do not currently discharge these heap, ordering and causal
obligations. External FugueMax model proofs likewise do not certify this source
representation automatically.

`epoch-mark-laws.ink` contains seven checked component laws over the actual
two-word cell record: current/stale reads, writing the current epoch, zero cells,
decoder preservation under append and a mathematical reset by mapping all cells
to zero tags. `tools/epoch_mark_laws.py` constructs this external authoring source
from a checked record schema; record names select a subject and grant no proof
authority. The source and subject manifest bind that schema, and canonical
proofs live in `libraries/proofs/epoch-marks`. These laws do not establish fresh
epochs across arbitrary histories, the full-range fill reset, heap ordering,
causal difference, or CRDT refinement.

Performance evaluation must validate complete outputs against the pinned current
Diamond Types implementation before timing. `bench/crdts/batch_run.py` accepts
independent source and control-source paths, with explicit `--core` and
`--control-core` flags for frozen checked source images, so unchanged implementations
can be compared as sibling modules in one process. Planner training remains
separate from full evaluation. No inline hints or benchmark-source edits are
needed. Peak memory, persistent merge/load APIs and full concurrent histories
remain separate requirements; prefix throughput does not close those gates.

The current source also reserves sequential gap capacity once per inserted chunk
and writes through a small cursor. The logical equivalence being tested is the
decoded sequence: inactive gap storage and spare capacity can differ. Malformed
gap layouts and capacity overflow retain the existing scalar path.

`interval_cursor.ink` accepts a stable interval-node hint, checks its current
bounds at use, and falls back to predecessor search. Splitting can invalidate a
hint, and rotations preserve node handles. The span walker caches these hints
for insertion anchors. Membership, reachability and disjointness invariants are
still obligations for a universal rewrite proof; tests alone do not admit it.

Visibility replay now uses identity-only lookup rather than computing an unused
sequence rank. It also avoids refreshing exact subtree measures when a metadata
change leaves a span's live extent unchanged. The latter depends on the engine's
maintained measurement invariant. The general weighted-sequence `set_weight`
function keeps its original behavior on arbitrary supplied trees.

Full evaluation now includes all seven histories, rather than only the concurrent
prefixes. The first three-sample full run after bulk insertion and interval hints
validated every expected document, but still measured concurrent ratios of 3.55,
3.69, 12.19 and 6.83 versus Diamond Types. Those measurements identify unfinished
performance work; they are not an established win or a source refinement proof.

`frame-laws.ink` adds a kernel-checked parametric fold observation law with an
explicit preservation assumption and a concrete cursor-data instance. Its
canonical objects are published separately under `libraries/proofs/frames`.
Negative tests reject the missing assumption and a cursor step that changes the
observed data. Applying this to a concrete query still requires its preservation
proof; the fold law does not by itself justify removing a repeat-until traversal.
`span_measures.ink` independently checks exact raw/live subtree measures, span
weights/extents and child-parent links after every batch in randomized histories.
These checks exercise the invariant behind conditional refresh skipping, without
claiming a universal invariant proof.

The next cursor experiment lives separately in `weighted_cursor.ink`. Mutation
wrappers preserve a visible cursor rank only when an insertion is adjacent to
its known node or a weight/extent change affects that node; other changes
invalidate it. Searches try at most eight nearby linked nodes before using the
ordinary treap search. A conservative flag permanently disables cached searches
after live-weight overflow, and the original MAX search sentinel is not cached
as valid membership. The randomized comparison checks all position fields and
underlying nodes against the ordinary tree, not only final text. This library
has not yet been integrated into the text walker or admitted as a rewrite.

The cursor experiment's first controlled measurements showed only about 1–5%
changes on the concurrent prefixes. It did not close the Diamond Types gap.
A larger experimental alternative is `phased_event_graph.ink`: it prepares the
endpoint DAG, derives conservative critical cuts, and uses a gap sequence for
long critical runs. Short runs retain the compressed walker. Before changing
modes, the completed prefix must be common to every later causal view. Prior
endpoint parents are mapped to the seeded checkpoint version; later parents
retain their real identities. Whole linear inputs retain the existing linear
implementation and its validation rules.

`checkpoint_span_graph.ink` seeds the common visible text as an internal run.
Its identities occupy the actor-zero namespace. Input batches require a nonzero
actor, so the internal region does not overlap input identities. The baseline
has no insertion transition and cannot be deactivated by retreat. Deletes can
still address and split its runs. Final union materialisation and permanent
versus temporary deletion remain separate. The full prefix-shredding and
FugueMax preservation proof is still required; this is an ordinary source
candidate, not an admitted database rewrite.

The minimum run length is an explicit library argument; the default is 128.
The long-run predicate requires the actual critical flag even at minimum zero.
This avoids flattening a document at thousands of small cuts. In the full
traces, C1/C2 have 3,650/4,825 noncritical regions; A1 has seven. A1 has 32,453
critical batches, while A2 has only two. These diagnostic counts identify
potential work skipping; they do not prove the implementation refinement.

The phased tests force mode changes at minimum two and zero, include long
production-threshold histories, sparse counters, maximum identities, overlapping
deletes, empty prefixes and redundant prior parents. They compare the scalar
implementation and an independent ancestor/list model. CPU parity checks values,
errors and exact portable snapshots. Performance remains an independent gate.

`tools/namespace_separation_laws.py` publishes two RUP-checked mathematical
component theorems under `libraries/proofs/namespace-64`: a nonzero high-word
mask places a u64 above the low-word namespace, and a bounded low-word key is
strictly below it. The checker rejects missing premises and corrupted hints
after rehashing. These theorems do not discharge the source constructor,
representability, causal-cut, tombstone-shredding or full CRDT obligations.

Source implementation exposed two general language limitations. An affine
record passed to an ordinary query helper is consumed, so the gap-length query
currently uses direct field reads. A Result match cannot consume an affine
record captured from its outer scope; the implementation first extracts an
immutable result record, then updates the affine state outside the match.
No checker limit or ownership rule was weakened for this candidate.


The first phased comparison regressed A1 because record reconstruction copied
both large flag lists on every edit. General final-field ownership fixes that
copying without a CRDT matcher. The compiler-isolation pilot retains the previous
checked plan and validates all seven full outputs before timing. Its Ink/DT
ratios are S1 0.984, S2 1.272, S3 1.295, C1 3.613, C2 3.163, A1 5.556 and
A2 6.206. This acquisition is still behind overall; the sequential near-parity
result does not establish a robust win. Fresh planner acquisition with the new
compiler is a separate pending check. Benchmark boundary is complete ingestion
and materialisation with output destruction, excluding input cloning; persistent
merge, load and peak-memory comparison remain separate work.


The maintained interval treap now has an experimental one-pass insertion library,
`interval_fused.ink`. It derives the predecessor, successor and insertion parent
in one traversal while retaining the original stable slots and rotations.
Generated tests compare exact tree images after each prefix, including rejected
insertions and the u64 end sentinel. The isolated fused text variants pass the
same history model and CPU parity. This remains source software; its maintained
representation invariant and universal source bridge are still required before
it becomes an automatic database rewrite.

Freshly selected plans were compared in one binary with the previous Ink plan
and pinned Diamond Types. Complete concurrent/complex traces improve about
5–9% against prior Ink in that acquisition, with paired bootstrap intervals
below one. They remain roughly 3–6 times slower than Diamond Types. Sequential
near-parity and short-prefix results do not establish an overall win. The source,
plan, compiler, harness and input bindings are in the controlled result reports.


## Permanent document projection

The experimental `projected_span_graph.ink` separates the permanent document
from the temporary causal view. `dual_measure_sequence.ink` maintains total
extent plus two independent weighted measures. Current visibility uses active
inserts and temporary delete counts; permanent visibility excludes every span
that has been deleted by any integrated operation.

Insertions use the permanent rank of their integration destination to update an
owned gap document. The first permanent deletion removes that span from the
document; later concurrent deletions retain their temporary counts without
removing the same document range twice. Retreat and advance change current
visibility alone. Splitting a span preserves both measures and its identity
interval. A checkpoint baseline is one synthetic identity run over the retained
gap, with no duplicate character payload in the tracker.

`projected_event_graph.ink` transfers the gap between direct-edit and tracked
phases without freezing and reseeding the entire visible text at every cut.
Its default critical-run threshold is one. Final materialisation freezes the
permanent document once. The conservative cut criterion and actor-zero namespace
remain required; universal prefix shredding and full FugueMax preservation are
still unproved. This source candidate is not an admitted algorithm rewrite.

The dual sequence matches two ordinary measured trees and an independent list
model across mixed insertions, extent changes, both weight updates, seeks and
ranks. The new walker and phased paths pass the existing independent causal
history models, malformed/interior fallback tests and five-target CPU parity.
Native performance must be established separately by normal planner selection
and complete upstream comparisons.


## Referenced interior frontiers

`fragmented_event_graph.ink` is an ordinary source adapter for parents that name
an event inside an earlier batch. It validates topological interval ownership,
groups referenced cut offsets, and splits a batch only at those offsets. Deletes
retain their common position; inserted segments advance by their preceding
insertion count. A later segment depends on the previous event identity.

The source adapter is checked against exact scalar event expansion, including
IDs, parents, positions, operation kind and Unicode values. Invalid dependencies
retain scalar fallback. This correspondence has passed 222 histories spanning
mixed delete/insert frontiers, duplicate parents and the u64 endpoint sentinel,
including 120 random histories with arbitrary interior parents. Execution on all
five CPU targets also preserves exact events, values, errors and original runtime
snapshots. Universal expansion/refinement proofs remain required; the adapter is
not yet the default benchmark implementation or a database rewrite.

## Permanent document measurements

The projected implementation completed normal planner search over 48 states and
selected a checked physical plan. The eleven-round full comparison is saved in
`projected-full-controlled-results.json`; the 31-round prefix comparison is in
`projected-prefix-controlled-results.json`. Both compare with the frozen prior
fused core and Diamond Types in the same executable and validate complete text
outputs before timing.

This candidate is not a general improvement. Full-trace times relative to the
prior Ink version are C1 0.970, C2 1.069, A1 0.857 and A2 1.503. The first three
bootstrap intervals include 1; A2's interval is 1.027–1.857. Prefix C1, C2 and A2
are slower by 21%, 12% and 16%, with intervals above 1. The permanent gap buffer
therefore remains an experimental source alternative. The prior fused version
remains the comparison baseline; these results do not establish a win over DT.

## Dense cuts and block sequences

`dense_causal_cuts.ink` keeps frontier membership in a boolean buffer indexed by
topological graph slots. The cut criterion is unchanged. The independent graph
oracle and existing map implementation agree on 509 cases and a 10,000-node
chain; all five CPU targets preserve values and exact original snapshots.

`blocked_measure_sequence.ink` provides stable item slots, linked iteration and
three independent additive measures in a tree with 32-child leaves and branches.
Point changes update ancestor aggregates by deltas. Splits update item/branch
positions while preserving stable IDs and sequence order. Child slots occupy a
flat buffer arena; blocks contain offsets and scalar metadata. This avoids
temporary storage inside buffer elements, which current Ink ownership admission
rejects, and needs no new compiler syntax or primitive.

Sequence tests compare 153 mixed histories with two treaps and an independent
list model, including three large random histories, and a 3,500-item multilevel
split case. All five CPU targets preserve query values and snapshots. An explicit
u32 maximum-position check uses the independent out-of-range expectation: the old
treap uses that value as its stop sentinel and can return its root for this query.
That sentinel result is not used as an oracle for the block implementation.

`phased_blocked_graph.ink` uses the block sequence with the prior payload strategy
and dense cut preparation. It passes 304 phased histories, 403 compressed histories
with error/fallback cases and all five CPU target comparisons. Its normal planner
search uses five 128-change training prefixes. Universal maintained-tree
refinement and whole CRDT source equivalence remain unverified.

The block candidate's normal planner search completed with 45 checked states and
225 offline observations. Selection includes a generic scalar-observer argument
projection followed by a physical layout; the block-tree algorithm was authored
as ordinary library source. The planner did not derive that algorithm from the
prior treap or admit their whole-source equivalence.

Eleven-round full comparisons in `blocked-full-controlled-results.json` reduce
time relative to the prior fused version by 6% on C1, 2% on C2, 16% on A1 and 28%
on A2. Paired bootstrap intervals for these ratios are 0.916–0.954, 0.950–0.999,
0.828–0.857 and 0.688–0.741 respectively. Sequential differences remain within
timing uncertainty. The candidate still takes 3.26x, 3.00x, 4.36x and 4.39x DT's
time on those four full traces.

The 31-round prefix comparison has a scaling tradeoff: C1 and C2 are 2–3% slower
than the prior Ink version, while A2 is 5% faster. These are complete-call timing
results with validated text outputs, not peak-memory or persistent-lifecycle
measurements. They do not meet the requested goal of beating Diamond Types.

## Speculative compressed replay

The C1 block-tree profile includes substantial endpoint eligibility work before
replay builds its own causal state. `speculative_span_graph.ink` instead attempts
the compressed walk first. Success returns its text; failure runs the original
scalar materialisation. The linear path retains its original validation. The
paired `speculative_event_graph.ink` uses prepared graph validity to select scalar
fallback for unresolved/interior frontiers without an additional eligibility map.

The alternative passes 304 phased histories, 403 compressed histories and their
error/fallback cases, plus all five CPU target values, errors and original
snapshots. Its native planner search selected three source helper/rewrite pairs
and a physical plan from 47 checked states and 235 comparable observations.

The full eleven-round acquisition reduces C1/C2 time relative to the block-tree
baseline by 14%/13%, with paired intervals 0.843–0.915 and 0.837–0.896. A2 improves
4% (0.932–0.971); A1's interval includes 1. Prefix C1/C2 improve 13% with intervals
below 1; A2 improves 6%. Sequential and A1 prefix differences remain within timing
uncertainty. Full times are still 2.69x/2.41x DT on C1/C2 and 4.09x/4.01x on A1/A2.
Reports are `speculative-full-controlled-results.json` and
`speculative-prefix-controlled-results.json`. Universal source equivalence is
still unverified.

A separate allocation diagnostic excludes input preparation and observes the
call plus output destruction. C1/C2 request 1,022,245/1,364,871 allocations versus
DT's 194,137/199,029. A2 requests 626,373 versus 52,757. Requested bytes are distinct
from peak live or resident memory, and this instrumented report is timing
ineligible. Generated replay code copies stored target lists when fetching them
from a buffer; flattening such ragged storage is a candidate for further generic
library/layout work, with decoding preservation still required.

## Concrete insertion-stream components

The checked `batch-insertion-chunks` proof instantiates universal fold append with
the actual batch `inserted` function and its captured source definition. Folding
prefix and suffix together equals folding the prefix then suffix through the
carried expansion state, including its event buffer, IDs, parents and position
counter. `tools/source_fold_chunks.py` authors this for arbitrary checked
two-argument state-returning transitions; replay checks parameter order, types,
definition context and exact theorem endpoints. A rehashed dropped-suffix control
is rejected.

The separate `insertion-rebase` store binds the same actual insertion function and
a checked ordinary-source helper that adds the insertion index to the base
position and resets that index. Idempotence and insertion commutation both pass
ordinary semantic normalization. The helper's checked source and conservative
extension are saved with the proofs. These components do not establish delete
chunking, parent-frontier normalization, maintained-tree refinement or FugueMax
equivalence of the complete implementation.

## Replay target arena

`ragged_buffer.ink` stores variable-length rows as flat values plus scalar row
ranges. `arena_span_graph.ink` and `checkpoint_arena_span_graph.ink` store replay
targets in this representation and visit each target through its range instead
of fetching an owned list. Checkpoint seeding retains one empty baseline row.
The algorithms remain ordinary library source; the compiler has no replay-target
or CRDT matcher.

The arena candidate passes 304 phased histories, 403 compressed histories and
their error/fallback cases, plus all five CPU target comparisons. The generic
container separately passes 103 exact decoding/range cases and all five targets,
including empty rows and missing row queries. These tests cover maintained
constructor states; universal row decoding and whole CRDT refinement remain
unfinished. Normal planner acquisition completed with 55 attempts and 47 admitted
states; the selected plan contains physical steps. Semantic candidates were
explored, but were not selected. The arena source representation was authored
manually; this result does not establish automatic representation discovery.

The full-trace controlled acquisition uses 11 rotating rounds with complete
Diamond Types output validation before timing. Relative to the frozen speculative
baseline, C2 improves 2.1% (95% paired interval: 1.4–3.0%) and A2 improves 1.4%
(0.9–1.8%); A1 regresses 1.6% (0.9–2.3%). Other full cases have intervals crossing
parity. The 31-round prefix acquisition does not establish a broad gain.
Full arena/DT time ratios are S1 1.060, S2 1.297, S3 1.293, C1 2.867, C2 2.539,
A1 4.214 and A2 4.192. The implementation has not reached the performance target.

A separate allocation diagnostic reports C1/C2/A1/A2 requests of
801,912/1,089,688/341,442/278,432, versus baseline
1,022,245/1,364,871/499,764/626,373. Requested bytes decrease by
2.3%/2.7%/5.5%/13.6%. These are allocation requests and cumulative requested bytes,
not peak memory; instrumented timings are ineligible for speed claims. Results
are saved in `build/crdt/arena-full-controlled-results.json`,
`arena-full-vs-control-ci.json`, `arena-full-vs-dt-ci.json`,
`arena-prefix-controlled-results.json` and `arena-allocation-results.json`.

The law checker now admits the existing fixed meaning of `Buffer.append`:
freezing its result concatenates both owners' frozen logical values in order.
A checked source law also binds this value-decoding equation to the actual
`ragged.append` body. Its proof store is `libraries/proofs/ragged-source-values`.
Another checked source equation preserves previous ranges and appends the exact
start/end record (`libraries/proofs/ragged-source-ranges`). These component laws
do not certify range coverage, overflow bounds, row lookup or an arbitrary
forged arena state. General primitive tests reject dropped/reversed/mismatched
inputs, and a source rewrite preserves five-target values, events, errors,
rollback and exact original snapshots.

## Direct row construction

The allocation size diagnostic (`arena-allocation-sizes-results.json`) reconciles
all bucket counts and requested bytes with the total counters. Eight- and
sixteen-byte requests dominate counts; the 64-byte bucket alone contains
146,605/160,980/22,586/32,560 requests on C1/C2/A1/A2. Size does not establish
call-site attribution, but it motivates eliminating per-batch temporary target
buffers. The observer uses fixed atomic counters and is absent from timing builds.
Its tests cover observer/input exclusion and bucket boundaries through `usize::MAX`.

`ragged_builder.ink` constructs a pending row directly in the destination arena.
`begin` retains the previous rows and starting offset, `push` extends flat values,
and `finish` appends the range, including empty rows. Isolated ordinary-source
`builder_span_graph.ink`, `checkpoint_builder_span_graph.ink` and
`builder_event_graph.ink` use this container instead of constructing and appending
a fresh target buffer for every batch. Existing arena sources remain frozen.

The candidate passes the 304 phased and 403 compressed history suites, including
errors and interior fallback, and all five CPU backend comparisons with exact
snapshots. The container passes the 103 independent row/range cases and five CPU
backends. The source-bound U32 component laws in
`libraries/proofs/ragged-builder-source-components` certify push decoding, start
preservation and empty-row boundaries. Rehashed dropped-value, changed-start and
wrong-boundary theorems are rejected.

The general untrusted authoring tool `tools/source_fold_observer.py` now constructs
source-bound list inductions for observer preservation or append decoding. It
supports nested record fields and either transition parameter order; ordinary
checking rejects noncommuting transitions, resetting a preserved field, and
rehashing a conclusion that drops the input. It contains no CRDT-specific rules.
For the instantiated U32 builder, checked induction preserves the start and
earlier ranges through arbitrarily long folds and decodes values as a logical
append fold. A further checked law binds that decoder to the actual `build_row`
body. Proofs live in `libraries/proofs/ragged-builder-source-fold-start`,
`ragged-builder-source-fold-ranges`, `ragged-builder-source-fold-values` and
`ragged-builder-source-row-values`. These establish component observations,
not final end bounds, row lookup, complete maintained-container refinement or
CRDT equivalence. This authoring tool is not yet registered as a planner recipe.
Normal planner search completed with 48 admitted states and 240 offline
observations, with no rejected measurements. The selected plan has one checked
helper extension, one rewrite and physical selection. The source representation
was still authored manually. Full 11-round acquisition establishes a C1 gain of
1.7% against arena (95% paired interval: 0.9–2.2%); other full intervals cross
parity. Prefix31 establishes C1/A2 gains of 1.4%/1.7%; other intervals cross parity.
Full builder/DT ratios are S1 1.019, S2 1.301, S3 1.255, C1 2.735, C2 2.491,
A1 4.205 and A2 4.163. No case establishes a DT win.

The separate diagnostic confirms the eliminated temporary buffers: 64-byte
requests on C1/C2 fall from 146,605/160,980 to 530/280. Total C1/C2/A1/A2 requests
are 655,412/928,438/318,851/244,806, with requested bytes
142,333,528/150,883,712/49,069,805/41,142,789. These are not peak-memory evidence
and instrumented times are ineligible. Reports use the `builder-full`,
`builder-prefix` and `builder-allocation` filenames in `build/crdt`.
The subsequent C1 sample (`builder-profile-c1.sample.txt`) uses an uninstrumented
build. Overlapping inclusive counts identify causal difference, interval
insertion, hinted lookup, sequence rank/seek and batch toggling as further targets;
they are not additive time percentages or comparable timing results.

## Further source bridges

The general `tools/source_fold_commutation.py` proves decoder/transition fold
commutation with ordinary generalized induction. It supports a changed logical
state type and optional decoder composition after each logical step. Its tests
reject noncommuting decoders, wrong logical transitions and rehashed dropped
inputs. Applied to the actual insertion function and the checked rebasing helper,
it admits an arbitrary-length insertion-rebasing law in
`libraries/proofs/insertion-rebase-fold`. This retains the full expansion state,
including events and parent chain. Deletion chunking, batch-parent reset and
whole CRDT equivalence remain unfinished.

`tools/source_bitvector_goals.py` authors named typed obligations over a checked
core and binds imported definitions from its semantic subject. It fills an
authoring gap without extending external-law import syntax or the proof kernel.
The actual batch validator admits source-bound laws for inclusive endpoint actor
preservation/order and interior actor preservation/nonzero IDs in
`libraries/proofs/batch-range-source`. Changing to an exclusive endpoint or
removing the interior condition rejects the original certificates after rehashing.
The exclusive endpoint can wrap to zero for the maximum valid identifier. These
laws are components of the batch-expansion bridge, not a complete CRDT proof.

## Cross-measure insertion anchors

`cross_measure_seek.ink` selects an item by one additive measure and returns its
prefix rank in another. It visits only item metadata at leaves and block metadata
at branches. Its offset remains in selection units; its rank excludes that
offset. Missing selections return zero node/rank/offset. This is a general
ordinary-source sequence query, requiring maintained tree sums within the
selection word range, rather than a compiler operation.

The independent flat model covers 123 mixed mutation histories, a 3500-item
multilevel split case, all nine measure combinations, zero weights/extents, and
maximum selected extent/observed prefix. Five CPU backends also agree with an
independent model and preserve exact original snapshots. These tests do not
prove correctness for arbitrary forged trees or overflowing selection sums.

The isolated `cross_span_graph`, `checkpoint_cross_span_graph` and
`cross_event_graph` candidate reuses the total rank found while locating an
insertion's live anchor. Live spans have weight equal to extent; splitting keeps
their total prefix. This removes a subsequent left-anchor interval/rank query.
The stable slot is passed only as a hint, which the ordinary interval cursor
validates on use. Deletion queries retain the original query. The candidate
passes 304 phased and 403 compressed histories, error/fallback cases and all five
CPU backend comparisons. Normal planner acquisition completed with 48 admitted
states, 240 offline observations and no rejected measurements. The selected plan
contains one helper extension, one rewrite and physical selection. Full11
acquisition establishes gains against builder of C1 6.7% (95% paired interval:
6.1–7.1%), C2 6.9% (6.3–8.3%), A1 1.8% (1.2–2.6%) and A2 3.4% (1.3–11.2%).
Sequential case intervals cross parity. Prefix31 establishes C1/C2/A2 gains of
6.3%/6.8%/4.1%, with other intervals crossing parity. Full cross/DT ratios are
S1 1.053, S2 1.320, S3 1.284, C1 2.539, C2 2.296, A1 4.100 and A2 4.112.
The performance target remains unmet. The allocation diagnostic has exactly the
same request counts and requested bytes as builder, supporting traversal work
reduction rather than another allocation reduction. Instrumented times remain
ineligible. Reports use `cross-full`, `cross-prefix` and `cross-allocation` names
in `build/crdt`. Maintained-tree and whole CRDT refinement remain unfinished.

The source-bound U32 step preservation law in
`libraries/proofs/cross-measure-source-tree` proves that one cross-query step
preserves the tree. The general authoring tool `tools/source_field_preservation.py`
discovers up to four Boolean guards and replays exhaustive cases through the
existing checker. Its bounded beta reduction is untrusted. Tests reject a field
changed on one branch, a changed scalar, a rehashed pushed-value conclusion and
excess guards. This proof certifies one observer, not the complete query result.

The general frontend now carries only outer mutable locals referenced or assigned
by a hygienically renamed loop body, plus bounded-while condition references.
This admits existing source that moves an owner before an unrelated loop. Genuine
uses of moved owners still fail; shadowed locals/items/callbacks remain distinct.
The 16-field limit counts the resulting carrier, including assignment-only
targets and readonly owners. Syntax and fixed executable-core semantics are
unchanged. Core tests, focused five-backend values/events/errors/rollback and
snapshots, and the CRDT history/backend suites pass. Broader generic libraries
also pass five CPU targets with 13 real GPU calls; recursive CRDT GPU work remains
unsupported. The frontend changes source elaboration identities, so old source
plans correctly reject and new-image planning uses fresh evidence.

The full11 comparison of the loop-carrier compiler's freshly selected cross
program against frozen prior cross core establishes no broad gain. C1 regresses
0.6% (95% paired interval: 0.2–1.2%); other full intervals cross parity. Prefix31
shows small S2/S3 gains and a 0.2% C1 regression; other intervals cross parity.
Full new/DT ratios are S1 1.042, S2 1.319, S3 1.288, C1 2.574, C2 2.297,
A1 4.065 and A2 4.079. This frontend fix improves expressibility but has not
established a CRDT runtime gain.

## Retained deletion cursor candidate

`cursor_span_graph`, `checkpoint_cursor_span_graph` and `cursor_event_graph` form
an isolated source alternative. `selected_split` retains the known suffix handle
after splitting a live span, avoiding the second position search in deletion.
Correctness depends on the maintained span extent/live-weight relationship;
forged engine states are not admitted by a universal rewrite. The candidate
passes 304 phased and 403 compressed histories with error/fallback cases and all
five CPU backend comparisons. Normal planner acquisition completed with 48
admitted states and 240 offline observations, with no rejected measurements.
The full11 comparison against frozen cross core establishes an A1 gain of 1.7%
(95% paired interval: 0.8–1.9%); all other full intervals cross parity. Prefix31
establishes a 3.6% A2 gain, a small S3 gain and a 0.6% C1 regression. Full
cursor/DT time ratios are S1 1.010, S2 1.292, S3 1.273, C1 2.528, C2 2.277,
A1 4.053 and A2 3.972. Reports use `cursor-delete-full` and
`cursor-delete-prefix` names in `build/crdt`. The target remains unmet.

The attempted zero-offset source equation exposed oversized raw definition
contexts: two bodies have JSON depths 133/131. Flat postorder transport now fits
the 32-function closure without raising canonical limits. The equation still
exceeds the unchanged semantic proof work/depth limit and is not admitted.
Complete split/query correspondence and whole CRDT refinement remain unfinished.
The general transport, iterative validation and demand-driven normalization
changes are independently tested; they do not themselves certify this shortcut.

The indexed-repeat tree observer law in
`libraries/proofs/repeat-source-frames` extends actual cross-measure step
preservation through arbitrary natural repeat counts. Its concrete instance
proves the step assumption with the earlier source-bound law. It covers the
repeat observer only; stopping-query refinement, rank correctness and retained
split correspondence remain unfinished.

## Origin identity candidate

`identity_span_graph`, `checkpoint_identity_span_graph` and
`identity_event_graph` are an isolated alternative based on cross, without the
retained deletion shortcut. The scan reuses the known rank when an origin ID
equals the insertion's origin, and skips the right-origin query when the
left-rank comparison already determines the result. Remaining lookups validate
their hints normally. This follows the identity comparisons in the pinned
Diamond Types merge source. The candidate passes 304 phased and 403 compressed
histories and five CPU backend comparisons. Fresh normal planner acquisition used
`identity-origin-autoplanner`; older `identity-autoplanner` results refer to a
different source and compiler. Complete source-refinement remains unfinished.

The acquisition is now complete: 48 states, 240 observations and no rejected
measurements, selecting a helper extension, rewrite and physical representation.
All full11 intervals against frozen cross core cross parity. Prefix31 establishes
an A2 gain of 3.8% (95% paired interval: 3.0–4.5%); other intervals cross parity.
Full identity/DT time ratios are S1 1.038, S2 1.323, S3 1.309, C1 2.596,
C2 2.301, A1 4.103 and A2 3.953. These are this acquisition's paired ratios;
they do not establish changes from earlier unpaired Diamond Types timings.
Reports use the `identity-origin-full` and `identity-origin-prefix` names.

## Suffix child metadata candidate

`suffix_measure_sequence` is an isolated generic block sequence alternative.
After inserting a child, it refreshes parent/leaf and ordinal metadata starting
at the insertion index. The preceding children retain their existing metadata.
Splitting still refreshes each affected block from its beginning. Correctness
requires a constructor-maintained tree; no arbitrary-state rewrite is admitted.

The independent model covers 153 mixed histories and a 3500-item multilevel
split, and all nine cross-measure combinations pass their independent model.
An additional 3873 comparisons agree with the original algorithm on the entire
maintained tree: node links, leaf/parent ordinals, measures, blocks, child arena,
root and endpoints. They include insertion at either end and in the interior,
with multilevel leaf and branch splits. These comparisons supplement the
independent model; they are not universal proofs. The sequence passes all five
CPU backends. Its `suffix_span_graph`, checkpoint and event variants also pass
the 304 phased and 403 compressed histories and five CPU backend comparisons.
Universal preservation proofs remain outstanding.

Fresh normal search completes with 16 states, 80 observations and no rejected
measurements, selecting physical representation only. Both candidates are
emitted by the new compiler, with frozen identity core as the control. All
full11 intervals against that control cross parity. Prefix31 establishes a
0.6% C1 gain and a 2.9% S2 regression; other intervals cross parity. Full
suffix/DT time ratios are S1 1.074, S2 1.327, S3 1.311, C1 2.637, C2 2.394,
A1 4.096 and A2 4.046. The target remains unmet. The finite A1 sampling run
records visibility replay and gap movement ahead of child reindexing. Its
inclusive stack counts are diagnostics, not elapsed benchmark times. Reports
use `suffix-origin-full`, `suffix-origin-prefix` and `suffix-profile-a1` names.

The isolated `build/crdt/word-induction-core` prototype extends induction to
U32/U64. The base case is zero; the successor case receives the exact premise
`previous < MAX`, followed by the immediate-predecessor induction hypothesis
or its generalized-state schema. The guard exists only in the successor branch.
Five focused tests replay opaque-function recurrence theorems at both widths,
including generalized state, and reject forged conclusions, zero-case IH use,
chosen recursive counts, premises depending on the quantified count, signed
words and invalid binders. This prototype is not yet in the current compiler.
Controlled symbolic stopping-loop unfolding and concrete loop source instances
are still needed; this rule alone does not establish CRDT equivalence.

The prototype additionally adds exact `Unfold` proof computation for lambda
application, literal choice, checked source function calls and the existing
stopping-loop meanings. Symbolic loop unfolding retains both count-zero and
stop guards and the original wrapping index/count operations. It does not
change automatic normalization or raise work/depth limits. A generic opaque
state/view theorem now proves observer preservation for arbitrary U32 stopping
counts, under universal step preservation, with generalized index and state.
Adversarial tests reject missing preservation, changed counts/indices and removed
guards. Literal boundary cases agree with the earlier recursive normalization.
After the identity timings completed, these general changes and tests were
applied to actual core. Full core validation, a fresh compiler build, the CPU
suites and eligible native GPU checks pass. No concrete query-result or
CRDT-refinement theorem follows yet.

## Validated interval hints and refinement references

The A1 profile's hot visibility-replay instruction is an interval treap child
load. The sampled loop follows left/right links through 40-byte nodes. This
supports targeting repeated identity searches; it does not establish that
carrying the larger walker record is the cause.

`interval_finger` uses existing parent links to find an immediate predecessor or
successor, validates its current interval bounds, then falls back to root search
on a miss. `interval_adjacent_finger` limits that probe to an existing membership
hit or an adjacent integer boundary. Both are ordinary reusable source, with
equivalence restricted to constructor-maintained disjoint trees. Independent
rolling, random-hint, maximum-key and split cases pass; the unrestricted finger
also passes the five CPU backend test. Both isolated CRDT variants pass 304
phased and 403 compressed histories and all five CPU backends.

The adjacent CRDT candidate's normal search checks 16 states and 80 observations,
with no rejected measurements. Full11 establishes an A2 gain of 1.9% (95% paired
interval: 1.1–2.5%) against frozen identity core; other full intervals cross
parity. Prefix31 establishes a 0.4% C2 regression; other intervals cross parity.
Full adjacent/DT ratios are S1 1.019, S2 1.268, S3 1.246, C1 2.595, C2 2.283,
A1 4.059 and A2 3.962. This does not close the performance target.

`tools/source_repeat_until_observer.py` combines checked actual single-step
preservation with the generic word-loop theorem. Its tests reject changed
observers and changed branches and cover colliding authoring parameter names.
Actual downward, upward and predecessor navigation now have arbitrary-count
index-preservation proofs. The complete `interval_cursor.locate` also has a
source-bound proof that its returned index equals the input index, even for
arbitrary input records. A rehashed different-owner claim rejects. This proves
ownership correspondence; lookup value correctness remains unfinished. The
authoring tool is not yet registered as a planner recipe.

The isolated `refined_span_graph`, checkpoint and event variants retain stable
span handles in replay targets. Splitting keeps the original handle for the
prefix and links it to the new suffix; the suffix retains the previous successor.
Replay checks the cached span's ID bounds and follows these links, with ordinary
identity lookup as a fallback. Independent partition models cover 244 split
histories, including reverse order, repeated cuts and out-of-range cuts, then
off/on replay. The model and all five CPU backends agree. The CRDT variants also
pass 304 phased and 403 compressed histories and all five CPU backends. Normal
planner acquisition and controlled timing results follow below.

That acquisition now checks 16 states and 80 observations without rejection.
Full11 against frozen identity core establishes C1/C2/A1/A2 gains of
4.8%/5.5%/15.4%/30.6%; all sequential-case intervals cross parity. Prefix31
establishes C1/C2/A2 gains of 3.8%/3.6%/7.6%; other intervals cross parity.
Full refined/DT time ratios are S1 1.057, S2 1.336, S3 1.305, C1 2.343,
C2 2.131, A1 3.494 and A2 2.799. Reports use `refined-origin-full` and
`refined-origin-prefix`. These gains do not meet the performance target.

The new finite A1 profile retains gap movement and interval insertion as large
contributors. Plain scalar buffer copying currently uses a directional clone
loop. Generic Rust lowering now chooses an overlap-safe slice copy for U32,
U64, I32, F32 and Bool, with clipped source/destination/count and logical shared
range limits. Other element types retain their clone path. This is fixed
primitive implementation, with no source syntax, algebraic rewrite or CRDT
matcher. Native tests cover clipping, overlap, shared partitions, zero-sized
elements, NaN payloads and signed zero. The five CPU suites and generic library
suite pass, including 13 actual eligible native GPU calls. The new compiler planner
acquisition and controlled performance results follow below.

The new compiler's normal search admits 16 states and 80 observations and selects
the exact same source-bound plan as before. The controlled benchmark explicitly
emits the control with the frozen old compiler; source and selected plan agree,
and both images' emitted bytes and compiler hashes are recorded. Full11 gives
new/DT ratios S1 0.694 (95% paired interval: 0.668–0.706), S2 0.764
(0.757–0.771), S3 0.773 (0.764–0.786), C1 2.352, C2 2.287, A1 3.073 and
A2 2.806. Thus the three sequential traces beat Diamond Types in this acquisition.
Against the old compiler, sequential times fall 35–42% and A1 falls 12.2%; the
other full intervals cross parity. Prefix31 confirms the sequential gains and
an A1-prefix gain; C1/C2/A2 prefix intervals cross parity. The short A1 prefix
beats DT, while full A1 remains slower. The complete target is still unmet.

The actual `refinement_span.covers` helper has source-bound scalar certificates
for nonwrapping inclusive membership and for narrowing a covered offset to U32.
Removing the membership premise changes the reconstructed circuit and rejects
the stale certificate. Complete split-chain preservation and lookup/CRDT
refinement are additional obligations, not consequences of these scalar facts.


The checked single-pass linear candidate exposed eager copying in owned
`fold_until` stop observation. Removing that general copying issue restores
linear scaling, but the candidate still loses to the best source on every full
trace: sequential time rises 45–59%, concurrent time 2–4%. It is not promoted;
its parent validation, callback boundaries and remaining copies need separate
profitability work. Reordering an immutable endpoint observation before an edit
has passed 304 model histories and five-target parity, but remains unmeasured.

`interval_partition.ink` refines a known interval directly using a validated
stable handle and the existing treap rotations. Its span variants retain a
cached interval slot. Randomized component checks preserve exact node images;
304 phased and 403 compressed histories and all five CPU targets pass. The
constructor-maintained disjointness and cache invariants still require universal
proofs. This optional source alternative is not a database-authorised rewrite.

The partition candidate's normal search admits 16 states and 80 observations.
Full11 against the best refined source on the same frozen compiler establishes
C1/A1/A2 gains of 1.6%/3.6%/4.4%, with a 0.7% C2 regression; sequential intervals
cross parity. Prefix31 establishes only the A2-prefix gain of 6.7%. Full/DT ratios
are S1 0.687, S2 0.799, S3 0.789, C1 2.349, C2 2.169, A1 2.952, A2 2.677.
Reports are `partition-full-controlled-results.json` and
`partition-prefix-controlled-results.json`, with paired intervals beside them.
The full performance target, source refinement and persistent lifecycle gates
remain open. A new normal search explores generic small-helper unfolding; no
profitability result for that search has been established yet.


The checked/hoisted linear step now has source-bound equality proofs for both
its returned linear state and previous endpoint, for all typed input parameters.
The first broad normalization attempt exhausted the existing work/depth cap;
explicit small reductions establish both equalities without raising that cap.
Objects live in `libraries/proofs/linear-endpoint-hoisting`. Changing and
rehashing the claimed result rejects in fixed computation replay. These are
step-component equalities; the stopping-fold simulation and CRDT refinement
remain separate obligations.

The first generic inlining acquisition admitted 32 states, 160 observations and
nine inlining edges, but selected the unchanged physical plan. Its static
heuristic prioritized constructors and fallback helpers. The next acquisition
prioritizes small helpers receiving affine carriers, with measured selection
still authoritative. There is no established performance gain from inlining yet.


The next acquisition pairs each inlining proposal with fresh, independently
checked physical alternatives. This prevents a small frontier budget from
measuring only the rewritten source without its layout. A normal 32-state,
160-observation search selects a rewrite plus physical plan for the checkpoint
walker's thin apply helper. Full11 establishes only an A1 gain of 3.5%; the other
full intervals cross parity, and every prefix31 interval crosses parity. The
complete concurrent gap remains. This selection is retained as measured evidence,
not promoted as a broad improvement. Reports use `composed-inline-partition`.

The checked and hoisted linear steps now also have a complete source-bound
stopping-fold simulation, for arbitrary change lists and initial checked states.
It composes an independently checked generic fold-until commutation theorem
with actual transition and stop-predicate equalities. Both assumptions are proved
for the concrete source. The generic theorem includes the terminal step and
rejects rehashed omissions of either assumption. Proofs live separately under
`libraries/proofs/fold-until-commutation` and `libraries/proofs/linear-fold-simulation`.
This establishes the loop relation between these two ordinary source programs;
it does not establish CRDT convergence or the full FugueMax implementation bridge.


The latest finite C1 profile uses the exact composed-plan emitted bytes. Inclusive
samples again highlight causal difference, interval insertion and visibility
replay. Disassembly of the causal difference's sampled frontier path shows a
list allocation/copy, a parent loop and deallocation. This is diagnostic evidence
about that path, not an elapsed-time attribution to every sample.

Two new ordinary-source DAG alternatives address this path. `pair_causal_workspace`
keeps two-parent frontiers in scalar fields; larger frontiers retain lists.
`flat_pair_causal_workspace` additionally stores larger frontiers in the general
ragged arena and iterates ranges without materialising parent lists. Both preserve
the original public query behavior in the independent ancestor-set tests, including
duplicates, invalid frontiers, repeated queries, appending after queries and epoch
rollover. Five-target DAG parity and CRDT phased histories pass. Complete measured
profitability and constructor-maintained graph representation proofs remain required;
these alternatives have not yet earned database rewrite authority.


The two-parent acquisition admits 32 states and 160 observations and selects a
rewrite plus physical plan. Full11 against the previous partition source on the
same compiler establishes C1/C2 time reductions of 5.3%/6.7%. Prefix31 establishes
6.7%/6.0% reductions on those cases. Full/DT time ratios are S1 0.685, S2 0.764,
S3 0.790, C1 2.253, C2 2.030, A1 2.942 and A2 2.656. A1's full point gain is
only 0.3%; A2 and the other prefix intervals cross parity. The complete target
remains open. Reports use `pair-parent-full` and `pair-parent-prefix`.

A separate `view_pair_causal_workspace` variant removes read-only graph data
from the mutable query carrier. It freezes the node/frontier buffers into an
immutable view for the query, then reconstructs the graph owners afterward.
This may reduce carrier transfer and permit existing generic parameter loans;
it does not introduce a borrowing primitive or a CRDT-specific compiler rule.
Ancestor-set, phased and compressed model checks and five-target DAG/CRDT parity
pass. Profitability and the complete representation proof remain under validation.


The actual read-view buffer thaw/freeze round trip now has a source-bound proof
under `libraries/proofs/causal-read-view`. It applies to arbitrary typed node
and frontier lists. A rehashed claim that discards the node list rejects in
fixed computation replay. This certifies that codec component, not the causal
query simulation or the maintained graph invariants.


The flat-frontier acquisition admits 32 states and 160 observations. Full11
against the two-parent source establishes no gain and a 1.4% C2 regression;
other intervals cross parity. It is retained as an adverse source alternative,
not the preferred implementation. The smaller mutable query-state variant's
normal planner acquisition has completed: 32 admitted states, 160 observations,
zero measurement rejections and a selected rewrite plus physical plan. Its
complete-trace comparison against the two-parent implementation is running.
Five-target DAG and CRDT parity and all phased/compressed model checks have
passed for that variant.

Two additional source-bound laws under `libraries/proofs/causal-work-fields`
establish that the actual read-view workspace's enqueue function preserves its
`bound` and `generation` fields for arbitrary typed parameters. The checker
rejects a canonical rehashed claim that enqueue always returns a zero bound.
These are component preservation laws; they do not establish ancestor-query
equivalence or constructor-maintained graph invariants.

The read-view candidate's complete-trace acquisition already exposes a severe
C1 regression: a median 4,854 ms against 186 ms for the two-parent control and
84 ms for Diamond Types. The completed acquisition establishes C1/C2 slowdowns
of 26.1x/49.6x against the two-parent control and a 39.8% A2 regression; this
candidate is rejected as a performance improvement. Literal emitted code
borrows the read view during traversal but clones both graph lists during
reconstruction. Generic final-use analysis conservatively excludes callback
captures for their entire lexical binding. Allowing final moves after a
nonescaping callback finishes is now implemented as general lexical machinery
for direct fixed synchronous loops. Both reconstruction clones disappear, while
the loop still borrows its read view. Full core tests and five-target value,
error, event and snapshot checks pass. A new controlled full-trace acquisition
compares the view and two-parent sources on the same changed compiler. The
completed full11 acquisition establishes C1/C2 gains of 6.8%/8.2% and A2 of
3.3%, while S2 regresses 1.5%. S1/S3/A1 intervals cross parity. Full/DT ratios
are S1 0.688, S2 0.794, S3 0.799, C1 2.095, C2 1.864, A1 2.948 and A2 2.565.
The complete target remains unmet. Prefix31 establishes C1/C2 gains of
8.7%/9.1%; all other prefix intervals cross parity. Reports use
`capture-end-view-full` and `capture-end-view-prefix`.

The current read-view implementation's delayed finite C1 sample identifies
interval insertion as a large remaining source path. The sample binds exact
emitted bytes and includes input cloning, so it is diagnostic evidence only.
`interval_bst_insert` is an isolated ordinary-source alternative that avoids
rereading the previous successor candidate during ordered tree descent. Its
maintained BST invariant makes each later candidate no larger than the previous
one. Exact node images, root, validity and lookups match the original across
603 constructor histories and 36,000 queries. The integrated alternative passes
400 independent model histories and five-target CRDT values/errors/snapshots.
Normal planner acquisition admits 32 states and 160 observations with no
measurement rejections, selecting a rewrite plus physical plan. The full11
comparison against the read-view source on the same compiler establishes only
S2 and A2 gains of 1.2% and 0.8%. All other full intervals cross parity. Full/DT
ratios are S1 0.678, S2 0.777, S3 0.804, C1 2.134, C2 1.874, A1 2.940 and
A2 2.548. Prefix31 establishes a 1.4% C1 regression; every other interval
crosses parity. This mixed alternative is not promoted as the default. The
maintained tree proof remains required before database rewrite authority is
possible.

`libraries/proofs/successor-bound` now contains independently checked generic
unsigned-word component laws: candidate-bound guard elimination under an
explicit strict-bound condition and transitivity through an ordered descendant.
The omitted-bound version rejects in RUP replay even after its circuit identity
is recomputed; solver search also finds it false. These laws do not supply the
maintained BST invariant or concrete insertion-loop simulation.

Actual insertion-search source now also has checked root and whole-index
observer preservation, lifted over arbitrary unsigned-word loop counts and stop
predicates using the generic loop-frame theorem. The stronger component lives
under `libraries/proofs/interval-bst-index-frame`. It certifies that search leaves
the index unchanged; it does not prove initial ordering, candidate dominance or
correct predecessor/successor results.

`blocked_interval_index` is a larger ordinary-source alternative for general
disjoint half-open unsigned-word intervals. A B+ tree stores up to 32 children
per block, binary-searches block keys and retains stable entry handles with
linked neighbors. Leaf and branch splits preserve handles; direct validated
partition hints avoid a new root search when refining an interval. End zero
still denotes the maximum unsigned-word endpoint. No compiler rule is added.

Independent checks cover 90 constructor histories and 10,800 queries, including
a 2,400-entry multilevel tree, plus 120 refinement histories and 16,800 queries.
They check exact leaf/parent/index/minimum/neighbor invariants against a sorted
interval oracle. Invalid overlaps, changed-end rejection, fallback hints and the
largest key are included. Dedicated index and integrated CRDT checks pass all
five CPU targets; the integrated source also matches 400 independent text
histories. Normal planner acquisition completes with 32 admitted states, 160
observations and no rejected measurements, selecting a rewrite plus physical
plan. Full11 establishes regressions against the default read-view source:
C1/C2 5.1%/4.1%, A1/A2 5.6%/6.2% and S2 1.6%. S1/S3 intervals cross parity.
It is rejected as a performance improvement. Universal representation, mutation
and lookup proofs remain unestablished. Reports use `blocked-index-full`.

The binary-bound loop has a checked whole-index observer law. The actual outer
tree-search step's observer is checked by composing that law rather than
expanding its inner loop; direct normalization exceeded the existing work limit.
`tools/source_field_composition.py` is a bounded untrusted author using ordinary
Unfold, Congruence, Cases and Use proofs. The compiler independently checks each
dependency and source definition. A portable replay test accepts the source
observer and rejects a canonical rehashed claim that clears the root. This
component lives under `libraries/proofs/blocked-interval-search-frame`; it does
not establish ordered-tree or lookup correctness.

The composed outer-search step now also supplies an arbitrary unsigned-word
loop observer theorem under `libraries/proofs/blocked-interval-tree-search-frame`.
Explicit beta reductions discharge its transition assumption without expanding
the nested source loop. Portable tests replay both closures and reject rehashed
false-root results. Failed authoring packets remain outside the published proof
stores. The theorem still concerns index preservation only.

The rejected blocked index's exact-emission finite C1 profile retains insertion
and search as large paths, including child-index maintenance. An isolated
`incremental_blocked_interval_index` variant reindexes only children shifted by
an insertion and stops minimum propagation when its stored word is unchanged.
These source optimizations rely on maintained metadata. Structural and
refinement checks pass 27,600 queries; another 100 histories have identical
complete index images to the prior blocked implementation. Dedicated index and
integrated CRDT parity pass five CPU targets, and 400 independent text histories
match. Normal acquisition completes with 32 states, 160 observations and no
measurement rejections, selecting a rewrite plus physical plan. Full-trace
timing against the default read-view implementation establishes regressions:
C1/C2 3.2%/3.3%, A1 3.4% and A2 4.9%. Sequential intervals cross parity.
The variant is rejected as the default. Reports use `incremental-index-full`.
Unsigned same-value and suffix-length component proofs are checked separately;
they do not prove the maintained metadata or the whole-source replacement.

Actual minimum-maintenance source also has checked arbitrary-loop observers for
entry storage, child storage, root and validity under
`libraries/proofs/incremental-minimum-frames`. Nested-field observer authoring
now emits a congruence proof for each projection in the path; regression tests
cover that case. Portable closure replay and a canonical false-root rejection
check the admitted component scope. Correct block minima and safe early stopping
remain separate invariant obligations.

A separate `resolved_parent_span_graph` source alternative stages reuse of a
resolved local frontier between traversal preparation and causal-node append.
The prior source performs the same external-ID map lookup in both places.
Type and ownership checking accepts the new source. It matches 400 independent
text histories and passes CRDT values, errors and snapshots on all five CPU
targets. Normal acquisition completes with 32 states, 160 observations and no
measurement rejections, selecting a rewrite plus physical plan. Full-trace
timing establishes C1/C2 reductions of 2.3%/4.1% against the default; all other
full intervals cross parity. Full/DT ratios are S1 0.684, S2 0.787, S3 0.788,
C1 2.061, C2 1.780, A1 2.972 and A2 2.587. Prefix31 establishes C1/C2 gains
of 2.5%/3.0%, with S2 and A2-prefix regressions of 0.8%/1.3%; other intervals
cross parity. The source is retained as a measured alternative with these
tradeoffs. Integrated
source equivalence and the complete performance target remain unestablished.

`libraries/proofs/parent-resolution-fold` contains a source-bound generalized
fold simulation between two resolver carriers, with an explicit decoder. It
covers arbitrary parent lists and initial states. A canonical rehashed conclusion
that drops the parent list rejects in induction replay. The integrated frontier
reuse remains unproved: its caller must establish unchanged map contents between
preparation and causal append, and the source wrappers do not supply that fact.

Actual ordinary and checkpoint target-replay source now has checked preservation
of `walker.ends`, lifted over arbitrary bounded target loops under
`libraries/proofs/parent-target-map-frames`. Explicit nested projections leave
unrelated engine updates opaque; direct normalization exceeded the fixed work
limit. The bounded author is tested on generic nested records as well. Higher
retreat/advance and preparation loops remain separate composition obligations.

Whole `toggle_batch` observers now check for both source variants under
`libraries/proofs/parent-batch-map-frames`. Proof-only wrappers for their actual
retreat/advance transition expressions also check under
`libraries/proofs/parent-traversal-step-frames`. Rebinding a proof to the wrapper
source requires a fresh definition-context replay: a first transfer correctly
rejected changed generated loop records. These components do not yet establish
correspondence with the original caller loops or complete preparation.

Arbitrary bounded wrapper-loop observers are checked under
`libraries/proofs/parent-traversal-loop-frames`. Portable replay accepts the
component closures. The original inline caller proof currently rejects exact
application endpoints: it needs an explicit checked beta conversion to the
wrapper theorem. Pattern normalization by an authoring tool grants no authority.

Exact conversion authoring now emits checked beta/source unfolding and
congruence before Use, with explicit fresh lambda binders. The actual original
ordinary/checkpoint retreat and advance observers check under
`libraries/proofs/parent-original-traversal-frames`. Actual removed/added range
steps also check under `libraries/proofs/parent-range-step-frames`. Generic
tests cover inline/named callback conversion with colliding binder names.
Complete preparation and integrated reuse still require higher composition.

Actual bounded removed/added range-loop observers are checked under
`libraries/proofs/parent-range-loop-frames`, with complete dependency definition
contexts. Preparation composition currently rejects a generated binder proof;
its packet is unadmitted. A smaller nested-closure reproduction checks, so no
general checker change is justified by that failure. The composer retains fixed
branch limits and independently checked exact conversions.

### Validated insertion-finger candidate (timing pending)

`interval_insert_hint.ink` is an ordinary general interval-index alternative. It
uses a stable predecessor handle, validates interval boundaries and parent links,
and falls back to fused insertion when the hint does not apply. It retains the
same node priority and rotations. The integrated `insert_hint_graph.ink` remembers
the last inserted ID-range handle. No CRDT recognition was added to the compiler.

The isolated JavaScript index test matched exact tree images for 603 histories,
including stale and arbitrary hints, overlaps, zero values and the terminal u64
interval. The integrated source passed C/Rust/JavaScript/both-Wasm CRDT parity
(60.85 seconds) and 400 independent complete-document histories. Dedicated index
C/Rust/JavaScript/both-Wasm parity also passed (26.11 seconds). Maintained-tree refinement and performance evidence
are pending; these checks do not grant a database rewrite. The next acquisition
uses normal planner search with the same 32-state, 96-budget, five-prefix training
workload, followed by a paired full-trace comparison against the resolved-parent
variant on the same immutable compiler.

Portable parent-map replay now covers the range-step and range-loop closures as
well as target, batch and traversal closures. All seven closures replayed; a
canonical rehashed conclusion that replaces the preserved map with an empty map
was rejected by the exact proof checker. The two-test suite passed in 60.90
seconds. A separate authoring diagnostic located an escaped binder specifically
in a semantic `Cons` head: the untrusted beta helper handled `Op` and `Lambda`
but omitted list constructors. That helper now traverses both list head and tail,
with a regression test. All four generic composition tests passed. No compiler
semantics or proof-checker rule changed. Preparation replay is being retried and
remains unadmitted until the fixed checker accepts it.

Both actual `prepare_resolved` functions now pass exact source-field composition:
ordinary `ea0f5379ed7d63fc527d9323d55461f336d472f7eeca0fdf94c3b729eeef98c5`
and checkpoint (see `parent-preparation-map-frames/scope.json`). Their conclusions
preserve the complete ends map for arbitrary walkers, resolved parent lists and
`follows` flags. The merged portable closure is being replayed. This closes the
preparation map-frame obligation; source equality of the integrated applications
and cached resolution still needs composition with the resolver and application.
Five generic authoring regressions pass, including checked source containing a
list literal under beta substitution.

The merged `parent-preparation-map-frames` closure replayed successfully in the
fixed checker. Checkpoint law:
`738d064911c5e9d581cfb4012cd6687dfeed047acaf4633bf0783849a3c29137`.
The generic author now also traverses list constructors during guard discovery
and compositional reduction, so list nodes do not hide nested source reductions.

Resolver-map observers also check for the actual ordinary/checkpoint `resolved`
functions, for arbitrary parent lists: ordinary
`9a9b8da486002e0f9360f741b86ea96b4338cf36fd7cb0b7df89921c9e76a8ed`,
checkpoint `6c68e22ecaaa97ac0a9dc8f281c87d89b54d5798e1c4e3c0ec781c5faa9b0bcb`.
The list induction uses named copies of the actual fold transitions. Composition
then checks exact beta conversion back to the original inline callbacks; wrapper
tests alone do not grant this correspondence. These laws preserve the map, while
the resolved values and whole application correspondence remain separate goals.

The merged resolver closure passed portable replay. A well-typed, rehashed false
conclusion that replaces the map with `Map.empty()` was rejected. Receipt:
`build/crdt/parent-resolver-portable-tests.json`. Preparation's expanded replay
suite passed both tests in 82.11 seconds, including the earlier map-erasure
adversary.

Insertion-hint ascent/descent now have checked arbitrary-loop index frames under
`interval-insert-hint-frames`: `c4c6f04e77d494b032c7e301fc7113b443730fb1b3bb84ccb8f8f9fedc82c9f3`
and `e1f77b892c928b08e2623543f3e404adec032e69999703cdb970524d50347fee`.
The merged closure replayed. These do not establish maintained BST ordering or
insertion equivalence. Normal planner acquisition completed with 32 states, 160
observations and zero rejections; selected implementation
`a7edc563d58f2ab7162b29886b1474412db49baf4f8c81f5352eddd7ae532102`.
The paired full-trace run is ongoing against resolved-parent on the same compiler.

Insertion-hint full-trace comparison completed (11 rounds, complete outputs
validated). Relative to resolved-parent on the same compiler, C1 ratio is
0.9784 (95% paired interval 0.9338–0.9929), a 2.2% measured gain. C2 is
0.9794 (0.9639–1.0081), uncertain; all other control intervals include parity.
Ratios to Diamond Types: S1/S2/S3 0.6705/0.7611/0.7691; concurrent
C1/C2/A1/A2 2.0162/1.7363/2.8820/2.6262. The concurrent target remains unmet.
Reports: `insert-hint-full-controlled-results.json`, `insert-hint-full-control-ci.json`,
`insert-hint-full-diamond-ci.json` in `build/crdt`. Prefix acquisition is running
for the cross-workload regression check.

Insertion-hint prefix comparison completed (31 rounds). C1-prefix improved
0.9%, ratio 0.9910 (0.9841–0.9963); every other control interval includes
parity. This candidate is a measured C1 improvement, with no established broad
concurrent win. Prefix reports use `insert-hint-prefix-*`. The next isolated
general library candidate, `deferred_measure_updates`, accumulates same-leaf
weight changes and flushes ancestor measures at structural/observation boundaries.
It is currently unvalidated and is not part of the measured hint candidate.

The isolated deferred-weight library matched exact tree images for 160 histories,
including leaf crossings, repeated updates and wrapping totals, and passed
C/Rust/JavaScript/both-Wasm parity (33.31 seconds). Its CRDT integration flushes
before interior refinement, span splitting, leaf changes and returning a completed
target replay. The first integration failed affine admission because a nested
record update reused an engine after its tree had moved; explicit engine field
reconstruction corrected that source pattern. Integrated emission and CRDT
parity are running; the alternative has no performance or refinement claim yet.

Deferred-weight integration passed 400 independent histories across materialize,
small phases and zero phases (1,200 complete-document checks), and full
C/Rust/JavaScript/both-Wasm CRDT parity (62.54 seconds). Normal planner acquisition
has started with the same immutable compiler, 32-state budget and five 128-change
training prefixes. No performance claim is established yet.

The general u32 modular delta composition law is checked under
`deferred-modular-deltas`, identity
`73eabb3d98819a1e004fcf3f6fc135e394598bc20e954fd901457e8b4a181bcb`.
It equates two sequential `total-old+new` updates with one combined update for
all five u32 arguments, including wrapping totals. Existing normalization proves
this algebra; a SAT author exhausted its bounded search and was not admitted.
A canonical rehashed off-by-one conclusion rejects. This is arithmetic evidence,
not a maintained-tree or flush-boundary theorem.

The generic ancestor-adjustment transition now has checked bounded-loop frames
for nodes, child storage, root and endpoint handles in
`deferred-adjustment-frames`. Portable replay and a rehashed false-root rejection
passed (0.449 seconds). These are structural observations only; the correctness
of combined aggregate measures and deferred observation boundaries remains open.

The five structural observers also compose through the actual `adjusted` source
wrapper (`deferred-adjusted-source-frames`), with exact loop/source endpoints.
Its merged portable closure replayed. These facts support flush composition,
while leaving aggregate blocks opaque.

Actual deferred `flush` structural observers now check under
`deferred-flush-frames`. Portable replay accepts all five conclusions and rejects
a canonical rehashed erased-root conclusion. These do not observe blocks or prove
aggregate values. The current benchmark implementation remains frozen during
normal planner acquisition.

The external `deferred-delta-laws.ink` now has four checked arbitrary-list laws:
old/new offset accumulation, generalized combined deltas and its zero-offset bulk
instance. Explicitly generalizing all three initial accumulators makes each
induction endpoint exact; attempts using implicit rewriting rejected. Portable
closure `deferred-delta-fold` replays, and changing the bulk result by +1 rejects
(0.070-second regression test). This expands scalar pair composition to arbitrary
batches while retaining u32 modular arithmetic. It does not establish ancestor
path membership or tree-buffer correspondence.

Deferred-weight normal acquisition completed: source
`40cb830cf02c5877038b422b5ac99b31f7b2f62a2cedd51b7270f57128495929`,
selected `ee6fcbf98f04809f10ed75d971916045ed22cbe1d75e8e9eac3d0895f74244d5`,
32 admitted states, 160 observations and zero rejections. Full11 paired timing
is running against insertion-hint on the same immutable compiler. The planner
selects implementation choices within the manually authored source alternative;
this is not an admitted rewrite from insertion-hint to deferred weights.

Two further general indexed-update laws check under `indexed-update-composition`:
repeated writes at the same index retain the last value, and writing back the
original observed value preserves the list. Both include the fixed out-of-range
no-op behavior. A changed overwrite conclusion rejects. These support buffer
update composition without adding a compiler optimization rule. A proposed
read-after-write law using wrapped list length did not normalize and was omitted;
the public language has no `has_index` method, so that attempted source also
rejected. Only the two admitted laws are published.

Deferred-weight full11 completed with complete outputs validated. Relative to
insertion-hint on the same compiler, C2 regresses 3.0%, ratio 1.0295
(1.0047–1.0515), and A2 regresses 7.6%, ratio 1.0758 (1.0561–1.1460).
Every other control interval includes parity. This candidate is rejected as the
default; no prefix run is needed to establish profitability. Its proofs and
adverse result remain available. Reports use `deferred-weight-full-*`.
Diamond ratios in this acquisition: 0.6613/0.7634/0.7940/2.1087/1.8194/3.0253/2.7790.
These do not replace insertion-hint's accepted control evidence.

Selected Rust emission inspection found no engine/tree/buffer owner clones in
`flushed_toggle`, `toggle_step` or `toggle`. Clone syntax applies to scalars and
the scalar Span record. The deferred regression therefore is not explained by
a newly copied tree in these functions. Flush frequency and extra validation
work remain hypotheses requiring a diagnostic profile.

A separate instrumented build of the exact selected deferred emission counted
update calls and nonempty flushes (no timing claim). C1 has 239,000 calls and
223,808 flushes (1.068 calls/flush); C2 287,750/280,196 (1.027); A1
242,918/195,545 (1.242); A2 735,480/509,319 (1.444). Calls include unchanged
weights. This confirms little amortization across per-target boundaries. A new
`batch_deferred_graph` candidate carries pending changes across targets within
a batch, retaining structural/refinement flushes and an end-of-batch flush.
It is unmeasured and still undergoing correctness checks.

The final batch-deferred source passed 400 independent histories on materialize,
small phases and zero phases (1,200 complete-document checks). Mandatory CPU
parity is still running. The validated diagnostic now binds the original selected
emission hash and verifies complete expected outputs where supplied. A proposed
stable-start comparison simplification failed ordinary normalization and remains
an unadmitted diagnostic outside the libraries. It grants no rewrite authority.

Final batch-deferred mandatory C/Rust/JavaScript/both-Wasm parity completed
successfully (see `batch-deferred-final-crdt-parity.log`). Normal planner
acquisition is now running with the same compiler and training budget; full
performance comparison will use insertion-hint as control.

Actual ordinary and checkpoint resolver values now have source-bound equality
under `parent-resolver-values`. Their returned parent list equals ordered
`get_or(parent,0)` lookups in the original ends map, for arbitrary walker and
parent list. Ordinary law `7ddbaee39593d1fcc130b7f87c3d8fb4153aace2e45e7648b1da5a1c0c3d0e76`;
checkpoint `446d592eeb4e280fd0d720fb3f795c15d434636129707ebdc31a0170266b5a21`.
The generic untrusted fold author supports typed item projections and preserved
initial-state projections; the composer accepts explicit equation endpoints with
bounded final normalization. Every resulting packet still replays in the fixed
checker. Portable value closure plus rehashed dropped-parent conclusion tests
passed (1.426 seconds); generic wrong projection and false equation tests reject.
Field-preservation mode retains its dependency contract and does not use the new
normalization fallback. Full integrated application and FugueMax refinement remain
separate composition obligations.

The ordinary actual-source wrapper equation now checks that resolved parent
values before `prepare_resolved` equal those afterward, for arbitrary walker,
input parent list, local preparation frontier and follows flag. Law
`3bb0ba620114e811a484a2a60662dba9dafacb4ee22dbdcd1f6f56c5a46992cf`.
The composer opens callback binders with fresh variables, applies exact checked
dependencies and closes them hygienically. Earlier attempts exceeded the fixed
checker work limit; no limit was changed. Seven generic composition tests pass,
including an assertion that the callback proof actually uses its checked field
dependency. Checkpoint composition is running. This source equation closes reuse
across preparation; complete application and representation refinement still
require further composition.

Checkpoint resolution-across-preparation also checks, law
`f8cd20eb4b2ff10378d8d9126b12bf335a7b25f2d702f504334e6187dbbbc468`.
A combined closure exceeded the fixed catalogue byte limit and was moved outside
knowledge as an unadmitted diagnostic. The two independently complete closures
are saved under `parent-ordinary-preparation-resolution` and
`parent-checkpoint-preparation-resolution`; separate portable replay and an
adversarial dropped-parent conclusion are running. No resource limit changed.

Batch-deferred normal acquisition completed: source
`09e48d40a6baa94fc3df4b3bfd2b370165608dbe030d07695912b855293148d8`,
selected `758b49519d7a81aa7544bcb62f55c119bc3267754e95c00b59d9c2c533ee0a91`,
32 states, 160 observations, zero rejections. Full11 acquisition is running
against insertion-hint on the same compiler.

Separate portable replay accepted both resolution-across-preparation closures.
An adversary retaining the original long proof but dropping the result list was
rejected at the fixed proof work limit; that is fail-closed evidence, not a
specific semantic counterexample. The targeted regression instead requests one
exact unfold to the false empty result, for direct endpoint rejection. It is
being replayed with the two positive closures.

The separate resolution-across-preparation portable regression completed: both
positive closures replay and the false empty-output exact-unfold conclusion
rejects. See `parent-preparation-resolution-tests.log` for the completed run.

Batch-deferred full11 completed with full outputs validated. Against insertion
hint, C1/C2/A1/A2 ratios are 1.0480 (1.0357–1.0660), 1.0497
(1.0423–1.0582), 1.0701 (1.0584–1.0747), 1.1232 (1.1088–1.1296).
All sequential intervals include parity. The batch variant is rejected as the
default; no prefix acquisition is needed. Reports use `batch-deferred-full-*`.
The retained insertion-hint implementation remains the control. Broader pending
carriers do not justify more deferred-weight variants without new evidence.

A new general `bucket_interval_index` forest shares stable global node storage
while indexing roots by the high 32 bits of each u64 key. It accepts only intervals
contained in one bucket. CRDT engine IDs already have that boundary restriction;
the global operation-overlap validation remains unchanged. The isolated index
passed 180 histories/126,000 independent membership queries, 21 refinement
histories including max-u64, and all five CPU targets (33.64 seconds). Integrated
`bucket_graph` passed 400 histories/1,200 full-document checks and five-target
CRDT parity (70.52 seconds). Normal planner acquisition is running with the
same compiler/budget/workload. No performance or maintained-forest proof claim.

The bucket-domain arithmetic is source-bound and RUP-checked under
`bucket-interval-domain`, law
`06c4683360b53bcb8e92d703c3cfa057996f490e1a01be1b0054abd32dab5eba`.
For arbitrary u64 start and nonzero u32 width, the explicit low-word sum bound
implies both interval endpoints remain in the same high-word bucket, including
the terminal end wrapping to zero. Removing the premise and rehashing rejects;
start 2^32−1 with width 2 is an executable crossing counterexample. This is a
domain fact, not a maintained-forest or full insertion refinement theorem.

Actual bucket lookup has checked source observers for nodes, roots and validity
under `bucket-lookup-frames`. The imported cursor-owner proof first rejected an
example-record context mismatch; all dependency identities were rebound to the
actual core and replayed before composition. The final equation composer now
proposes structural congruence at remaining matching heads, keeping large record
fields opaque; seven generic regressions pass. No lookup-answer or forest
invariant theorem follows from these observer laws.

Whole bucket-index reconstruction remains unadmitted: direct normalization
failed, and composition of all three field observers exceeded the fixed proof
work limit. Only the three individually checked source fields are published.
The failed whole-owner packet remains in build diagnostics. No checker limit or
proof rule changed. Portable field replay and a rehashed validity change are
being tested.

Independent bucket lookup validation now includes 140 histories/84,000 queries
with stale and cross-bucket hints (`bucket-hinted-random-tests.json`). The isolated
example gained a query interface; benchmark imports remain frozen. The source-bound
RUP domain theorem `aec23c694c90a01c2ec1735c08623df1b16d89d8f4712d0876b0eb8247a0aeb4`
checks that contained intervals split at strict interior cuts retain containment
in both subintervals, including end zero. It is saved in `bucket-partition-domain`.
This supplies interval arithmetic, while tree links/search refinement remain open.

`tools/crdt/bucket_interval_test.mjs` now provides the saved reproducible
84,000-query stale-hint and 21-history refinement oracle, including boundary
rejection. It passed against the compiled isolated example. Training remains
five 128-change prefixes; full-trace held-out comparison is still pending.

Live bucket acquisition's first 30 emitted plans include ordinary extension,
rewrite and physical implementation steps. The bucket algorithm remains a
manually authored source alternative; planner search explores checked choices
within it. This observation does not establish automatic discovery of the
maintained forest replacement from the original library.

Bucket normal planner acquisition completed: 32 admitted states, 160 observations,
zero rejections; source `4ea199f786d3dfa844c3bc5679f19d2ae8f4ad74e2f4c84952c73b54fb7ae617`,
selected `a55c7d574b1900f8bbff3f495bbaf837d90654049dc0e5f22cb6a30aa3ab44ba`.
Full11 held-out paired acquisition is running against insertion-hint with the
same immutable compiler. There is no bucket performance gain established yet.

Bucket full11 completed and validated full outputs. Against insertion-hint,
C1/C2/A1/A2 ratios are 1.0506 (1.0393–1.0574), 1.0431
(1.0179–1.0515), 1.0624 (1.0216–1.0678), 1.0891 (1.0809–1.0996):
all regress. Sequential intervals include parity. The bucket forest is rejected
as default; no prefix run is needed. Reports use `bucket-full-*`. A finite
structural audit of 160 forests/40,000 nodes also passed reachability, parent
reciprocity, heap priorities, interval ordering and bucket isolation. This does
not prove the invariant universally. Additional bucket-map lookup/update cost
remains a diagnostic hypothesis; the accepted insertion-hint control is retained.

Exact bucket emission performs the bucket-root map lookup before testing a
valid cached interval handle. A new `lazy_bucket_interval_index` source alternative
tests interval membership first and only looks up the bucket root on a miss.
This removes that map operation from successful cached queries; it does not
claim that the rejected forest becomes profitable. Its isolated 84,000-query
stale-hint/refinement runner passed; integrated checks are running.

Lazy bucket-root integrated validation passed 400 independent histories across
three execution paths (1,200 document checks). Five-target parity is still
running; normal planner acquisition has not started. The rejected original
bucket result remains the control evidence until a new paired run establishes
the changed implementation's profitability.

Lazy bucket-root CRDT parity passed across C/Rust/JavaScript/both-Wasm
(60.10 seconds). Normal planner acquisition is now running with the unchanged
compiler and training budget. No performance claim is established.

The actual cursor hint-hit branch is checked under its exact source predicate
(`cursor-hint-hit`, law `dd276befd3f921308675900cd9ab30600154a8d0068049e3d8f7bd42815481fd`).
It equates the direct answer with cursor lookup only when the hint validates.
Removing the premise is rejected at the fixed proof work limit; an executable
invalid-hint example separately shows unequal answers. Whole eager/lazy bucket
lookup equality exceeded the fixed proof-work limit and remains unadmitted in
build diagnostics. No checker change or blanket rewrite follows.

The cursor-hit portable proof and concrete missing-guard counterexample passed
the saved regression suite. The source example now exposes only scalar results
from invocation-internal buffers; an initial attempt to pass Buffer storage
through the JavaScript public boundary correctly rejected. The published proof
continues to bind its saved exact core, and the added test wrapper grants no
automatic transfer to different source images.

Shared-carrier eager/lazy bucket lookup equality now checks, law
`0be52c0e5c91282268d96b63a606283df9b0e72133654b6fcd8b9f51acfe8658`,
under `lazy-bucket-lookup-equivalence`. The untrusted pair author gained bounded
explicit unfolding for shared helpers and structural reflexivity for untouched
branches. It exposes the actual shared cursor's guard without normalizing its
search loop. Two generic tests pass, including a huge opaque loop in the unused
branch. This theorem uses the original bucket carrier; correspondence to the
separately named lazy library and the forest invariant remain separate.

Actual named-record codec round trip is checked under `lazy-bucket-named-codec`,
`5ed17269544d4a96b848792d14aba9f92663a4ac888d002d6e3c3b5571b7b5ab`:
decoding the encoded index returns the original arbitrary index. Portable replay
passed. Full eager lookup versus decoded actual lazy lookup exhausted the
untrusted author's 256 and 512 step bounds and remains unadmitted. This is a
search limitation; no proof rule or fixed checker limit changed.

Reverse named codec round trip also checks and replays portably:
`0823e5d49bd4c8ddd0ea0d74ddc4d53d6f548fa119aded6df381c0472d8ab8a6`
under `lazy-bucket-named-reverse-codec`. Both carrier directions retain nodes,
roots and validity for arbitrary input records. This does not supply lookup
transport automatically.

Both named-codec closures passed the saved portable regression; replacing
validity with false in the source causes proof rejection. The test's initial
temporary import path failed before checking and was corrected to exact library
paths; the corrected suite passed in 0.859 seconds. Full lookup transport is
still unadmitted.

A smaller named transport observer attempt also failed publication: the value
equality's generated proof exceeded the canonical object nesting limit. It
remains unadmitted; no canonical or checker limit was increased. The existing
shared-carrier equality and both named codec round trips are the admitted scope.
Further transport needs smaller intermediate lemmas or flatter proof authoring.

Lazy-root normal acquisition completed: 32 states, 160 observations and no
rejections; selected `38d1dfd433156050a90a43e0cfcb3315c923869206e62f48e63f2964c6234cc7`
for source `0b13eea19da144ce322a6abe926f3f5aeee9749c02145bcd61698c6d3885be15`.
Full11 held-out paired acquisition is running against insertion-hint on the same
compiler. No timing improvement is established yet.

The lazy bucket candidate completed its eleven-round controlled full-trace run. Compared with the accepted insertion-hint implementation it increased concurrent elapsed time by 4.5%, 3.8%, 7.3%, and 9.7%; all four paired 95% intervals exclude parity. Sequential differences were inconclusive. The candidate is rejected, and no prefix confirmation is warranted. Receipts: `build/crdt/lazy-bucket-full-controlled-results.json`, `lazy-bucket-full-control-ci.json`, and `lazy-bucket-full-diamond-ci.json`. The separate named body-transport proof attempt exceeded the unchanged semantic work/depth limit and is unadmitted.

A separate `dual_hint` source variant applies the existing general stable insertion finger to the operation-identity overlap index as well as the text-span index. The ordinary and checkpoint walkers carry the previous allocation handle; phase preparation carries its own handle. Failed validation retains the fused root-search fallback. The helper still requires the maintained BST invariant for its universal equivalence proof. Exact maintained tree images pass 603 histories, five CPU targets pass the phased value/error/snapshot suite (62.41s), and independent list/ancestor-set validation passes the 304 existing phased histories plus 400 additional histories/1,200 result checks. No performance claim yet: normal 32-state planner acquisition is running against the existing five training prefixes.

The dual insertion-hint normal planner acquisition completed with 32 states, 160 observations and no acquisition rejection, using the unchanged E1ade compiler. Selected plan `44400e779eae222363c2296d906fc23489eb67c838a114d8d0618b0e70ad64e9` binds source `526c2c2ad4661ab1e8a8c47606329a4a9e0055e1c175b452f0eb11018372e901`. Full11 against insertion-hint control establishes C2 1.1% and A1 5.4% elapsed-time reductions; all other intervals cross parity. Full/DT ratios are S1 0.6726, S2 0.7678, S3 0.7796, C1 1.9837, C2 1.7394, A1 2.7528 and A2 2.5143. Prefix31 confirmation is running; no broad promotion yet. Reports use `dual-hint-full` and `dual-hint-prefix`.

Dual-hint prefix31 completed. A1-prefix improves 2.4% (ratio .9765, 95% .9624–.9915) and A2-prefix 3.9% (.9607, .9529–.9694); other intervals cross parity, including C2-prefix .9875 (.9698–1.0003). Full A1 and C2 gains plus absence of supported regressions justify retaining dual-hint as the next measured control; profitability remains workload-specific, not a universal source rewrite. Full/DT concurrent ratios remain 1.9837/1.7394/2.7528/2.5143. The complete target is unmet.

A fresh finite A1 profile binds the exact accepted dual-hint emitted bytes and validates the full expected output before sampling. The largest sampled Ink function is checkpoint visibility `toggle_batch`; gap insertion, seek and interval attachment are also prominent. `tools/crdt/profile_native.py` makes this diagnostic reproducible and retains code/executable/input hashes; input cloning is included and these samples are not benchmark evidence. An `engine_pass` source alternative moves only Engine/index/end through the target replay loop, retains targets as an immutable view and reconstructs the unaffected walker fields once. Profitability and actual stopping-loop simulation remain required.

Target replay projection now has two checked concrete source premises: encoded target-buffer step equality `bedc5c84d60be13dc039309cf7a66d44db11e17daf0ebf41ce8fdb9b3151431b` and stop equality `d30edb73bb5e944d715877353314927ae46468e11f9d6eda40d6120851756d07`, published separately under `target-carrier-encoded-step` and `target-carrier-stop`. The domain explicitly reconstructs the target buffer from an arbitrary immutable target list. The arbitrary opaque-buffer version remains unproved: existing normalization does not relate an opaque buffer lookup to lookup through freeze. The untrusted pair author now refuses structural congruence between unlike child sorts; two generic regressions pass (0.317s), with no checker change. A whole replay-loop proof must preserve the target encoding and compose both step/stop facts.

The smaller engine carrier normal acquisition admits 32 states and 160 observations with no measurement rejection, on the same E1ade compiler. Plan `dea2cf37063bebcd3f24a12d04492d897c6e2f3e5af9a77f3fd0e64ad2bda032` binds source `87c7966707175ffcfb0b8a9df1228515f2485c321e4e3199fd3364e7b7120242`. Full11 evaluation against dual-hint control is running. A context-preserving source wrapper was added for proof authoring; direct and dependency-composed transition checks exceeded the unchanged semantic work/depth bound and remain unadmitted. The earlier encoded step/stop premises and generic indexed projection theorem remain checked, but whole-loop source equivalence is still open.

Engine-pass full11 completed with complete output validation. Relative to dual-hint control, A1 improves 5.1% (ratio .9485, 95% .9398–.9654) and A2 improves 7.3% (.9266, .9153–.9572); all other intervals cross parity. Full/DT ratios are S1 .6843, S2 .7626, S3 .7786, C1 1.9617, C2 1.7492, A1 2.6352 and A2 2.2864. Prefix31 confirmation is running; whole-loop proof and complete performance target remain open. Receipts use `engine-pass-full`/`engine-pass-prefix`.

Engine-pass prefix31 supports C1-prefix 2.6% (.9736, 95% .9632–.9820), C2-prefix 1.1% (.9887, .9806–.9984) and A2-prefix 1.9% (.9814, .9750–.9882) elapsed-time reductions. Other intervals cross parity, including the A1-prefix point regression 1.0123 (.9962–1.0239). Retain engine-pass as the next measured control based on full A1/A2 and prefix C1/C2/A2 gains with no established regression. No universal rewrite/default claim follows. Full/DT concurrent elapsed ratios remain 1.9617/1.7492/2.6352/2.2864.

A `whole_target` source alternative validates a stable target slot, exact start identity and full fragment length, nonzero work, clean engine error and valid deletion decrement before updating the span/measure once. Other cases retain the prior split-and-walk replay. Five CPU targets pass phased values/errors/exact snapshots (63.15s), and 304 independent phased histories pass (33.769s). A first guarded-step source equality attempt exhausted the untrusted branch-discovery budget; no proof is admitted. Whole workload profitability and universal preservation remain required.

The shortcut lookup proof now has an actual `refinement_span.covers` bitvector lemma: every nonempty u32-length span contains its own u64 start, law `b9410c29107bfd7b0cd422ec9fe3e6975e4c237b1b626cd0010720aba6832911` under `span-start-membership`. It replays the unchanged hinted-RUP verifier. Removing the nonzero premise rejects and the maximum-u64 start with zero extent evaluates false (portable regression 0.059s). A plain Normalize attempt was rejected and retained; the complete guarded target transition remains unadmitted.

Guarded fragment start lookup now checks as actual source equality `d211db6c01aef5cf805ddddf649fef6bf16f1864cab67e965472f746882e7a60`, under `fragment-location-start`. It composes the checked general zero-offset word theorem `5c914c0efbd0897d45ed70dbd672e714bc2f5d0a62ee9f57c6fdc772109c1b50` with exact source unfolds/guard branches. For arbitrary engines, the explicit stable-slot bounds and covers guard yield the original engine, slot, zero offset/rank/hint. Portable replay passes and dropping the arithmetic proof dependency rejects (1.004s). This proves one lookup relation, not refined splitting or the whole target transition. The untrusted pair author accepts an explicit typed Boolean guard, preserving ordinary checked Cases and unchanged work limits; its two generic regressions pass.

Whole-target acquisition completed with 32 states/160 observations and no rejection on E1ade, plan `816f2fcf9087383c7469d0536889574b4c175d0a8510f892a53e9dea73d1266c`, source `fc32855fe2c63588f24832b7ad544f8833db92b7654d1b9f0cf67df9499dfeb2`. Full11 comparison against engine-pass is running. Correcting source context and the required law marker allowed the refined adapter proof to reach semantic checking, where it exceeded the unchanged work/depth limit; it remains unadmitted. The checked fragment lookup and zero-offset lemmas remain valid separate results.

Whole-target full11 completed and validated full outputs. Relative to engine-pass, C1 .9723 (.9625–.9798), C2 .9676 (.9344–.9718), A1 .9403 (.9367–.9482) and A2 .9049 (.9000–.9181) establish 2.8%, 3.2%, 6.0% and 9.5% elapsed reductions. Sequential intervals cross parity. Full/DT ratios are .6775/.7901/.7904/1.9369/1.6610/2.4753/2.0608. Prefix31 confirmation is running. The performance target and full shortcut equivalence remain unmet.

Whole-target prefix31 completed: C1-prefix .9662 (.9503–.9759), C2-prefix .9603 (.9457–.9824), A2-prefix .9856 (.9747–.9988) support gains; remaining intervals cross parity, including A1-prefix 1.0033 (.9900–1.0312). Retain whole-target as next measured control, with full concurrent gains and no established prefix regression. Universal whole-target proof remains unadmitted.

`bulk_copy_gap_sequence` is an ordinary source alternative: it appends insertion values after existing storage, copies that range into the reserved gap using snapshot `copy_within`, then truncates the temporary suffix. Growth uses `append(buffer_fill(...))`. Explicit capacity-overflow/malformed guards retain the scalar fallback. Five CPU targets pass exact phased values/errors/snapshots (63.00s), 304 independent histories pass (35.239s), and the general gap test covers 121 histories, movement/growth/empty chunks, malformed fallback and a 200,000-element insertion (0.845s). A first general empty-overwrite proof attempt was rejected and retained outside the library catalogue; no universal bulk rewrite is admitted. Profitability still requires planner/full-trace measurement.

`tools/crdt/audit_comparison.py` checks full/prefix report consistency, exact compiler/source/plan/receipt hashes, candidate acquisition coverage, all seven fixtures/three variants, positive 11/31 sample counts, median calculations, complete output lengths and the pinned upstream Git revision. It distinguishes supplied full-trace expected text from native-DT concurrent-prefix oracles. The accepted whole-target artifact audit passes; a forged output length fails before writing an audit receipt. Complete current source/plan replays for both candidate and control also pass, authenticating imported module meanings against the current compiler. This audit is provenance validation, not a new timing acquisition or convergence proof.

`bulk-growth-laws.ink` supplies checked general decoded equalities for appending a filled buffer and zero growth. The zero-growth proof composes an explicit right-empty list induction law. Portable positive replay and missing-fill/nonzero-growth false variants pass/reject respectively (0.024s), under the optional `bulk-growth` proof database. These observations do not prove the full gap overwrite or capacity invariant.

Bulk-copy normal acquisition completed with 32 states, 160 observations and no rejection on E1ade; selected candidate `0d5e0e453eb5dfde1aaeaad82e29b2b9b13ae20b935a72cfb6bb344fe36ce19d` binds source `5d4f4b4ed0a2e86c3c69b7dfcec190760756af1653cfede0ec01f76ff0e7b403`. Full11 intervals show sequential S1/S2 gains of 4.1%/2.7% against whole-target; all concurrent intervals cross parity. Prefix31 confirmation is running. No concurrent performance improvement is claimed.

Bulk-copy prefix31 shows S1/S2/S3 gains (ratios .9574/.9883/.9921), A1-prefix .9786 (.9633–.9915), but C1-prefix regresses .6% (1.0060, 1.0004–1.0141). Remaining concurrent intervals cross parity. Keep whole-target `816f...` as the accepted concurrent-performance control; retain bulk-copy as measured experimental evidence. It has no established full concurrent benefit.
