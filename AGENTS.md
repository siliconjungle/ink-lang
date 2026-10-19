# Ink architecture

Ink separates program meaning from accumulated implementation knowledge.
Keep fixed primitive semantics and general checking in `core/src`. Core growth
should unlock a disproportionately larger space of reusable implementation
knowledge; absolute core size is not the objective. Prefer composable mechanisms
over one new compiler case per optimisation. Optimisation
laws, work skipping, range specialisations, maintained representations and layout
alternatives belong in the independently pinned `ink-knowledge` database.
No target matcher, theorem whitelist or hash may grant rewrite authority.

Stateful JavaScript may execute eligible pure helpers with native F32 carriers
through typed private bridges. State/actions, keeps, events, equality and portable
snapshots retain exact bits; preserve eager captured ingress and normalize only
where its ABI requires it. Unsupported owned/recursive float bridges retain the
bit lane. This literal machinery grants no arithmetic rewrite or profitable
selection authority. See docs/stateful-native-f32.md and its exact-history tests.

Fixed keep retention is implementation machinery: checked effects derive root
dependencies, concrete mutations invalidate them, and failed actions restore cache
before-images. JavaScript host rollback restores its prior private cache image;
native rollback and explicit restore discard auxiliary caches. Structured immutable
values may be retained; owned Buffer/Map descendants remain ineligible. Public
results must remain detached and pure callees must not acquire unique ownership
of shared inputs. This preserves deterministic evaluation of the same source; it
grants no algebraic replacement or maintained-layout authority. Value-state defaults
may reference explicit keeps only through the checked state-independent preparation
domain: transitive state/action access rejects, pure functions remain checked, and
fresh scopes prevent callback capture. Carry derived reads through complete
interfaces, retain strict fallback evaluation and keep legacy source identities
unchanged when the new form is unused. This grants no automatic profitable staging.
More selective
state/field/algorithm replacements continue to require database proofs.

The distribution pins Rust, JavaScript, Wasm and GPU lowering packages.
Each backend emits checked programs literally and reports unsupported capabilities.
General visitors, lexical binding and expression limits belong in core analysis.
A new primitive needs general semantics, explicit trust documentation and meaningful
adversarial and cross-target validation. `foldr` and `fold_until` have distinct fixed
iteration semantics; proofs selecting early termination stay in the database.

Every backend uses `ink-abi`. It owns value descriptors, packed layouts,
and the shared host decision contract. Browser hosts run the same Rust decision
and workload-feature code through Wasm; do not duplicate those algorithms.
`ink-native-support` owns emitted value/ownership primitives and state exports.
Keep dynamic and typed representations separate where their contracts differ.
The independently implemented reference evaluator stays in core.

Planner search and model fitting belong in `ink-planner`. Structural prices,
immutable measurements and fitted models live in knowledge. Runtime executes
already eligible implementations, applies the common decision contract, enforces
resource limits and falls back on device failure. Runtime does not run profitability
probes. Missing comparable evidence retains the compiled CPU baseline, including
plans made only of checked maintained folds. At James's request the former
asymptotic-dominance exception is removed: equal asymptotic write cost does not
establish profitable setup, constants, memory or migration. Use comparable
lifecycle evidence or an admitted validated work model for every automatic choice.
Correctness, applicability and profitability are separate gates.

Legacy aggregate certificates, bounded cache/narrowing, typed storage policies,
source maintenance evaluators and historical scalar loaders are removed.
Do not restore compatibility flags, experiment admission paths or obsolete APIs.
Archived evidence may remain as data; current tooling uses current contracts.

Core must build without the knowledge checkout or any backend. Integration uses
exact independent repository revisions; never silently select the latest catalogue.
Canonical entries and snapshots are the storage contract. SQLite is a disposable
index. Check proof bytes locally: pins, observations and profiles are not proof.

Source image checks bind complete modules and typed values, not interpreter meaning.
Selection binds exact source and checks applicable equality proofs. Physical
representations additionally require universal source/action preservation and
checked encode/decode or migration. Keep each admitted proof domain and its
remaining limitations explicit; tests do not prove backend correctness.

Validate reference/native/JavaScript/Wasm values, errors, events and exact snapshots
when changing semantics or generated support. Exercise actual eligible GPU work.
Ordered parallel map has sequential value semantics. Grain and worker counts are
scheduling hints; owned captures, recursion and scratch bounds remain checked.
GPU feedback preserves simultaneous assignment and bounded capacity. Resource
failure retains CPU execution. Do not make performance claims from conformance.

Editor support and schema evolution remain outside James's requested scope.
Installation, diagnostics, durable snapshots, transaction rollback, recovery and
portable logical state remain in scope. Keep broader proof ambitions distinct from
what is currently admitted; see PLAN.md and the domain-specific docs.

Source correspondence covers the admitted scalar, collection, vector and pure closure domains. Preserve fail-closed unsupported keys/operators and standalone representation conformance across CPU, JavaScript, Wasm and both GPU hosts. Recursive physical state executes on the host. Keep caller-trusted standalone calls and explicit checked codec boundaries distinct; benchmark checking, compilation, migration and steady state separately.

The generic stateful representation executor, research bundle adapters and per-call
logical snapshot validation are removed. Do not restore them under a new name.
Compilation checks representation/bridge proofs; ordinary compiled state retains
transaction semantics and portable checkpoint/restore migration.

Generic surface elaboration now lives in core/src/surface.rs. Type/constant
parameters, payload enums, exhaustive matching, fixed shapes, finite loops and
nonescaping pure callbacks elaborate into existing values/records/sums and checked
lexical bindings. Preserve hygienic names, explicit resource bounds and normal
purity/ownership/descent checks; template provenance grants no authority. New
value operations bind executable-core V8; action Bind/fold bind typed-actions V3.
Algorithms/laws remain in ink-knowledge (libraries and finite-list producer).
Do not restore the JavaScript fold shortcut. Keep docs/generic-language-foundations.md
coverage, source/transport limits and remaining machinery explicit. Both new
mandatory CPU suites include complete Rust/JS/Wasm comparisons; GPU host
fallback does not close the broad GPU gap.

Fallible requires/ensures clauses erase to checked readonly callbacks, lazy branches
and hygienic result bindings. Preserve declaration order, original parameter
captures, single result evaluation, explicit Result errors and transaction rollback.
They are validations, not static assumptions. External emit-laws authoring must
check ordinary canonical laws, explicit conditions/dependencies and portable
definition contexts; executable source still rejects inline rewrites and `law`
declarations. `law` is the one source form for laws (`rewrite` is its concrete
case); general laws (type parameters, assumptions) carry ink-general-laws-v1
and reach programs only through concrete instances that prove their assumptions. Exact Int
correspondence uses the same bounded polynomial machinery with exact coefficients,
never wrapping coefficients. Keep finite laws and authored algorithms in knowledge.

Scoped native/JavaScript buffers share disjoint logical ranges. Preserve affine
source admission, range-bounded writes, ordered compaction and detachment before
partial-range growth. Adjacent rejoining may reuse the allocation; a remaining
range may require materialisation. Opaque native handles share invocation-local
storage; typed owners retain direct vectors until partitioned. Runtime must embed
ink-native-support ownership primitives, never the independent reference evaluator.
Keep partition algorithms in knowledge and measure whole-workload profitability
separately from clone/allocation mechanism checks.

Bulk `Buffer.fill_range` and `copy_within` bind executable-core V9. Keep fixed
clipped/snapshot meanings and independent reference execution in core. Preserve
affine admission, left-to-right argument evaluation and scoped partition bounds;
range arithmetic must not wrap. The kernel's recursive list meanings are fixed
semantics, not optimisation recognisers. Zero/empty work elimination and length
invariants remain ordinary database laws. Voxel/codec/ECS algorithms stay in
knowledge libraries. New range operations have CPU execution/GPU-host fallback;
real eligible numeric dispatch does not imply device range support. See
`docs/bulk-buffer-workloads.md` and the mandatory generic_libraries coverage.

General final-use facts live in core/src/last_use.rs and refer only to the borrowed
expression tree. Preserve fresh lexical identities, evaluation order, conservative
branch handling and sharing of repeated callback captures. Rust literal emission
may move final-use values; no domain matcher or equality rule follows from these
facts. Keep real upstream benchmarks and lifecycle/output-size controls in
bench/competitive-workloads; measured voxel/codec algorithms remain knowledge
libraries. Formats and performance observations never grant rewrite authority.

Source physical capabilities now include optional direct Buffer owners and checked
flat scalar columns on Rust/Rust-Wasm. Bounds and unchanged-field certificates bind
an exact module, function and child path; source aliases retain numeric types and
wrapping semantics. RUP verification, existing semantic equality and inductive
codec round trips are mandatory; rehashing metadata never grants access or permits
skipping a write. Layout codecs are fixed source-shape meanings; solver search,
proof construction, layout proposals and fusion specialise in ink-knowledge.
Packed lanes widen on values that do not fit and preserve raw float bits in plain
lanes. Profiles rank replayed candidates only; absent comparable lifecycle evidence
retains the baseline. Unsupported target selections must fail explicitly. Physical
planning does not change executable-core V9 or public serialisation formats.

Maintained source folds use ink-maintained-fold-v1: exact source factorisation,
commutative group laws and insertion/deletion/replacement equations replay in core.
Contributions and group operations remain database definitions, emitted literally.
The fixed native cell/fold controller and codecs remain trusted; this is not whole
compiler correctness. Restore rebuilds folds from validated rows and rollback
restores before-images. Dense prefixes require exact fallback outside their range.
Single-cell bounds and fresh-result ownership facts are structural core analyses,
never algorithm authority. Maintained group folds run on JavaScript, Rust and
Rust-Wasm; word extremum views (max/min, checked against the fixed comparison) and
grouped one-parameter query views run on Rust and Rust-Wasm; dense prefixes are
JavaScript only; unsupported targets fail explicitly. State lifecycle measurements require
independent source histories, exact snapshots, fresh processes and held-out traces.

Measure generalisation, not entry count. Evaluate knowledge changes on the frozen
`bench/planning-corpus` (programs enter before laws aimed at them) with
`ink_planner.corpus`, and report the funnel, near misses and cross-program reuse.
Compiled planning publishes candidates into the knowledge root it is given, so
evaluations run against a private copy. Near-miss receipts, corpus and knowledge
health reports, and `tools/action_algebra.py` relations are untrusted
observations: never proof premises, applicability hints for admission, or
selection authority. Structure laws (general laws with assumptions about a whole
fold step) reach programs only through plan-time instances admitted by
`knowledge-check`; keep that library free of carrier-, operator- or
program-specific statements. A commutation claim needs a checked whole-action
equality of the swapped pair, not the access analysis.

Finish completed, validated work by merging and publishing it on `main` in the
distribution and every changed independent package repository. Report the verified
main revision. When a pin bump changes a crate another pinned crate depends on
(for example, runtime pins the Rust lowering), refresh `runtime/Cargo.lock` in the same
change (`cargo metadata` without `--locked`); CI's locked fetch fails otherwise. Also refresh
other tracked package locks, including JavaScript, and check them with `cargo fetch
--locked` before publication.
When core changes, publish its matching standalone package and update the current
root `core-package.json` receipt. CI compares its tree with `HEAD:core` and tests
that exact private package. Historical report receipts and their test logs retain
their original source/package identities.
A run is verified only when every job finishes green; failing steps report their
error lines as annotations (`tools/ci_step.sh`). Feature branches and worktrees are staging areas during active work;
keep work isolated when James explicitly requests a draft or separate branch.

Executable core V11 adds fixed F32 sqrt/division, explicit conversion, classification,
named rounding, fixed-width counts and UTF-8 byte operations. Preserve exact
rounding, canonical arithmetic NaNs, raw reinterpretation and fallible boundaries.
Derived math/text algorithms and bounded approximations remain knowledge source;
never substitute them for exact computation without ordinary equality authority.
GPU numeric operations use integer lanes; host fallback is not device coverage.
See docs/numeric-text-primitives.md and its required cross-target suites.

Executable core V14 binds immutable typed initial rows in Program.frozen, outside
erasable proof metadata. Preserve existing source identities when bindings are
empty. Frozen roots have no writer or trainable capability; every restore boundary
must compare their exact typed rows, including raw F32 bits. Initial invariant and
sorted-state obligations use declared rows. Transition-domain equalities derive
from these checked source bindings, never producer hints. Legacy action-IR callers
reject frozen modules until they explicitly support initialization and restore.
Freezing is an authored API restriction with a new source identity; arithmetic
specialization still requires ordinary database proofs and measured selection.
See docs/frozen-state.md.

Sealed JavaScript pure-call preparation may carry transitive bound parameter masks
through lazily created per-call-site helpers and cache successful stable checks.
Retain argument/source order, lazy branches, preconditions, retry of thrown
failures and ordinary fallback at sixteen helper levels/body/source limits.
Owned inputs/retained values never acquire unique storage. Every changing model
input requires fresh primals; opaque graph records remain untrusted ABI data.
This is literal execution support, separate from proof-backed graph rewriting
and profitability. Keep complete-result controls and ordinary/setup regressions
visible; stateful learning does not silently acquire this pure-call lane.
Sequential callbacks can carry stable lexical captures, but their iteration
elements, indices and state are always dynamic. Preserve operand evaluation once
in source order, lazy Boolean branches, both early-stop contracts, hygienic
shadowing and per-syntactic-site helpers. Owned/parallel/unsupported callbacks keep
ordinary execution. Bounded opportunity search may skip staging; it never grants
an equality fact or profitability authority. See docs/prepared-loop-callbacks.md.

Binary64 uses explicit suffixed literals, raw u64 storage/transport and V15 core
meaning (V4 action trees). Keep scalar IEEE equality separate from structural
stored-bit identity. Reference square root uses independent integer significands;
CPU targets use literal binary64 arithmetic. JavaScript finite values use Numbers,
while immutable private tags preserve NaN payloads through copies and negation.
Validate bounded decimal bit strings before BigInt conversion, including changing
host getters. GPU binary64 work retains compiled CPU fallback. No F32/word law,
NaN reflexivity, precision narrowing or physical layout gains authority from the
new type. Semantic F64 proof terms currently fail closed, including closed nested
subterms. Source forward/reverse AD supports F32/F64 in the objective's precision;
neural/Adam library interfaces retain their separate F32 domain.
Keep that scope distinct from general whole-application differentiation and the
remaining Pretext/Handwired performance requirements. See docs/binary64.md.


Source forward/reverse differentiation uses the objective's F32/F64 precision,
homogeneous trainable shapes, fresh bounded owned tapes and fixed operation/
adjoint order. Preserve independent hygienic precision domains and legacy F32
source images. Neither AD mode may drop an objective/helper proof precondition;
unsupported transport rejects with a diagnostic. Preserve primal evaluation, lazy branches/defaults,
repeat_until's exclusive stop and fold_until's inclusive terminal step. Capacity
and zero-cotangent policy are explicit; never substitute reverse for forward AD
by equality or silently drop proof preconditions. Variant fold arms returning owned carriers run once; plain-valued contract
observations retain readonly captures. Consumed captures invalidate the outer owner across either arm, while repeated
and borrowed callbacks retain their restrictions. Normal helpers remain checked;
no AD transform, provenance or sampled gradient grants rewrite authority. CPU
host tape execution is distinct from actual eligible GPU dispatch. See
`docs/source-reverse-differentiation.md` and required `source_reverse` conformance.

Literal JavaScript binding reuse applies only to fresh const locals and immutable
nonrecursive parameters. Mutable branch/loop/call slots retain value snapshots;
field reads and calls keep their evaluation positions. Do not infer purity,
unique ownership, numeric range or rewrite authority from a reused local name.
See docs/immutable-javascript-bindings.md and the exact-bit alias/swap regression.

Whole-action specialization may use the re-derived frozen_domain after existing
sorted-table premises. Arbitrary source predicates and producer hints grant no
additional facts. Use exhaustive Cases to transport state-dependent premises;
do not introduce dependent induction hypotheses. Partial evaluation and helper
specialization belong in knowledge. Explicit build-model --specialize-frozen
must replay complete action proofs and preserve the restricted checkpoint
namespace; artifact verification rechecks proofs even without training replay.
This is not automatic profitability selection or physical-layout authority.
Programmable objective versions and feedback policies remain authored state;
the example does not change the general planner's evidence/admission contract.
See docs/frozen-structural-specialization.md.

Explicit structural-v2 action projection uses canonical lexical binders and
minimal term/type imports. Preserve default legacy projection bytes; every
replacement re-derives its selected mode and reachable definitions from checked
source. Projected helper metadata grants no equality authority. Dependency DAGs
use iterative traversal under the whole-view entry/byte bounds; do not confuse
dependency height with proof nesting or bypass individual replay. See
docs/structural-action-correspondence.md.

Direct gated conversion may allocate 16,384 work steps within the shared
32,768-step structural attempt to substitute and align a valid larger body.
Keep the whole-attempt and ordinary proof work/depth bounds; a larger direct
candidate still requires exact checked conversion. See docs/structural-conversion.md.
Capture-avoiding mathematical substitution may share one borrowed name analysis
across its lexical walk. Keep every inserted term's copy work, simultaneous
insertion and shadowing semantics; reserve fresh names against all source and
replacement names. No cached term identity or verdict grants equality authority.
Scoped substitution environments borrow their keys and replacement terms; only
materialized results clone terms. Charge environment metadata as well as result
copies so nested binders cannot hide repeated large temporary allocations.

Complete source-bearing plans use planning::canonical/identity, preserving
valid frozen JSON floats and legacy integer packet bytes. Knowledge object
canonicalization remains integer-only; every embedded object and proof must
still replay. Keep selection, view, plan and trained-proof I/O at the common
aggregate byte bound, distinct from source/trace/checkpoint and per-entry limits.
Use bounded packet decoding: whole envelopes have a 256-container allowance,
while embedded JSON fields retain their independent 128-level budget and ordinary
literal keys. Preserve exact incoming request presence in stream receipts.
Do not re-encode frozen rows or rehash snapshots to fit transport. See
docs/source-plan-transport.md.

Mixed immutable records carry bounded field provenance through literal constructors,
projections and helper returns. Keep returned-value provenance separate from the
work needed to produce it: unused dynamic arguments/fields, guards and failures
still execute before any cached projection. Iteration bindings stay dynamic.
Mask sharing uses only private captured policies, never source/host object access.
Bound expanded alias summaries as well as traversal; exhaustion retains ordinary
execution. Do not raise source limits to accommodate verbose optional masks.

Optional/result callback preparation preserves selected-arm laziness and receiver
execution once. Only a complete immutable captured sum fixes its payload; changing
sums keep dynamic payloads, while a None arm's Unit is constant. Loop arguments
stay dynamic. Use checked sum views/constructors and ordinary ownership fallback;
strict defaults and thrown failure retry keep source behavior. Bounded opportunity
conditions and structural work estimates affect only explicit preparation, never
proof/evidence authority. Keep direct ordinary calls for non-reusable captured
policies, and share private policy predicates without evaluating source work.

JavaScript record wrappers may stay local through bounded helper expansion and
loops, including checked affine Buffer/Map fields. Evaluate all arguments/fields
before entering the callee, preserve snapshots and simultaneous updates, and
retain each owner's handle, moves and readonly loans. Splitting a wrapper grants
no extra uniqueness; expanded List parameters remain shared under their own
callee analysis. Recursive helpers, checked elisions and exhausted budgets retain
their ordinary handling. Account for returned expressions in
source limits and leave stack headroom for type/loan visitors; optional emission
must not reject an otherwise supported source. See docs/local-record-helpers.md.
Direct checked Buffer/Map parameters and records containing owners can expand
without an already split argument. Preserve the same private handles, callee-local
List sharing and ordinary recursive/oversized fallback. This adds no public owned
ABI, retained storage, source/proof authority or higher expansion limits.

Explicit mathematical `Step` witnesses perform one immediate reduction of the
existing checked total definitions, constructor cases, literal Boolean choices
or literal scalar operations. Check input visibility/types before reduction and
the computed equation afterward. Keep recursive constructor gates, capture
avoidance, copied-term accounting and ordinary proof work/depth bounds. The
producer supplies no destination, oracle result, axiom or source-specific rule.

GPU-local immutable list constructors evaluate elements once in order and retain
private arrays through helpers/captures. Account for WGSL vector/record alignment
in the cumulative local storage bound, separately from packed ABI lanes. Lazy list
graph stages retain branch control and input-derived capacity bounds; actual length
stays resident. Graph wrapping must preserve direct traversal work limits. Keep
device-training evidence distinct from host tape execution and from performance:
the authored coordinate-forward/Adam consumer performs actual resident iterations,
while the prepared graph and reverse tapes retain their existing CPU path. See
docs/resident-source-training.md.
