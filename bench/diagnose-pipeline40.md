# Fusion diagnosis, Engine40

This lane diagnoses generated loop scheduling and integer representation. It does not modify a compiler/backend, grant rewrite authority, tune a cost model or time anything during preparation. Historical Engine39 and Proof38 artifacts remain unchanged.

The controls preserve the full original strict ESM module, original function/export names and all bytes after the primary function. Originals and byte-identical clones distinguish module URL/import context. Four archived source contexts cover plain/composed arithmetic and both padded zip orientations. These orientations are related constructions, not independent statistical holdouts. Their 96 correctness frames include empty/unequal lists, full U32 wrapping and zero divisors. Sixteen large low/high regime cells are predeclared for subsequent diagnosis; shape and values are joint historical regimes, not independent factors.

Primary comparisons are frozen in `fusion/manifest-final.json`:

| Comparison | Changed factor |
|---|---|
| Original vs byte-identical clone, both versions | Module URL/import context |
| Prior clone vs prior without padding | Remove suffix allocation/copy, keeping staged scalar loops |
| Prior without padding vs its typed counterpart | Intermediate/output storage representation |
| Checked clone vs no `+0` | Neutral operations after quotient/remainder |
| Checked clone vs canonical U32 quotient/remainder | Explicit unsigned integer representation |
| Checked clone vs typed output | Array vs Uint32Array storage |
| Checked clone vs blocked64 | Loop blocking with unchanged per-index scalar instructions |
| Checked clone vs two-pass same buffer | Stage left mapper, then combine right mapper and pair callback |
| Two-pass array vs two-pass typed | Storage representation with two-pass schedule |
| Typed fused vs typed two-pass | Schedule with the same typed output buffer |
| Prior without padding vs checked clone | Multi-factor context; not an isolated causal comparison |

Two-pass uses the same one fresh output buffer as checked fusion. It does not recreate the two scratch arrays of the staged prior. It writes left mapper results into that buffer, then overwrites them with the final right+pair result. Per-index scalar helper bodies remain identical. This schedule relies on this source's pure independent callbacks; it is not a proposal to reorder effectful callbacks. Typed output changes the physical public result representation, even though every word matches. It is a diagnostic experiment and not an admitted target replacement.

Every JS invocation captures both public input arrays and returns its complete owned result. Prepared Wasm captures inputs once and returns a borrowed destination view. Setup allocation observation is used only for untimed resident input nonmutation checks. Output ownership and changed-input lifetime are checked where owned, and every timed result word will enter the common deterministic checksum. Native LLVM reports are static evidence only; no native timing or dynamic profile is performed in this lane.

Ordinary and both-vectorizers-disabled C/Wasm builds keep the same source and other compilation flags. The disabling changes the whole module, so it identifies vectorizer sensitivity rather than proving a particular loop mechanism. Both variants are validated, and named primary/Into LLVM functions are inventoried separately from allocator and ABI code. Instrumented execution cannot supply ordinary timing ratios.

## Untimed findings and hypotheses

All 1,536 variant/frame correctness checks passed. Source/rest-byte and binding audits passed, including missing/duplicate frame, false nonmutation and stale manifest tamper controls. Thirty-two LLVM builds and sixteen executable Wasm controls were prepared.

For the composed source, ordinary Wasm primary/Into IR contains six `udiv` and six `urem` instruction sites in staged prior, versus ten each in fusion. Both have vector IR and successful vectorization remarks. Ordinary native IR has four sites each in prior and two each in fusion. These are static instruction sites including transformed/cloned paths; they are not execution counts. The target difference warrants a compiler transformation/scheduling hypothesis and rules out describing the old loss simply as absent SIMD. It does not establish a dynamic cause.

The source-shape controls can test whether integer coercions/storage representation or staged live ranges alter the measured loss. If a two-pass schedule helps across scalar families and regimes, the general candidate is alternative pure pipeline staging with reusable storage, priced from target evidence. A loop-size whitelist or unconditional fusion penalty would not explain the mechanism. If only a typed representation helps, the follow-up is a universally validated target representation choice with explicit public-output boundaries. No such choice is admitted by these experiments.

## Reproduction and gated timing

Fresh preparation:

```sh
python3 bench/diagnose-pipeline40.py
python3 bench/diagnose-pipeline40.py --compile-static
node bench/diagnose-pipeline40.mjs --output=reports/web-stack-engine-40-2026-10-11/fusion/validate.json
```

The current evidence also retains the initial JS/Wasm validation attempts and manifest. `manifest-final.json` binds the strengthened resident input checks, and its predecessor hash is explicit. Current validation:

```sh
node bench/diagnose-pipeline40.mjs --manifest=manifest-final.json --output=reports/web-stack-engine-40-2026-10-11/fusion/validate-final.json
python3 bench/diagnose-pipeline40.audit.py
```

All outputs refuse overwrite. Reproduction needs a parent-authorized `fusion/serial-gate.json` binding the exact manifest and runner hashes. Predeclared ordinary protocol: three independent Node processes, nine randomized interleaved rounds, 64 warmups and a 4ms per-variant calibration target. Captured JS and resident Wasm comparisons remain separate. No instrumented Node flags are allowed for ordinary speed ratios. Existing source families support exploratory mechanism diagnosis, not a broad superiority claim. Preserve raw journals and every loss; run only in the granted exclusive window.
