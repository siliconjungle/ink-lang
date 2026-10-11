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
gain=tab('Fresh proof tasks: attribution',gainq,'fresh');expert=tab('Fresh proof tasks: optimized competitors',expertq,'fresh');allgain=tab('All nine tasks: attribution',gainq,'all');allexpert=tab('All nine tasks: optimized competitors',expertq,'all')
gq=list(dict.fromkeys((x['host'],x['mode'],x['comparison'],'Actual GPU versus '+x['ratio_variants'][0]) for x in rows if x['comparison'].endswith('_gpu')));gpu=tab('Actual GPU execution',gq,'all')
fresh_cells=len({(x['case'],x['input']) for x in rows if x['proof_fresh']});allcells=len(read('fixtures.json')['cells']);cat=read('catalogue-review.json');typed=read('typed-wasm25/verification.json') if (R/'typed-wasm25/verification.json').exists() else None
report=f'''# Ink accepted-branch proofs — batch 25

Checked proofs remove a repeated predicate branch after filtering, and work in ordered folds and wrapping U32 sums. Backend changes remove scalar-result arena allocation at the Wasm CPU boundary and add early exit to the legacy C emitter. The tables show their separate effects against the previous compiler and optimized JS/Rust implementations. A broad victory across languages remains unestablished: these are five related fresh recipes and four reference tasks on one machine, not a representative application suite.

## General laws and checked database

For arbitrary pure total callbacks, `xs.filter(p).map(x => choose(p(x),f(x),g(x))) = xs.filter(p).map(f)`. Ordinary list induction checks empty and nonempty lists; a case split on `p(head)` removes the rejected head or selects `f(head)`. No callback whitelist, new trusted rule or semantic extension is used. U32, I32, U64 and F32 instances preserve the arithmetic expressions and F32 grouping. Purity matters: callback scheduling is unobservable in these semantics.

Four ordered-fold deployments combine that identity with existing filter/map fold fusion: `foldr(filter(p).map(choose(p,f,g)),z,h)` becomes `foldr(xs,z,x => a => choose(p(x),h(f(x))(a),a))`. The reducer can depend on its accumulator; the exact right-fold order is retained. One U32 sum deployment uses the existing checked predicated mapped-sum law, with zero for rejected elements. This relies on wrapping U32 addition and does not authorize floating-point reassociation or an F32 zero-mask sum.

Publication added **{v['added_entries']} immutable checked objects**, bringing the database to **{v['catalog_entries']}**: four optimization endpoints, five deployment compositions, eight fresh source bridges and seventeen newly derived old-only certificates. Nineteen old-only witnesses were retained; two were already historical objects. The old-only comparison catalogue has **{v['fair_prior_entries']} entries**, and all of those opportunities are also offered to the current catalogue. Search was bounded to four source applications and 128 expanded bodies per source. All twelve rejected proposals and earlier failed author fixtures are preserved. These are standard identities new to this pinned catalogue search, not claims of new mathematics.

## Leaner targets

C packed dispatch now borrows Bool input words, as U32 already did. Other layouts retain required conversion copies. Scalar32 returns U32/Bool words, I32 modulo bits and F32 raw bits; scalar64 returns U64 directly. The Wasm emitter exports those functions, and the CPU host selects them using the function result descriptor and available exports. Scalar calls avoid the old result header and result arena; missing exports retain compatibility with the generic path. List/record/vector results still use generic transport. The host still captures and copies inputs and creates a small scalar result array; this is not a zero-allocation host call. New U32 ingress borrowing is not claimed.

Legacy native C now shares the existing early-exit recognizer: choice predicates must be accumulator-independent, and each reached leaf must retain the accumulator or replace it independently. A forward loop stops at its first replacement. Accumulator-dependent checksum folds keep reverse evaluation. Early exit can lose on late/absent full scans; those cases remain measured. Production changes are exactly C compute/native lowering, Wasm exports and the CPU host. The other 98 guarded files, semantic core, checker and planner are unchanged. Backend and host transport are trusted implementations backed by tests, not formally verified machine code.

Proof search and selection happen at compile time. Emitted targets contain ordinary target code and existing backend selection, with no added caller validation, optional checker wrapper or runtime proof optimization.

## Five fresh proof tasks ({fresh_cells} cells per host/boundary)

{gain}

{expert}

Vector repair and ordered checksum use primary and held-out callback instantiations; total uses the primary callbacks. These are general full-scan algebraic opportunities, but the timed instances are U32. Sizes 32 and 65,536 use two preset distributions with fixed captures across sizes. Size 4,096 is correctness-only. Held-out describes callback expressions, not an external dataset. Strong experts fuse filtering/mapping, evaluate the predicate once, hoist legal invariants, and preserve the noncommutative reverse checksum. Staged original algorithms validate only.

## All nine tasks ({allcells} cells per host/boundary)

{allgain}

{allexpert}

First-accepted, filtered mapped-head and indexed kernels provide backend/reference comparisons. Lookup workloads include first, interior, last and absent matches. Captured JS/Wasm, synchronous borrowed JS, resident native and snapshot native are separate boundaries. Native baselines already call kernels/scalars directly; they do not incur an artificial output-store handicap.

{gpu}

WebGPU eligibility and fallback reasons come from the actual emitted manifests. Identical ABI/host/device/WGSL fingerprints are deduplicated. Only actual GPU executions count; CPU fallback is not a GPU result. Filtered variable vectors and arbitrary ordered folds are unsupported by the current GPU path. The frozen CPU selection is used for both compiler versions and all target comparisons; a GPU cost policy was archived but does not secretly select another algorithm. No general adaptive scheduling improvement is claimed.

## Evidence and limits

There are {v['selection_packages']} checked selection packages and {v['compiled_matrix_bundles']} compiled bundles. The same selected core reaches both old and new backends. A 2×2 proof/backend matrix separates proof gains, backend/host gains and their interaction. Optimized Rust uses its own tuned native/Wasm kernels. Rust 1.96/LLVM22 and Apple Clang14 are different toolchains, so native comparisons describe these outputs rather than isolated language properties.

Author tests checked 17 typed functions, 26 source certificates and 127 frames through 254 original/selected interpreter calls, plus semantic false controls. C integration suites passed nine tests and 1,623 interpreter comparisons, with allocation/copy counters and raw F32/scalar payload coverage. Host transport tests cover direct exports, old-module fallback, failure cleanup and input ownership; real compiled Wasm transport evidence is archived under `typed-wasm25/`. Bool borrowing has operation/copy evidence only and is not presented as a timed U32 result. Independent Python source/oracle checks cover 207 frames and 2,508,219 input values; original/expert JS checks cover 414 complete results and nonmutation. Measured runners validate full outputs and consume checksums during trials.

Completed runs contain **{v['timing_samples']:,} timing samples**, **{v['complete_benchmark_comparisons']:,} complete benchmark comparisons**, and **{v['independent_intervals']:,} independently recomputed intervals**. Every calibration, recorded warmup and round is retained. Timing ran sequentially with author/build/test/audit jobs stopped. Native measured invocations also make three common unrecorded prewarm calls. Checksumming is timed and can dominate constant-time kernels. Browser startup sums three bounded contexts; merged cold-call evidence covers the first context only. The machine is Apple M2/macOS arm64 with Node and the headed in-app browser. Exported Wasm memory is recorded; it is not total process or GPU memory.

A confirmed faster/slower cell requires the whole paired bootstrap 95% interval to favor one implementation. These are exploratory per-cell intervals without family-wise adjustment. Counts are not pooled language rankings. Absolute medians and all intervals are preserved, including **{v['adverse_comparisons_retained']} adverse backend/proof comparisons**. No failed or slow cells were removed to improve the headline.

Canonical imports added **{v['observations_added']} Wasm observations**, bound to actual compiler/Wasm bytes, selected laws and captured workload. The immutable ledger and disposable SQLite index agree on **{v['canonical_observations']:,} observations** and {v['catalog_entries']} entries. Correctness authority and profitability observations remain separate. Snapshot: `{v['snapshot']}`.

Evidence includes `publication.json`, `catalogue-review.json`, `protocol-compiled-preflight-review.json`, `protocol-final-review.json`, `native-final-review.json`, `verification.json`, `policy-freeze.json`, `pretime-review-bindings.json`, `metadata.json`, `all-comparisons.json`, `regressions.json`, `root-interval-verification.json`, both web summaries, native summary and raw journals. Prior report history and unrelated ownership are preserved. No commit, push or PR was made.
'''
(R/'REPORT.md').write_text(report)
body=[]
for title,data in tables:
 cells=''.join('<tr>'+''.join('<td>'+html.escape(x)+'</td>' for x in row)+'</tr>' for row in data);body.append('<section><h2>'+html.escape(title)+'</h2><table><thead><tr><th>Host / boundary</th><th>Comparison</th><th>Faster</th><th>Slower</th><th>Inconclusive</th></tr></thead><tbody>'+cells+'</tbody></table></section>')
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ink · accepted-branch proofs</title><style>body{font:16px/1.55 system-ui;background:#101820;color:#eaf3f3;margin:0;padding:40px;max-width:1300px}h1{font-size:36px}h2{font-size:22px;margin-top:40px}small{color:#a9bcc0}.stats{display:flex;gap:16px;flex-wrap:wrap}.stats div{background:#1c2d36;padding:18px;border-radius:10px;min-width:170px}.stats strong{display:block;font-size:30px;color:#8de7ce}table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:9px;border-bottom:1px solid #34434b;text-align:left}th,a,code{color:#8de7ce}p{max-width:1000px}</style><h1>Ink · accepted-branch proofs</h1><p>Generic predicate simplification, ordered-fold/sum deployment and leaner scalar Wasm transport. Completed measurements with separate proof/backend attribution.</p>'''
page+=f'<div class="stats"><div><strong>{v["catalog_entries"]:,}</strong>checked DB entries</div><div><strong>{v["added_entries"]}</strong>objects added · 4 generic roots</div><div><strong>{v["timing_samples"]:,}</strong>timing samples</div><div><strong>{v["independent_intervals"]:,}</strong>recomputed intervals</div></div><p><code>filter(p).map(choose(p,f,g)) = filter(p).map(f)</code><br>Pure total callbacks; U32/I32/U64/F32. No added caller checks or runtime proof optimizer.</p><p>Five fresh recipes cover {fresh_cells} cells; nine total tasks cover {allcells}. Confirmed gains require a favorable paired 95% interval. One machine and related workload families: broad superiority over native implementations remains unestablished.</p>'
page+=''.join(body)+f'<p>{v["complete_benchmark_comparisons"]:,} complete comparisons · {v["adverse_comparisons_retained"]} adverse comparisons retained · {v["canonical_observations"]:,} canonical observations.</p><p><a href="REPORT.md">Full report</a> · <a href="outcome-tables.json">Verified tables</a> · <a href="all-comparisons.json">Every comparison</a></p><small>Snapshot '+v['snapshot']+'</small></html>'
(R/'browser-completed.html').write_text(page);print(json.dumps(dict(status='passed',report_sha256=sha(R/'REPORT.md'),dashboard_sha256=sha(R/'browser-completed.html'))))
