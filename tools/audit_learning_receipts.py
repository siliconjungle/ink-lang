#!/usr/bin/env python3
"""Audit retained learning artifacts; conformance itself runs in Rust tests."""
import argparse,hashlib,json,re
from pathlib import Path

def audit(root):
    metadata=json.loads((root/'metadata.json').read_bytes())
    for name,digest in metadata['files'].items():
        if Path(name).name!=name or hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest:raise ValueError('artifact changed: '+name)
    receipt=json.loads((root/'model.snapshot.receipt.json').read_bytes())
    trace=json.loads((root/'training-trace.json').read_bytes())
    if receipt['semantics']!='ink-explicit-learning-v1' or trace['schema']!=1:raise ValueError('semantics')
    if receipt['updates']!=trace['epochs']*len(trace['observations']) or receipt['updates']!=1600:raise ValueError('updates')
    if receipt['epochs']!=trace['epochs'] or receipt['observations']!=len(trace['observations']):raise ValueError('trace shape')
    if hashlib.sha256((root/'model.snapshot').read_bytes()).hexdigest()!=receipt['snapshot_sha256']:raise ValueError('model digest')
    if hashlib.sha256((root/'training-trace.json').read_bytes()).hexdigest()!=receipt['trace_sha256']:raise ValueError('serialized trace digest')
    if not re.fullmatch('[0-9a-f]{64}',receipt['source_core_sha256']):raise ValueError('module identity')
    rows=json.loads((root/'gpu-receipts.json').read_bytes())
    if len(rows)!=24 or sum(r.get('backend')=='gpu' for r in rows)!=1:raise ValueError('actual dispatch coverage')
    for name in ['parity.log','value-state-parity.log']:
        log=(root/name).read_text()
        for marker in ['5 passed; 0 failed','wgpu: 24 results matched; 1 GPU calls','rust Wasm: 24 values/outcomes and exact snapshots matched']:
            if marker not in log:raise ValueError('missing required-target receipt: '+marker)
    print(json.dumps(dict(status='checked',updates=receipt['updates'],online_cases=len(rows),actual_gpu_calls=1)))
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('report',type=Path);args=parser.parse_args();audit(args.report)
