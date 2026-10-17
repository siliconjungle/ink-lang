#!/usr/bin/env python3
"""Audit/replay this immutable helper-expansion study, without plan admission."""
import argparse,gzip,hashlib,io,json,math,os,statistics,subprocess,tarfile,tempfile
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--run',action='store_true');p.add_argument('--ink',type=Path);a=p.parse_args()
root=Path(__file__).resolve().parent;s=json.loads((root/'summary.json').read_bytes());raw={};sha=lambda d:hashlib.sha256(d).hexdigest()
for name,info in s['files'].items():
 path=root/name;assert path.resolve().is_relative_to(root);data=path.read_bytes();assert len(data)==info['bytes']and sha(data)==info['sha256'],name
assert set(s['files'])=={str(p.relative_to(root))for p in root.rglob('*')if p.is_file()and p!=root/'summary.json'}
for name,info in s['artifacts'].items():
 path=root/info['stored'];assert path.resolve().is_relative_to(root);data=path.read_bytes();assert sha(data)==info['stored_sha256']
 if info['encoding']=='gzip':data=gzip.decompress(data)
 else:assert info['encoding']=='identity'
 assert len(data)==info['bytes']and sha(data)==info['sha256'],name;raw[name]=data
def load(name):return json.loads(raw[name])
sources={}
for name,info in s['source_archives'].items():
 data=(root/name).read_bytes();assert len(data)==info['bytes']and sha(data)==info['sha256']
 with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz')as t:
  files={}
  for member in t.getmembers():
   path=Path(member.name);assert member.isfile()and not path.is_absolute()and'..'not in path.parts and member.name not in files
   files[member.name]=t.extractfile(member).read()
  assert {n:sha(v)for n,v in files.items()}==info['files'];sources[name]=files
package=load('validation/package/receipt.json');assert(package['status'],package['tests'],package['targets'],package['RUST_MIN_STACK'])==('passed',62,49,None)
assert s['source_archives']['sources/final-javascript.tar.gz']['files']==package['source']
assert all(c['exit_code']==0 for c in package['commands'])and[c['name']for c in package['commands']]==['fetch','tests','examples']
baseline=sources['sources/baseline-javascript.tar.gz'];final=sources['sources/final-javascript.tar.gz']
changed={n for n in set(baseline)|set(final)if baseline.get(n)!=final.get(n)}
assert changed=={'AGENTS.md','src/helper_inline.rs','tests/owned_parameters.rs'}
integration=load('validation/integration/receipt.json');assert integration['status']=='passed'and integration['distribution']==s['distribution']
assert sha(raw['validation/integration/sources.json'])==integration['sources_sha256']
assert[p['name']for p in integration['phases']]==['compile','owned-parameters','owned-records','numerical-state','function-specialization']
for phase in integration['phases']:assert phase['exit_code']==0 and sha(raw['validation/integration/'+phase['name']+'.log'])==phase['log_sha256']
failed=load('validation/failed-integration/receipt.json');assert failed['status']=='failed'and failed['phases'][-1]['exit_code']!=0
assert b'unsupported method at_or on List(F32)'in raw['validation/failed-integration/owned-parameters.log']
assert b'owned temporary storage used after move'in raw['validation/diagnostics/move-fixture-failure-owned-parameters.log']
gpu=load('validation/gpu/receipt.json');assert(gpu['status'],gpu['exit_code'],gpu['outcomes'],gpu['gpu_calls'])==('passed-real-eligible-dispatch',0,388,1)
rows=load('validation/gpu/gpu-receipts.json');assert len(rows)==388 and sum(r.get('backend')=='gpu'for r in rows)==1
for name,info in gpu['files'].items():assert len(raw['validation/gpu/'+name])==info['bytes']and sha(raw['validation/gpu/'+name])==info['sha256']
expected=load('parity/expected.json');script=load('parity/script.json');assert len(expected)==388 and len(script)==405 and sum('restore'in row for row in script)==17
assert raw['validation/gpu/gpu-final.snapshot']==bytes(expected[-1]['snapshot'])
for mode in ['native','bits']:assert len(load('controls/'+mode+'/cases.json'))==291 and load('controls/'+mode+'/replay-exit.json')['exit_code']==0
repro=load('validation/diagnostics/distribution-image-reproduction.json');assert repro['status']=='matched-final-measured-image'and repro['distribution']==s['distribution']
assert repro['compiler_sha256']==integration['compiler_sha256']and repro['image_sha256']==sha(raw['neural/new.mjs'])and repro['source_sha256']==sha(raw['neural/source.core.json'])
for row in load('other-images/comparison.json'):
 assert row['byte_identical']and row['source_sha256']==sha(raw['other-images/'+row['name']+'.core.json'])
 for variant in ['baseline','new']:assert row['emitters'][variant]['exit_code']==0 and row['emitters'][variant]['sha256']==sha(raw['other-images/'+row['name']+'-'+variant+'.mjs'])
processes=0;canonical=None
def semantic_rows(record):return[{k:v for k,v in row.items()if k!='samples_ms'}for row in record['rows']]
for cohort,info in s['cohorts'].items():
 protocol=load(cohort+'/protocol.json');assert protocol['pairs']==info['pairs']==6
 assert protocol['runner_sha256']==sha(raw['neural/measure.mjs'])
 for variant in ['baseline','new']:assert protocol['images'][variant]['sha256']==sha(raw['neural/'+variant+'.mjs'])
 records=[]
 for pair in range(6):
  pair_rows={}
  for variant in ['baseline','new']:
   assert load(f'{cohort}/{pair}-{variant}.exit.json')['exit_code']==0
   r=load(f'{cohort}/{pair}-{variant}.json');assert(r['variant'],r['pair'],r['node'],r['v8'])==(variant,pair,'v22.22.1','12.4.254.21-node.35')
   assert(r['verified_reference_outcomes'],r['dense_predictions'],len(r['rows']))==(27,16,5)
   assert r['core_sha256']==sha(raw['neural/source.core.json'])and r['image_bytes']==len(raw['neural/'+variant+'.mjs'])
   for row in r['rows']:assert len(row['samples_ms'])==7 and all(math.isfinite(v)and v>0 for v in row['samples_ms'])
   if canonical is None:canonical=r
   assert semantic_rows(r)==semantic_rows(canonical);pair_rows[variant]=r;processes+=1
  records.append(pair_rows)
 calculated={}
 for index,row in enumerate(canonical['rows']):
  ratios=[statistics.median(r['baseline']['rows'][index]['samples_ms'])/statistics.median(r['new']['rows'][index]['samples_ms'])for r in records]
  calculated[row['name']]={'median':statistics.median(ratios),'pairs':ratios,'min':min(ratios),'max':max(ratios)}
 assert load(cohort+'/summary.json')=={'status':'measured-unadmitted','pairs':6,'ratios':calculated}
assert load('neural/cohort-1/summary.json')['ratios']['training/4']['median']<1
assert load('neural/cohort-2/summary.json')['ratios']['training/4']['min']>1
with tempfile.TemporaryDirectory(prefix='ink-direct-owners-audit-')as temporary:
 temp=Path(temporary)
 if a.run or a.ink:
  for name,data in raw.items():
   if name.startswith(('controls/','parity/','neural/','other-images/')):
    q=temp/name;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(data)
 if a.ink:
  # This optional historical reproduction check is useful at publication. CI
  # replays retained semantics without permanently freezing future code bytes.
  compiler=a.ink.resolve()
  for source,image,core in [('neural/source.core.json','neural/new.mjs',True),('parity/source.ink','parity/program.mjs',False),('controls/native/source.ink','controls/native/program.mjs',False),('controls/bits/source.ink','controls/bits/program.mjs',False)]:
   target=temp/(image+'.reproduced.mjs');cmd=[str(compiler),'build',str(temp/source),*(['--core']if core else[]),'--target','javascript','-o',str(target)]
   r=subprocess.run(cmd,capture_output=True,text=True);assert r.returncode==0,r.stderr;assert target.read_bytes()==raw[image],image
 if a.run:
  for mode in ['native','bits']:
   r=subprocess.run(['node',str(temp/'controls'/mode/'test.mjs')],env=dict(os.environ,INK_THREADS='2'),capture_output=True,text=True,timeout=120);assert r.returncode==0,r.stderr
   controls=json.loads(r.stdout);assert(controls['status'],controls['cases'],controls['expanded'],controls['ordinaryRecursiveAndBudgetFallback'])==('passed',291,True,True);print(mode,r.stdout.strip())
  r=subprocess.run(['node',str(temp/'parity/check.mjs')],env=dict(os.environ,INK_THREADS='2'),capture_output=True,text=True,timeout=120);assert r.returncode==0,r.stderr
  original=(temp/'parity/check-wasm.mjs').read_text();path='`${backend}/target/wasm32-unknown-unknown/debug/compiled_state.wasm`';assert original.count(path)==1
  (temp/'parity/check-retained-wasm.mjs').write_text(original.replace(path,"'compiled_state.wasm'"))
  r=subprocess.run(['node',str(temp/'parity/check-retained-wasm.mjs')],capture_output=True,text=True,timeout=120);assert r.returncode==0,r.stderr;print(r.stdout.strip())
  for variant in ['baseline','new']:
   r=subprocess.run(['node',str(temp/'neural/measure.mjs'),str(temp/f'neural/{variant}.mjs'),str(temp/'neural'),variant,'0'],capture_output=True,text=True,timeout=300);assert r.returncode==0,r.stderr;assert semantic_rows(json.loads(r.stdout))==semantic_rows(canonical)
print(json.dumps({'status':'audited','processes':processes,'cohorts':2,'finite_controls':a.run,'current_emission':bool(a.ink),'retained_gpu_calls':1,'automatic_admission':False}))
