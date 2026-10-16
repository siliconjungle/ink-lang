"""Reconcile retained complete results, images and empirical observations."""
from pathlib import Path
import gzip,hashlib,json,re,statistics
ROOT=Path(__file__).resolve().parent
DIST=ROOT.parents[1]
def sha(data):return hashlib.sha256(data).hexdigest()
def read(path):return json.loads((ROOT/path).read_text())
def text(path):return gzip.decompress((ROOT/path).read_bytes()).decode()
def analyse():
 m=read('metadata.json');files={str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.is_file() and p.name!='metadata.json'}
 assert files==set(m['files'])
 for name,want in m['files'].items():
  p=Path(name);assert not p.is_absolute() and '..'not in p.parts
  assert sha((ROOT/p).read_bytes())==want,name
 for name,want in m['retained_inputs'].items():assert sha((DIST/name).read_bytes())==want,name
 images={task:{lane:gzip.decompress((ROOT/f'{task}-{lane}.mjs.gz').read_bytes()) for lane in ['before','current']} for task in ['workloads','complex','simple']}
 assert images['complex']['before']==gzip.decompress((DIST/'reports/prepared-fields-2026-10-16/complex-current.mjs.gz').read_bytes())
 runs=[read(f'timings/{i}.json') for i in range(3)];assert {d['seed'] for d in runs}=={19,71,991}
 for d in runs:
  assert d['warmup_rounds']==128 and len(d['records'])==495
  assert all(d['sources'][lane]['sha256']==sha(image) for lane,image in images['workloads'].items())
  assert all(s['source_core']==sha((ROOT/'workloads.core.json').read_bytes()) for s in d['setup'] if s['name'] in ['before','current'])
 result={'workloads':[],'complex':[],'simple':[],'memory':{},'scope':'Pooled medians of retained process observations, not a general speed or memory guarantee.'}
 def values(docs,size,task=None,engine=None,names=None):
  return {name:statistics.median(r['ns_per_call'] for d in docs for r in d['records'] if r['size']==size and r['name']==name and (task is None or r['task']==task) and (engine is None or r['engine']==engine)) for name in names}
 names=['before_ordinary','before_prepared','current_ordinary','current_prepared','direct_prepared']
 for size in [16,128,512]:
  for task in ['membership','aggregates','numeric']:
   v=values(runs,size,task=task,names=names);result['workloads'].append(dict(size=size,task=task,ns=v,prepared_before_over_current=v['before_prepared']/v['current_prepared']))
 for size in [8,64,512]:
  for engine in ['blink','gecko','webkit']:
   v={}
   for lane in ['before','current']:
    docs=[read(f'complex-timings/{lane}-{i}.json') for i in range(3)]
    for i,d in enumerate(docs):
     assert d['rotation']==i and len(d['records'])==405 and d['warmupRounds']==128 and d['calls']==128
     assert d['sources']['ink']['sha256']==sha(images['complex'][lane])
    v[lane]=values(docs,size,engine=engine,names=['pretext','ordinary','prepared'])
   result['complex'].append(dict(size=size,engine=engine,ns=v,current_over_before=v['current']['prepared']/v['before']['prepared'],current_over_pretext=v['current']['prepared']/v['current']['pretext']))
  docs=[read(f'simple-timings/{i}.json') for i in range(3)]
  for d in docs:
   for lane in ['before','current']:assert d['sources'][lane]['sha256']==sha(images['simple'][lane])
  v=values(docs,size,names=['pretext','before_ordinary','before_prepared','current_ordinary','current_prepared'])
  result['simple'].append(dict(size=size,ns=v,current_over_before=v['current_prepared']/v['before_prepared']))
 for lane in ['before','current']:
  d=read(f'memory/{lane}.json');assert d['module_sha256']==sha(images['workloads'][lane])
  result['memory'][lane]=dict(bytes=len(images['workloads'][lane]),heap_after_calls=d['phases']['after_100']['heapUsed'],rss_after_calls=d['phases']['after_100']['rss'],import_ms=d['import_ms'],first_one_ms=d['first_one_ms'])
 assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',text('checks/javascript.log.gz'))))==54
 for carrier in ['native','bits']:
  cases=read(f'cases/{carrier}/cases.json');assert len(cases)==111
  core=sha((ROOT/f'cases/{carrier}/source.core.json').read_bytes())
  packet=read(f'cases/{carrier}/layout.json');assert packet['input_core_sha256']==core
  observations=[json.loads(s) for s in (ROOT/f'cases/{carrier}/observations.jsonl').read_text().splitlines()]
  assert {x['module'] for x in observations}=={'program.mjs','flat.mjs'}
  assert all(x['source_core']==core and x['referenceCases']==111 and x['calls']==1665 for x in observations)
 cli=read('checks/cli-image.json');assert cli['pinned_core_emitter_matches_full_cli'] and cli['sha256']==sha(images['complex']['current'])
 ci=read('checks/previous-ci.json');assert ci['headSha']==m['source_parent'] and len(ci['jobs'])==20 and all(j['status']=='completed' and j['conclusion']=='success' for j in ci['jobs'])
 receipts=json.loads(gzip.decompress((ROOT/'checks/gpu-receipts.json.gz').read_bytes()));assert len(receipts)==112
 assert sum(r.get('backend')=='gpu' for r in receipts)==1 and receipts[-1]['backend']=='gpu' and receipts[-1]['counters']['dispatches']==1 and receipts[-1]['value']==[0.5,0.75,1.5]
 assert '112 results matched; 1 GPU calls'in text('checks/cross-target.log.gz')
 assert 'rust Wasm: 112 values/outcomes and exact snapshots matched'in text('checks/cross-target.log.gz')
 assert '"referenceCases":112,"preparedCalls":672'in text('checks/cross-target.log.gz')
 assert '4 passed; 0 failed'in text('checks/root-conformance.log.gz') and '2 passed; 0 failed'in text('checks/root-conformance.log.gz')
 c=read('checks/complex.json');assert (c['referenceObservations'],c['ordinary'],c['prepared'])==(13002,13002,52008)
 n=read('checks/neural.json');assert (n['referenceCases'],n['preparedCalls'],n['topologyChecksPerToken'])==(18,270,1)
 return result
if __name__=='__main__':
 import sys
 result=analyse()
 if '--write'in sys.argv:(ROOT/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
 else:assert result==read('summary.json')
 print('Prepared sum images, complete histories, checked-layout packets and measurements passed.')
