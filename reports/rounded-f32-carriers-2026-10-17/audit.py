#!/usr/bin/env python3
"""Audit retained observations; optional finite controls and current emission."""
import argparse,gzip,hashlib,json,os,statistics,subprocess,tempfile
from pathlib import Path

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--run',action='store_true',help='execute finite correctness controls, not timing loops')
p.add_argument('--ink',type=Path,help='reproduce final images using this current distribution compiler')
a=p.parse_args();root=Path(__file__).resolve().parent
s=json.loads((root/'summary.json').read_bytes());raw={}
sha=lambda b:hashlib.sha256(b).hexdigest()
for name,r in s['files'].items():
    path=root/name;assert path.resolve().is_relative_to(root)
    data=path.read_bytes();assert len(data)==r['bytes'] and sha(data)==r['sha256'],name
assert {str(f.relative_to(root)) for f in root.rglob('*') if f.is_file() and f!=root/'summary.json'}==set(s['files'])
for name,r in s['artifacts'].items():
    assert (root/name).resolve().is_relative_to(root)
    stored=root/r['stored'];assert stored.resolve().is_relative_to(root)
    data=stored.read_bytes();assert sha(data)==r['stored_sha256']
    if r['encoding']=='gzip':data=gzip.decompress(data)
    else:assert r['encoding']=='identity'
    assert len(data)==r['bytes'] and sha(data)==r['sha256'],name
    raw[name]=data
def load(name):return json.loads(raw[name])
processes=0
for cohort,kind in s['cohorts'].items():
    captured=load(cohort+'/summary.json');assert captured['status']=='measured-unadmitted'
    records=[]
    for pair in range(captured['pairs']):
        prefix=f'pair-{pair}' if kind=='scalar' else str(pair)
        r={v:load(f'{cohort}/{prefix}-{v}.json') for v in ['baseline','new']}
        assert r['baseline']['core_sha256']==r['new']['core_sha256']
        for v,record in r.items():
            assert record['variant']==v and record['pair']==pair
            assert record['node']=='v22.22.1'
            if kind=='scalar':
                assert (record['values'],record['outcomes'],record['restores'])==(3543,128,17)
            else:assert (record['verified_reference_outcomes'],record['dense_predictions'])==(27,16)
            processes+=1
        key='records' if kind=='scalar' else 'rows'
        assert len(r['baseline'][key])==len(r['new'][key])
        for x,y in zip(r['baseline'][key],r['new'][key]):
            assert x.keys()==y.keys()
            for k in x:
                if k not in ['samples_ms','median_ms','setup_ms']:assert x[k]==y[k],(cohort,pair,x['name'],k)
            if kind=='scalar':
                for row in [x,y]:assert row['median_ms']==statistics.median(row['samples_ms'])
        records.append(r)
    for index,row in enumerate(records[0]['baseline'][key]):
        ratios=[statistics.median(r['baseline'][key][index]['samples_ms'])/statistics.median(r['new'][key][index]['samples_ms']) for r in records]
        saved=captured['ratios'][row['name']]
        assert saved==dict(median=statistics.median(ratios),pairs=ratios,min=min(ratios),max=max(ratios)),(cohort,row['name'])
    if 'images' in captured:
        for v,digest in captured['images'].items():assert sha(raw[cohort+'/'+v+'.mjs'])==digest
integration=load('validation/integration/receipt.json');assert integration['status']=='passed'
assert sha(raw['validation/integration/sources.json'])==integration['sources_sha256']
for phase in integration['phases']:
    assert phase['exit_code']==0
    assert sha(raw['validation/integration/'+phase['name']+'.log'])==phase['log_sha256']
package=load('validation/package-complete-receipt.json');assert package['tests']==60 and package['targets']==47
assert sha(raw['validation/package-complete.log'])==package['log_sha256']
assert sha(raw['validation/final-sources.json'])==package['sources_sha256']
gpu=load('validation/gpu/receipt.json');assert gpu['status']=='passed-real-eligible-dispatch' and gpu['exit_code']==0
gpu_rows=load('validation/gpu/gpu-receipts.json')
assert len(gpu_rows)==gpu['outcomes']==101 and sum(row.get('backend')=='gpu'for row in gpu_rows)==gpu['gpu_calls']==1
for name,r in gpu['files'].items():
    assert sha(raw['validation/gpu/'+name])==r['sha256'] and len(raw['validation/gpu/'+name])==r['bytes']
assert len(load('controls/final/cases.json'))==3543
assert len(load('parity/expected.json'))==772
assert sum('restore'in row for row in load('parity/script.json'))==17
for name in ['neural','staged-neural']:
    assert raw[name+'/new.mjs']==raw[name+'/final.mjs']
assert raw['scalar/cohort-warm/new.mjs']==raw['scalar/final.mjs']
with tempfile.TemporaryDirectory(prefix='ink-rounded-f32-audit-')as temporary:
    temp=Path(temporary)
    if a.run or a.ink:
        for name,data in raw.items():
            if name.startswith(('controls/','scalar/','neural/','staged-neural/','parity/')):
                target=temp/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    if a.ink:
        compiler=a.ink.resolve()
        for folder,core,expected in [('scalar','controls/micro/core.json','scalar/final.mjs'),('neural','neural/source.core.json','neural/final.mjs'),('staged-neural','staged-neural/source.core.json','staged-neural/final.mjs'),('controls/final','controls/final/core.json','controls/final/program.mjs')]:
            output=temp/folder/'reproduced.mjs'
            result=subprocess.run([str(compiler),'build',str(temp/core),'--core','--target','javascript','-o',str(output)],capture_output=True,text=True)
            assert result.returncode==0,result.stderr
            assert output.read_bytes()==raw[expected],expected
    if a.run:
        result=subprocess.run(['node',str(temp/'controls/final/test.mjs')],env=dict(os.environ,INK_THREADS='2'),capture_output=True,text=True,timeout=120)
        assert result.returncode==0,result.stderr
        result_json=json.loads(result.stdout)
        assert result_json['values']==3543 and result_json['stateOutcomes']==208 and result_json['restores']==17
        print(result.stdout.strip())
        result=subprocess.run(['node',str(temp/'parity/check.mjs')],env=dict(os.environ,INK_THREADS='2'),capture_output=True,text=True,timeout=120)
        assert result.returncode==0,result.stderr
        # Retained Wasm is a report asset, never restored to a Cargo target.
        # Change only the harness's artifact URL for this finite replay.
        harness=(temp/'parity/check-wasm.mjs').read_text()
        old='`${backend}/target/wasm32-unknown-unknown/debug/compiled_state.wasm`'
        assert harness.count(old)==1
        (temp/'parity/check-retained-wasm.mjs').write_text(harness.replace(old,"'compiled_state.wasm'"))
        result=subprocess.run(['node',str(temp/'parity/check-retained-wasm.mjs')],capture_output=True,text=True,timeout=120)
        assert result.returncode==0,result.stderr
        print(result.stdout.strip())
print(json.dumps(dict(status='audited',processes=processes,cohorts=len(s['cohorts']),finite_controls=a.run,current_emission=bool(a.ink),retained_native_gpu_calls=gpu['gpu_calls'],automatic_admission=False)))
