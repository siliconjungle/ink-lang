#!/usr/bin/env python3
"""Validate retained bytes and complete execution receipts; no timing claim."""
import hashlib,json,tarfile
from pathlib import Path,PurePosixPath
root=Path(__file__).resolve().parent
load=lambda name:json.loads((root/name).read_text())
sha=lambda data:hashlib.sha256(data).hexdigest()
for name,digest in load('manifest.json')['files'].items():
    assert sha((root/name).read_bytes())==digest,name
with tarfile.open(root/'histories-and-images.tar.gz') as archive:
    members=archive.getmembers();index=load('archive-files.json')
    assert all(m.isfile() and not PurePosixPath(m.name).is_absolute() and '..' not in PurePosixPath(m.name).parts for m in members)
    assert len(members)==len({m.name for m in members}) and {m.name for m in members}==set(index)
    read=lambda name:archive.extractfile(name).read()
    for name,digest in index.items():assert sha(read(name))==digest,name
    for name,digest in load('artifact-equivalence.json')['final_files'].items():assert sha(read('bundle/'+name))==digest,name
    native=json.loads(read('device-private-helpers/gpu-receipts.json'))
    gpu=[row for row in native if row.get('backend')=='gpu']
    assert len(native)==138 and len(gpu)==128
    assert sum(row['counters']['dispatches'] for row in gpu)==152
    assert sum(row['counters']['dispatches']==0 for row in gpu)==8
    browser=json.loads(read('browser-history.json'));assert browser['status']=='passed' and browser['comparisons']==105
    helpers=browser['private_helpers'];assert helpers['status']=='passed' and helpers['comparisons']==414 and helpers['gpuCalls']==128 and helpers['requiredErrors']==5
    training=browser['resident_training'];assert training['javascript_initial_gradient_exact'] and training['binary64_gpu_required_rejected']
    assert all(len(rows)==10 for rows in training['histories'].values())
    assert all(row['observed_transfers']=={'uploads':0,'readbacks':0} for row in training['receipts']['gpu-required'])
    before=load('before-manifest.json');after=json.loads(read('bundle/manifest.json'))
    assert before['core_sha256']==after['core_sha256']==load('before-after.json')['source_identity']
    for row in load('before-after.json')['functions']:
        assert not next(f for f in before['functions'] if f['name']==row['function'])['gpu']
        assert next(f for f in after['functions'] if f['name']==row['function'])['gpu']
    assert not next(f for f in after['functions'] if f['name']=='reverse_value')['gpu']
assert load('source-pins.json')['core_package']==load('core-package.json')
print(json.dumps({'status':'integrity passed','archive_files':len(members),'final_generated_files':len(load('artifact-equivalence.json')['final_files'])}))
