# Text CRDT library and performance work

This optimisation pass is closed. The retained ordered document is ordinary Ink
research software; it is not a complete Diamond Types port or an admitted
replacement for a different CRDT source. The implementation passes finite
cross-target and pinned native-oracle checks. Full source/FugueMax preservation,
full-trace, snapshot and peak-memory competition remain open. Historical notes
below record experiments, including alternatives that were rejected. See
[the final decision and evidence](crdt-wrapup.md) for the publication scope.

This work implements CRDTs as ordinary Ink libraries. The compiler may admit
general language, ownership and checking machinery; it must not recognize CRDT
names, algorithms, datasets or application-specific invariants. Reusable
algorithm/layout alternatives and their checked preservation evidence belong
in the independently pinned knowledge repository. Passing tests and matching
source hashes do not establish an equivalence theorem.

The performance target is to beat the pinned current source of Diamond Types
on the retained complete-phase workloads, reporting each workload and its
measurement uncertainty. James strengthened the earlier comparability target;
the previous 1.25-times geometric-mean gate no longer defines acceptance.
Persistent merging, loading, memory and serialized-size comparisons remain
required. All inputs and full outputs must agree under the semantics being
compared. Algorithm families with different merge orders are compared with
their respective semantic oracles. The target remains unmet.

## Current artifacts

- `knowledge/libraries/text_crdts.ink`: scalar YATA/Yjs, RGA, Fugue and
  YjsMod/FugueMax reference semantics, retained tombstones, identity collision
  rejection, idempotent delivery and deletion-before-insertion support.
- `knowledge/libraries/measured_sequence.ink`: a general implicit treap with
  stable slots, parent/neighbor links, total and visible subtree measurements.
  No CRDT types or matching occur in this library.
- `knowledge/libraries/indexed_text_crdts.ink`: indexed implementations and a
  local-edit API, admitted and differentially validated; its per-character storage still trails Diamond Types.
- `tools/crdt/differential.mjs`: 1,200 random replica histories, 54,038 edits,
  289,440 state comparisons against upstream sequence algorithms and independent
  Fugue/FugueMax trees. This validates the scalar implementation, not universal
  convergence or an arbitrary-source bridge.
- `tools/crdt/sequence_test.mjs`: 100,000 general indexed sequence edits checked
  against JavaScript array semantics.
- `tools/crdt/fetch_sources.py`: exact upstream revision capture and a complete
  public Hunchroom harvest. Captured 885 problems, 876 proof sources (870 verified,
  four failed, two partial), and 233 modules. Seventy-seven entries concern CRDTs,
  causal histories or compression. Raw material is under ignored `build/crdt`.
- `bench/crdts/run.py`: native complete local-edit/text-materialisation comparison
  against Diamond Types. Concurrent merging, memory and loading remain additional
  required phases; this local phase alone cannot close the target.

## Proof boundaries found in source review

Hunchroom #106 verifies its exact YjsMod/FugueMax model equivalence, including
tombstones, using previous-visible left origins and immediate following raw
right origins. Submissions #125 and #567 have verified Lean and Nanoda verdicts.
It explicitly does not establish a complete native implementation bridge.
The upstream list demo chooses another cursor affinity after deletions. The
scalar differential harness therefore uses the formal generator convention for
Fugue/FugueMax; it tests the unchanged independent tree as another oracle.

#493 supplies maximal non-interleaving for the specified model. #469 covers
historical views. #542 relates a scalar integration model to the formal scan.
#195 supplies a counterexample to readiness in FugueMaxSimple save/load; that
source must not be promoted to a universally correct specification.
#865 (Sync9/Fugue) and #871 (pairwise OT/FugueMax) remain open, despite bounded
supporting checks. None may authorize a production rewrite.

## Additional verified work

The pinned production sources now supply independent semantic checks:
Yjs 160 replica histories, 8,464 edits and 11,851 states (BMP Unicode);
Automerge 160 histories, 8,378 edits and 23,696 scalar/indexed comparisons
(actual insertion Lamport clocks via native cursors); Loro 160 histories,
8,347 edits and 13,945 states (including astral Unicode). These tests are not
universal equivalence certificates. Yjs uses UTF-16 coordinates; the Ink library
uses Unicode scalar coordinates. The Yjs test corpus deliberately uses the
coincident BMP domain and records that limitation.

`causal_ranges.ink` supplies general heap-based compressed DAG differences,
checked against 3,000 random closure-set calculations and a 10,000-node chain.
`event_graph_text.ink` uses it for retreat/advance and separate current/final
visibility. `compact_event_graph.ink` and `slot_text_crdts.ink` replace repeated
external-ID lookups with local handles and separate payload/sequence storage.
Each walker passes 500 independently generated histories (24,979 events).
The eg-walker reference defaults to plain Fugue; the test names and retains its
documented one-line FugueMax variant explicitly.

The native event benchmark validates complete outputs against current Diamond
Types before timing. Its adapter sorts frontiers by local version as required
by Diamond Types; unsorted wire-ID order is invalid for that API. This correction
is part of the benchmark, not a change to the oracle. Retained small concurrent
fixtures initially appeared roughly 2–3 times slower in the best experimental layout.
The fair adapter now uses Diamond Types' own compressed identity lookup, without
an extra per-event BTreeMap; linear synthetic results are about 1.4–1.6 times
slower. These small synthetic measurements do
not establish the real-trace or lifecycle performance gate.

The latest complete sequential real-trace batch ingestion/materialisation
experiment records median slowdowns of 5.69x (S1), 4.92x (S2), and 4.68x (S3).
Concurrent prefixes record 5.57x (C1), 5.11x (C2), 3.41x (A1), and 31.48x (A2).
These are three-sample discovery measurements, with full output comparison
before timing. They used an explicitly chosen direct-buffer physical plan and
experimental generated-Rust inline hints. The hints are outside the sealed plan
pipeline; these results do not demonstrate automatic planner selection or the
performance target. Full concurrent traces and additional lifecycle phases remain
required.

General scalar projection hoisting is now discoverable through the knowledge
producer catalogue and ordinary semantic search, rather than only a CRDT tool.
Its Normalize evidence binds exact source definitions; independent admission is
still required. A record-and-fold integration test checks discovery, selection,
wrapping values and literal JavaScript emission. The planner now has a general
offline Rust pure-call acquisition adapter for measured plan ranking; this does
not itself establish that the CRDT implementation is profitable.

The ordinary compiled planner has now measured six independently checked native
source plans on three 40-change trace prefixes. All six matched reference
outputs; measured ranking selected direct buffers without borrowed reads, about
22% below the baseline's aggregate training time. No generated-Rust inline hints
were added. State/action representation recipes decline pure-only sources instead
of spending their state limit on vacuous state replacements without callable pure
exports. Published earlier experiments remain separate from the pinned empty
source snapshot used for this search.

The selected plan's separate eleven-sample evaluation still misses the target:
S1/S2/S3 are 5.26x/5.35x/5.00x slower than Diamond Types; C1/C2/A1/A2 prefixes
are 5.74x/5.61x/4.95x/30.07x. The seven-row geometric mean is 6.80x. This
establishes actual proof-checked planning and measured selection of a physical
choice, not automatic invention of the library algorithms or competitive speed.
The retained report is `build/crdt/batch-native-planned-results.json` and the
search receipt is `build/crdt/batch-autoplanner/selected-source.json.receipt.json`.

Five generic sequence laws are checked in the independent proof store under
`knowledge/libraries/proofs/sequence`. Its decoded-history induction requires
an actual step-commutation premise: it does not by itself prove any concrete
tree/CRDT representation correct. Source-specific general definition unfolding
is also independently admitted and replayed, rather than authorized by names.
Checked physical plans select owners and layouts; absent bounds or unchanged-
field evidence grants neither unchecked reads nor omitted writes.

Compiler changes remain general: a bounded work queue elaborates generic helper
call graphs independently of lexical nesting; typed walking covers Option and
Result callbacks; semantic enum literals have checked source correspondence;
selected borrowing covers length/index observations of lexical list fields; final-use field projections can move their value when the root is no longer used or captured.
Nested packed Buffer owners now compile and pass native/Rust-Wasm parity,
including widening integers and raw NaN/negative-zero payloads.

## Run representation and general word conversions

`interval_index.ink` stores disjoint half-open `u64` key intervals with stable
handles, including the maximum word via an explicit end sentinel.
`weighted_sequence.ink` supplies total/live extents and offsets inside items.
Independent tests cover 99,946 interval queries and 200,000 weighted queries,
including zero extents/weights, out-of-range lookups and overlap rejection.

`run_text_crdts.ink` splits and coalesces forward identity runs, preserving
original origins, stamps, payloads, tombstones and deletion-before-insertion.
It passes all 1,200 random replica histories from the differential harness;
60,000 local edits also match complete scalar/indexed atom metadata and text,
including BMP/astral Unicode and first-error retention. All four ordering
families are present. Reverse runs, event-range state changes and critical
version materialisation are still required. A local generated-history path
avoids searching for concurrent items because that builder creates one actor
and incorporates every prior local operation. That restricted invariant is not
a licence to skip integration for arbitrary incoming operations.

The language now has fixed unsigned conversion primitives:
`word_widen_u32_to_u64` zero-extends, and `word_narrow_u64_to_u32` retains low bits.
Modules using them require executable-core V11; existing modules retain their
previous versions. Wrong input/result types and forged version downgrades are
rejected. C, Rust, JavaScript and Wasm checks cover values, events, rollback and
snapshots. No CRDT names or algorithms occur in this compiler machinery.

## Callback capture and batch experiments

The untrusted `capture_projections` producer proposes scalar field hoisting
outside callbacks, using exact typed source terms and ordinary Normalize proofs.
The compiler admitted 34 of 44 source-specific proposals; rejected proposals do
not become authority. No algorithm name is required. This addresses cases where
capturing a scalar field conservatively keeps its whole containing record shared.

`batched_event_graph.ink` represents contiguous actor event intervals as normal
library records: deletions then insertion codepoints, with one external frontier
and implicit internal parent chains. Its atomic expansion and text agree with
the independent FugueMax walker on 300 histories and 23,097 concurrent events.
It has a validated linear batch path; concurrent batches currently expand into
the existing walker, so large-trace performance is not yet competitive.

The first forward-run local implementation still misses Diamond Types: 6,000
single-character local edits remain about 5–15 times slower across retained
patterns. Explicit all-function native inlining hints are experimental artifacts,
separately tagged, and do not constitute a sealed source-proof-only selection.
Packed columns were also adverse and are retained as rejected performance data.
After replacing the benchmark adapter's per-event external-ID map with Diamond Types' own public RLE identity lookup, the linear event path also remains about 1.4–1.6 times slower. Earlier timings with the extra map are retained but do not establish native-Diamond-Types parity.

The native author-history variant (`native_event_graph.ink`) accepts distinct
same-author IDs on concurrent branches; the actor-prefix variant retains its
stricter validation and proof scope. Actual paper JSON splits some authors into
logical actors. The trace adapter derives original names and sequence positions
from the pinned `.dt` files; numeric JSON actor IDs are not used to invent a new
tie order. Full synthetic checks remain valid after this adapter correction.

## Remaining mandatory work

1. Finish indexed admission, independent oracle checks and CPU/Wasm parity.
2. Replay and audit relevant external proofs, then establish precise source
   correspondence and representation preservation for accepted alternatives.
3. Implement causal event-graph walking, retreat/advance, compressed runs and
   critical-version fast-forwarding as ordinary library algorithms.
4. Generalize profitable ideas into checked database entries. Candidate families
   include interval split/coalescing, sparse weighted prefix indexes, exact
   lookup hints, append logs, version-frontier differences and guarded work
   skipping. Only admitted proofs can enable alternatives.
5. Measure real sequential and concurrent editing traces, Unicode, adversarial
   conflict shapes, incremental edits, replay, loading, serialization, memory,
   and setup/selection costs. Retain adverse rows and complete outputs.
6. Iterate until the stated Diamond Types gate passes, run required integration
   checks, then publish all changed repositories on main with exact pins.

The latest completed full-trace acquisition establishes sequential wins:
The accepted whole-target control uses 32.2%/21.0%/21.0% less elapsed time than Diamond Types on S1/S2/S3. Concurrent
C1/C2/A1/A2 require 1.94/1.66/2.48/2.06 times Diamond Types elapsed time. These results do not close the
complete performance, proof or lifecycle gates; see `crdt-span-walking.md`.

## Retained atom application and portable loading

`examples/crdts/persistent_atoms.ink` is an ordinary stateful application using the existing scalar atom library. It retains complete atom identities, left/right origins, stamps, payloads, tombstones and pending deletion identities. The document mode is fixed after the first successful merge. Receiving a batch uses normal Result propagation and commits atomically; conflicting identities roll back the entire batch. This is a logical lifecycle baseline, not the fast batched walker or a competitive persistent merge implementation.

`tests/persistent_crdt.rs` passes C, Rust, JavaScript, C-Wasm and Rust-Wasm with exact portable snapshots, deletion-before-insertion, astral Unicode, future operations after restore, duplicate insertion delivery, conflicting batch rollback and mode-change rejection across all four ordering modes. The strengthened final run passed in 9.83 seconds. `tools/crdt/persistent_atoms_test.mjs` restores into a fresh JS instance at every operation boundary in 20 cached pinned upstream histories: 934 checkpoints and 1,868 merges match full atom metadata and visible text. These finite checks do not close the native Diamond Types persistent timing/memory/save-load comparison or universal FugueMax source bridge.

The separate `persistent_runs.ink` application retains the run-based representation through `run_state_codec.ink`. Because Buffer/Map are scoped temporary values, the codec stores immutable node/span/payload/interval lists and pending key/value pairs, then reconstructs temporary owners inside pure helper calls. Actions only receive ordinary frozen results. A merge checks the engine error and index validity before committing, without decoding every atom merely to validate success. This uses existing language machinery. Reconstructing owners and transaction state may cost copies; no competitive lifecycle performance claim follows.

The compressed application passes all five CPU targets with exact snapshots (48.74s) and the same 934 fresh-instance restore points/1,868 merges against complete cached upstream atom metadata and text. Eleven arbitrary frozen-field load/store equalities are admitted under `libraries/proofs/run-state-codec-fields`; they cover nodes, sequence root/first/last/fallback, spans, payload, interval nodes/root/validity and error. Pending-map normalization, full codec inverses on malformed states and maintained tree invariants remain unproved.

The generic `map-pair-laws.ink` last-write lookup law is checked by generalized list induction for arbitrary pair lists, initial maps, queried keys and fallbacks. Wrong-key and first-write decoder variants are rejected. The law is stored under `libraries/proofs/map-pair-lookup`. A first attempt to compose it with the actual run codec loader failed source equality checking and is retained as rejected evidence; the actual pending-map source bridge remains unadmitted.

The actual run-codec loader now has a checked pending lookup source bridge: `6d43dec5b85c4a01150f77b1cb9655b8ab69f0583aee4df36309c2bbc7ff855a` under `libraries/proofs/run-state-pending-lookup`. A carrier-fold intermediate law matches the elaborated loop and composes with actual source. For arbitrary stored pair lists, key and fallback, loader `get_or` equals the ordered last-write scalar fold. Portable replay and a valid rehashed always-true false conclusion pass/reject respectively (0.408s). This supersedes the earlier failed direct composition only for this lookup observation; encode inverse and representation invariants remain open.

`tools/crdt/snapshot_sizes.mjs` records complete portable snapshot byte sizes for the retained scalar/run applications after validating full upstream atom metadata, then restores into a fresh instance and checks logical equality. Both sets contain 20 cached histories, binding exact module/input bytes and each snapshot hash. The reports `persistent-atoms-snapshot-sizes.json` and `persistent-runs-snapshot-sizes.json` describe only Ink encoded sizes; native Diamond Types size and retained/peak memory comparisons remain required.

The retained causal-batch application `persistent_causal_batches.ink` now uses `causal_batch_state_codec.ink` to preserve the whole-target walker, causal workspace, identity indexes, applied targets and exact accepted input history. Duplicate identical batches are skipped; conflicts fail the ordinary transaction. Five CPU targets pass exact snapshots, restore followed by concurrent edits, idempotency and rollback (50.08s). A separate JS replay passes 400 independent generated histories, 1,577 fresh-instance restore points and 4,731 merge calls with exact visible text and retained operations; maximum-u64 fixture parsing preserves exact identity bytes. This application supports the whole-batch frontier domain of the walker. Codec field/invariant proofs, interior-frontier support and native DT matched timing/memory remain required.

`bench/crdts/persistent_diamond.rs` validates the same 400 generated causal histories against pinned native Diamond Types: 1,577 full-log encode/load points, exact pre-restore text and operation counts, future concurrent batches and duplicate encoded-log merge all pass. Both systems now have independently checked future-merge round trips on identical histories. This is correctness evidence only; matched incremental merge/load timing and memory acquisition remain open.

The first eight-history lifecycle smoke measurement uses preconverted inputs and excludes text checkout for both systems. Ink retained merge is 19.6–66.5 times native DT OpLog ingestion; save/load ratios are 23.4–29.3/25.4–30.8. This is diagnostic evidence: DT OpLog ingestion does not maintain a visible branch, whereas Ink merge updates its run representation. The stronger comparison harness now includes `ListCRDT` branch merge and restoration before any document-level performance claim. Full workload and memory comparison remain open.

The stronger eight-history/11-round native lifecycle comparison includes DT `ListCRDT` branch merge and branch reconstruction on load. Exact output equality passes outside every timing interval. Ink/DT point ratios are 3.24–5.45 for merge, 22.93–29.59 for save and 6.58–12.28 for load, on this finite smoke set. Compiler, source, emitted code, fixture, both harnesses, executable, native revision and flags are bound by `persistent-lifecycle-document-results.json`. This closes a diagnostic comparison, not full-trace competitiveness. The separate indexed source variant replaces linear duplicate scans with the already maintained interval index, retaining exact input equality validation and ordinary rollback; validation is in progress.

Indexed duplicate detection passes all five CPU targets (34.84s) and the 400-history/1,577-restore oracle. Its separate eight-history native smoke run measures Ink/DT document-merge ratios of 2.84–3.77, with complete artifact hashes. Acquisitions differ, so comparison with the earlier 3.24–5.45 range is diagnostic rather than a paired speedup claim. Buffered history additionally passes all five CPU targets (39.81s) and the same independent restore oracle. An explicit eight-batch incremental boundary is now under measurement; DT maintains its branch after each matching chunk.

The frozen buffered binary also validates 400 independent short histories at eight-batch transaction boundaries with 11 rounds each. Ink/DT merge has median case ratio 1.534 and ratio of summed medians 1.328; only ten case point estimates favor Ink. Save/load summed ratios are 26.56/7.65. These broad short-history measurements contradict any claim of overall persistent parity; full real histories, confidence and memory remain required. Artifact `persistent-lifecycle-buffered-400-results.json` binds the identical executable and all input bytes.

Real concurrent prefix lifecycle acquisition (11 rounds, 64-batch transactions) validates pinned DT output equality and reports Ink/DT merge ratios C1 6.41, C2 8.16, A1 41.00 and A2 1.68. Save ratios are 50.46/51.63/120.78/98.73; load ratios 9.81/11.71/74.48/22.00. These results show that short-history comparisons do not establish scalability. Whole-input history copies and frozen physical state reconstruction remain candidates for direct profiling; no performance target is closed.

A finite A1-prefix diagnostic validates exact pinned native output before sampling the unchanged emitted persistent library. Its initial window includes restore and shows allocator, hash/portable parsing, memory movement, stored-record clone and map reconstruction costs. These samples are not timing evidence. A separate readiness-marked profile preconstructs retained states and input chunks to isolate merges; portable parsing samples must not be attributed to the merge hot path.

The merge-only profile preconstructs 1,000 retained states and input chunks before a readiness signal, then samples the A1-prefix merge window for one second. It identifies endpoint-map rebuilding in codec load (107 sampled BTree inserts) and codec store (86 sampled map gets), alongside stored-record cloning. `endpoint_index_span_graph.ink` removes this redundant endpoint map: exact endpoints resolve through the existing operation interval index and retained batch slots, including wrapped-u64 end handling. The corresponding codec/application passes five CPU targets (37.66s), the 400-history restore suite and maximum-u64 fixtures. Exact source/invariant replacement is still unproved; this remains an ordinary alternative, with real-prefix performance under acquisition.

Endpoint-index real-prefix acquisition completes with exact output validation. Ink/DT merge ratios are 5.45/7.32/27.68/1.44; save 47.19/50.75/119.96/96.06; load 9.83/10.92/74.68/21.46. Endpoint-map elimination reduces raw merge medians versus the prior separate acquisition by 14–34%, but these are not paired confidence claims. Persistent competitiveness remains unmet.

A paired three-variant lifecycle acquisition confirms endpoint-map removal: candidate/control merge ratios are .8803 (.8211–.9926), .8401 (.7396–.8921), .6822 (.6524–.7328), .8517 (.8377–.8790), nominal95% paired bootstrap intervals over 11 rounds. Save A1/A2 improves; load intervals cross parity. Control ABI symbols alone are namespaced for linking and separately hashed; measured methods remain literal emitted code. The flat-history arena alternative passes all five CPU targets (48.06s), 400 independent histories and maximum-u64 restore fixtures. Arena inverse/equality/bounds proofs remain unadmitted; paired profitability measurement is running.

Flat-history arena paired real-prefix11 confirms merge reductions C1 10.0% (.8997, .8912–.9088), C2 10.0% (.9002, .8826–.9109), A1 23.2% (.7684, .7356–.7754), A2 11.4% (.8859, .8597–.8969). Save regresses 3.6–5.8% on all four; C1/C2 load regresses 1.9%/3.0%, others cross parity. Retain it as a measured merge-oriented source alternative, not an unconditional default. Ink/DT merge ratios remain 4.77/6.54/20.71/1.26. Artifact provenance/wrapper reversal and a forged-median rejection pass the lifecycle audit.


The typed native checkpoint writer and restore reader remove the intermediate JSON tree for supported finite schemas while preserving the portable byte contract. Paired, isolated acquisitions show roughly 82–84% less save time and 82–83% less load time against their preceding implementations. This does not establish lifecycle parity: `typed-restore-diamond-ci.json` reports retained merge ratios 5.32/7.11/28.59/1.38, save 7.75/8.11/19.34/17.21 and load 1.70/1.95/12.70/3.86 on four real prefixes with 64-batch transactions. Whole-trace persistent performance and retained/peak memory remain open.

The remaining persistent copy cost is visible in literal emitted code: merge clones the Engine and History roots before calling accepted, reconstructs scoped buffers from their stored lists, and clones the returned engine field before setting the state root. Transaction rollback retains the previous root until commit. The checkpoint includes physical graph/tree/workspace arrays and exact accepted history, rather than only a compact operation log. A general ownership/transaction optimization must preserve failure rollback, host rollback and portable state; a compact maintained representation additionally needs checked source/action and codec bridges. Existing profiles precede the endpoint-map removal and cannot quantify the current shares.

Normal offline planning now accepts bounded setup/action sequences on JavaScript. It validates complete outcomes, exact portable states and unchanged inputs before accepting observations; restore/setup are outside the timed sequence. A separately emitted source descriptor supplies action argument types to representation facades. The counter-v2 normal search admits and measures four candidates with no rejected measurements. This is a tooling check, not a CRDT speed claim. Native action acquisition and broad maintained CRDT representation proofs remain open; manually authored library algorithms are still separate from planner discovery.

The first retained CRDT action acquisition also completes through normal search: four admitted JavaScript candidates, eight phase observations and no rejected measurements, on two generated training sequences with eight retained and eight incoming changes. Full action outcomes and exact before/after portable bytes agree. The small timing differences do not establish a speed improvement or Diamond Types parity; the acquisition closes the general action measurement path for this supported domain. Receipt: `build/crdt/stateful-crdt-planner-v1/selected.json.receipt.json`.


The retained row-history alternative replaces the growing deep copy of every historical Change with point reads for incoming identities, transactional bulk writes for new rows and a separate ordered identity list. It preserves exact accepted-input history and handles duplicates within a transaction with scoped storage. Four hundred histories (1,577 fresh restores/4,731 merges) and five CPU targets pass. It remains an authored application alternative pending its complete source preservation bridge and lifecycle tradeoff measurement.

The deferred sequence-measure alternative accumulates modular live-weight deltas for stable edits in the same leaf and flushes before structural edits, fallback paths or returning to a caller that can observe prefix measures. It is general sequence-library source. Four hundred histories and five CPU targets pass; universal deferred-tree preservation is still required.

A source-bound complete Stored -> loaded -> stored identity is now checked for the endpoint codec, including every stored field and arbitrary input values of that type: optional proof cd21e34fe0495fa5df2a9ecdfddfa02ae43f29bb634ae749f220c2db7c214815. The generic producer emits ordinary unfold/beta/projection/congruence/normalization proofs and rejects a swapped-field inverse. This proves the concrete codec inverse, rather than a CRDT semantic invariant. A separate arbitrary-type, arbitrary-step ordered append/replay theorem d4a5b0e149ee9ca15efcceb1373993a7579125a6301b49ae0b469314cfcb8d83 supplies the algebraic basis for maintained replay caches. Compact operation-log document save/load is now implemented as an ordinary library API; it does not replace full portable host checkpoints, and its complete packet/replay proofs remain open.

Native offline planning now also accepts bounded action sequences and portable initial seeds, with independent reference continuation, full outcomes and exact before/after snapshots. The Rust measurement adapters import literal emitted modules, use unique Cargo package identities, and verify the compiled-in emitted-source digest. Two distinct layouts pass schema-2 setup and schema-3 seeded integration checks, including rollback and rejected unproved plans. This corrects an observed shared Cargo package-name collision caught by the seed schema check: that rejected seed was never used for training. Older pure native planner observations from adapter v1 require fresh acquisition before trusting their rankings. Independent CRDT head-to-head harnesses already import literal modules and are unaffected by that library-link collision.

Checked physical column alternatives now offer shared pages of 64 or 256 elements through normal source-capability recipes. Snapshot clones share pages, while edits detach touched pages; logical portable bytes remain unchanged. These are generic physical storage choices, not CRDT recognition. The initial page implementation passes five CPU target comparisons, physical gate rejection cases and the generic suite's 13 actual GPU calls/160 matched results. A subsequent refinement compares actual scalar values before detaching unchanged columns, preserving raw float bits; its final target validation is pending. The normal paged-layout planner experiment uses disjoint generated training histories; real trace prefixes are held out.

The retained storage search now offers direct owners and indexed tables independently of columns. A normal three-state native acquisition selects that combination with complete source outcome/snapshot validation. The 31-round held-out paired acquisition confirms merge/control ratios .801/.804/.670/.721, with all nominal95% intervals below parity. Relative to pinned DT, merge ratios are 3.966/5.433/13.087/.932: A2 beats DT by roughly 7%, while the other three remain slower. Save remains much slower, and some loads regress slightly against the previous Ink implementation. Reports and audit: `build/crdt/persistent-direct-selected-heldout-31-*`. This is finite prefix evidence, not full-trace competitiveness.

All-column paging was rejected by normal search and subsequently regressed held-out merge by 5–91%; it is not the current selected layout. Fresh diagnostics identify copying, stable-tree child reindexing, selection and interval predecessor searches. The exact sample is readiness-marked and bound to literal source; sample counts are not elapsed-time fractions.

General indexed-loop frame proof authoring now discharges concrete callback preservation rather than assuming it. Checked source observations establish that sequence selection returns the complete original tree (677a0e577639aa2f26210c1c08d9d00619fd632405c8c1f66c4754bfb452ec8f), text-engine selection returns the complete original engine (96de189b1040b4106c28a0ef549dc41c1feedc1d0463c10566603fba61e5b405), and zero-offset splitting returns the original engine (6dd91fa0dd61bfe4cce6566e10a85eef3c1025104af196adb95b2af99dfeba37). These quantify over arbitrary typed inputs, without a well-formed-tree premise. The producer rejects a mutated callback and the checker rejects its reused proof even with a freshly rehashed definition context. Complete deletion/apply replacements and the broader FugueMax bridge remain open.

The boundary-selection source alternative reuses the first selection at offset zero; 400 histories/1,577 restores/4,731 merges and all five CPU targets pass. A separate authored run-coalescing alternative extends adjacent compatible tail spans while preserving exact batch target IDs/subranges, allowing later forks to split them again. It passes the same JS corpus and an 800-edit tail run followed by interior forks and deletion. Pinned native DT independently agrees with the latter expected document. Coalescing still needs final CPU validation, matched performance and its complete reachable-state/source preservation proofs. It is not yet an admitted planner algorithm replacement.

The next replay optimization extracts unchanged index data from the loop state.
`readonly_interval_index.ink` keeps the node owner outside predecessor/successor
iteration and carries only the current and best handles. The general database
producer `loop_state_embedding.py` discovers smaller record accumulators among
ordinary source alternatives, constructs an embedding, proves every transition
and stopping predicate on embedded states, and proposes exact call replacements.
It adds no compiler recognizer or proof rule. Full predecessor and successor
source equalities have replayed in the existing kernel (including every returned
index field and malformed typed indexes); the theorem does not require a valid
search tree. This is narrower than a convergence or FugueMax bridge. Performance
selection and the CPU conformance run remain pending as of this note.

Tail-cursor held-out acquisition (31 paired rounds, frozen C4 compiler) did not
justify a default switch: relative to the earlier selected direct/indexed rows
implementation, merge ratios were C1 1.016 [1.004,1.032], C2 0.996
[0.975,1.022], A1 0.960 [0.943,0.970], A2 1.090 [1.053,1.102]. This candidate's
normal training search chose direct/ordered storage. The four real-prefix
checkpoints remained the same size. Artifact audit passed. Source coalescing and
tail shortcuts still lack their complete maintained-tree equivalence proofs.

The deletion-boundary replacement now has a complete source function equality:
`41ac82a43426ea9e3c2751df545c4a571f1695dfb7db8fc52c2e44dc42df9a4a`.
It proves the entire `Deleting` result, including the engine, pending targets,
position and remaining count, for arbitrary typed inputs. Its premises are the
checked query state-frame equation, the exact zero-offset split equation and a
checked scalar equality-test elimination. The general proof-authoring tool lifts
an argument equality through an unchanged source let continuation; it does not
expand the large shared continuation or increase checker budgets. Portable query
laws export actual library equations without requiring test observer wrappers in
applications. This closes the preservation gap for this deletion optimization;
coalescing, retained-tree redesign and the full FugueMax source bridge remain open.
The narrowed lookup passed all five CPU targets with 168 exact result/snapshot
cases, including malformed indexes. Normal performance selection is still pending.
