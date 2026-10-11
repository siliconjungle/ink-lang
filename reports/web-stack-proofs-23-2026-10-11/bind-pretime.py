"""Bind completed untimed validation and review helper bytes."""
import hashlib,json
from pathlib import Path
R=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert not (R/'pretime-review-bindings.json').exists()
names=['metadata.json','policy-freeze.json','native/metadata.json','native/validation.json','node-validation.json','protocol-compiled-preflight-review.json','protocol-compiled-preflight-review.md','browser-batches/manifest.json','catalogue-review.py','native-final-review.py','code-shape-review.py','protocol-final-review.py','compiled-preflight.py','freeze-policy.py','make-report.py','make-dashboard.py','verify-final.py','bind-pretime.py']
result=dict(status='bound-before-performance',artifacts={n:sha(R/n) for n in names},scope='All source/control/fixture/target/policy bytes and untimed validation bound before sequential native, Node and browser measurements. Review helper bytes fixed; only saved-data audits follow timings.')
(R/'pretime-review-bindings.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(dict(status=result['status'],artifacts=len(names))))
