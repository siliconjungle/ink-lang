# Complete rows and columns in Lean

Published as [Hunchroom module 151](https://hunchroom.com/modules/151). The hosted Lean check is **verified**, and the independent Nanoda check **passed**. The saved receipt's Ed25519 signature checks against the site's published public key and binds the exact returned source hash. This is verification of the site's attestation, not another local Nanoda execution.

This contribution translates the useful representation laws from Ink's [source-bound row/column packages](../../docs/column-layout-models.md) into standalone core Lean. It has 32 declarations, including separate recursive implementations of writes and lookups for rows and paired columns. A row is an arbitrary complete payload; the proofs do not replace it with its cache contribution.

The main results establish:

- Splitting and joining preserves every key, payload and enumeration position.
- Lookups and insert/replace/remove operations agree across the two representations.
- Every finite future write history agrees, including repeated keys and removals. Exact final sequence equality also establishes enumeration and lookup equivalence. Instantiating the history theorem with each prefix covers intermediate states.
- Both lanes remain aligned. Any aligned initial columns behave like encoding the row history after decoding them.
- A checked decoder accepts encoded rows, and any accepted decoding re-encodes to the exact original columns.
- Unchecked zip can silently lose an extra key or an extra value. Concrete witnesses for both cases are rejected by the checked decoder.

The comparison function is arbitrary, and keys have decidable equality. Correspondence does not need order laws because both implementations make identical branch decisions. This deliberately separates representation equivalence from ordered-map correctness. Sortedness, uniqueness and the comparator laws belong to separate obligations; Ink has its own [sorted-layout proofs](../../docs/sorted-layout-models.md), which this module does not port.

The proofs do not establish native binary search, Rust Vec/BTreeMap refinement, allocation/index safety, atomic migration, effects, serialization or speed. The Lean translation is checked independently, but its correspondence to Ink proof objects is reviewed rather than proved by a translation checker. It adds no optimization authority to Ink's compiler. These are standard sequence/refinement laws; there is no novelty claim.

The submitted and returned sources both compile locally without errors or warnings. Axiom reports contain only Lean's `propext` and `Quot.sound`; there are no placeholders or custom axioms. Local Lean is v4.35.0-rc4, while Hunchroom uses its pinned version. Hosted acceptance is recorded separately rather than inferred from local compilation.

Six well-typed semantic mutations fail their downstream proofs: discarding decoded rows, accepting any lane lengths, disabling either write implementation, returning absent for every row lookup, and accepting unaligned columns in the decoder. Each replacement definition is separately type checked before the full changed library is required to fail. `local-validation.json` records those checks.

The catalog scan captured 148 visible modules for title/description duplicate triage. It found no paired key/value-column module; this is a limited duplicate check, not a line-by-line review or a novelty determination.

`module-payload.json` is the exact submission. `module-bundle.json` and `returned-source.lean` retain the accepted source; all returned declaration types and bodies match the payload. `validation.json` pins the evidence. Reproduction needs Lean and Node but no account credentials:

```sh
python3 reports/hunchroom-column-layout/build_payload.py
python3 reports/hunchroom-column-layout/validate_local.py --lean /path/to/lean
node reports/hunchroom-column-layout/verify_receipt.mjs
```

Runtime source and measured benchmark artifacts are unchanged by this publication. Full native/source/effect correspondence and the broader language/performance objectives remain open.
