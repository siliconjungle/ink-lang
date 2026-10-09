# Complete-row undo and same-key coalescing

Published as [Hunchroom module 144](https://hunchroom.com/modules/144), verified by Lean and passed by the independent Nanoda checker. The saved status and validation record contain the checker results. The receipt signature is also checked locally against Hunchroom's published public key, and its source hash matches the exact returned source. This checks the site's attestation; it is not another local Nanoda execution.

This contribution comes from Ink's [whole-row undo](../../docs/whole-row-undo.md) and [source row models](../../docs/source-row-models.md). A cache contribution can discard information: two different records can contribute the same number. Correct rollback must retain the complete old record, including absence, as well as reverse the cache change.

The Lean model uses arbitrary key and row types, decidable key equality, and any `Row → Int` contribution function. A store pairs a total `Key → Option Row` lookup with an integer cache. Each undo frame holds the key, complete old optional row, and signed contribution delta. It models mathematical integers and functional lookup, rather than a physical finite map.

The 25 declarations prove:

- One undo reverses a write exactly, including the existing journal.
- Undoing a finite history restores the complete starting machine. Keys may repeat; writes may insert, replace or remove rows. The initial cache need not equal a recomputed total, and the initial journal need not be empty.
- Every subsequent write continuation is identical after restoration.
- Rolling back the complete journal after new writes has the same result as rolling back the original journal.
- Two adjacent writes to the same key can be coalesced into the last write if their undo frames are merged. The merged frame keeps the oldest payload and adds both deltas. The resulting machine equals a single final write, establishing future write and undo equivalence.
- A concrete counterexample shows that equal cache contributions do not imply equal stored payloads.

Coalescing is valid at the modeled boundary only. It cannot erase an observable intermediate read, event, or savepoint. Those effects are absent from this model and require separate evidence. There is no native layout, sorted enumeration, serialization, machine-integer, full transaction or performance theorem here. This is a reusable formalization of standard reversible-update laws, with no novelty claim.

The current catalog scan captured 141 modules. Related modules 39 and 40 cover integer-cell caches and snapshot transaction continuations; 119 and 120 cover physical chunk snapshots and nested control. This module adds the complete arbitrary row payload and per-write delta journal boundary. The scan is duplicate triage, not an independent verification of every catalog entry.

`module-payload.json` is the submitted module; `returned-source.lean` is Hunchroom's exact returned source. All returned declaration types and proof bodies match the payload. Both that source and `module-source.lean` compile locally without errors or warnings. Axiom reports are limited to Lean's `propext` and `Quot.sound`. Local Lean is v4.35.0-rc4; Hunchroom pins a different commit, so local compilation alone does not establish hosted acceptance.

`build_payload.py` reproduces the payload and local source without credentials or network access. `validation.json` pins the evidence hashes and checker status. The original request was rejected by Hunchroom's statement validator because a witness proposition used local `let` declarations; named witness definitions fixed that presentation. Module 143 then failed on a redundant tactic under the hosted Lean version. Replacing the final tactic with a goal-sensitive sequence fixed the compatibility issue without changing the statements. Both attempts are retained.

This Lean publication does not install a new Ink optimization. Ink's existing generic kernel still checks its own database proof format. A native coalescing transformation requires source/effect and runtime correspondence before it can be admitted. No runtime code or benchmark result changes in this contribution.
