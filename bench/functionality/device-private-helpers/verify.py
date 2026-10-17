#!/usr/bin/env python3
"""Check retained bytes and the stated scope of execution receipts."""
import hashlib,json,tarfile
from pathlib import Path,PurePosixPath
root=Path(__file__).resolve().parent
load=lambda name:json.loads((root/name).read_text())
sha=lambda data:hashlib.sha256(data).hexdigest()
for name,digest in load('manifest.json')['files'].items():assert sha((root/name).read_bytes())==digest,name
with tarfile.open(root/'histories-and-images.tar.gz') as archive:
    members=archive.getmembers();expected=load('archive-files.json')
    assert all(m.isfile() and not PurePosixPath(m.name).is_absolute() and '..' not in PurePosixPath(m.name).parts for m in members)
    assert len(members)==len({m.name for m in members}) and {m.name for m in members}==set(expected)
    read=lambda name:archive.extractfile(name).read()
    for name,digest in expected.items():assert sha(read(name))==digest,name
    for name,digest in load('artifact-equivalence.json')['final_files'].items():assert sha(read('bundle/'+name))==digest,name
    browser=json.loads(read('browser-history.json'));assert browser['status']=='passed' and browser['comparisons']==105
    helpers=browser['private_helpers'];assert helpers['status']=='passed' and helpers['comparisons']==252 and helpers['gpuCalls']==74 and helpers['requiredErrors']==5
    training=browser['resident_training'];assert training['javascript_initial_gradient_exact'] and training['binary64_gpu_required_rejected']
    assert all(len(v)==10 for v in training['histories'].values())
    assert all(r['observed_transfers']=={'uploads':0,'readbacks':0} for r in training['receipts']['gpu-required'])
    native=json.loads(read('device-private-helpers/gpu-receipts.json'));gpu=[r for r in native if r.get('backend')=='gpu']
    assert len(native)==84 and len(gpu)==74 and sum(r['counters']['dispatches'] for r in gpu)==98
    outer=json.loads(read('bundle/manifest.json'))
    for f in outer['functions']:
        if f.get('gpu'):
            prefix='bundle/'+f['bundle'];part=json.loads(read(prefix+'manifest.json'));program=json.loads(read(prefix+'core.json'))['program']
            assert len(part['functions'])==1
            entry=part['functions'][0];assert entry['name']==f['name'] and program['functions'][entry['index']]['name']==f['name']
before=load('before-manifest.json');after=load('after-manifest.json')
assert before['core_sha256']==after['core_sha256']==load('before-after.json')['source_identity']
for name in ['value','evaluated','readout','lazy_total']:
    assert not next(f for f in before['functions'] if f['name']==name)['gpu']
    assert next(f for f in after['functions'] if f['name']==name)['gpu']
assert not next(f for f in after['functions'] if f['name']=='reverse_value')['gpu']
assert load('source-pins.json')['core_package']==load('core-package.json')
print(json.dumps({'status':'integrity passed','archive_files':len(members),'final_generated_files':len(load('artifact-equivalence.json')['final_files'])}))
