"""Postmeasurement presentation corrections only; frozen generators stay intact."""
import hashlib,json
from pathlib import Path
R=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
o=json.loads((R/'outcome-tables.json').read_text())
d=o['counts']['fresh|browser||js_expert_over_ink_checked_gpu|all']
a,z,u=[d.get(k,0) for k in ['Ink_faster','expert_faster','inconclusive']]
assert (a,z,u)==(0,36,0)
before={}
for name in ['REPORT.md','browser-completed.html']:
 p=R/name; q=R/(name+'.before-display-review');assert not q.exists()
 q.write_bytes(p.read_bytes());before[name]=sha(p)
report=(R/'REPORT.md').read_text()
old='| Actual GPU / expert JS | 0 | 0 | 0 |'
assert report.count(old)==1
report=report.replace(old,f'| Actual GPU / expert JS | {a} | {z} | {u} |')
report=report.replace('Per-family, callback cohort, match location and exact ratio intervals are retained in [outcomes](outcome-tables.json) and raw summaries.','Per-family and callback-cohort counts are retained in [outcomes](outcome-tables.json); every match location and exact ratio interval is retained in the raw summaries.')
report+='\n## Review corrections and next performance targets\n\n'
report+='Before the first measurement, a reporting-only inventory correction marked `count.wgsl` active and `sum.wgsl` inactive for the complementary-count GPU descriptors, matching the existing frozen scalar dispatch. The original helper and receipt remain preserved. The recovered inventory and its distinct helper are authenticated by [pretime bindings](pretime-review-bindings.json); no compiled target, source fixture, control or cost policy changed.\n\n'
report+='After measurement, the frozen report/dashboard generators looked up an absent GPU ratio label. This display correction reads the actual `js_expert_over_ink_checked_gpu` verdicts: **0 Ink wins, 36 expert-JS wins**. The generators and their original outputs remain preserved. No sample, interval or verdict changed. [Display receipt](display-review.json) binds the corrected outputs.\n\n'
report+='The strongest next general opportunities are a proved forward early-exit lowering for first-match consumers and lower output/call-boundary overhead. This batch does not implement either. Expert controls already erase the same useless work; gains over prior Ink alone cannot establish a lead over those controls.\n'
(R/'REPORT.md').write_text(report)
page=(R/'browser-completed.html').read_text()
old='<tr><td>Actual GPU / expert JS</td><td>0</td><td>0</td><td>0</td></tr>'
assert page.count(old)==1
page=page.replace(old,f'<tr><td>Actual GPU / expert JS</td><td>{a}</td><td>{z}</td><td>{u}</td></tr>')
(R/'browser-completed.html').write_text(page)
receipt=dict(status='passed',scope='Postmeasurement presentation correction only; no target, sample, interval, verdict or frozen generator changed.',original_output_hashes=before,actual_gpu_comparison='js_expert_over_ink_checked_gpu',actual_gpu_verdicts=d,bindings={n:sha(R/n) for n in ['review-display.py','outcome-tables.json','REPORT.md','browser-completed.html','REPORT.md.before-display-review','browser-completed.html.before-display-review']})
(R/'display-review.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(dict(status='passed',report_sha256=sha(R/'REPORT.md'),dashboard_sha256=sha(R/'browser-completed.html'))))
