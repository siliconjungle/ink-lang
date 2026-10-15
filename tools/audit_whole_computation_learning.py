#!/usr/bin/env python3
"""Verify retained whole-computation training artifacts and acceptance receipts."""
import argparse,hashlib,json,math
from pathlib import Path

def audit(root):
    metadata=json.loads((root/'metadata.json').read_bytes())
    for name,digest in metadata['files'].items():
        if Path(name).name!=name or hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest:raise ValueError('artifact changed: '+name)
    receipt=json.loads((root/'training-receipt.json').read_bytes());trace=json.loads((root/'trace.json').read_bytes())
    if receipt['updates']!=200 or trace['epochs']*len(trace['observations'])!=200:raise ValueError('update coverage')
    if hashlib.sha256((root/'model.snapshot').read_bytes()).hexdigest()!=receipt['snapshot_sha256']:raise ValueError('model binding')
    before=json.loads((root/'before.json').read_bytes());after=json.loads((root/'after.json').read_bytes())
    if len(before)!=3 or len(after)!=3:raise ValueError('context coverage')
    for a,b in zip(before,after):
        if not(math.isfinite(a['result'])and math.isfinite(b['result'])and 0<=b['result']<a['result']*.2):raise ValueError('retained learning result')
        if a['version']!=0 or b['version']!=200:raise ValueError('snapshot version')
    rows=json.loads((root/'gpu-receipts.json').read_bytes())
    if len(rows)!=25 or sum(r.get('backend')=='gpu'for r in rows)!=2:raise ValueError('actual dispatch')
    log=(root/'parity.log').read_text()
    for marker in ['5 passed; 0 failed','wgpu: 25 results matched; 2 GPU calls','rust Wasm: 25 values/outcomes and exact snapshots matched']:
        if marker not in log:raise ValueError('missing target receipt')
    print(json.dumps(dict(status='checked',updates=200,contexts=3,online_cases=25,actual_gpu_calls=2)))
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('report',type=Path);audit(p.parse_args().report)
