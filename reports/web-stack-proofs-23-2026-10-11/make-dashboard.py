"""Local dashboard of independently audited result tables."""
import html,json
from pathlib import Path
R=Path(__file__).resolve().parent
read=lambda n:json.loads((R/n).read_text())
v=read('verification.json');o=read('outcome-tables.json');s=read('spec.json');f=read('fixtures.json');c=read('catalogue-review.json')
cells=sum(t['fresh_proof_required'] for t in s['tasks'] for x in f['cells'] if x['case']==t['name'])
rows=[('Node JavaScript','node','','prior_over_checked_js'),('Browser JavaScript','browser','','prior_over_checked_js'),('Node WebAssembly','node','','prior_over_checked_wasm'),('Browser WebAssembly','browser','','prior_over_checked_wasm'),('Native C · resident','native','resident','prior_over_checked'),('Native C · copied inputs','native','snapshot','prior_over_checked')]
def counts(h,m,k):return o['counts'].get('|'.join(['fresh',h,m,k,'all']),{})
tr=''.join('<tr><td>'+html.escape(name)+'</td>'+''.join(f'<td>{counts(h,m,k).get(z,0)}</td>' for z in ['faster','slower','inconclusive'])+'</tr>' for name,h,m,k in rows)
expert=[('Browser JS / expert JS','browser','','ink_checked_js_over_js_expert'),('Browser Wasm / expert Rust Wasm','browser','','ink_checked_wasm_over_rust_expert_wasm'),('Native resident / expert Rust','native','resident','checked_over_rust_expert'),('Actual GPU / expert JS','browser','','ink_checked_gpu_over_js_expert')]
etr=''.join('<tr><td>'+html.escape(name)+'</td>'+''.join(f'<td>{counts(h,m,k).get(z,0)}</td>' for z in ['Ink_faster','expert_faster','inconclusive'])+'</tr>' for name,h,m,k in expert)
text=f'''<!doctype html><meta charset="utf-8"><title>Ink · checked proof batch 23</title>
<style>body{{margin:0;background:#13191d;color:#e5edef;font:15px/1.5 system-ui}}main{{max-width:960px;margin:auto;padding:28px 32px}}h1{{font-size:30px;line-height:1.2;margin:14px 0}}h2{{font-size:19px;margin:22px 0 6px}}p{{margin:7px 0;color:#bac8cc}}small{{color:#b5c4c9}}.cards{{display:flex;gap:12px;margin:20px 0}}.card{{flex:1;border:1px solid #3b484d;border-radius:7px;background:#1b252b;padding:13px 18px}}b{{font-size:27px}}table{{width:100%;border-collapse:collapse;margin:12px 0}}td,th{{text-align:left;padding:8px 12px;border-bottom:1px solid #354048}}td:not(:first-child){{width:90px}}th{{font-size:12px;color:#afbec4}}.limit{{border-left:3px solid #d4b56d;padding:10px 15px;background:#252b2f;margin:20px 0}}a{{color:#bcdde7}}</style>
<main><small>INK / CHECKED WEB-STACK PROOFS / BATCH 23</small><h1>Erase irrelevant predicate and prefix-state work</h1>
<p>General equalities for arbitrary finite lists and pure total callbacks.<br>Compile-time proof application; no runtime caller checks or proof optimizer added.</p>
<div class="cards"><div class="card"><b>{c['generic_roles'].get('optimization_endpoint',0)}</b><br>generic optimization endpoints</div><div class="card"><b>{v['catalog_entries']:,}</b><br>proof objects · fair prior {c['effective_prior_entries']:,}</div><div class="card"><b>{v['timing_samples']:,}</b><br>samples · {v['exact_benchmark_comparisons']:,} full comparisons</div></div>
<h2>Fresh recipes versus fair prior · {cells} cells per row</h2><p>First/interior/absent lookup positions at every size and distribution.<br>Individual paired 95% intervals; all {v['regressions_retained']} fresh regressions retained.</p>
<table><tr><th>Target and call boundary</th><th>Faster</th><th>Slower</th><th>Inconclusive</th></tr>{tr}</table>
<h2>Against already optimized handwritten implementations</h2><table><tr><th>Target and expert boundary</th><th>Ink faster</th><th>Expert faster</th><th>Inconclusive</th></tr>{etr}</table>
<div class="limit"><strong>Broad superiority over optimized handwritten code remains unproven.</strong><p>Experts count length, erase unused scan/zip work and stop at the first match. Selected first-match folds still scan all input words. GPU comparisons include transfers.</p></div>
<small>One machine, preset U32 workloads; broader types proved separately. Supports, deployments and old-only consequences counted separately. No handwritten WGSL expert.<br>{v['canonical_observations']:,} canonical observations · {v['selection_packages']} checked selection packages · 102 unchanged production sources.<br>{v['web_intervals_independently_recomputed']+v['native_intervals_independently_recomputed']:,} independently recomputed intervals.</small>
<p><a href="REPORT.md">Full report and proof sketches</a> · <a href="outcome-tables.json">All outcomes</a> · <a href="fresh-regressions.json">Every regression</a> · <a href="verification.json">Verification</a></p></main>'''
(R/'browser-completed.html').write_text(text)
print(json.dumps(dict(status='written',fresh_cells=cells)))
