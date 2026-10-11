"""Create immutable report-only host-isolation bundles and exact reference frames; no timers."""
from pathlib import Path
import importlib.util,json,hashlib,shutil
B=Path(__file__).resolve().parents[3];R=Path(__file__).resolve().parent;OUT=R/'browser-attribution'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def module(path,name):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
prepare=module(R/'prepare-attribution.py','prepare').prepare
spec=module(B/'bench/web-stack-proofs-38/spec.py','spec38')
assert not OUT.exists(),'preserve existing preparations'
OUT.mkdir()
original=R/'original/runtime/hosts/ink-compute.mjs';candidate=B/'runtime/hosts/ink-compute.mjs'
parity=json.loads((R.parent/'parity/browser-preparation.json').read_text())
layouts=[('u32',R/'attribution-original-final','pipeline38_left_padded_zip_heldout_u32'),('i32',B/'build/generated-parity-memory40/gpu-module/gpu/f12','signed'),('bool',B/'build/generated-parity-memory40/gpu-module/gpu/f14','flags'),('vector',B/'build/generated-parity-memory40/gpu-module/gpu/f15','vectors')]
frames=[];task=next(t for t in spec.TASKS if t['name']==layouts[0][2])
for n in [0,1,32,2048]:
 for profile in ['low','high']:
  xs=spec.words(2026113801+(17 if profile=='high'else 0),n,profile=='low');ys=spec.words(123,n//3+1,profile=='low');seed=512 if profile=='low'else 0x9e3779b9;k=7
  f=spec.fixture(task,f'u32-{profile}-{n}',xs,ys,seed,k,profile,False)
  frames.append(dict(id=f['id'],layout='u32',name=task['name'],args=[xs,ys,seed,k],expected=f['expected'],oracle='independent unbounded ring + original staged map/concat/zip',sizes=[n,len(ys)]))
for layout,bundle,name in layouts[1:]:
 for row in parity['rows']:
  if row['pure']and row['name']==name:frames.append(dict(id=f'{layout}-reference-{row["index"]}',layout=layout,name=name,args=row['args'],expected=row['expected'],oracle='frozen whole-source logical reference from full parity',reference_index=row['index']))
versions={};bindings={}
for layout,bundle,name in layouts:
 versions[layout]={}
 for version,host in [('original',original),('candidate',candidate)]:
  out=OUT/f'{layout}-{version}';prepare(bundle,out,host,B/'lowerings/gpu/devices/compute.mjs'if version=='candidate'else None)
  shutil.copy2(host,out/'host-uninstrumented.mjs')
  receipt=json.loads((out/'attribution-preparation.json').read_text());receipt['bindings']['host-uninstrumented.mjs']=sha(out/'host-uninstrumented.mjs');(out/'attribution-preparation.json').write_text(json.dumps(receipt,indent=2)+'\n')
  versions[layout][version]=dict(folder=out.relative_to(R).as_posix()+'/',host_sha256=sha(host),preparation_sha256=sha(out/'attribution-preparation.json'))
  for p in out.iterdir():
   if p.is_file():bindings[p.relative_to(B).as_posix()]=sha(p)
for p in [B/'bench/web-stack-proofs-38/spec.py',B/'knowledge/producers/web_pipeline38_laws.py',R.parent/'parity/browser-preparation.json',B/'build/generated-parity-memory40/source.ink',B/'build/generated-parity-memory40/expected.json',R/'prepare-attribution.py',Path(__file__)]:bindings[p.relative_to(B).as_posix()]=sha(p)
protocol=dict(schema=1,status='frozen_untimed',layouts=versions,frames=frames,routes=['cpu','auto','gpu'],rounds=3,warmups_per_context_version=1,order='context then route; warmup original/candidate once; rounds alternate original/candidate and reverse on odd round',boundary='captured owned complete call plus all-output consumer; CPU arena upload/execution/unpack inclusive spans; GPU total includes transfer/dispatch/readback, no isolated shader timing',hosts={'original':sha(original),'candidate':sha(candidate)},bindings=bindings,limits=['Instrumented spans perturb execution and do not estimate uninstrumented speed.','One checked U32 recipe with four sizes and two value regimes; other carriers retain existing small reference fixtures only.','Synthetic saved profile forces auto JS without online probes; no calibrated profitability claim.','Same compiled bundle bytes isolate hosts; this is not compiler or backend comparison.','GPU asynchronous work is included in return interval; no hardware timestamp queries.','F32, u64, scalar legacy, strings and nested carriers are covered by parity separately, outside this attribution matrix.'])
(OUT/'protocol.json').write_text(json.dumps(protocol,indent=2)+'\n');print(json.dumps({'status':'frozen_untimed','protocol_sha256':sha(OUT/'protocol.json'),'frames':len(frames),'validation_calls':len(frames)*6,'instrumented_calls':len(frames)*6*3,'warmups':len(frames)*6}))
