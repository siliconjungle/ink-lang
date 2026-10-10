"""Present exact checked roles and measured results without universal speed claims."""
import json
from pathlib import Path
R=Path(__file__).resolve().parent
read=lambda n:json.loads((R/n).read_text())
m=read('metadata.json');p=read('publication.json');o=read('outcome-tables.json');c=o['counts'];v=read('verification.json')
def table(items,expert=False,scope='fresh'):
 text='| Target / boundary | Faster | Slower | Inconclusive |\n|---|---:|---:|---:|\n'
 for label,key in items:
  d={}
  for role in (['fresh','reference'] if scope=='all' else [scope]):
   for k,n in c.get(role+'|'+key+'|all',{}).items():d[k]=d.get(k,0)+n
  text+=f"| {label} | {d.get('Ink_faster' if expert else 'faster',0)} | {d.get('expert_faster' if expert else 'slower',0)} | {d.get('inconclusive',0)} |\n"
 return text
prior=[('Node JS','node||prior_over_checked_js'),('Browser JS','browser||prior_over_checked_js'),('Node Wasm','node||prior_over_checked_wasm'),('Browser Wasm','browser||prior_over_checked_wasm'),('Native C resident','native|resident|prior_over_checked'),('Native C input snapshot','native|snapshot|prior_over_checked')]
expert=[('Node captured JS / expert JS','node||ink_checked_js_over_js_expert'),('Browser captured JS / expert JS','browser||ink_checked_js_over_js_expert'),('Node Wasm / expert Rust Wasm','node||ink_checked_wasm_over_rust_expert_wasm'),('Browser Wasm / expert Rust Wasm','browser||ink_checked_wasm_over_rust_expert_wasm'),('Native C resident / expert Rust','native|resident|checked_over_rust_expert'),('Native C input snapshot / expert Rust','native|snapshot|checked_over_rust_expert'),('Actual indexed GPU / expert JS','browser||js_expert_over_ink_checked_gpu')]
fresh=sum(t['fresh_proof_required'] for t in m['tasks'].values());references=len(m['tasks'])-fresh
text=f'''# Checked web-stack proof batch 22

The database adds **{p['added_entries']} checked proof objects**, reaching **{p['entries']} entries**. There are 15 generic optimization endpoints: three same-condition choice equalities in wrapping word types and twelve indexed self-zip fusions. Three list-fold deployments and twelve index-transport supports are counted separately. Exact source certificates and old-law consequences are archived in [publication.json](publication.json).

Broad superiority over optimized handwritten Rust, Wasm or JavaScript remains **unproven**. Fresh gains are assessed on {fresh} recipes / {fresh*6} cells per CPU row. Four complementary contribution recipes already follow from existing proofs and are shared old-law references. All adverse fresh comparisons are retained.

## Proofs and compile-time application

| Family | Generic equality | Semantics |
|---|---|---|
| Same-condition choice sum | `choose(c,a,b)+choose(c,d,e) = choose(c,a+d,b+e)` | U32, I32, U64; arbitrary condition and words |
| Both indexed branches of a self-zip | `xs.map_indexed(f).zip(xs.map_indexed(g),h) = xs.map_indexed(i=>x=>h(f(i)(x))(g(i)(x)))` | U32, I32, U64, F32 |
| One indexed branch of a self-zip | `xs.map_indexed(f).zip(xs,h)` or `xs.zip(xs.map_indexed(g),h)` becomes one indexed map | Same four types |

Choice proofs split on the common Boolean condition and normalize selected arithmetic. Three deployment equalities lift this into one wrapping-word fold over a finite list. F32 sum reassociation is excluded. Indexed proofs induct on the list with a generalized natural start index, preserving the same public wrapping U32 index on each branch. Twelve beta-transport supports connect the induction goals. Per-element primitive F32 grouping, output order and length are preserved. Callbacks must be pure and total because stages can interleave.

Complementary add/subtract also have six scalar and six deployment endpoints obtained using only prior partition, dual-sum and predicated-sum equalities. A singleton proof needs explicit predication bridges; failed Normalize-only attempts remain archived. These consequences and their four U32 source bridges are available symmetrically in both stores. Actual selected bodies determine reference classification. Endpoint hash novelty is not evidence of new mathematics.

Sources: [guard proofs](../../knowledge/producers/web_guard22_laws.py), [indexed proofs](../../knowledge/producers/web_indexed22_laws.py), [source certificates](../../knowledge/producers/web_static22_laws.py). Admission uses the unchanged small kernel's ordinary Cases, Induction, Congruence, Normalize, Use and Trans. Static specialization is checked against the complete source, without an export-name whitelist.

All discovery, checking and application occur at compile time. No input-validation wrappers or runtime proof optimizer are added. Existing host backend selection remains separate from compile-time proof optimization. All 102 guarded compiler/backend/runtime/planner files remain unchanged. Historical snapshot `{m['prior_snapshot']}` is preserved; fair prior `{m['effective_prior_snapshot']}` includes {len(m['shared_old_witness_ids'])} old-only certificates. Current snapshot is `{m['new_snapshot']}`. All 48 compact selections authenticate minimal dependency closures. Old semantic candidates receive the same bounded static-sharing opportunities; failed admissions remain archived.

The initial whole-catalogue preparation exhausted the unchanged checker's shared proof-work budget. The preserved pretime failure is in [preparation-failed-catalogue-budget](preparation-failed-catalogue-budget/receipt.json). An external benchmark orchestrator now checks every type-indexed discovery root in deterministic batches, then replays each proposed and final selection against its authenticated minimal closure. Both catalogues use the same unchanged search function, costs and search budget. No root is silently omitted and the checker limit is unchanged; this is compile-time orchestration, not measured runtime work.

## Matched performance protocol

Twelve U32 algorithms with natural `(xs,seed,k)` inputs: six scalar guard consumers and six indexed vector consumers. Primary and alternate callbacks are preset instantiations, not an external production corpus. There are 180 complete frames and 72 timed cells: lengths 32, 4096, 65536 under small/full-width distributions. Scalar divisors 2, 3, 5 and cutoffs 512, 256, 128 (full-width counterparts separately frozen) vary with size; these are matched cells, not a size-only scaling experiment. All timed top guard branches occur; nested callback counts remain explicit even where one-sided.

Literal controls retain original eager stages. Strong expert JS/Rust already fuse the algorithm, reuse valid guard quotient/product computations, evaluate indexed callbacks once and may reuse vector scratch. Captured JS, borrowed JS, Wasm, native resident/input-snapshot and actual GPU calls have separate boundaries. Captures, required output allocations, complete output consumption and cleanup are timed as appropriate; vector arrays are fully compared before timing. GPU calls include upload, dispatch, readback and consumption. Fallback is not an actual GPU sample. No handwritten WGSL expert is measured.

Nine shuffled measured rounds use seed 20261031, two warmups and a 15 ms target. Native calibration starts at one call, records timer-resolution zero trials and grows by at most 16. Each common native invocation performs one result check and three untimed prewarm calls uniformly before the measured interval; these differ from the two journaled warmups. Native C and Rust use archived optimized/native flags, different LLVM versions and one common shared-library driver. This is not an Ink-to-Rust emitter or equal-LLVM comparison.

Compiler hash: `{m['compiler_sha256']}`. CPU/GPU policy bytes equal batch21; authoring, controls, fixtures and policies are not tuned using timings. Author/audit jobs stop during sequential native, Node and three bounded browser contexts. Individual paired median-bootstrap 95% intervals use 4000 Random(0) draws; they are exploratory, unadjusted and correlated. Browser startup sums three contexts; its cold-call map names only the first context, with all raw maps retained.

Totals: **{v['timing_samples']:,} samples, {v['exact_benchmark_comparisons']:,} complete benchmark comparisons, {v['web_intervals_independently_recomputed']+v['native_intervals_independently_recomputed']:,} independently recomputed intervals**.

## Fresh recipes versus fair prior

Each CPU row contains 48 cells. The four old-law references are excluded here; their 24 cells remain in [all outcomes](outcome-tables.json).

'''+table(prior)+f'''
All **{v['regressions_retained']} adverse fresh comparisons** remain in [fresh-regressions.json](fresh-regressions.json). Per-family/cohort outcomes and supported median ranges are archived without a pooled speedup.

## Optimized handwritten implementations

Ink versus expert: CPU rows contain all 72 cells including references; GPU contains 36 actual indexed cells. A language-wide ranking cannot be inferred from these recipes.

'''+table(expert,True,'all')+f'''
GPU counters and fallbacks: `{json.dumps(v['gpu'],sort_keys=True)}`. Scalar guard recipes retain packed scalar output and CPU fallback. Indexed shader eligibility and prior/current GPU bodies are checked directly in manifests; missing records are not slower GPU observations.

## Evidence and limits

[Catalogue review](catalogue-review.json), [native review](native-final-review.json), [protocol review](protocol-final-review.json), [code shapes](code-shape-review.json) and [final verification](verification.json) bind exact archived artifacts. Fewer loops or arrays do not guarantee faster complete calls. Mathematics applies to arbitrary finite lists with stated semantics; profitability covers these exact fixtures on this machine. A production corpus and broader machines are still needed for generalization.

The DB contains **{v['canonical_observations']:,} canonical observations**, adding 720 Wasm observations with exact programs, plans, workloads, hardware and complete-call samples. JavaScript/GPU measurements remain in raw reports. SQLite is rebuilt as a disposable index. No commit, push or PR was made.
'''
(R/'REPORT.md').write_text(text)
print(json.dumps(dict(report='REPORT.md',fresh_recipes=fresh,reference_recipes=references,samples=v['timing_samples'])))
