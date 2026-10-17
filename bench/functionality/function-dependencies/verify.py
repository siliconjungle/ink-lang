#!/usr/bin/env python3
"""Verify retained byte integrity and explicit execution receipt scope."""
import hashlib,json,tarfile
from pathlib import Path,PurePosixPath
root=Path(__file__).resolve().parent
load=lambda name:json.loads((root/name).read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
for name,digest in load('manifest.json')['files'].items():
    assert sha((root/name).read_bytes())==digest,name
with tarfile.open(root/'histories-and-images.tar.gz') as archive:
    members=archive.getmembers()
    assert all(m.isfile() and not PurePosixPath(m.name).is_absolute() and '..' not in PurePosixPath(m.name).parts for m in members)
    assert len(members)==len({m.name for m in members})
    expected=load('archive-files.json')
    assert {m.name for m in members}==set(expected)
    read=lambda name:archive.extractfile(name).read()
    for name,digest in expected.items():assert sha(read(name))==digest,name
    for name,digest in load('artifact-equivalence.json')['final_files'].items():
        assert sha(read('bundle/'+name))==digest,name
    for name,digest in load('complete-training-receipt.json')['files'].items():
        assert sha(read('validation/'+name))==digest,name
    browser=json.loads(read('required-browser.json'))
    assert browser['status']=='passed' and browser['comparisons']==105
    train=browser['resident_training']
    assert train['binary64_gpu_required_rejected'] and train['javascript_initial_gradient_exact']
    assert train['binary64_companion']=={'cpu':2.0000000000000004,'javascript':2.0000000000000004}
    assert all(len(v)==10 for v in train['histories'].values())
    assert sum(r['counters']['dispatches'] for r in train['receipts']['gpu-required'])==44
    assert all(r['observed_transfers']=={'uploads':0,'readbacks':0} for r in train['receipts']['gpu-required'])
    lexical=json.loads(read('lexical-browser.json'))
    assert lexical['status']=='passed' and lexical['comparisons']==75 and lexical['gpuCalls']==1
core=load('core-private.json');package=load('core-package.json')
assert core['status']=='passed' and core['private_checkout'] and core['private_target']
assert core['core_tree']==package['core_tree'] and core['package']==package['commit']
assert sha((root/'core-private.log').read_bytes())==core['log_sha256']
after=load('after-manifest.json');before=load('before-manifest.json')
assert before['core_sha256']==after['core_sha256']==load('before-after.json')['same_complete_source']
for name in ['shape','gradients','update','losses']:
    old=next(f for f in before['functions'] if f['name']==name)
    new=next(f for f in after['functions'] if f['name']==name)
    assert old['fallback_reason'] and new['fallback_reason'] is None and new['graph']
print(json.dumps({'status':'integrity passed','archive_files':len(members),'final_generated_files':len(load('artifact-equivalence.json')['final_files'])}))
