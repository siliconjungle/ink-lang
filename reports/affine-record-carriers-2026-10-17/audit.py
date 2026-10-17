#!/usr/bin/env python3
"""Audit retained local-record observations; optionally replay finite controls."""
import argparse,gzip,hashlib,io,json,os,re,statistics,subprocess,tarfile,tempfile
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--run',action='store_true');p.add_argument('--ink',type=Path);a=p.parse_args()
root=Path(__file__).resolve().parent;s=json.loads((root/'summary.json').read_bytes());raw={};sha=lambda data:hashlib.sha256(data).hexdigest()
for name,receipt in s['files'].items():
    path=root/name;assert path.resolve().is_relative_to(root);data=path.read_bytes()
    assert len(data)==receipt['bytes']and sha(data)==receipt['sha256'],name
assert {str(f.relative_to(root))for f in root.rglob('*')if f.is_file()and f!=root/'summary.json'}==set(s['files'])
for name,receipt in s['artifacts'].items():
    assert (root/name).resolve().is_relative_to(root)
    path=root/receipt['stored'];assert path.resolve().is_relative_to(root);data=path.read_bytes();assert sha(data)==receipt['stored_sha256']
    if receipt['encoding']=='gzip':data=gzip.decompress(data)
    else:assert receipt['encoding']=='identity'
    assert len(data)==receipt['bytes']and sha(data)==receipt['sha256'],name
    raw[name]=data
def load(name):return json.loads(raw[name])
for name,receipt in s['source_archives'].items():
    data=(root/name).read_bytes();assert len(data)==receipt['bytes']and sha(data)==receipt['sha256']
    with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz')as archive:
        members=archive.getmembers();assert len(members)==len(receipt['files'])
        for member in members:
            assert member.isfile()and member.name in receipt['files']
            assert sha(archive.extractfile(member).read())==receipt['files'][member.name]
processes=0
for cohort,info in s['cohorts'].items():
    captured=load(cohort+'/summary.json');assert captured['status']=='measured-unadmitted'
    kind=info['kind'];images=info['images'];key='records'if kind=='graph'else'rows';records=[]
    source_sha=sha(raw[images+'/source.core.json'])
    for pair in range(captured['pairs']):
        record={v:load(f'{cohort}/{pair}-{v}.json')for v in ['baseline','new']}
        for variant,row in record.items():
            assert row['variant']==variant and row['pair']==pair and row['node']=='v22.22.1'
            assert row['image_bytes']==len(raw[images+'/'+variant+'.mjs'])
            if kind=='graph':assert(row['reference_values'],row['reference_history_outcomes'])==(96,335)
            else:assert(row['verified_reference_outcomes'],row['dense_predictions'],row['core_sha256'])==(27,16,source_sha)
            processes+=1
        assert len(record['baseline'][key])==len(record['new'][key])==(24 if kind=='graph'else 5)
        for x,y in zip(record['baseline'][key],record['new'][key]):
            assert x.keys()==y.keys()
            for field in x:
                if field not in ['samples_ms','median_ms','setup_ms','first_call_ms']:assert x[field]==y[field],(cohort,pair,x['name'],field)
            if kind=='graph':
                for row in [x,y]:assert row['median_ms']==statistics.median(row['samples_ms'])
        records.append(record)
    for index,row in enumerate(records[0]['baseline'][key]):
        ratios=[statistics.median(r['baseline'][key][index]['samples_ms'])/statistics.median(r['new'][key][index]['samples_ms'])for r in records]
        assert captured['ratios'][row['name']]==dict(median=statistics.median(ratios),pairs=ratios,min=min(ratios),max=max(ratios)),(cohort,row['name'])
    if 'images'in captured:
        for variant,digest in captured['images'].items():assert sha(raw[images+'/'+variant+'.mjs'])==digest
assert raw['diagnostics/pre-fold/graph/baseline.mjs']==raw['diagnostics/pre-fold/graph/new.mjs']
assert min(load('final/neural-prepared/cohort-1/summary.json')['ratios']['training/16']['pairs'])<0.6
package=load('validation/package/receipt.json');assert package['status']=='passed'and(package['tests'],package['targets'])==(61,48)
assert s['source_archives']['sources/final-package.tar.gz']['files']==package['source']
for phase in package['phases']:assert phase['exit_code']==0 and sha(raw['validation/package/'+phase['name']+'.log'])==phase['log_sha256']
integration=load('validation/integration/receipt.json');assert integration['status']=='passed'
assert sha(raw['validation/integration/sources.json'])==integration['sources_sha256']
for phase in integration['phases']:assert phase['exit_code']==0 and sha(raw['validation/integration/'+phase['name']+'.log'])==phase['log_sha256']
gpu=load('validation/gpu/receipt.json');assert gpu['status']=='passed-real-eligible-dispatch'and gpu['exit_code']==0
gpu_rows=load('validation/gpu/gpu-receipts.json');assert len(gpu_rows)==101 and sum(row.get('backend')=='gpu'for row in gpu_rows)==gpu['gpu_calls']==1
for name,receipt in gpu['files'].items():assert len(raw['validation/gpu/'+name])==receipt['bytes']and sha(raw['validation/gpu/'+name])==receipt['sha256']
assert len(load('parity/expected.json'))==1251 and sum('restore'in row for row in load('parity/script.json'))==17
for mode in ['native','bits']:assert len(load('controls/'+mode+'/cases.json'))==1731
reproduction=load('validation/distribution-image-reproduction.json');assert reproduction['status']=='matched-final-measured-images'and reproduction['compiler_sha256']==integration['compiler_sha256']
for row,folder in zip(reproduction['rows'],['final/graph','final/neural-prepared','final/neural-earlier']):assert row['sha256']==sha(raw[folder+'/new.mjs'])and row['source_sha256']==sha(raw[folder+'/source.core.json'])
with tempfile.TemporaryDirectory(prefix='ink-affine-record-audit-')as temporary:
    temp=Path(temporary)
    if a.run or a.ink:
        for name,data in raw.items():
            if name.startswith(('controls/','parity/','final/')):
                q=temp/name;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(data)
    if a.ink:
        compiler=a.ink.resolve()
        for folder in ['final/graph','final/neural-prepared','final/neural-earlier']:
            target=temp/folder/'reproduced.mjs';result=subprocess.run([str(compiler),'build',str(temp/folder/'source.core.json'),'--core','--target','javascript','-o',str(target)],capture_output=True,text=True)
            assert result.returncode==0,result.stderr;assert target.read_bytes()==raw[folder+'/new.mjs'],folder
        for mode in ['native','bits']:
            folder='controls/'+mode;target=temp/folder/'reproduced.mjs'
            result=subprocess.run([str(compiler),'build',str(temp/folder/'source.core.json'),'--core','--target','javascript','-o',str(target)],capture_output=True,text=True)
            assert result.returncode==0,result.stderr;assert target.read_bytes()==raw[folder+'/program.mjs'],folder
    if a.run:
        for mode in ['native','bits']:
            result=subprocess.run(['node',str(temp/'controls'/mode/'test.mjs')],env=dict(os.environ,INK_THREADS='2'),capture_output=True,text=True,timeout=120)
            assert result.returncode==0,result.stderr;observations=json.loads(result.stdout);assert observations['values']==1731 and observations['status']=='passed'
            if mode=='bits':assert(observations['outcomes'],observations['restores'])==(96,17)
            print(mode,result.stdout.strip())
        result=subprocess.run(['node',str(temp/'parity/check.mjs')],env=dict(os.environ,INK_THREADS='2'),capture_output=True,text=True,timeout=120);assert result.returncode==0,result.stderr
        harness=(temp/'parity/check-wasm.mjs').read_text();old='`${backend}/target/wasm32-unknown-unknown/debug/compiled_state.wasm`';assert harness.count(old)==1
        # Only relocate the retained report asset; never restore a Cargo target.
        (temp/'parity/check-retained-wasm.mjs').write_text(harness.replace(old,"'compiled_state.wasm'"))
        result=subprocess.run(['node',str(temp/'parity/check-retained-wasm.mjs')],capture_output=True,text=True,timeout=120);assert result.returncode==0,result.stderr;print(result.stdout.strip())
print(json.dumps(dict(status='audited',processes=processes,cohorts=len(s['cohorts']),finite_controls=a.run,current_emission=bool(a.ink),retained_gpu_calls=1,automatic_admission=False)))
