"""Render completed independently audited evidence; no timing or proof writes."""
import collections,hashlib,html,json
from pathlib import Path
R=Path(__file__).resolve().parent
read=lambda n:json.loads((R/n).read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
v=read('verification.json');assert v['status']=='passed';m=read('metadata.json');pub=read('publication.json');rows=read('all-comparisons.json')['rows'];tables=[]
def tab(title,queries,role):
 lines=['| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |','|---|---|---:|---:|---:|'];data=[]
 for host,mode,label,display in queries:
  q=[x for x in rows if x['host']==host and x['mode']==mode and x['comparison']==label and (role=='all' or x['proof_fresh'])]
  if not q:continue
  c=collections.Counter(x['verdict'] for x in q);expert='expert' in label;faster=c['Ink_faster' if expert else 'faster'];slower=c['expert_faster' if expert else 'slower'];unknown=c['inconclusive'];assert faster+slower+unknown==len(q)
  name=host+(' / '+mode if mode else '');lines.append(f'| {name} | {display} | {faster}/{len(q)} | {slower} | {unknown} |');data.append([name,display,str(faster)+'/'+str(len(q)),str(slower),str(unknown)])
 tables.append((title,data));return '\n'.join(lines)
gainq=[];expertq=[]
for host in ['node','browser']:
 for target,display in [('js','JS captured call'),('wasm','Wasm captured call'),('borrowed_js','JS synchronous borrowed call')]:
  gainq.extend((host,'',x+'_'+target,display+' · '+desc) for x,desc in [('backend_checked','backend on current proofs'),('proof_new','proofs on current backend'),('combined','combined versus old prior')])
  e='rust_expert_wasm' if target=='wasm' else 'js_expert_borrowed' if target=='borrowed_js' else 'js_expert';expertq.append((host,'','ink_new_checked_'+target+'_over_'+e,display+' versus optimized '+('Rust Wasm' if target=='wasm' else 'JavaScript')))
for mode in ['resident','snapshot']:
 gainq.extend(('native',mode,x,desc) for x,desc in [('backend_checked','backend on current proofs'),('proof_new','proofs on current backend'),('combined','combined versus old prior')]);expertq.append(('native',mode,'current_over_expert','versus optimized native Rust'))
gain=tab('Fresh proof tasks: attribution',gainq,'fresh');expert=tab('Fresh proof tasks: optimized competitors',expertq,'fresh');allgain=tab('All tasks: attribution',gainq,'all');allexpert=tab('All tasks: optimized competitors',expertq,'all')
gq=list(dict.fromkeys((x['host'],x['mode'],x['comparison'],'Actual '+x['ratio_variants'][1]+' versus '+x['ratio_variants'][0]) for x in rows if x['comparison'].endswith('_gpu')));gpu=tab('Actual GPU execution',gq,'all')
fresh_cells=len({(x['case'],x['input']) for x in rows if x['proof_fresh']});allcells=len(read('fixtures.json')['cells']);fixture=read('fixtures.json');preflight=read('preflight-receipt.json')

report=f'''# Ink aligned zip proofs and known-call inlining — batch 27

Three agents and integration added 32 checked objects: eight optimization endpoints (two ordinary fusion identities × four numeric types), eight beta-transport proof supports and sixteen typed primary/held-out source certificates. The DB now has {v['catalog_entries']:,} entries and {v['canonical_observations']:,} canonical observations. Mathematical correctness and measured profitability remain separate.

The identities are `zip(zip(xs,ys,h),xs,g) = zip(xs,ys,x=>y=>g(h(x)(y))(x))` and `zip(zip(xs,ys,h),ys,g) = zip(xs,ys,x=>y=>g(h(x)(y))(y))`. They remove one intermediate list and pass for arbitrary pure total callbacks. Unequal/empty lists still truncate to `min(len(xs),len(ys))`; each callback's exact expression grouping and F32 rounding remain. Ordinary functional list induction checks the identities. They are new catalogue endpoints, not new mathematics. All 16 typed applications select, replay and reify under the unchanged frozen cost policy. The complete prior's 1,231 semantic laws were offered to each frozen source in an admitted frontier bounded at four source applications and 128 expanded bodies per task; one Normalize-only named-helper proposal was rejected with `unknown semantic function` by context-free catalogue admission; that complete failed candidate is preserved. No old-only source certificate was admitted, and the fair prior remains 1,790 entries. A separate helper-module knowledge-check, selection replay and reification pass for that same Normalize-only certificate, establishing the contextual opportunity. Reification drops the explicit Let and restores the old emitter hazard. This valid module-local certificate is excluded symmetrically from both context-free catalogues; context declarations are a publication limitation, not a false equality or global non-derivability result. This bounded search does not prove global non-derivability.

The compiler now inlines bounded known pure function calls in C and JavaScript. Arguments are materialized exactly once in source order; the callee receives only its own typed lexical parameters. Lazy bodies, numeric order and list allocations remain. Limits are 2,048 AST nodes per candidate body, depth eight and 16,384 expanded nodes across a module; failed C expansion restores emitted statements, names, depth and budgets before falling back to the ordinary call. All function exports and target ABIs remain. Inlining exposes invariants and target vectorization opportunities; it does not guarantee either or remove source collection stages implicitly. No caller checks, allocator change, runtime optimizer, core/checker/planner/runtime/GPU emitter changes were added. Exactly two production files change, plus disclosed test-only counter instrumentation. Target lowering remains trusted and tested; the checked laws do not prove emitted machine code.

## Fresh proofs: {fresh_cells} cells per host/boundary

{gain}

{expert}

## All eight families: {allcells} cells per host/boundary

{allgain}

{allexpert}

Nominal interval differences on byte-identical target code are run variation rather than compiler gains. The emission review records actual target equality/difference for each fixed proof core. Reference tasks have identical prior/current selected cores; their proof-factor timing differences are not newly checked mathematical improvements. Whole paired 95% intervals are exploratory per-cell evidence without family-wise correction; task families are related U32 kernels on one machine, not a broad application corpus or universal language ranking.

## Actual WebGPU

{gpu}

Only actual dispatch/upload/readback counts as GPU execution; CPU fallback remains separate. Identical ABI/device/host/WGSL fingerprints are deduplicated. Fresh versus reference attribution follows the actual selected cores and manifests. Full calls include transfers, readback and result consumption; no GPU-only kernel ranking is substituted for those boundaries.

## Frozen workloads and optimized controls

Two fresh independent nested zips and six helper references cover calibrated maps, indexed output, ordered checksum, filtered projection, independent paired processing and the exact batch26 modular-mix continuity. Three natural two-list ABIs capture both arrays, with distinct donor values and a 3N/4 right-hand timing length. Empty, unequal, zero-divisor, wrapping and branch-profile cases compare complete arrays and verify source nonmutation. Sizes 32 and 65,536 are timed; 4,096 is correctness-only. Captures and distributions were chosen before timing and stay fixed across sizes. Small ordered-checksum data yields one true accumulator gate and 65,535 false gates at the large size; no balanced-branch claim is made.

Preflight caught repeated evaluation of a directly consumed list-returning helper in the old C/Wasm emitter, before any timing. The entire failed preparation and the later syntax/context failures are preserved in `../web-stack-proofs-27-single-evaluation-preparation-2026-10-11/`. The filtered-projection source now explicitly binds its accepted list once before map. Both compiler states consume this same source; original/expert controls, complete fixtures and captures are exact unchanged bytes. Emission review requires one old-root producing-helper call. The benchmark therefore does not credit inlining for eliminating that accidental repeated work.

Staged original JS/Rust controls validate source equivalence only. Strong experts already inline helpers, hoist legal captured calculations (including calibration bias), fuse legal passes, preserve accumulator-dependent reverse-fold order, and use exact fixed-modulus conditional reduction in the continuity case. Vector experts reuse output scratch; generated arrays allocate. That ownership/lifetime advantage is disclosed, not hidden by weakening the expert. Captured JS/Wasm calls, synchronous borrowed JS calls, and native resident/copied-input calls are separate boundaries. Both native scalar implementations return through the same common driver ABI. Generated C/Clang and Rust use different LLVM toolchains, not isolated language semantics. Native driver makes three unrecorded prewarm calls in addition to two recorded warmup phases.

The modular mix retains the exact source and four timed input/capture/golden frames from batch26, but timing is a new run. It performs sixteen fixed stages (65 original word primitives); it is a bounded arithmetic reference, not a cryptographic claim or timing-tuned workload.

## Verification and provenance

Completed evidence contains {v['timing_samples']:,} timing samples, {v['complete_benchmark_comparisons']:,} complete benchmark comparisons and {v['independent_intervals']:,} independently recomputed paired/interaction intervals. The {v['selection_packages']} checked selections and {v['compiled_matrix_bundles']} compiler/proof bundles use the same exact selected core across compiler states. Source/control preflight validates {preflight['inputs']} complete fixtures and {preflight['js']['comparisons']} original/expert JS calls, plus nonmutation. Typed proof tests cover 168 frames / 336 original-selected interpreter runs, independent U32 oracles, F32 NaN/Inf/signed zero, lexical capture and rejected hash-valid wrong-alignment controls. The known-call differential suites cover 318 interpreter frames per emitter plus operational lazy/read/allocation/order counters, bounds and C transactional rollback; full existing package suites and preserved first-attempt test-counter failures are linked in backend evidence. Finite tests do not establish a machine-code theorem.

Timing used nine shuffled rounds, two recorded warmups and a 15 ms target. All authors, builds, tests and audits stopped during the sequential Node/native/browser timings. Bounded browser partitions retain every frozen fixture/cell and raw phase log. Exported Wasm memory is not total process/GPU memory. Every inconclusive and all {v['adverse_comparisons_retained']} adverse attribution rows remain archived.

Snapshot `{v['snapshot']}`. Ledger and disposable index agree; {v['observations_added']} exact Wasm observation records were imported only after timing. Previous catalogue/history and unrelated dirty work are preserved. No commit, push or PR was made.

[Raw comparisons](all-comparisons.json), [regressions](regressions.json), [protocol audit](protocol-final-review.json), [native audit](native-final-review.json), [catalogue audit](catalogue-review.json), [emission review](emission-review.json), [final integrity](verification.json).
'''
(R/'REPORT.md').write_text(report)
body=[]
for title,data in tables:
 cells=''.join('<tr>'+''.join('<td>'+html.escape(x)+'</td>' for x in row)+'</tr>' for row in data)
 body.append('<h2>'+html.escape(title)+'</h2><table><tr><th>Host</th><th>Comparison</th><th>Faster</th><th>Slower</th><th>Inconclusive</th></tr>'+cells+'</table>')
page='<html><meta charset="utf-8"><title>Ink batch 27 measured comparisons</title><style>body{font:16px system-ui;margin:32px;max-width:1400px}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}table{border-collapse:collapse}h2{margin-top:32px}</style><h1>Ink aligned zip proofs and known-call inlining</h1><p>Two independent zip fusions, six helper references. C/JS known-call inlining at compile time. Exact proof/backend factorial and separate ownership/capture boundaries; broad native superiority remains unestablished.</p>'+''.join(body)+'<p><a href="REPORT.md">Full report</a> · <a href="all-comparisons.json">All raw comparisons</a></p></html>'
(R/'browser-completed.html').write_text(page)
print(json.dumps(dict(status='written',report_sha256=sha(R/'REPORT.md'),dashboard_sha256=sha(R/'browser-completed.html'))))
