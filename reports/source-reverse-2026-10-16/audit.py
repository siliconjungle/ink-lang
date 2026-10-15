#!/usr/bin/env python3
"""Audit retained byte identities and complete replay counts, not AD correctness."""
from pathlib import Path
import hashlib,json,re
root=Path(__file__).resolve().parent
manifest=json.loads((root/'artifacts.json').read_text())
for name,digest in manifest['sha256'].items():
    assert Path(name).name==name
    assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest,name
steps=json.loads((root/'script.json').read_text());expected=json.loads((root/'expected.json').read_text())
assert len(steps)==38 and len(expected)==35
assert sum('restore'in s for s in steps)==3
assert len(json.loads((root/'wgpu-receipts.json').read_text()))==35
browser=json.loads((root/'browser-conformance.json').read_text())
assert browser['status']=='passed' and browser['comparisons']==105 and browser['restores']==9
assert browser['gpuCalls']==1 and browser['requiredErrors']==6
log=(root/'source-unit-tests.log').read_text()
assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',log)))==16
print('source reverse evidence: byte hashes, 16 unit tests, 35 observations, 3 restores and 105 browser comparisons retained')
