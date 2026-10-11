"""Import authenticated empirical samples separately from checked proof entries."""
from pathlib import Path
import hashlib,json,sys
R=Path(__file__).resolve().parent;B=R.parents[1];P=R/'targets';sys.path.insert(0,str(B/'knowledge'))
from ink_knowledge import Store,identity

def read(p):return json.loads(Path(p).read_text())
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
st=Store(B/'knowledge');metadata=read(P/'metadata.json');assert st.snapshot_id==metadata['new_snapshot'];environment=read(R/'environment.json');fixtures={x['id']:x for x in read(P/'fixtures.json')['frames']};records=[]
for host,results_path in [('node',P/'node-results.json'),('browser',P/'browser-results.json'),('native',P/'native/results.json')]:
 results=read(results_path);assert results['status']=='passed';groups={}
 for row in results['samples']:groups.setdefault((row['frame'],row['variant'],row['boundary']),[]).append(row)
 for(frame,variant,boundary),samples in sorted(groups.items()):
  assert len(samples)==9 and {x['round']for x in samples}==set(range(9));samples.sort(key=lambda x:x['round']);f=fixtures[frame];task=f['task'];selection=metadata['selections'][task];version=variant.split('_')[0];expert=version in ['expert','rust']
  if expert:
   code=sha(P/('expert.mjs'if variant=='expert_js_owned'else'expert.rs'));entries=[]
  else:
   assert version in ['literal','prior','checked'];code=sha(P/'targets'/task/(version+'.core.json'));entries=[]if version=='literal'else read(P/'targets'/task/(version+'.selection.json'))['knowledge']['roots']
  backend='native'if host=='native'else'webgpu'if variant.endswith('gpu_requested')else'wasm'if'wasm'in variant else'javascript'
  if backend=='webgpu':assert all(set(x['actual_backend_counts'])=={'gpu'}for x in samples)
  toolchain=(environment['rust']if expert and backend!='javascript'else environment['node']if expert else metadata['compiler_sha256'])
  obj=dict(schema=1,program=selection['input_core_sha256'],entries=sorted(entries),plan=identity(dict(code_sha256=code,variant=variant,compiler=toolchain,boundary=boundary)),target=dict(hardware=environment['hardware']+'/'+environment['os'],driver=results.get('host',environment['clang']),toolchain=toolchain,backend=backend,bridge=boundary),workload=dict(shape=dict(xs=len(f['xs']),ys=len(f['ys']),output=len(f['expected'])),distribution=dict(frame=frame,mode=f['mode'],seed=f['seed'],k=f['k'],input_sha256=hashlib.sha256(json.dumps([f['xs'],f['ys'],f['seed'],f['k']],separators=(',',':')).encode()).hexdigest()),concurrency=1,residency=boundary),metrics=dict(complete_call_ns=[str(round(x['ns_per_call']))for x in samples],peak_bytes=None))
  oid=st.observe(obj);records.append(dict(id=oid,host=host,frame=frame,variant=variant,boundary=boundary,raw_results_sha256=sha(results_path)))
assert len(records)==840 and len({x['id']for x in records})==840
prior=read(R/'prior-observation-bindings.json');assert all(sha(st.data/'observations'/name)==h for name,h in prior['files'].items());st.rebuild()
(R/'observations.json').write_text(json.dumps(dict(status='recorded',records=records,added=840,prior_count=prior['count'],total_files=len(list((st.data/'observations').glob('*.json'))),previous_bytes_preserved=True,source_sha256=sha(__file__),scope='Empirical nine-round timings rounded to integer ns. Exact floating samples retained in raw results. peak_bytes=null: CPU heap/GPU driver heap not measured; reported device-buffer counters are separate. No runtime or cost-model policy installed.'),indent=2)+'\n');print('recorded',len(records))
