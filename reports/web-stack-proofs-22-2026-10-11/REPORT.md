# Checked web-stack proof batch 22

The database adds **60 checked proof objects**, reaching **1648 entries**. There are 15 generic optimization endpoints: three same-condition choice equalities in wrapping word types and twelve indexed self-zip fusions. Three list-fold deployments and twelve index-transport supports are counted separately. Exact source certificates and old-law consequences are archived in [publication.json](publication.json).

Broad superiority over optimized handwritten Rust, Wasm or JavaScript remains **unproven**. Fresh gains are assessed on 8 recipes / 48 cells per CPU row. Four complementary contribution recipes already follow from existing proofs and are shared old-law references. All adverse fresh comparisons are retained. Of 48 fresh cells per target, 30 Node JS, 20 browser JS, 10 Node Wasm, 7 browser Wasm and 39 native resident cells improve over fair prior Ink. These are gains over earlier Ink; expert implementations still win most comparisons, and 32 fresh regressions remain.

## Proofs and compile-time application

| Family | Generic equality | Semantics |
|---|---|---|
| Same-condition choice sum | `choose(c,a,b)+choose(c,d,e) = choose(c,a+d,b+e)` | U32, I32, U64; arbitrary condition and words |
| Both indexed branches of a self-zip | `xs.map_indexed(f).zip(xs.map_indexed(g),h) = xs.map_indexed(i=>x=>h(f(i)(x))(g(i)(x)))` | U32, I32, U64, F32 |
| One indexed branch of a self-zip | `xs.map_indexed(f).zip(xs,h)` or `xs.zip(xs.map_indexed(g),h)` becomes one indexed map | Same four types |

Choice proofs split on the common Boolean condition and normalize selected arithmetic. Three deployment equalities lift this into one wrapping-word fold over a finite list. F32 sum reassociation is excluded. Indexed proofs induct on the list with a generalized natural start index, preserving the same public wrapping U32 index on each branch. Twelve beta-transport supports connect the induction goals. Per-element primitive F32 grouping, output order and length are preserved. Callbacks must be pure and total because stages can interleave.

Complementary add/subtract also have six scalar and six deployment endpoints obtained using only prior partition, dual-sum and predicated-sum equalities. A singleton proof needs explicit predication bridges; failed Normalize-only attempts remain archived. These consequences and their four U32 source bridges are available symmetrically in both stores. Actual selected bodies determine reference classification. Endpoint hash novelty is not evidence of new mathematics.

Sources: [guard proofs](../../knowledge/producers/web_guard22_laws.py), [indexed proofs](../../knowledge/producers/web_indexed22_laws.py), [source certificates](../../knowledge/producers/web_static22_laws.py). Admission uses the unchanged small kernel's ordinary Cases, Induction, Congruence, Normalize, Use and Trans. Static specialization is checked against the complete source, without an export-name whitelist.

All discovery, checking and application occur at compile time. No input-validation wrappers or runtime proof optimizer are added. Existing host backend selection remains separate from compile-time proof optimization. All 102 guarded compiler/backend/runtime/planner files remain unchanged. Historical snapshot `edd38a3302391d76195c377189a95c4f9f893c497198b2c599ce6002df906d37` is preserved; fair prior `0ab5d6cfad0159c86660da8bd09ec1e3c1476195e011826d96fbb59e02f51be0` includes 22 old-only certificates. Current snapshot is `95c096ab4a28114fb70c334b662057bd8abfffe135a3198032f4ea38a679bd57`. All 48 compact selections authenticate minimal dependency closures. Old semantic candidates receive the same bounded static-sharing opportunities; failed admissions remain archived.

The initial whole-catalogue preparation exhausted the unchanged checker's shared proof-work budget. The preserved pretime failure is in [preparation-failed-catalogue-budget](preparation-failed-catalogue-budget/receipt.json). An external benchmark orchestrator now checks every type-indexed discovery root in deterministic batches, then replays each proposed and final selection against its authenticated minimal closure. Both catalogues use the same unchanged search function, costs and search budget. No root is silently omitted and the checker limit is unchanged; this is compile-time orchestration, not measured runtime work.

## Matched performance protocol

Twelve U32 algorithms with natural `(xs,seed,k)` inputs: six scalar guard consumers and six indexed vector consumers. Primary and alternate callbacks are preset instantiations, not an external production corpus. There are 180 complete frames and 72 timed cells: lengths 32, 4096, 65536 under small/full-width distributions. Scalar divisors 2, 3, 5 and cutoffs 512, 256, 128 (full-width counterparts separately frozen) vary with size; these are matched cells, not a size-only scaling experiment. All timed top guard branches occur; nested callback counts remain explicit even where one-sided.

Literal controls retain original eager stages. Strong expert JS/Rust already fuse the algorithm, reuse valid guard quotient/product computations, evaluate indexed callbacks once and may reuse vector scratch. Captured JS, borrowed JS, Wasm, native resident/input-snapshot and actual GPU calls have separate boundaries. Captures, required output allocations, complete output consumption and cleanup are timed as appropriate; vector arrays are fully compared before timing. GPU calls include upload, dispatch, readback and consumption. Fallback is not an actual GPU sample. No handwritten WGSL expert is measured.

Nine shuffled measured rounds use seed 20261031, two warmups and a 15 ms target. Native calibration starts at one call, records timer-resolution zero trials and grows by at most 16. Each common native invocation performs one result check and three untimed prewarm calls uniformly before the measured interval; these differ from the two journaled warmups. Native C and Rust use archived optimized/native flags, different LLVM versions and one common shared-library driver. This is not an Ink-to-Rust emitter or equal-LLVM comparison.

Compiler hash: `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`. CPU/GPU policy bytes equal batch21; authoring, controls, fixtures and policies are not tuned using timings. Author/audit jobs stop during sequential native, Node and three bounded browser contexts. Individual paired median-bootstrap 95% intervals use 4000 Random(0) draws; they are exploratory, unadjusted and correlated. Browser startup sums three contexts; its cold-call map names only the first context, with all raw maps retained.

Totals: **22,356 samples, 7,704 complete benchmark comparisons, 2,052 independently recomputed intervals**.

## Fresh recipes versus fair prior

Each CPU row contains 48 cells. The four old-law references are excluded here; their 24 cells remain in [all outcomes](outcome-tables.json).

| Target / boundary | Faster | Slower | Inconclusive |
|---|---:|---:|---:|
| Node JS | 30 | 10 | 8 |
| Browser JS | 20 | 10 | 18 |
| Node Wasm | 10 | 2 | 36 |
| Browser Wasm | 7 | 1 | 40 |
| Native C resident | 39 | 4 | 5 |
| Native C input snapshot | 36 | 5 | 7 |

All **32 adverse fresh comparisons** remain in [fresh-regressions.json](fresh-regressions.json). Per-family/cohort outcomes and supported median ranges are archived without a pooled speedup.

## Optimized handwritten implementations

Ink versus expert: CPU rows contain all 72 cells including references; GPU contains 36 actual indexed cells. A language-wide ranking cannot be inferred from these recipes.

| Target / boundary | Faster | Slower | Inconclusive |
|---|---:|---:|---:|
| Node captured JS / expert JS | 2 | 68 | 2 |
| Browser captured JS / expert JS | 0 | 72 | 0 |
| Node Wasm / expert Rust Wasm | 6 | 66 | 0 |
| Browser Wasm / expert Rust Wasm | 6 | 65 | 1 |
| Native C resident / expert Rust | 12 | 54 | 6 |
| Native C input snapshot / expert Rust | 7 | 52 | 13 |
| Actual indexed GPU / expert JS | 0 | 36 | 0 |

GPU counters and fallbacks: `{"actual_gpu": 90, "comparisons": 540, "fallbacks": 450}`. Scalar guard recipes retain packed scalar output and CPU fallback. Indexed shader eligibility and prior/current GPU bodies are checked directly in manifests; missing records are not slower GPU observations.

## Evidence and limits

[Catalogue review](catalogue-review.json), [native review](native-final-review.json), [protocol review](protocol-final-review.json), [code shapes](code-shape-review.json) and [final verification](verification.json) bind exact archived artifacts. Fewer loops or arrays do not guarantee faster complete calls. Mathematics applies to arbitrary finite lists with stated semantics; profitability covers these exact fixtures on this machine. A production corpus and broader machines are still needed for generalization.

The DB contains **13,746 canonical observations**, adding 720 Wasm observations with exact programs, plans, workloads, hardware and complete-call samples. JavaScript/GPU measurements remain in raw reports. SQLite is rebuilt as a disposable index. No commit, push or PR was made.
