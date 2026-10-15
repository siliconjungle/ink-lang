"""Audit fixed artifact bindings, complete-target logs and retained measurements."""
import argparse,hashlib,json,math,statistics
from pathlib import Path

def analyse(root):
    metadata=json.loads((root/'metadata.json').read_bytes())
    for name,digest in metadata['files'].items():
        if Path(name).name!=name or hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest:raise ValueError('artifact changed: '+name)
    outputs={}
    for cohort,seed in [('development',72131),('holdout',99173)]:
        rows=[json.loads((root/f'{cohort}-{i}.json').read_bytes())for i in range(3)]
        for r in rows:
            if r['schema']!=1 or r['seed']!=seed:raise ValueError('cohort')
            if r['architecture']!=dict(parameters=244,features=10,hidden=[6,6],outputs=4,inkOperations=232,handwiredOperations=664,handwiredRangedOperations=232):raise ValueError('architecture')
            if r['inkSha256']!=metadata['files']['program.mjs'] or r['upstreamSha256']!=metadata['upstream_file_sha256']:raise ValueError('binding')
            if set(r['lanes'])!={'ink','handwired','handwired_ranges','direct'}:raise ValueError('lanes')
            if not math.isfinite(r['sink']):raise ValueError('unconsumed output')
            for lane in r['lanes'].values():
                samples=lane['samplesNs']
                if len(samples)!=11 or not all(math.isfinite(v)and v>0 for v in samples)or statistics.median(samples)!=lane['medianNs']:raise ValueError('raw timings')
        outputs[cohort]={n:statistics.median(r['lanes'][n]['medianNs']for r in rows)for n in ['ink','handwired','handwired_ranges','direct']}
    log=(root/'conformance.log').read_text()
    if 'FAILED' in log:raise ValueError('failing conformance')
    for marker in ['6 passed; 0 failed','wgpu: 8 results matched; 1 GPU calls','rust Wasm: 8 values/outcomes and exact snapshots matched','8 passed; 0 failed','wgpu: 11 results matched; 1 GPU calls','rust Wasm: 11 values/outcomes and exact snapshots matched']:
        if marker not in log:raise ValueError('missing conformance marker: '+marker)
    core=(root/'core.log').read_text()
    if 'FAILED' in core or '397'!=str(sum(int(line.split('ok. ')[1].split(' passed')[0])for line in core.splitlines()if line.startswith('test result: ok. '))):raise ValueError('core coverage')
    receipts=json.loads((root/'gpu-receipts.json').read_bytes())
    if len(receipts)!=11 or sum(r.get('backend')=='gpu'for r in receipts)!=1:raise ValueError('GPU coverage')
    complete=(root/'complete.snapshot').read_bytes();first=(root/'first.snapshot').read_bytes();resumed=(root/'resumed.snapshot').read_bytes()
    if complete!=resumed:raise ValueError('complete state resume')
    for name,initial in [('complete',None),('first',None),('resumed',first)]:
        receipt=json.loads((root/(name+'-receipt.json')).read_bytes())
        trace=json.loads((root/('trace-12.json'if name=='complete'else'trace-6.json')).read_bytes())
        if receipt['snapshot_sha256']!=hashlib.sha256((root/(name+'.snapshot')).read_bytes()).hexdigest():raise ValueError('checkpoint binding')
        if receipt['initial_snapshot_sha256']!=(None if initial is None else hashlib.sha256(initial).hexdigest()):raise ValueError('parent binding')
        if receipt['updates']!=trace['epochs'] or receipt['epochs']!=trace['epochs'] or receipt['observations']!=1:raise ValueError('update count')
        if receipt['source_core_sha256']!=metadata['source_core_sha256']:raise ValueError('training source')
    before=json.loads((root/'before.json').read_bytes());after=json.loads((root/'after.json').read_bytes())
    if not after[0]['result']['Ok']<before[0]['result']['Ok']*.5:raise ValueError('loss reduction')
    if after[1]['result']['accepted']+after[1]['result']['rejected']!=12:raise ValueError('frame coverage')
    print(json.dumps(dict(status='checked',cohorts=outputs,scope='Equivalent dynamic-context CPU graph forward plus VJP; separate host conformance and unrelated eligible GPU kernel, no GPU training or whole-gallery claim.'),indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('report',type=Path);analyse(p.parse_args().report)
