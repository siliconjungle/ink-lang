"""Render audited descriptive counts, keeping prior and expert comparisons separate."""
from pathlib import Path
import html,json
R=Path(__file__).resolve().parent
t=json.loads((R/'outcome-tables.json').read_text())['counts']
rows=[('Node JS','node','', 'prior_over_checked_js'),('Browser JS','browser','', 'prior_over_checked_js'),('Node Wasm','node','', 'prior_over_checked_wasm'),('Browser Wasm','browser','', 'prior_over_checked_wasm'),('Native C · resident','native','resident','prior_over_checked'),('Native C · snapshots','native','snapshot','prior_over_checked'),('GPU · prior/current eligible','browser','', 'prior_over_checked_gpu')]
body=''
for label,host,mode,pair in rows:
 c=t['|'.join(['fresh',host,mode,pair,'all'])]
 body+=f'<tr><td>{html.escape(label)}</td><td class="gain">{c.get("faster",0)}</td><td>{c.get("slower",0)}</td><td>{c.get("inconclusive",0)}</td></tr>'
page='''<!doctype html><html><meta charset="utf-8"><title>Ink · batch18 measured results</title>
<style>body{margin:0;background:#101827;color:#e7edf5;font:16px system-ui}main{max-width:1080px;margin:32px auto;padding:0 28px}h1{font-size:34px;margin:8px 0}p{line-height:1.55;color:#c0cedf}.tag{color:#83baff;font-size:13px;letter-spacing:2px}.cards{display:flex;gap:16px;margin:22px 0}.card{flex:1;background:#1d293b;border:1px solid #31445b;border-radius:12px;padding:15px}.card b{font-size:29px;display:block}.card span{font-size:13px;color:#b2c2d8}table{border-collapse:collapse;width:100%;background:#172235;border-radius:12px;overflow:hidden}th,td{text-align:left;padding:11px 18px;border-bottom:1px solid #314056}th{font-size:13px;color:#a6bad4}.gain{color:#85deb2;font-weight:700}.note{background:#22324a;border-left:4px solid #e7bc79;padding:14px 18px;margin:20px 0}.foot{font-size:12px;color:#9cabc0}a{color:#91c1ff}</style>
<main><div class="tag">INK · PROOF KNOWLEDGE · BATCH18</div><h1>Reusable proofs, measured operation removal</h1>
<p>Sort elimination for integer aggregates. Positive repetition collapse for checked idempotent callbacks.<br>All selected during compilation; no new caller checks or runtime optimizer.</p>
<div class="cards"><div class="card"><b>51</b><span>new admitted proof objects · two mechanisms</span></div><div class="card"><b>23,328</b><span>timing samples · JS / Wasm / native / GPU</span></div><div class="card"><b>2,304</b><span>saved confidence intervals independently verified</span></div></div>
<table><thead><tr><th>Current vs pinned prior catalogue</th><th>Faster</th><th>Slower</th><th>Inconclusive</th></tr></thead><tbody>ROWS</tbody></table>
<div class="note"><b>Strong expert performance remains the target.</b><br>Expert Rust beats Ink in67/72 resident and66/72 snapshot native cells. Expert JS beats all72 current GPU cells. GPU eligibility grows6→12 recipes; same-backend speed gains are unconfirmed.</div>
<p class="foot">Apple M2 · twelve U32 callback recipes · preset lengths32/4,096/65,536 · nine shuffled rounds.<br>Exploratory individual95% paired bootstrap intervals; correlated views, no external application corpus or general language ranking. Native Ink is generated C/Clang, compared with optimized Rust. All four regressions retained.<br>Catalogue1,298 · observations11,106 ·102 source hashes unchanged ·6,936 complete comparisons.<br><a href="REPORT.md">Full report</a> · <a href="outcome-tables.json">All counts</a> · <a href="fresh-regressions.json">Regressions</a></p></main></html>'''.replace('ROWS',body)
(R/'browser-completed.html').write_text(page)
