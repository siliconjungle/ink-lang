"""Verify final chains and bind supplementary display preservation artifacts."""
import hashlib,json
from pathlib import Path
R=Path(__file__).resolve().parent;P=R.parents[2]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda n:json.loads((R/n).read_text())
f=read('final-binding.json');d=read('display-review.json')
assert f['status']=='bound' and d['status']=='passed'
for n,h in f['artifacts'].items():assert sha(R/n)==h,n
for n,h in d['bindings'].items():assert sha(R/n)==h,n
assert sha(P/'REPORT.md')==f['parent_report_sha256']
assert sha(P/'agent-ownership.json')==f['ownership_sha256']
assert read('verification.json')['status']=='passed'
assert read('protocol-final-review.json')['status']=='Final review passes'
extra=['bind-completion.py','final-binding.json','display-review.json','REPORT.md.before-display-review','browser-completed.html.before-display-review','catalogue-review.prepared.json','parent-REPORT.md.before','parent-agent-ownership.json.before','final-verification-run.log']
result=dict(status='passed',bound_final_artifacts=len(f['artifacts']),bound_display_artifacts=len(d['bindings']),supplementary_artifacts={n:sha(R/n) for n in extra},scope='Final chain hashes checked, including display correction and preserved originals; prior history and unrelated ownership preserved.')
(R/'completion-binding.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(dict(status='passed',final_artifacts=len(f['artifacts']),supplementary_artifacts=len(extra))))
