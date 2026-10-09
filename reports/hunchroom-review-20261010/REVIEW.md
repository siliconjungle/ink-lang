# Hunchroom review for Ink

The most useful direction is a database of proved implementations and executable admission checks, with a bounded, measured selector outside the trusted core. A growing proof database can expand the set of safe choices. It does not by itself establish a fastest choice, make proof search cheap, or connect a Lean model to Ink's emitted code.

## Coverage and what was checked

The public API snapshot completed at **2026-10-09 18:42:52 UTC** (10 October in Sydney), with problem cutoff **443**. It contains **436 public problems, 427 submissions and 114 modules**. Every listed submission's canonical source was retrieved: 16,311,929 bytes, with source hashes matching the API's reported proof hashes. All 996 public GET receipts and captured source hashes validate. Eighteen public problems have no visible submission. Hidden entries and later arrivals are outside this snapshot.

Every submission is indexed by statement identity, direct pinned modules, declared scope and limitations, reported checks, source structure and relevance to Ink. The [complete index](INDEX.md) and [machine-readable entries](submissions.json) include unsuccessful attempts. Deeper semantic reading concentrated on the cache/transaction, source/effect, reverse-accumulator, equivalence, layout-replacement and cost-planning families discussed below. Their executable definitions and selected proof bodies were examined. This is **not** independent recompilation of the corpus, a line-by-line audit of every proof body, or an audit of Lean/Nanoda soundness.

The site reports 420 verified submissions, three failed, two partial, one error and one capacity result. Secondary checks report 214 passed, 189 errors and 24 not run. All 114 modules are primary-verified; 49 have secondary passes, 62 errors and three not run. Many secondary errors concern export support for declarations such as `Nat.le_of_ble_eq_true` and `Nat.eq_of_beq_eq_true`; they should not be reported as counterexamples to the theorem. They also cannot be counted as independent-checker passes. Failed/partial submissions 4, 5, 15, 21, 27, 57 and 75 are not proof authority. Neither a reduction of an open number-theory problem nor a concrete witness should be described as solving its parent conjecture.

The categories are a triage aid: 112 submissions have high direct Ink relevance, 171 medium and 144 lower. They are not 427 independent optimisation algorithms: many are consequences, boundary examples or counterexamples using shared models. [Coverage](coverage.json), [modules](modules.json) and [receipt identities](receipts.json) make the boundary explicit. The raw third-party source corpus remains in local scratch; this repository stores the index, hashes and review rather than copying all of it.

## 1. A finite runtime check can justify every future execution

[Module 113](https://hunchroom.com/modules/113) defines an executable finite comparison over the union of both states' identifier supports. It checks live payload lookup, removal-context membership and registry lookup, plus a registry-consistency bit. Its [future-equivalence result](https://hunchroom.com/p/422) connects this check to arbitrary future checked merges. [Accepted replacements](https://hunchroom.com/p/423) preserve future query/error traces and remain certified.

That is a useful architecture for Ink: prove once that a concrete acceptance procedure establishes a simulation relation; run the finite procedure on each proposed representation. The runtime need not prove the whole future again. Proof objects should pin the actual check, operations and observation definitions.

The restrictions matter. [Query-only checks suffice for initialized valid histories](https://hunchroom.com/p/425), where consistency is derived. They do not suffice for arbitrary imported states. [The counterexample](https://hunchroom.com/p/427) uses a shadowed conflicting registry row: current lookups agree, but a future merge reports a different error. “Same current output” is weaker than interchangeable software state.

**Ink action:** describe the complete invariant and observation relation for each candidate, including control/error state that later operations can inspect. Use invariant derivation to eliminate redundant checks only in the proved reachable domain. Ink's current cache arithmetic proofs are a smaller fragment; they do not yet prove the whole transaction relation.

## 2. Validate and install the actual physical candidate

[Measured chunks](https://hunchroom.com/modules/111) store a cached length beside each nonempty payload. Lookup and split traverse these caches directly. [Actual chunk edits](https://hunchroom.com/modules/112) preserve dense semantics through successful edits, bounds failures and later queries. The [stale-cache witness](https://hunchroom.com/p/419) shows why equal flattened content alone is insufficient: an incorrect stored length changes both lookup and insertion position.

[Module 115](https://hunchroom.com/modules/115) adds the missing runtime mechanism. Its check verifies every cached length and nonempty payload, then compares flattened content. It installs the supplied candidate itself, delegates later edits to the actual chunk operations, and rejects invalid cache/content candidates without changing state. [The admission laws](https://hunchroom.com/p/438), [arbitrary mixed future histories](https://hunchroom.com/p/442) and [negative examples with error priority](https://hunchroom.com/p/443) cover acceptance, physical installation and continuation.

This is more relevant than a conversion that silently discards the proposed representation and rebuilds a canonical one. It is a concrete template for database-defined layouts in Ink. However, the current admission check can scan all payload content; it can cost more than the optimisation saves. The model proves behavior, not native allocation or speed, and excludes transaction rollback, crashes and concurrent delivery.

**Ink action:** first support candidate installation at transaction boundaries. Prove valid construction, logical-content preservation, exact rejection behavior and all-future operations. Measure checking and migration costs, and require a workload large enough to amortise them. Checksums alone must not replace exact equality without an explicit collision contract.

## 3. Migration must preserve the continuation, including failure

[Module 110](https://hunchroom.com/modules/110) switches between forward and reversed patch continuations. Both retain the cursor, accumulated output, ordered events and first error. A saved error stops subsequent commands from producing effects. Representation switches preserve that saved error. [The unsafe reset example](https://hunchroom.com/p/409) loses it and permits later work that should remain suppressed.

[Module 40](https://hunchroom.com/modules/40) and [module 46](https://hunchroom.com/modules/46) extend the same idea to working/committed rows, saved transaction frames, pending/published events and versions. [Typed checkpoint continuation](https://hunchroom.com/p/170) rebuilds caches for the complete logical machine and preserves every finite future trace in the stated model.

**Ink action:** a migration certificate must cover the whole continuation that remains observable. At present Ink avoids this harder obligation by allowing maintenance selection only at transaction boundaries; keep that restriction until the source bridge covers undo entries, tentative reads, staged/outbox events, commit exhaustion and poison errors. Logical snapshot equality is not a proof of crash-safe persistence.

## 4. Prove that any choice is safe; measure which choice pays

[Module 114](https://hunchroom.com/modules/114) separates execution equivalence from a cost score containing switches, commands and final observation. [The minimum-score theorem](https://hunchroom.com/p/429) covers every finite Boolean mode vector. [Transaction-by-transaction replanning](https://hunchroom.com/p/433) preserves outcomes. [The greedy witness](https://hunchroom.com/p/434) shows that a locally cheaper choice can lose overall; [failed executions](https://hunchroom.com/p/436) still incur conversion and terminal costs.

There is an important engineering limit in the actual definition: `plans n` enumerates **2^n** vectors. This is a proof-friendly exhaustive reference planner, not a suitable default for an incredibly fast compiler. The score counts declared operation work, not measured wall time, cache misses or RSS. Global minimality in that score is not global fastest execution.

**Ink action:** make safety independent of search quality. A budgeted external selector can propose any checked candidate, using profiling, dynamic programming where its state abstraction is valid, or a bounded search. Include import/checking, warmup, migration, final materialisation and retained-memory costs. Leave a cheap stable fallback when no candidate repays its selection cost. Current Ink measurements already support this direction: delta journals and owned integers help small changes much more than wide changes.

## 5. Fusion must preserve error order and frozen captures

[Pure collection certificates](https://hunchroom.com/modules/48) account for capture safety and fold order. [The capture-alias example](https://hunchroom.com/p/169) demonstrates a boundary where a superficially equivalent rewrite changes what is read. [Stateful certificate use](https://hunchroom.com/modules/59) embeds query replacement in an actual transaction protocol.

[Ordered effectful consumers](https://hunchroom.com/modules/66) and [partial producers](https://hunchroom.com/modules/68) distinguish materialise-then-consume from naive interleaving. If the producer can fail later, starting consumer writes/events early changes the first failure and visible effect prefix. The repair performs nonmaterializing full-input preflight before effects, using immutable captures; successful producer work can be evaluated twice. Avoided temporary storage is not automatically a speedup.

[Partial bytecode](https://hunchroom.com/modules/77), [source translation](https://hunchroom.com/modules/86) and [atomic translation](https://hunchroom.com/modules/87) make failures observable by origin and code. [Deleting zero-add without a positive stack-depth guard](https://hunchroom.com/p/273) erases a real underflow even though zero addition is a value identity.

**Ink action:** future fusion and batch coalescing proofs must cover the actual effect/error semantics. Preserve exact first-error priority, capture timing, ordered events and rollback, or explicitly restrict the fragment to pure total operations. Today's owned BigInt lowering keeps the existing expression tree and evaluation order; it is not a new fusion law.

## 6. Prove the cost of the executable operation, then benchmark

[Reverse accumulation](https://hunchroom.com/modules/106) preserves partial patch execution, errors and atomic outcomes. [Its instrumentation](https://hunchroom.com/modules/107) includes initialization and final reversing, exposing both linear favorable cases and small/existing-state overhead. This is a better performance theorem than counting only append removal.

The [bounded byte codecs](https://hunchroom.com/modules/69), [chunked encoding](https://hunchroom.com/modules/74) and [mixed-block dynamic program](https://hunchroom.com/modules/81) similarly distinguish fewest abstract runs from smallest executable encoding. A shorter run description can violate a bounded count field; literal/repeated mixes have different real byte costs. Claims need the actual format and admission domain.

**Ink action:** put cost instrumentation alongside implementation objects, with explicit units and boundaries. Connect it to emitted operations before calling it a native cost guarantee. Maintain independent observations and timings. The new storage experiment counts allocations in separate binaries and times original uninstrumented binaries; neither count is peak or live memory.

## 7. Prove full state refinement around the arithmetic core

[Module 39](https://hunchroom.com/modules/39) supplies concrete finite-map cached updates and transaction transitions; [module 40](https://hunchroom.com/modules/40) lifts them to arbitrary traces and checkpoints. [Module 46](https://hunchroom.com/modules/46) adds guarded actual UInt64 cache arithmetic with tagged exact fallback and a checked occupied-cell capacity policy. Those are the closest models to the missing part of Ink's cache work.

Their domain is a fixed finite indexed key space with mathematical row values and explicitly modeled snapshot transactions. The capacity bound counts occupied cells; it does not bound allocation, frame/event history, memory or time. There is no compiled-native correspondence, isolation or crash-recovery theorem. The fallback is a correctness mechanism; a speed gain remains to be demonstrated.

**Ink action:** use these as operational proof templates, rather than treating a model theorem as a certificate for today's BTreeMap/undo implementation. Define the source transaction machine and actual candidate transition separately, prove invariant preservation and equal observations, then lift one-step refinement by induction over traces. Pin those definitions through Ink's existing proof-object and source-correspondence architecture. This is the next major verification dependency; current journal proofs only establish cache forward arithmetic and inverse identity.

## The rest of the corpus

The complete index records the remaining replicated editing, causal/history, admission, retirement and codec families. Their recurring lesson is to retain information that future operations can observe: tombstone ancestry, immutable identities, conflict evidence, historical coordinate frames, active leases and pending references. Removing presently invisible data can change later integration or admission. These are valuable negative examples, but most are application-specific until Ink adds distributed value semantics.

Scope needs especially careful reading in broad external-equivalence claims. For example, [problem 106](https://hunchroom.com/p/106) proves a stated shared-history model relationship; its current limitations also discuss an unmodified-source cursor-affinity counterexample. It is not a blanket equivalence claim about all versions and histories of the named libraries. Likewise, number-theory reductions are not compiler optimisation authority. No novelty claim for Ink follows from reviewing this corpus.

## Concrete order of work

1. Finish the source-to-state transition bridge: cache invariants, actual table updates, undo, errors, events and trace induction.
2. Add database-defined physical representations and exact runtime admission at transaction boundaries; cover rejected candidates as well as accepted ones.
3. Add bounded measured selection with migration/setup/terminal costs. Keep universal safety proofs separate from machine-specific performance records.
4. Extend to checked batched effects and partial-producer fusion once the operational semantics preserve failures and captures.
5. Address durable recovery and broader language/workload coverage explicitly; these models do not supply them automatically.

The current performance milestone implements generic ownership lowering, not a new mathematical theorem. It does not warrant reposting existing Hunchroom results as a new proof. A future source/state bridge or a genuinely broader runtime-admission theorem could make a worthwhile Lean contribution, with the executable model and limitations stated precisely.
