"""Bind a reviewed reporting-only recovery before the first timed workload."""
import hashlib,json,subprocess,sys
from pathlib import Path
R=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert not any((R/n).exists() for n in ['node-results.json','browser-results.json','native/results.json','pretime-review-bindings.json'])
subprocess.run([sys.executable,str(R/'bind-pretime.py')],check=True)
p=R/'pretime-review-bindings.json';original=p.read_bytes();saved=R/'pretime-review-bindings.original.json';assert not saved.exists();saved.write_bytes(original)
d=json.loads(original);shape=json.loads((R/'code-shape-review.json').read_text());assert shape['status']=='passed'
for n in ['bind-recovery.py','code-shape-review-recovered.py','code-shape-review.json','code-shape-review.md','code-shape-review.before-recovery.json','code-shape-review.before-recovery.md','pretime-review-bindings.original.json']:
 d['artifacts'][n]=sha(R/n)
d['reporting_recovery']=dict(reason='Count descriptors dispatch count.wgsl. Original frozen helper incorrectly marked sum.wgsl active. Only active-shader reporting is corrected; all targets, measurements, selection and policy bytes unchanged.',original_binding_sha256=sha(saved),recovered_helper_sha256=sha(R/'code-shape-review-recovered.py'),before_first_measurement=True)
p.write_text(json.dumps(d,indent=2)+'\n')
print(json.dumps(dict(status='bound-before-performance',artifacts=len(d['artifacts']),reporting_recovery=True)))
