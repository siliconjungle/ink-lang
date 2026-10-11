"""Render only saved, independently reviewed performance evidence; never time."""
import collections,hashlib,html,json
from pathlib import Path
R=Path(__file__).resolve().parent
read=lambda n:json.loads((R/n).read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
v=read('verification.json');assert v['status']=='passed'
m=read('metadata.json');out=read('outcome-tables.json');assert out['status']=='passed'
rows=read('all-comparisons.json')['rows'];tables=[]
def tab(title,queries,role):
 lines=['| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |','|---|---|---:|---:|---:|']
 data=[]
 for host,mode,label,display in queries:
  q=[x for x in rows if x['host']==host and x['mode']==mode and x['comparison']==label and (role=='all' or x['proof_fresh'])]
  if not q:continue
  c=collections.Counter(x['verdict'] for x in q);expert='expert' in label
  faster=c['Ink_faster' if expert else 'faster'];slower=c['expert_faster' if expert else 'slower'];unknown=c['inconclusive'];assert faster+slower+unknown==len(q)
  name=host+(' / '+mode if mode else '')
  lines.append(f'| {name} | {display} | {faster}/{len(q)} | {slower} | {unknown} |')
  data.append([name,display,str(faster)+'/'+str(len(q)),str(slower),str(unknown)])
 tables.append((title,data));return '\n'.join(lines)
gainq=[];expertq=[]
for host in ['node','browser']:
 for target,display in [('js','JS full call'),('wasm','Wasm full call'),('borrowed_js','JS synchronous borrowed call')]:
  gainq.extend((host,'',x+'_'+target,display+' · '+desc) for x,desc in [('backend_checked','backend with current proofs'),('proof_new','proofs on new backend'),('combined','combined versus old prior')])
  e='rust_expert_wasm' if target=='wasm' else 'js_expert_borrowed' if target=='borrowed_js' else 'js_expert'
  expertq.append((host,'','ink_new_checked_'+target+'_over_'+e,display+' versus optimized '+('Rust Wasm' if target=='wasm' else 'JavaScript')))
for mode in ['resident','snapshot']:
 gainq.extend(('native',mode,x,desc) for x,desc in [('backend_checked','backend with current proofs'),('proof_new','proofs on new backend'),('combined','combined versus old prior')])
 expertq.append(('native',mode,'current_over_expert','versus optimized native Rust'))
gain=tab('Fresh proof tasks: attribution',gainq,'fresh');expert=tab('Fresh proof tasks: optimized competitors',expertq,'fresh')
allgain=tab('All tasks including references: attribution',gainq,'all');allexpert=tab('All tasks including references: competitors',expertq,'all')
gq=[(x['host'],x['mode'],x['comparison'],'GPU reference versus '+x['ratio_variants'][0]) for x in rows if x['comparison'].endswith('_gpu')]
gpu=tab('Unchanged GPU references',list(dict.fromkeys(gq)),'all')
raw=[read('node-results.json'),read('browser-results.json'),read('native/results.json')]
hostcounts='; '.join(f'{h}: {len(q["samples"]):,} samples' for h,q in zip(['Node','browser','native'],raw))
report=f'''# Ink web demand proofs — batch 24

Checked generic demand laws and a forward early-exit lowering are implemented. The tables below separate measured backend gains, proof gains and comparisons with optimized competitors. These measurements cover demand/head/first-match patterns and two unchanged references on one machine; they do not establish a broad victory over native Rust, JavaScript or GPU execution.

## Proofs and implementation

The new generic law is `xs.map(f).at_or(0,f(z)) = f(xs.at_or(0,z))`, for an arbitrary pure total unary mapper and U32, I32, U64 and F32 values. On an empty list both sides return `f(z)`; on a nonempty list both return `f` of the first element. It requires the transformed fallback, preserves each arithmetic expression and F32 grouping, and removes unobserved callback evaluations. There is no fixed-point premise or trusted theorem flag. Four checked deployment compositions combine this law with the previous first-accepted law: `xs.filter(p).map(f).at_or(0,f(z)) = f(foldr(xs,z,x => a => choose(p(x),x,a)))`. These are standard mathematical identities, new against the pinned bounded catalogue search; they are not claimed as mathematical discoveries.

The JS and C emitters now recognize numeric right folds whose choice predicates are independent of the accumulator and whose leaves either retain it or replace it independently. The first replacement in source order overrides every later replacement. A forward loop therefore stops at that replacement, or returns the original default. Lexical dependence detection respects shadowing; unsupported or accumulator-dependent folds keep their original reverse lowering. An explicit break handles replacements equal to the fallback, NaN and negative zero. This is trusted backend refinement backed by differential tests, not a formal machine-code proof. The C change applies to compute-emitter routes: in this fixture set, only the two checked filtered mapped-head C kernels gain early exit. Their old-prior mapped-fold and the standalone first-accepted references still use the unchanged legacy C emitter; those backend comparisons are byte-identical controls. JS routes cover those folds as well. Only two production emitter files changed; the other 100 guarded files, core semantics, checker, planner and runtime are unchanged.

Proof search and selection happen before deployment. Outputs contain ordinary target code, with no runtime proof optimization or added caller validation/checker wrappers. Existing transport boundaries still matter: full-call snapshots and Wasm ingress can traverse the input even when the selected computation stops immediately. Borrowed synchronous JS calls and resident native calls expose a different cost from complete captured calls.

Canonical publication added **36 objects**: four generic optimization endpoints, four deployment compositions, six fresh benchmark source certificates and 22 old-derived certificates made available equally to both catalogues. The immutable historical catalogue has 1,688 entries; the fair old-only comparison catalogue has 1,710; the current catalogue has **1,724**. Source derivation is bounded to four applications and 128 expanded bodies per source; all 52 rejected proposals remain archived. Dynamic-index generalization failed this normalizer and is not published. No semantic core extension was required.

## Measured gains on the four fresh proof tasks

Each cell uses nine interleaved rounds and a paired bootstrap 95% interval. A confirmed gain requires the entire interval to favor the candidate. These are exploratory per-cell intervals, without family-wise adjustment; counts are not a pooled language ranking. A ratio greater than one means old/new speedup for backend, proof and combined comparisons. Expert comparison orientation is Ink/expert, so less than one favors Ink. Absolute medians and every interval remain in the summaries.

{gain}

{expert}

Mapped-head and filtered mapped-head use primary and held-out callback expressions. The four fresh tasks account for 40 timed cells; four backend/reference tasks account for the other 40. All tasks use one list and runtime scalar captures. Sizes are 32 and 65,536 with two distributions and fixed captures across sizes. Search cases include first, interior, last and absent matches at both sizes. The 4,096-element fixtures are correctness-only. Typed proof tests span all four numeric types, while these performance measurements instantiate U32 operations; the count reference returns U64.

## All tasks, including backend and unchanged references

{allgain}

{allexpert}

{gpu}

GPU evidence is limited to unchanged reference kernels, deduplicated by exact ABI/host/device/WGSL fingerprints. Availability, actual backend, dispatches, upload and readback bytes were recorded; fallback rows are not counted as GPU execution. No fresh WebGPU proof or emitter performance gain is claimed by this batch. Adaptive backend selection is not newly implemented or proved here.

## Fairness and validation

One prior and one checked core were selected per task using the archived semantic checker; each exact selected core was compiled by both the archived and new backends. This yields 16 minimal checked selection packages and 32 target bundles. Both compiler hashes, full proof closure admissions, emitted ABIs, controls, fixtures and policy bytes were pinned before timing. The 2×2 design independently measures backend gains, proof gains and their interactions. Optimized JS and Rust controls already select the first raw value and map once; staged original implementations are validation-only. No benchmark-specific export whitelist is used for the law matcher or emitter.

Both new backend test suites passed **663 interpreter comparisons each**, including F32 bit patterns, overflow, shadowing, accumulator dependencies, empty/default cases and reached-only callback/read counters. Existing backend suites also passed. Proof tests replayed/reified 16 typed functions and compared 96 frames through 192 interpreter calls. Python independently compared original and demand formulations on 208 frames comprising 2,786,840 input values; generated original/expert JS completed 416 output/nonmutation checks. Before timing, all 17 CPU web variants completed 3,536 comparisons and all six native variants completed 1,248. Measured runners also validated complete outputs before measurement and consumed checksums during all trials.

The completed runs contain **{v['timing_samples']:,} timing samples** ({hostcounts}) and **{v['complete_benchmark_comparisons']:,} complete benchmark comparisons**. Saved independent audits recomputed **{v['independent_intervals']:,} intervals**, including factorial interactions. The machine is Apple M2, macOS 26.5.2 arm64, with Node and the headed Chromium-based in-app browser. Rust is 1.96.0/LLVM22; generated native C uses Apple Clang14, whose upstream LLVM major is unestablished. Toolchain parity is not established, so native ratios compare these actual compiled outputs rather than isolated language properties. Native resident and snapshot boundaries are separate. Timing ran sequentially with author/build/test/audit work stopped. Calibration, recorded warmups, every round, availability and native trial journals are retained. Each native sample invocation also makes three common unrecorded prewarm calls before its measured loop. Common checksum consumption remains timed and can dominate constant-time kernels. Browser startup sums both bounded contexts; merged cold-call evidence covers the first context only. Full results retain **{v['adverse_comparisons_retained']} adverse backend/proof comparisons**, including noisy unchanged/reference rows; none were removed to improve headline counts.

Canonical imports added **800 Wasm observations** across five variants, 80 cells and two hosts, with actual compiler/Wasm bytes, plans, workload and exported linear-memory evidence. The immutable observation ledger and disposable SQLite index agree on **15,746 observations** and 1,724 entries. Memory scope is exported Wasm linear memory, not total process/GPU memory. Snapshot `{v['snapshot']}` preserves prior objects; profitability observations are not theorem authority.

## Preserved corrections and evidence

The initial source-baseline capture raced authorized emitter edits; the failed capture receipt is retained. Exact original emitter copies were recovered without resetting the working tree and match the archived batch23 hashes. An initial C test parser stopped at an inner brace; its failure is retained and the test extractor now balances braces. The initial proof test wrongly assumed no old fallback-normalization opportunities; its failure remains archived and the final fair prior includes all old-only witnesses. Independent prepared audits also required initializing Merkle witnesses before reconstructing serialized byte hashes, matching the preparation order; original audit failures and recovered helpers are preserved. A pretime helper status mismatch was corrected in a separately named helper, leaving frozen originals untouched. None of these corrections used timing results or changed the frozen measured algorithms.

Evidence: `publication.json`, `catalogue-review.json`, `protocol-compiled-preflight-review.json`, `protocol-final-review.json`, `native-final-review.json`, `verification.json`, `policy-freeze.json`, `pretime-review-bindings.json`, `metadata.json`, `outcome-tables.json`, `all-comparisons.json`, `all-expert-comparisons.json`, `regressions.json`, `root-interval-verification.json`, `node-summary.json`, `browser-summary.json`, `native/summary.json`, and raw result/trial files. `early-exit.md` documents backend semantics and test commands. No commit, push or PR was made.
'''
(R/'REPORT.md').write_text(report)
body=[]
for title,data in tables:
 cells=''.join('<tr>'+''.join('<td>'+html.escape(x)+'</td>' for x in row)+'</tr>' for row in data)
 body.append('<section><h2>'+html.escape(title)+'</h2><table><thead><tr><th>Host / boundary</th><th>Comparison</th><th>Faster</th><th>Slower</th><th>Inconclusive</th></tr></thead><tbody>'+cells+'</tbody></table></section>')
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ink · checked demand proofs</title><style>body{font:16px/1.55 system-ui;background:#101820;color:#eaf3f3;margin:0;padding:40px;max-width:1300px}h1{font-size:36px}h2{font-size:22px;margin-top:40px}small{color:#a9bcc0}.stats{display:flex;gap:16px;flex-wrap:wrap}.stats div{background:#1c2d36;padding:18px;border-radius:10px;min-width:170px}.stats strong{display:block;font-size:30px;color:#8de7ce}table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:9px;border-bottom:1px solid #34434b;text-align:left}th{color:#8de7ce}a{color:#8de7ce}p{max-width:1000px}code{color:#8de7ce}</style><h1>Ink · checked demand proofs</h1><p>Generic map/head laws and forward early-exit lowering. Completed, independently reviewed measurements; backend and proof gains measured separately.</p>'''
page+=f'<div class="stats"><div><strong>1,724</strong>checked DB entries</div><div><strong>36</strong>objects added · 4 generic laws</div><div><strong>{v["timing_samples"]:,}</strong>timing samples</div><div><strong>{v["independent_intervals"]:,}</strong>recomputed intervals</div></div>'
page+='<p><code>head(map(xs,f),f(z)) = f(head(xs,z))</code><br>Pure total callbacks; U32/I32/U64/F32. No added caller checks or runtime proof optimizer.</p><p>Faster counts require a favorable 95% paired interval. Fresh tasks have 40 cells per host/boundary; all tasks have 80. This is one machine and a demand-pattern workload family. A broad victory over native implementations remains unestablished.</p>'
page+=''.join(body)+f'<p>{v["complete_benchmark_comparisons"]:,} complete benchmark comparisons · {v["adverse_comparisons_retained"]} adverse comparisons retained · 15,746 canonical observations. GPU rows are unchanged references; no fresh GPU speed gain is claimed.</p><p><a href="REPORT.md">Full report</a> · <a href="outcome-tables.json">Verified outcome tables</a> · <a href="all-comparisons.json">Every comparison</a></p><small>Snapshot '+v['snapshot']+'</small></html>'
(R/'browser-completed.html').write_text(page)
print(json.dumps(dict(status='passed',report_sha256=sha(R/'REPORT.md'),dashboard_sha256=sha(R/'browser-completed.html'))))
