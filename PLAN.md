# Implementation and evaluation plan

## Accepted production roadmap — 2026-10-10

The compiler and knowledge catalogue evolve in separate repositories. Keep as
much optimisation knowledge as possible in the catalogue: alternative layouts,
allocation strategies, query maintenance, batching, range specialisation and
selection evidence. The core owns fixed semantics, general evidence checking,
application correspondence and straightforward primitive execution/lowering.
Profiles guide choices; only checked conditions justify them. Preserve the full
language and evaluation requirements below while delivering these milestones.

| Order | Deliverable | Acceptance gate |
| --- | --- | --- |
| 1 | Separate `ink-lang` and `ink-knowledge`; extract catalogue history, move producers, pin a revision, provide discovery metadata | Core builds without catalogue checkout; full integration works with the pin; external packages check without modifying the compiler |
| 2 | Freeze the executable semantic core and trust boundary | Every supported value, operation, ownership/effect rule, error, abort, event and snapshot has explicit semantics and a reference implementation; draft features are distinguished |
| 3 | Generic proof and replacement interface | Original/replacement typed IR, conditions and observation-preservation evidence are checked against the actual application; no package-name authority |
| 4 | Stable knowledge packaging | Definitions, proofs, candidates, representation relations, initialisation/migration and separate cost evidence have pinned bounded dependency closures, offline replay and inspectable plans |
| 5 | Complete one table representation transformation | Independently supplied row/column and maintained-query candidates preserve future reads/writes, failures, aborts, ordered events and snapshots under an unchanged compiler; correct baseline remains available |
| 6 | Refine base execution through general primitives and database alternatives | Competitive ownership/allocation/construction behaviour; remaining hardcoded transformation authority is migrated rather than renamed |
| 7 | First usable language release | Modules, standard library, diagnostics, installation, debugging/editor support and native/Wasm interoperability work for the declared subset |
| 8 | Bounded search, then profile-guided adaptation | Replaceable external search has budgets and caching; exhaustion preserves a correct build; runtime adaptation additionally checks guards, migration and fallback |
| 9 | Harden and evaluate the declared deployment scope | Adversarial/fuzz/independent checking, durability/recovery and concurrency claims have explicit boundaries; fair end-to-end performance, memory and compilation/proof-check costs are reported |

Milestone 1 is implemented and validated in `reports/repository-split-phase1`: 96 tests, all binaries built without knowledge, 19 checked primary libraries, 60 native extension checks, and byte-identical search package reproduction.

Milestone 1 is a repository boundary, not a proof of kernel soundness or native
code correctness. Ink currently checks its restricted proof language in Rust;
Lean remains external research/metatheory tooling. A Lean model needs an explicit
connection to the implemented checker before claiming that implementation is
verified. LLVM and generated C/Rust remain disclosed trusted components.

The next implementation gate after the split is a frozen semantic IR and a
generic proposal contract. Further isolated mathematical layout lemmas do not
complete source/effect/native correspondence on their own. Keep legacy
optimisation paths visibly transitional until their authority is removed.


The objective is to implement the language specified in docs/language-specification-draft.md and evaluate it against C, C++ and Rust. The full objective remains active until its implementation and evaluation requirements are satisfied. Early benchmark kernels are milestones, not substitutes for the language.

The requested Goose-inspired changes are also binding: contiguous/compact representations, fewer copies and allocations, general arenas/ownership inference, narrow relative links, variable-size inline data/enums and construction directly into final destinations. Representation choices should come from the database, with actual native correspondence and future-update safety; typed storage policy alone does not complete that requirement. Benchmark construction/teardown and retained memory as well as execution, and keep matching layout controls.

## GPU execution milestone

Contextual u32 execution and an initial browser WebGPU/native wgpu backend are
implemented. Each checked u32 map/filter stage is emitted literally, with
parallel modular sum/stable filter primitives and compiled CPU fallback.
Bounded host profiles compare actual execution costs and sampled results.
This is an execution milestone within steps 6–8, not completion of their general
ownership, database-defined representation, migration or refinement gates.
GPU primitive implementations, shaders, host ABI and drivers remain trusted;
formal backend verification, wider numeric kernels and general stateful GPU
execution remain open. See `docs/gpu-backend.md` and `reports/gpu-phase1/`.

## Requirements and evidence

- [ ] Small compiler core has no built-in optimisation catalogue. All language-level rewrites, incremental algorithms and representation choices come from checked database entries; new entries work without rebuilding the compiler. See `docs/small-core-and-knowledge.md` for the binding architecture and migration audit.

- [ ] Parser and diagnostic coverage for the specified surface language, including the complete inventory example.
- [ ] Types, effects, ownership, totality and contract checking with negative cases.
- [ ] Reference interpreter for pure functions, collections, transactions, events and queries.
- [ ] Native code generation with declared compiler/runtime trust boundaries.
- [ ] Built-in proof checking and reusable, locally checked knowledge packages.
- [x] Actual imported knowledge changes an eligible compilation plan. Evidence: native-phase1 generated C/LLVM and plan IDs; modular rewrite validation and benchmark improvement. Stateful package selection also changes maintained execution.
- [ ] Incremental sum/count maintenance covers insert, replace, remove, batches, errors and abort.
- [ ] Representation changes preserve future update behaviour and observable event sequences.
- [ ] Persistence, restoration, recovery and native/Wasm interchange.
- [x] WebAssembly execution with a documented host ABI. Evidence: `docs/wasm-abi.md` and `reports/state-wasm-phase1`; five stateful modules pass bidirectional native/Wasm continuation in Node and an actual browser. Pure kernels retain their separate ABI.
- [ ] Adaptive selection, bounded search, migration and safe implementation fallback.
- [ ] Reproducible benchmarks against equivalently optimised C, C++ and Rust.
- [ ] Workloads include pure kernels, update/query mixes, changing distributions, memory limits and durability.
- [ ] Final report includes raw measurements, correctness validation, toolchains, limitations and fair algorithm-matched comparisons.

## Executable core and replacement boundary progress

The shared executable declarations now live in `src/core.rs`; parsing and all
existing semantic consumers use the same structures. `ink-executable-core-v1`
adds a bounded checked-module witness, strict versioned wire input, canonical
identity and emit-core/check-core/--core commands. The full design draft now
separates implemented semantics and observable transaction behaviour from
proposed ownership, concurrency and durability features. Native/reference/codec
implementations remain trusted, and the checked typed AST is not yet resolved SSA.

The first `ink-checked-replacement-v1` admission envelope binds the exact full
input core and library lock, admits only pure total-value equality, reuses actual
source/math correspondence and checks the candidate core before atomic install.
An external producer owns envelope construction. General state/effect and
representation migration admission are still required; this does not close
milestones 2–5 or remove the legacy polynomial/aggregate/bounded/layout paths.

## Current implementation sequence

The whole-row journal work also has a [Lean contribution](reports/hunchroom-row-journal/README.md) on Hunchroom: arbitrary history restoration and complete-machine equivalence for adjacent same-key coalescing. It is reusable research evidence, not native optimization admission. Source/effect and physical-map correspondence remain required; the full implementation and evaluation objective stays active.

The row/column representation work also has a [Lean contribution](reports/hunchroom-column-layout/README.md), Hunchroom module 151: complete enumeration/lookup/write correspondence, arbitrary future histories and checked conversion that rejects unmatched lanes. Lean and Nanoda both passed. Six well-typed false implementations fail locally. This publication makes the laws reusable; it adds no native optimization or speed claim and leaves the full objective active.

1. Establish a real Rust frontend, independent reference evaluator, bounded arithmetic proof checker and native compilation path. Benchmark pure collection programs without hardcoded workload recognition.
2. Implement the inventory/state language and correctness suite; add checked incremental implementations and compare against manually maintained C/C++/Rust.
3. Add portable snapshots and Wasm; implement safe runtime migration and adaptation.
4. Broaden language coverage, verification and workloads, then audit every requirement above.

LLVM code generation initially runs through emitted portable C and Clang. This is a transparent bootstrap path, not a claim that the handwritten C intermediate or backend is formally verified. LLVM IR is retained for inspection. The semantic frontend and knowledge checker remain independent of this backend.

## Verified progress after phase two

The full inventory example is executable in the reference runtime. Records, IDs, nullary enums, Option/Result, u32 and exact Int support its transactions, effects and queries. An undo journal handles rollback and event staging. Domain-specific certificates validate actual aggregate update expressions, and imported knowledge selects maintained sums/counts for row-local pipelines. Tests compare 2,000 mixed operations against recomputation and exercise snapshot restoration and implementation switching.

Pure programs also compile to WebAssembly and pass 2,856 independent arithmetic checks in Node/V8. Subsequent work added native stateful compilation and benchmarks, plus canonical binary snapshots that transfer between native representations and the reference runtime. Stateful Wasm now has a documented ABI and verified native interchange in Node and an actual browser. Durable recovery remains unfinished. These milestones do not close the broader unchecked requirements above.

## Next concrete work

1. Prioritise the user's small-core architecture: externalise optimisation knowledge and proof production, define the general checking boundary, and demonstrate independently evolving database entries. The first total-scalar proof-term path now loads external Boolean laws without recompiling (archived in `reports/database-equality`). Reusable acyclic scalar definitions and pinned theorem dependencies now compose in a checked seven-object example. Scoped conditional equality proofs and complete application proofs now preserve short-circuit observations. A first-order proof library now checks database-defined datatypes, structurally recursive functions, list-traversal composition by induction and generic tree-copy identity. The exact map/sum/count/foldr bridge now installs induction-checked whole-function database candidates, and the baseline no longer fuses collections automatically. Its latest benchmark reaches combined C/C++/Rust loop performance. The bridge now also handles filter, lazy choose, acyclic source calls and nested collection computations. The external filtered producer supplies four checked candidates; its dedicated native benchmark improves traversal workloads by 3.43× and matches combined C/C++/Rust, with the constant-time case reported separately. The broader pure Wasm path passes 4,476 checks in each of Node and an actual browser. Next migrate arithmetic, aggregate and representation laws, and extend general stateful refinement. Higher-order/type-polymorphic logic remains pending. Existing hardcoded transformation mechanisms are transitional, not the intended core. Hunchroom research informs proof obligations but does not automatically authorise compiler transformations.
2. Initial native state comparison is complete: all baselines maintain totals and compare observable state, errors, versions and ordered events. The range-checked cache and exact native query view improve performance, but handwritten Rust remains faster overall. Next reduce transactional bookkeeping and redundant work, explore physical layouts, and broaden workloads to distribution shifts and memory limits. Preserve algorithm-matched baselines.
3. Portable native snapshots now transfer logical state across implementation choices. The same format/state machine now executes in Wasm and passes bidirectional native interchange. Next add durable recovery and measured selection with safe migration through the database architecture.
4. Broaden the language and proof core against the original draft. Keep the outstanding acceptance criteria intact.

### Arithmetic migration milestone

An external SAT producer now supplies arithmetic theorems to a fixed circuit encoder and bounded hinted RUP checker. The compiler checks exact scoped premises and source replacement proofs; no solver or arithmetic identity catalogue is added to the core. The package contains nine theorems, including a conditional equality, and eight unconditional replacements. Arithmetic proof reuse composes with list induction. Nine database revisions change C output under one compiler identity. The complete Rust suite passes 54 tests; native validation checks 42,920 outcomes and an independent Python/SAT encoding suite checks 2,534 assignments. The 560-sample scalar-call benchmark shows identical baseline/checked ARM64 bodies and no runtime speedup because LLVM already recognises these simple identities.

Next extend external proof production to useful arithmetic inside collection/state algorithms and replace the remaining legacy polynomial authority, rather than claiming that the new path alone completes its migration. General finite-map/state-transition refinement and database-defined representations remain the main architectural work; those need future-update, abort and event evidence as well as competitive benchmarks. The full unchecked acceptance list above remains binding.

### Exact-sum proof foundation

The next dependency is now checked: a 35-object database-defined exact-integer/list model with 23 universal induction proofs, including group laws and sum insertion/replacement/removal at arbitrary positions. The unchanged kernel checks it without a new arithmetic primitive, ring axiom or aggregate rule. Deterministic replay and 57 passing tests are recorded in `reports/exact-sum-proof-foundation`; full import takes roughly 6 ms on this machine.

The source-update bridge now pins these definitions and checks actual candidate update expressions through database proof terms. Version-2 certificates authorise canonical and commuted arithmetic without invoking the legacy polynomial checker. The 62-test suite and `reports/database-maintenance-phase1` include real native execution, checkpoints, signed values and the maintained C/C++/Rust comparison. Its 756 samples show no new runtime algorithm gain: canonical legacy/database certificates emit identical runtime source, and bounded Ink still takes 1.75× handwritten Rust time.

Next broaden exact arithmetic to multiplication/efficient large literals, migrate row-pipeline recognition and cache/transaction protocols to general checked state-transition/representation objects, and remove legacy aggregate authority. Table/source correspondence and complete transaction refinement remain unfinished. The broader architecture, language and benchmark requirements above remain binding.

### Cache lowering and profile-sensitive delta selection

Two new universal database theorems now authorise `total + (new - old)` under the original compiler, without adding a core optimisation law. A separate base-lowering change borrows exact operands instead of cloning them redundantly and preserves expression semantics; bounded emitted source is unchanged. The full suite passes 63 tests across all three exact candidates, including signed data, rollback/events and future checkpoints.

The controlled inventory report (`reports/cache-lowering-phase1`) compares eight maintained variants in 1,008 samples and 16,040 independent native checks. Its small-integer changes are minor; bounded Ink still takes 1.77× Rust u128 time. The wide-Int report (`reports/wide-cache-phase1`) adds 448 samples, 4,096 native oracle comparisons and separate allocation instrumentation. Borrowed lowering improves by 1.23× overall. Delta-first helps the small-changing-row profile by 1.05× and is slightly worse on the wide-changing-row profile. Handwritten Rust remains faster. This is actual profile-dependent evidence for retaining multiple proved alternatives, not automatic adaptation or a fastest-language result.

Next address remaining cache/row copies and transactional work through general state-transition/refinement evidence; make measured selection and migration part of the database architecture. Preserve rollback, tentative reads, commit exhaustion, events and future changes. Continue the arithmetic, full language, durability and broader workload requirements rather than closing the objective around these kernels.

### Database-defined reversible journal milestone

The exact cache journal now takes saved-value, apply and restore expressions from version-3 database evidence. The bridge checks actual forward equivalence and inverse identity over arbitrary signed totals, in addition to the original source/list-sum proofs. External full-snapshot and reversible-difference candidates work under one compiler; two new universal theorem objects pass the preserved original generic kernel. No cancellation-law catalogue or solver was added to the core.

The reference runtime and native backend execute the selected journals. All 65 tests pass, including multi-table aborts, repeated writes/removals, tentative reads, signed values, events, future checkpoints, exhausted commit counters and bounded fallback. The wide-Int report contains 448 samples and 4,096 native oracle checks: 1.31× improvement for small-changing-row profiles, essentially no benefit for wide changes, and 2.54× handwritten Rust time overall. Allocation instrumentation confirms one fewer call/update for small changes beside a large total; wide changes can allocate more. The companion C/C++/Rust inventory report contains 756 samples and 12,030 native comparisons; bounded Ink remains 1.77× Rust u128 time. Executed audits preserve and replay the measured binaries and regenerate both candidates.

Next use checked evidence to remove remaining owned-result/row copies, support mutable storage reuse and measured selection/migration, and broaden general table/transaction/representation proofs. One exact saved integer is a fragment, not the complete state design. Reverse scheduling, table/source correspondence, bounded representations and the backend remain trusted. Keep durability, broad language coverage and every unchecked acceptance criterion above active.

### Owned integer lowering and operational-model review

The native backend now consumes the final use of the cached BigInt in forward and inverse expressions, copying earlier uses and preserving the AST/evaluation order. This is base ownership lowering; the proof kernel, source bridge, database candidates and reference transaction protocol are unchanged. All 65 tests pass, with repeated-owner multiplication coverage. Bounded inventory emission is byte-identical to the prior milestone.

The 560-sample storage experiment compares old/current compilers and both checked journals, with 5,120 native oracle comparisons. Journal speed improves by 1.36× overall, 1.73× on small-changing-row profiles and 1.06× on wide changes. The 8192-exponent small-row update-only case improves by 2.12× and goes from 1.492 to zero measured update allocations, but overall Ink still takes 1.90× handwritten Rust time. The companion 756-sample C/C++/Rust inventory report leaves bounded Ink at 1.77× Rust time. Executed audits preserve/replay timed binaries and all 40 separate allocation cases.

`reports/hunchroom-review-20261010` indexes every public submission in the captured catalog (427 submissions, 114 modules). Selected operational families provide templates for exact runtime admission, actual physical candidate installation, invariant-preserving all-future replacement, sticky-error/capture/effect preservation and cost-aware replanning. Site verification is not compiled-Ink correspondence. The exhaustive 2^n reference cost planner should not enter the core; search quality and safety must remain separate.

Next build the source-to-state transition/refinement bridge around actual table updates, undo scheduling, tentative queries, poison errors, event order and commit exhaustion. Lift one-step correspondence to traces. Then admit database-defined representations at transaction boundaries with exact rejected/accepted behavior and bounded measured selection that charges import, checking, migration and final observation. Keep partial-effect fusion, durable recovery, general syntax/types and the broader benchmark acceptance criteria active; these cache kernels do not complete the language.

### Keyed contribution-table transition/history milestone

The generic checker now supports generalised induction, allowing a structurally decreasing trace proof to instantiate its hypothesis with changed initial state. Typed branch-local hypotheses, complete constructors and fixed-premise independence preserve its scope; no arithmetic/transaction optimisation axiom was added. The 63-object database package proves actual first-match keyed writes maintain exact sums and that every finite initialized write history equals independent recomputation, recording every intermediate contribution state. Version-4 checking pins the model and actual submitted update expressions. Both reversible/snapshot choices work under one compiler. Numeric keys and 128-bit IDs are represented; unsupported key domains retain scanning.

All 70 tests pass, including an independent 384-intermediate-state mathematical oracle, rehashed legitimate-but-wrong definitions, source arithmetic/model mismatch, old certificate compatibility and actual reference/native integration. The 756-sample maintained C/C++/Rust report adds 12,030 native and 4,010 reference checks; bounded Ink takes 1.77× Rust time. Emitted runtime code for the benchmark is identical to the prior v3 implementation. Executed audits replay the original timed binaries and both produced candidates.

This is contribution-table write refinement, not complete stateful source/native correspondence. Next formalize the actual map/projection abstraction and transaction/undo transitions, including failed operations, tentative queries, nested poison errors, staged/published events and commit exhaustion. Then prove accepted/rejected physical replacement and measured selection. The current bridge is a restricted schema; general layouts, durable recovery, broad language coverage and all outstanding acceptance criteria above remain active.

### Compact storage and borrowed-outcome milestone

External policies now select sorted contiguous rows or separate key/row buffers, with an optional database-supplied threshold for promotion to BTreeMap. A checked index hint reuses searches without retaining raw pointers. Native lowering moves new/old rows directly into storage/undo and copies a removed row only when its return value is used. Borrowed event outcomes drain staged events directly into outbox and expose a lifetime-checked slice; independently owned outcomes remain available.

All 75 tests pass, including storage oracles, signed/string/128-bit data, repeated writes, rollback, events, commit exhaustion, checkpoints, clone instrumentation and a Rust lifetime rejection. Separate warmed bounded-action instrumentation observes zero view allocations versus one for an owned outcome. Column buffers reserve 25% less space for the tested u64/u32 entries; this is not RSS. Six exact/bounded tree/row/column variants pass 29,395 checks in each of Node and an actual browser, plus 3,030 native outcome checks, with cross-layout continued checkpoints.

Two controlled experiments archive 1,512 and 1,764 samples respectively. The latter isolates views against the preserved storage compiler and records 28,070 native observations and 4,010 reference outcomes. The small-column policy takes 0.734× Rust tree time for 64-row cases, 1.281× Rust tree time overall and 1.570× matching-layout Rust time overall. Permanent flat columns lose badly on large mixed writes. Both executed audits preserve timed binaries and replay exact code/plans and native streams without rebuilding them.

These are base physical/ownership primitives selected by checked typed policy data, not a new core catalogue of algebraic optimisation laws and not formal storage refinement. Next prove full map/projection and transaction/undo/effect correspondence, then admit database-defined physical candidates with accepted/rejected all-future semantics and bounded measured selection. Continue general arenas/lifetimes, compact graph links, inline variable-size values, final-destination construction, setup/teardown/retained-memory measurements, durability and the full language acceptance criteria. The full goal remains open.

### Lifecycle and retained-allocation evaluation

The unchanged compact-storage compiler is now evaluated over construction, growth through the policy threshold, steady-to-mixed updates, clearing, final observation and destruction. Eleven generated/handwritten C/C++/Rust implementations produce 462 samples over six fixture cells and 66 separately compiled allocation profiles. Intermediate diagnostic observations are outside the measured segment sum; final observation is inside. Bulk handwritten constructors directly build rows, whereas the generated ABI invokes source creates. This difference is explicit.

Every phase agrees with an independent exact state model; 22,055 native and 4,010 reference observations anchor source behavior. Known-size C/C++/Rust sequences verify probe accounting. An executed audit replays 66 native lifecycles and all 66 exact allocation profiles, preserving timed binaries and checking instrumented source correspondence.

Small-policy Ink takes 1.25× Rust tree time and 1.45× matching-layout Rust time across these cells. Clearing 65,536-row flat columns takes about 396 ms in both Ink and matching-layout Rust, versus 2.04 ms in Ink after promotion. Permanent columns retain about 2.0 MiB of requested implementation bytes after clear versus 0.5 MiB under promotion; required event logs remain in both. All counted bytes return to zero after destruction. This is not RSS, proof of physical refinement or a universal optimal threshold.

Next use lifecycle/memory costs as evidence for bounded database candidate selection, while proving actual representation installation and future-update/abort/effect behavior. General arenas, compact links, inline variable-size values, final-destination construction, reclamation policy, imposed memory limits and durability remain outstanding alongside the original full language/specification criteria. Do not close the goal around these inventory fixtures.

Reproduction input checking also regenerates all five exact emitted bodies/plans, rejecting altered source, candidate code and plan metadata. A fresh compiler identity is accepted only through that correspondence check; new-host runs capture actual CPU targets. Original samples, measured source snapshots and timed binaries remain unchanged.

### Whole-row undo proof milestone

Two standalone external libraries extend the existing 63-object foundation with 33 definitions/theorems each. Under the unchanged preserved kernel, arbitrary word-list payloads and exact caches restore at every 128-bit lookup after any finite write history, including repeated keys and preexisting undo stacks. The producer translates the actual candidate save/apply/restore expressions. Supporting lookup and observation-correspondence proofs lift one-step undo to histories. Model metadata is not native admission authority.

All 78 tests pass. New independent map checks cover 840 forward observations, 840 rollback observations, 840 continued-stack observations and 168 execution prefixes. Eight fully rehashed false models are rejected. Six native fixtures verify payloads, signed wide values, aborts, events and checkpoint continuation across both journals and tree/row/column layouts; twelve failed invocations preserve logical snapshot bytes. Package production reproduces byte-for-byte under one compiler identity. Runtime code and existing timing evidence are unchanged.

Next bind actual source codecs and native map abstractions to a shared transition model, prove ordered enumeration/projection and full transaction/effect/commit control, then admit safe representation replacement and measured selection. This abstract lookup/cache result does not complete source/native refinement, general ownership/arenas, compact links, inline variable-size data, adaptation or durability. Every unchecked full-language acceptance criterion remains active.

### Logical source row/key/projection bridge

The compiler now lowers actual source value types and row-local map/filter contributions to the existing first-order proof language, with no new optimisation laws or changes to the generic kernel. Numeric/nominal-ID key adapters preserve both words. A bound wrapper must retain the complete actual source row and call its exact derived projection. Unsupported symbolic unsigned casts, u32 arithmetic, richer exact arithmetic and recursive types fail closed in this bridge.

The external producer instantiates complete-row/cache undo proofs with two distinct nested source schemas and both journal variants. Four libraries contain 105/102 objects and reproduce under one compiler. The preserved preceding kernel accepts them all. All 83 tests pass: actual source projection/reference comparisons, key boundaries, rehashed unrelated/wrong adapters, 288 new native results, 72 failed-invocation checkpoint comparisons and six final snapshot comparisons. The earlier abstract undo packages also reproduce. Current five benchmark bodies/plans and all recorded lifecycle binaries are unchanged, so existing performance evidence remains current.

The lowering and source/native codecs remain trusted. A checked value/projection wrapper does not establish source-action correspondence or native implementation admission. Next connect map/protocol transitions and ordered enumeration to actual source changes and native storage, prove success/failure/error/event/commit/migration behavior, then select valid physical candidates using measured costs. Continue all general language, ownership/arenas, compact links, inline variable-size values, durability and benchmark requirements. The full objective remains active.

### Source-bound sequence layout correspondence

Two external [row/column layout packages](docs/column-layout-models.md) prove complete ordered enumeration roundtrip, lookup and linear ordered-write correspondence, lane alignment and all finite future write histories for the actual Row/Ledger source payload sorts. They add 38 objects each under the unchanged kernel, reproduce byte identically, and check under the earlier preserved kernel. The full suite passes 86 tests; 512 prefixes compare the mathematical transitions with flat/promoting native rows/columns and a tree oracle. Ten rehashed false models fail. The proof evaluator's existing resource budget bounds concrete whole-history expansion; symbolic universal proofs and all one-step prefix/native comparisons pass.

This sequence correspondence is a required layer, not native storage admission or a sorted-map correctness proof. Next prove sorted/unique invariants and the search/index contracts used by actual native buffers, then link source actions, cache/journal, effects, snapshot installation and physical representation changes. Runtime and measured benchmark code/plans remain unchanged. Keep the broader language, small-core/database architecture, ownership/arenas, compact links, inline data, adaptation, durability and performance requirements active.

### Sorted/unique sequence invariants

The [sorted layout packages](docs/sorted-layout-models.md) add 22 objects each under the unchanged kernel: key-order laws proved by external SAT/RUP certificates, all-tail lower bounds, sorted write/step/history preservation, explicit uniqueness and aligned-column history validity. Their closures retain only needed parent proofs plus the original source authority, fitting the existing 128-object budget. Both reproduce byte identically and check under the earlier preserved kernel. All 89 tests pass; new cases compare 128 prefixes with native rows/columns, exercise boundary order/equality and reject twelve fully rehashed false models, reversed/duplicate sequences and mismatched lanes.

Next prove lookup/update and search/index contracts and connect actual native operations to these model invariants. Complete source action/effect, cache/journal, codec and candidate installation correspondence remains required before database representation admission. Runtime, five benchmark bodies/plans and 44 measured lifecycle binaries remain unchanged. The full language, performance and small-core/database objective remains active; preserve general ownership/arenas, compact links, inline data, adaptation, durability and broader fair benchmarks.

### Complete-row search cuts and positions

The [search packages](docs/search-layout-models.md) add 41 external objects each: complete sequence reconstruction, cut application/write equality, sorted lookup correctness, prefix/suffix bounds, exact found-key validity and mathematical positions, including all future write histories. Their 122/121-object closures check under the preceding generic kernel. Generic checked projection lets source binding retain actual immutable definition ancestry without carrying unrelated parent theorems; certificate/source/direct-import checks remain. Both packages reproduce byte identically.

All 96 tests pass without warnings. New comparisons cover 128 prefixes, 1,024 searches, 2,048 Rust binary-search position results, 4,096 native lookups and 512 native mutations/returned values/enumerations. Eighteen fully rehashed false models fail. Five benchmark bodies/plans reproduce exactly and 44 measured lifecycle binaries are unchanged. There is no new speed claim.

Next connect actual native binary search, usize/index operations and buffer mutation to the proved cut contract, then combine complete source updates, caches/journals, effects and checkpoint installation. Use lifecycle cost evidence for bounded database candidate selection after those correspondences. Keep the full language, performance, small-core/database architecture, ownership/arenas, compact links, inline data, adaptation and durability objective active.

### External arithmetic-search migration

The production modular-polynomial checker and rewrite matcher have been
removed. Explicit external DB law selection now produces complete proofs for
scalar expressions and arithmetic within a single mapped sum. Optional
map/sum-to-fold candidates use existing induction rules; no compiler law or
fusion recogniser was added. Search is shared-budget bounded and an exhausted
search supplies a valid unchanged program. The old factoring law does not yet
have a replacement proof and is deliberately left unapplied.

Active native/Wasm harnesses use externally checked replacement packages;
historical compilers, packages and measured reports retain their old identities.
Remaining separation work includes the older scalar-database search and
exact-integer aggregate schema, bounded-cache analysis and representation
admission. This does not close milestones 2–5 or establish new timing claims.

### Scalar search externalisation

The compiler's older typed-scalar rewrite search and application are removed.
Historical scalar libraries are verification-only. The external producer can
consume executable core IR, expand definitions, apply typed DB laws, discharge
actual branch conditions and close complete Boolean-split proofs. Original
unguarded expressions remain unchanged; changing a guard, dropping a branch or
leaking a branch hypothesis is rejected before installation. General kernel
and source correspondence rules were not extended.

The next prerequisite for stateful representations is a general executable
implementation description with explicit operation semantics and a checked
connection to emitted bodies. Existing abstract row/column/search proofs and
typed layout policy alone do not provide that connection. This remains part
of the full source/effect/native admission gate, not a narrower replacement
for it. Aggregate/bounded-cache authority and release experience remain open.

### Executable candidate descriptions

Checked first-order definitions now lower directly to Rust, without a
representation-name recogniser or optimisation law. A pinned entry-selection
package must prove unconditional equality between actual checked functions
with matching signatures before any output is written. Internal calls retain
immutable bodies, preventing equal entry selections from introducing cycles.
External packages supply combined list passes and row/column transition
adapters; the compiler emits their actual checked bodies.

Next connect efficient physical buffer operations to this executable/proof
boundary and keep the chosen representation across source actions. The current
boxed row/column adapter converts at each entry and is not a competitive
physical implementation. Complete source-action, error, abort, event, commit,
snapshot and migration correspondence remains an explicit admission gate.
Continue aggregate/bounded-cache separation, general ownership/arenas, compact
links, inline data, final-destination construction, bounded search, profiles,
durability and all original release/benchmark requirements.


### Backend separation and composable routing — 2026-10-10

The user extended the small-core requirement: target emitters/runtime adapters
belong in separate repositories, and one program may span multiple targets.
`ink-core` now has no backend dependencies. The distribution combines pinned C,
Rust, Wasm-adapter and shared WebGPU/wgpu packages. Existing native toolchains emit
assembly; architecture-specific compiler projects are not part of this plan.

`ink-pure-routing-v1` checks actual acyclic stage composition against the original
function using the existing general kernel. Types, forward/missing/unused edges,
resource bounds and whole-function equality are checked before admission.
Physical mixed-target execution remains unfinished. The current GPU runtime
selects per eligible function; the router interface does not yet connect its u32
source dialect, async transfers or physical buffer representation to proofs.

Complete the shared graph/ABI boundary, give every conversion/transport/residency
choice an explicit contract, and make external knowledge search rank admitted
plans by complete costs including upload, readback, conversion, allocation and
synchronisation. Compare against all-CPU and algorithm-matched controls. State
placement additionally requires future-call, abort/event/snapshot/migration
preservation. See docs/backend-packages.md. Earlier acceptance gates remain open.

## Resident compute milestone

The pure compute v2 milestone now lowers i32/f32 vectors and numeric records,
multiple arrays, array outputs, safe indexed access and bounded loops to C/Wasm
and eligible WebGPU/wgpu kernels. Explicit host pipelines retain intermediate
buffers across steps and iterations; whole-pipeline timings select CPU/GPU.
See `docs/gpu-compute.md` for the versioned float contract, ABI and trust boundary.

Next: persistent resident handles across host calls, richer source-level control
flow, reusable GPU scan/sort/scatter primitives with explicit conditions, tiled
matrix kernels, wider stateful Wire support and externally checked pipeline
rewrites. Current profiling is host policy, not proof-producing optimization.
