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

report=f'''# Ink invariant folds and direct JS targets — batch 26

Two recipes instantiate checked two-live-branch invariant-fold hoisting. Seven unchanged backend references cover filtered repair, ordered checksum/selfzip, independent min-length zip, first-match lookup, indexed output and dependent modular mixing. This is a bounded set of related U32 kernels on one machine, not a broad application corpus or universal language ranking. Strong handwritten experts already apply all these legal reductions and loop improvements.

For arbitrary pure total callbacks and an item/accumulator-independent Boolean `c`, the identities are `map(xs,x => choose(c,f(x),g(x))) = choose(c,map(xs,f),map(xs,g))` and `foldr(xs,z,x => a => choose(c,h(x)(a),j(x)(a))) = choose(c,foldr(xs,z,h),foldr(xs,z,j))`. A case split on `c` and ordinary list induction check the identities. These are two standard identities with four numeric instances each, new to the pinned catalogue, not new mathematics. Eight generic roots, sixteen typed primary/alternate source certificates and eight newly derived old-only certificates make the 32-object publication; one additional shared witness was already historical. All eight typed fold examples select under the frozen cost policy. All eight map examples pass correctness/reification checks but remain unselected because the current model charges both whole-map branches; no map profitability is claimed.

The general identities move a captured Boolean choice outside an arbitrary pure map or arbitrary ordered fold. Both branches are live; either selected reducer still traverses the full list. U32/I32/U64/F32 proofs preserve callback expressions and exact right-fold order. The map identities are checked evidence; benchmark freshness and actual selection are tracked separately for the two fold recipes. Old-only checked specialization opportunities are offered symmetrically, and the same selected core is compiled unchanged by both backends.

The backend change is direct-loop JavaScript emission with scalar statement blocks and typed local sharing. It introduces no mathematical fusion or caller checks. Exactly one guarded production file and its structural test change; the other 100 guarded sources, core/checker/planner/C/Wasm/runtime host stay unchanged. Emitted C and Wasm outputs are authenticated as identical for each fixed proof core. Source size may grow; fewer closures or callbacks do not establish speed by themselves. For a fixed proof core, unchanged native/Wasm/GPU backend code cannot establish a JS-emitter gain; any measured old/new variation there reflects measurement or build/layout variation. Mathematical proof effects remain separately measured.

## Fresh proof recipes: {fresh_cells} cells per host/boundary

{gain}

{expert}

## All {len(m['tasks'])} tasks: {allcells} cells per host/boundary

{allgain}

{allexpert}

## Actual GPU comparisons

{gpu}

GPU rows are actual execution with dispatch/upload/readback counters, not CPU fallbacks. Exact ABI/device/host/WGSL fingerprints are deduplicated; task role and actual selected cores determine attribution. No fresh GPU gain is implied by a backend-only arithmetic/indexed reference. Full calls include captured input copies, GPU transfer/readback and output consumption.

## Frozen workload and controls

Inputs use sizes 32 and 65,536 for timing and 4,096 for correctness, preset small/full distributions and fixed scalar captures per distribution/profile across sizes. The invariant folds exercise enabled/disabled flags and both branches still traverse. First-match lookup covers first/interior/last/absent matches. The independent zip has two genuine lists, with ys taken from a distinct donor and truncated to 3N/4; every declared list is captured fairly and output truncates to min length. Empty, unequal, wrapping and zero-divisor fixtures compare all outputs and confirm source nonmutation.

Original JS/Rust materialize source stages and validate only. Strong experts hoist invariant flags, fuse repair/paired/indexed passes, preserve accumulator-dependent reverse reduction order, and reuse output scratch. The modular mix uses 16 fixed stages:64 stage primitives plus initial x+seed,65 original word primitives total. Experts precompute 16 captured multipliers and replace remainder by an exact conditional subtraction because the wrapped word is below twice 4,294,967,291. This is a fixed modular-mix reference, not cryptographic security, proof novelty or timing-tuned work.

Full captured JS/Wasm, synchronous borrowed JS and native resident/snapshot are separate cohorts. Borrowed JS calls are synchronous with no per-call promises or snapshots. Native Rust and generated C return scalars through the same common driver boundary; vectors use reusable expert output scratch versus generated allocations. Native measures C/Clang versus Rust with distinct toolchains, not language isolation. Native common invocations make three unrecorded prewarm calls before the clock in addition to two recorded warmup phases. Final output consumption/arena cleanup is timed and may dominate cheap kernels.

## Evidence and limits

There are {v['selection_packages']} checked selections and {v['compiled_matrix_bundles']} compiler/proof bundles. JS author tests passed 1,972 interpreter comparisons plus operational read/allocation/order/lazy checks; proof author tests passed 168 typed frames through 336 original/selected interpreter calls and two false controls. These finite tests and checked source identities do not formally prove the trusted target emitter. Untimed source/oracle corroboration covers {preflight['inputs']} complete fixtures and {preflight['python_input_values_exercised']:,} input words; original/expert JS validated {preflight['js']['comparisons']} complete outputs. Completed runs contain {v['timing_samples']:,} samples, {v['complete_benchmark_comparisons']:,} complete comparisons and {v['independent_intervals']:,} independently recomputed intervals. All {v['adverse_comparisons_retained']} adverse attribution rows and all inconclusives remain archived.

Nine shuffled rounds, two recorded warmups and 15 ms target were preset before timing. Timing ran sequentially with other jobs stopped. Three bounded browser contexts preserve every frozen fixture/cell; startup costs sum contexts, while merged cold-call map holds only the first context and raw maps retain the others. Exported Wasm memory is not total process/GPU memory. Favorable whole paired 95% intervals are exploratory per-cell evidence without family-wise adjustment, not pooled language rankings.

Publication added {v['added_entries']} checked objects to {v['catalog_entries']} entries, with effective fair prior {v['fair_prior_entries']}. Canonical imports added {v['observations_added']} Wasm observations; ledger and index agree on {v['canonical_observations']:,}. Snapshot `{v['snapshot']}`. Correctness authority is separate from empirical profitability. No commit, push or PR was made.

A pre-timing audit caught stale default compiler paths in the first preparation. That complete matrix, validations and audit failures are preserved under `../web-stack-proofs-26-mis-pinned-preparation-2026-10-11/`; it supplied zero timing samples. The final preparation explicitly pins the correct compilers. No measured workloads or controls changed in recovery.

[Full raw comparisons](all-comparisons.json), [adverse rows](regressions.json), [independent protocol audit](protocol-final-review.json), [native audit](native-final-review.json), [catalogue audit](catalogue-review.json), [emission review](emission-review.json), [final integrity](verification.json). No general superiority claim follows from this corpus.
'''
(R/'REPORT.md').write_text(report)
body=[]
for title,data in tables:
 cells=''.join('<tr>'+''.join('<td>'+html.escape(x)+'</td>' for x in row)+'</tr>' for row in data)
 body.append('<h2>'+html.escape(title)+'</h2><table><tr><th>Host</th><th>Comparison</th><th>Faster</th><th>Slower</th><th>Inconclusive</th></tr>'+cells+'</table>')
page='<html><meta charset="utf-8"><title>Ink batch 26 measured comparisons</title><style>body{font:16px system-ui;margin:32px;max-width:1400px}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}table{border-collapse:collapse}h2{margin-top:32px}</style><h1>Ink invariant folds and direct JS targets</h1><p>Two fresh folds, seven backend references. Separate proof/backend factorial, captured/borrowed and native resident/snapshot boundaries. Strong experts already hoist/fuse; broad language superiority remains unestablished.</p>'+''.join(body)+'<p><a href="REPORT.md">Full report</a> · <a href="all-comparisons.json">All raw comparisons</a></p></html>'
(R/'browser-completed.html').write_text(page)
print(json.dumps(dict(status='written',report_sha256=sha(R/'REPORT.md'),dashboard_sha256=sha(R/'browser-completed.html'))))
