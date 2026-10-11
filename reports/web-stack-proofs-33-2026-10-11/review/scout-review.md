# Batch 33 independent scout / prepared review

The selected mechanism is independent-list scan projection erasure. A wrapping scan whose values are unused by the zip callback may be replaced by its original input. The input still bounds the output extent:

```ink
xs.scan().zip(ys, fn(unused) => fn(y) => g(y))
// equal to:
xs.zip(ys, fn(unused) => fn(y) => g(y))
```

The right-side orientation is the same mechanism with the arguments reversed. Empty, singleton, unequal-length and independently valued inputs must be validated; neither endpoint is generally equal to `ys.map(g)`. For example, `xs=[]`, `ys=[7]`, `g=identity` yields `[]`, while deleting the zip entirely yields `[7]`.

The prior `web_pipeline23_laws.py` handles a scan zipped with the *same* input and can return a full map. Batch 33 has two independent list parameters and retains shortest-list truncation. `web_collection8_laws.py` is also same-input projection. `web_pipeline31_laws.py` relates a mapped list to a filtered subsequence of that same input. The current producers/name catalogue contain no exact independent scan projection endpoint. This is a bounded catalogue inspection, not a claim that no old-law derivation exists. Fair-prior replay should preserve all old opportunities plus any new Normalize-only helper transports shared with current.

Prepared producer review: six wrapping endpoints (U32, I32, U64), each with beta and arbitrary-initial-state supports. Both orientations use independent list induction. The state update affects only a discarded callback argument; replacing the scan preserves list length and the selected input element, so arbitrary initial accumulators are allowed. The arbitrary callback retains its evaluation grouping and is constrained by Ink's total pure value semantics. F32 scan is unsupported and no floating scan theorem should be published. U64 semantic admission does not establish WebGPU U64 deployment.

The new source specialization uses the existing content-binding producer and existing equality rules. It checks that the discarded de Bruijn argument does not occur, including under nested lambdas, then emits checked Normalize/Use transports. Review must verify rejection of callbacks that observe the scanned argument; helper content changes; rehashed false endpoints; and zero/unequal lengths.

The heldout source composes a mapped producer and two scans. Repeated use of the same generic law may erase both scans. An ignored mapped producer may remain unless an independently checked old or new law removes it. Report actual selected-body operation counts and generated graph counters rather than inferring elimination from callback purity.

No optimization-specific core rule, runtime checker, certificate whitelist or backend change is needed for this mechanism. Performance claims require the same compiler, model and fair catalogue controls, complete outputs before timing, actual WebGPU/no fallback counters, and strong handwritten controls which directly compute only the shortest prefix. A speedup over the prior generated pipeline does not establish superiority over those controls.

A scalar-scan homomorphism was also scouted as a possible later family, with finite corroboration saved separately (`scout_oracle.py`, `scout-oracle.json`). It is not selected, checked, published or included in batch 33 performance claims. An initial suggestion using `skip(1)` was corrected after source inspection: the existing `skip_first` law names do not denote a skip primitive, so that spelling cannot deploy in the current language.

## Checked proof and staging review

The final staging audit passes, saved as `proof-staging-review.json` with exact receipt hashes. All 26 new objects were returned in the ordinary checker's complete admitted closure: six generic endpoints, twelve supports, four bound source deployments, and four old-only Normalize helper transports. The fair prior contains all 2,459 original objects plus those four shared transports (2,463); current contains 2,485. All original discovery names are present and unchanged on both sides, and every fair-prior dependency belongs to that prior. The compiler, staging names, canonical names, admission views and command log hashes match the checked receipt.

Source replay verifies 60 complete frames across four U32 recipes, including both one-empty orientations and 128/1, 1/128, 128/97, 97/128 lengths. The arbitrary-state receipt has 42 typed cases across U32/I32/U64 and both orientations. Rehashed false truncation and rehashed retained/discarded helper changes reject. Four specialization controls reject observing either discarded prefix argument, including nested lexical captures. The independent finite projection oracle additionally passes 204,800 modulus-16 cases and 11,520 complete 32/64-bit cases with independent lists and nonzero accumulator starts.

The producer's novelty receipt compares all 1,653 prior semantic pairs and reports no duplicate endpoint. The independent full-catalogue operation audit finds 30 prior entries exposing both scan and zip with two list parameters; they are batch32 add/subtract laws or their checked source/shared transports. This is an exact-endpoint/structural novelty check, not a global nonderivability claim.

Publisher review found that snapshot IDs do not bind discovery names. The parent resolved this before publication: checked status, old object inclusion, exact extension membership and every old discovery name are verified before canonical writes; hashes bind the original/staged names, admission commands and proof views. `Store.object` also authenticates mathematical object bytes. These hashes preserve provenance; ordinary local checking supplies correctness.

The strong JavaScript and Rust controls and independent benchmark specification have been reviewed. Both handwritten implementations traverse only the selected shorter prefix and omit discarded scan/mapper work. JavaScript returns a fresh array; Rust writes the caller destination. Task ordering matches the Rust dispatch. U32 wrapping, integer quotient/remainder and zero-divisor sentinel paths match source semantics. Untimed preflight validates 192 complete control outputs across 96 frames, nonmutation and owned JavaScript output stability. The Python staged oracle executes the discarded producer, while its direct oracle uses indexed selected values and `divmod`. This separation corroborates the source equivalence. Actual target profitability and GPU execution remain separate evidence owned by the parent benchmarking phase.

## Final direct-call certificates supersede expanded transports

An initial ordinary selection declined the composed heldout bodies because expanding retained helper calls inflated the structural callback cost. The original failed/partial preparation and checked expanded certificates remain archived. The final producer retains the original helper calls while applying the same generic laws. This changes exactly four deployment proof/target identities; every source `from`, bound helper context, generic law and shared old certificate is unchanged. The direct raw targets contain zip and the selected helper call. The composed targets additionally retain the original discarded mapper, while both scans disappear. The final publication contains these four direct certificates; the four expanded certificates are research evidence only and are not included.

`proof-staging-direct-review.json` independently verifies the final complete 26-object closure, all old names/objects, fair-prior dependency closure and every recorded SHA. Final snapshot is `3c78ba2b4059c318afafca2f087c774139c00dc666288c207598b7c91abb2957`; the fair prior remains byte-identical in snapshot to the initial attempt (`d4bb394e910b2b8668dd5c4635fa73f743e3dffbdb240440141665aab7a52118`). Direct replay and all semantic/helper/scope negatives pass with the same complete 60 frames and 42 arbitrary-state checks. This is a DB certificate-shape improvement; neither compiler nor cost model was changed to force selection.
