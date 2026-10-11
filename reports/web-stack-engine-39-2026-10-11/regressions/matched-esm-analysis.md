# Matched ESM regression follow-up

Matched strict ESM fused-versus-staged comparisons remain adverse in all four high-value fixtures across all three fresh processes. Source names/strictness/helpers/exports/rest-module bytes are preserved; the former Function/sloppy confound is removed.
Unchanged original-versus-clone controls show process/path context variation (all point ratios retained); they are not assumed identically timed simply because their bytes match.
Removing the primary concat allocation/copy loops reduces staged arrays4→3, while fused output uses1. The no-padding staged code still beats fused code on all12 fixture/process point estimates. Extra checked allocation or padding-copy cost cannot explain these specific losses.
Four neutral-addition removal has mixed effects and does not consistently close the fused gap. No general neutral-addition speed claim is supported.
All four representative profiled primaries reach TurboFan. Last printed primary code has0 JIT-inlined functions because scalar helpers were already source-inlined. Staged profiles have more observed primary deopts; missing helper inlining, lack of checked top-tier code, and more checked primary deopts are unsupported explanations.
The controlled result localizes these Node losses to staging/fusion of the scalar arithmetic pipeline under these fixtures. Exact causal machine instruction, array representation, scheduling or register-pressure mechanism remains unknown; printed static instructions do not isolate it.
No supplemental actual-browser timing ran. Browser nine-case results and Node/Wasm diagnostic receipts remain separately preserved. No production, cost-model or canonical edits were made by this lane.

Ratios are reference/current; below1 favors reference. All15 pair orientations per frame are retained in JSON.

| Fixture | Pair | Three fresh process ratios |
|---|---|---|
| left_padded_zip_heldout_u32-high-4096 | prior_original_esm / prior_unchanged_clone_esm | 0.9899, 1.0468, 1.0235 |
| left_padded_zip_heldout_u32-high-4096 | prior_unchanged_clone_esm / prior_no_padding_esm | 1.0029, 1.0050, 1.0289 |
| left_padded_zip_heldout_u32-high-4096 | prior_unchanged_clone_esm / checked_unchanged_clone_esm | 0.8770, 0.8993, 0.8479 |
| left_padded_zip_heldout_u32-high-4096 | prior_no_padding_esm / checked_unchanged_clone_esm | 0.8745, 0.8948, 0.8241 |
| left_padded_zip_heldout_u32-high-4096 | checked_original_esm / checked_unchanged_clone_esm | 0.9935, 1.0018, 0.9441 |
| left_padded_zip_heldout_u32-high-4096 | checked_unchanged_clone_esm / checked_no_pluszero_esm | 1.0300, 1.0174, 1.0384 |
| left_padded_zip_heldout_u32-high-65536 | prior_original_esm / prior_unchanged_clone_esm | 1.0146, 0.9767, 0.9542 |
| left_padded_zip_heldout_u32-high-65536 | prior_unchanged_clone_esm / prior_no_padding_esm | 1.0105, 1.0674, 0.9996 |
| left_padded_zip_heldout_u32-high-65536 | prior_unchanged_clone_esm / checked_unchanged_clone_esm | 0.9032, 0.9045, 0.8002 |
| left_padded_zip_heldout_u32-high-65536 | prior_no_padding_esm / checked_unchanged_clone_esm | 0.8938, 0.8474, 0.8005 |
| left_padded_zip_heldout_u32-high-65536 | checked_original_esm / checked_unchanged_clone_esm | 1.0088, 1.0052, 0.9218 |
| left_padded_zip_heldout_u32-high-65536 | checked_unchanged_clone_esm / checked_no_pluszero_esm | 1.0078, 1.0644, 0.9071 |
| right_padded_zip_heldout_u32-high-4096 | prior_original_esm / prior_unchanged_clone_esm | 0.9964, 0.9700, 0.9798 |
| right_padded_zip_heldout_u32-high-4096 | prior_unchanged_clone_esm / prior_no_padding_esm | 1.0115, 1.0287, 1.0691 |
| right_padded_zip_heldout_u32-high-4096 | prior_unchanged_clone_esm / checked_unchanged_clone_esm | 0.8882, 0.8648, 0.9247 |
| right_padded_zip_heldout_u32-high-4096 | prior_no_padding_esm / checked_unchanged_clone_esm | 0.8781, 0.8406, 0.8649 |
| right_padded_zip_heldout_u32-high-4096 | checked_original_esm / checked_unchanged_clone_esm | 0.9743, 0.9405, 0.9809 |
| right_padded_zip_heldout_u32-high-4096 | checked_unchanged_clone_esm / checked_no_pluszero_esm | 1.0485, 1.0893, 0.9927 |
| right_padded_zip_heldout_u32-high-65536 | prior_original_esm / prior_unchanged_clone_esm | 0.9949, 1.0372, 1.0055 |
| right_padded_zip_heldout_u32-high-65536 | prior_unchanged_clone_esm / prior_no_padding_esm | 1.0244, 0.9581, 0.9982 |
| right_padded_zip_heldout_u32-high-65536 | prior_unchanged_clone_esm / checked_unchanged_clone_esm | 0.9141, 0.8649, 0.9031 |
| right_padded_zip_heldout_u32-high-65536 | prior_no_padding_esm / checked_unchanged_clone_esm | 0.8923, 0.9027, 0.9047 |
| right_padded_zip_heldout_u32-high-65536 | checked_original_esm / checked_unchanged_clone_esm | 1.0000, 0.9849, 0.9997 |
| right_padded_zip_heldout_u32-high-65536 | checked_unchanged_clone_esm / checked_no_pluszero_esm | 1.0097, 1.0373, 1.0265 |

## Profile evidence

prior_unchanged_clone_esm: last printed TURBOFAN_JS primary has5492 instruction bytes, 16 observed primary deopts and0 JIT-inlined functions. Helpers already appear inline in source. Static code size/counts do not establish cause.
prior_no_padding_esm: last printed TURBOFAN_JS primary has3988 instruction bytes, 16 observed primary deopts and0 JIT-inlined functions. Helpers already appear inline in source. Static code size/counts do not establish cause.
checked_unchanged_clone_esm: last printed TURBOFAN_JS primary has1580 instruction bytes, 1 observed primary deopts and0 JIT-inlined functions. Helpers already appear inline in source. Static code size/counts do not establish cause.
checked_no_pluszero_esm: last printed TURBOFAN_JS primary has1540 instruction bytes, 1 observed primary deopts and0 JIT-inlined functions. Helpers already appear inline in source. Static code size/counts do not establish cause.

## Limits

Three fresh process estimates retained separately;4000-draw intervals condition on9within-process pairs without multiplicity correction. No27-round independent-process inference.
Six variants execute in seeded interleaving in each process; callsite feedback/order and module URL effects remain measured by no-op baselines rather than assumed absent.
Untimed counted constructors establish primary allocation counts only; they omit engine-internal allocations and are not performance profiles.
Instrumented profile validation/startup/warmup are part of logs; timing ratios use only uninstrumented processes.
Retain exact JIT cause unknown. No universal fusion penalty or source-pattern/hash-specific cost-model rule follows from four selected archived regression fixtures.
