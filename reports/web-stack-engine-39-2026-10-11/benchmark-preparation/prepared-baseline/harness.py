#!/usr/bin/env python3
"""General39 web-stack suite: reproducible preparation, separate boundaries.
No timing without an explicitly supplied metadata-bound serial gate file.
"""
from pathlib import Path
import argparse,hashlib,importlib.util,json,subprocess,shutil,sys,http.server,math
ROOT=Path(__file__).resolve().parents[1];ASSETS=ROOT/'bench/web-stack-general39';REPORT=ROOT/'reports/web-stack-engine-39-2026-10-11/benchmark-preparation/prepared-baseline'
PIN='04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536'
sys.path[:0]=[str(ROOT/'bench'),str(ROOT/'knowledge')]
from compact_selection28 import plan
from ink_knowledge import Store
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):return json.loads(Path(p).read_text())
def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
def run(argv,log):
 r=subprocess.run(list(map(str,argv)),cwd=ROOT,capture_output=True,text=True);log.append(dict(argv=list(map(str,argv)),exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr))
 if r.returncode:raise RuntimeError(r.stdout+'\n'+r.stderr)
 return r.stdout
def prepare(a):
 p=a.report
 if p.exists() and any(p.iterdir()):raise ValueError('preserve preparation; choose fresh --report')
 if sha(a.compiler)!=PIN:raise ValueError('baseline must be exact frozen batch32 compiler')
 p.mkdir(parents=True);log=[];s=module('general39_spec',ASSETS/'spec.py');spec=s.public_spec();fixtures=s.fixtures()
 for f in ASSETS.iterdir():
  if f.is_file():shutil.copy2(f,p/f.name)
 shutil.copy2(__file__,p/'harness.py');shutil.copy2(a.model,p/'cost-model.json')
 (p/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');(p/'fixtures.json').write_text(json.dumps(fixtures,separators=(',',':'))+'\n')
 store=Store(a.knowledge);compilers={'baseline':a.compiler,'candidate':a.candidate_compiler or a.compiler};selections={};unsupported=[]
 try:
  for task in spec['tasks']:
   name=task['name'];td=p/'targets'/name;td.mkdir(parents=True);src=td/'source.ink';src.write_text('module General39;\n'+task['source']+'\n');rows={}
   for version,compiler in compilers.items():
    raw=td/(version+'.literal.core.json');run([compiler,'emit-core',src,'-o',raw],log)
    selected=td/(version+'.selection.json');receipt=plan(compiler,raw,store,a.model,selected,budget=4096)
    if receipt['search'].get('exhausted'):raise ValueError('ordinary search exhausted '+name)
    core=td/(version+'.core.json');run([compiler,'emit-core',raw,'--core','--selection',selected,'-o',core],log)
    bundle=td/version;run([compiler,'build',core,'--core','--target','webgpu','--zig',a.zig,'-o',bundle],log)
    host=bundle/'ink-gpu.mjs';text=host.read_text();anchor='    manifest,'
    if text.count(anchor)!=1:raise ValueError('instrumentation anchor changed')
    host.write_text(text.replace(anchor,anchor+'\n    benchmarkMemoryBytes(){return cpu?.memory.buffer.byteLength ?? 0;},',1))
    fn=next(x for x in read(bundle/'manifest.json')['functions']if x['name']==name)
    rows[version]=dict(compiler_sha256=sha(compiler),source_sha256=sha(src),core_sha256=sha(core),selection_sha256=sha(selected),applications=len(read(selected)['applications']),initial_cost=receipt['search']['initial_cost'],selected_cost=receipt['search']['selected_cost'],gpu=dict(eligible=bool(fn.get('shader')or fn.get('graph_required')),graph_required=fn.get('graph_required',False),shader=fn.get('shader'),fallback_reason=fn.get('fallback_reason'),graph_ops=[n['op']for n in(fn.get('graph')or{}).get('nodes',[])]),resident_gpu_api='prepareGpuPipeline: async'in text)
    if not rows[version]['gpu']['eligible']:unsupported.append(dict(task=name,version=version,path='actual-gpu',reason=fn.get('fallback_reason')or'no emitted GPU route'))
    if not rows[version]['resident_gpu_api']:unsupported.append(dict(task=name,version=version,path='resident-gpu-input-owned-readback',reason='prepared device session API absent in this compiler'))
    for frame in fixtures['frames']:
     if frame['task']!=name or len(frame['xs'])>32 or len(frame['ys'])>39:continue
     args=td/'oracle-args.json';args.write_text(json.dumps([frame['xs'],frame['ys'],frame['seed'],frame['k']]))
     actual=json.loads(run([compiler,'run',core,name,args,'--core'],log))
     if actual!=frame['expected']:raise ValueError('source interpreter disagrees with independent golden '+frame['id'])
   selections[name]=rows
  run(['rustc','--edition=2021','--crate-type=cdylib','--target','wasm32-unknown-unknown','-C','opt-level=3','-C','panic=abort','-C','target-feature=+simd128',p/'expert.rs','-o',p/'rust-expert.wasm'],log)
 finally:(p/'commands.json').write_text(json.dumps(log,indent=2)+'\n')
 protocol=dict(rounds=5,warmups=2,target_ms=2,max_iterations=16384,seed=2026113901,result_kind='mixed_u32',timed_cells=sum(f['timed']for f in fixtures['frames']),selection='ordinary complete pinned DB selection; same fixed model; proofs are checked separately from profitability',consumption='all returned vector words read inside timer using U32 weighted checksum; scalar U32 value read directly; common consumer overhead included',boundaries={'captured-js-owned':'captured typed inputs, owned Array output; scalar uses captured-js-value','captured-wasm-owned':'runtime capture/packing/scheduling/owned output; scalar uses captured-wasm-value','resident-wasm-destination':'setup outside timer; borrowed vector output into dedicated packed destination; scalar uses resident-wasm-scalar','instrumented-full-gpu-request':'capture, upload, dispatch, full owned readback; actual backend and device counters per call','resident-gpu-input-owned-readback':'input upload and pipeline setup excluded; each run dispatches and returns full owned readback; supported only with real prepared session API'})
 m=dict(status='prepared',suite='general39',engine_scope='old baseline and separate candidate compiler capability; identical candidate compiler is explicitly a parity preparation, not an upgrade measurement',baseline_compiler_sha256=sha(a.compiler),candidate_compiler_sha256=sha(compilers['candidate']),candidate_is_baseline=sha(a.compiler)==sha(compilers['candidate']),snapshot=store.snapshot_id,catalogue_members=len(store.members()),cost_model_sha256=sha(a.model),selection_policy='ordinary planner, no forced candidates',selections=selections,unsupported=unsupported,protocol=protocol,split_policy='train affine/compaction/scan only at sizes32,16384; held-out cells size2048; whole branch/ordered/stencil/overwrite families disjoint; freeze before candidate tuning',incremental_scope='pure fixed overwrite batch with unique cadence indices; dense payload ABI identical; no maintained-state or stateful proof authority; full recompute control explicit',native_scope='Ink emitted C vs handwritten native Rust; no Ink Rust-target comparison claimed',harness_sha256=sha(__file__),bindings={str(f.relative_to(p)):sha(f)for f in sorted(p.rglob('*'))if f.is_file()and f.suffix!='.log'})
 (p/'metadata.json').write_text(json.dumps(m,indent=2)+'\n');print(json.dumps(dict(status='prepared',tasks=len(spec['tasks']),frames=len(fixtures['frames']),timed_cells=protocol['timed_cells'],bindings=len(m['bindings']),unsupported=len(unsupported))))
def verify_bindings(p,m):
 for path,digest in m['bindings'].items():
  if sha(p/path)!=digest:raise ValueError('bound file drift '+path)
def audit(a):
 p=a.report;m=read(p/'metadata.json');verify_bindings(p,m);r=read(p/(a.host+('-validation.json'if a.validate_only else'-results.json')));fixtures=read(p/'fixtures.json')['frames'];tasks=read(p/'spec.json')['tasks']
 if r['status']!='passed'or r['metadata_sha256']!=sha(p/'metadata.json'):raise ValueError('unbound/failed results')
 versions=['baseline','candidate'];variants={v+'_'+b for v in versions for b in ['js_owned','wasm_full','wasm_prepared']}|{'expert_js_owned','rust_wasm_full','rust_wasm_prepared'}
 if a.host=='browser':variants|={v+'_gpu_requested'for v in versions}
 expected={(f['id'],v)for f in fixtures for v in variants};seen={(v['frame'],v['variant'])for v in r['validation']}
 # Resident sessions are separately accounted; never substitute for full requests.
 resident={(v['frame'],v['variant'])for v in r['validation']if v['variant'].endswith('_gpu_resident')}
 if seen-resident!=expected or len(seen)!=len(r['validation']):raise ValueError('validation coverage')
 if any(not v['passed']or not v['nonmutation']or(not v['variant'].endswith('_wasm_prepared')and v.get('changed_input_lifetime')is not True)for v in r['validation']):raise ValueError('output/nonmutation/lifetime')
 if a.validate_only and any(r[k]for k in ['samples','calibration','warmups']):raise ValueError('timed data in untimed validation')
 by_id={f['id']:f for f in fixtures};by_task={t['name']:t for t in tasks}
 for row in r['availability']:
  f=by_id[row['frame']];t=by_task[f['task']];version=row['variant'].split('_')[0];fn=next(x for x in read(p/'targets'/t['name']/version/'manifest.json')['functions']if x['name']==t['name'])
  if row['actual_backend']=='gpu':
   if not(fn.get('shader')or fn.get('graph_required')):raise ValueError('GPU authority absent')
   counts=[len(f['xs']),len(f['ys']),1,1];output=len(f['expected'])if isinstance(f['expected'],list)else 1
   capacity=max([0]+[counts[i]for i in fn.get('lengths',[])])
   want=dict(dispatches=len(fn['graph']['nodes']),upload_bytes=4*(sum(counts)+2),readback_bytes=4*(output+(1 if isinstance(f['expected'],list)else 0)))if fn.get('graph_required')else dict(dispatches=int(capacity>0),upload_bytes=4*(sum(counts)+2+len(fn['params'])+1),readback_bytes=4*(capacity+1))
   if row['variant'].endswith('_gpu_resident'):want['upload_bytes']=0
   if row['contract']!=want or any(row['counters'][k]!=v for k,v in want.items()):raise ValueError('GPU physical counter mismatch '+row['frame'])
  elif row.get('reason')is None:raise ValueError('unexplained GPU fallback')
 if not a.validate_only:
  groups={}
  for row in r['samples']:
   f=by_id[row['frame']];key=(row['frame'],row['variant']);groups.setdefault(key,[]).append(row)
   if not f['timed']or row['iterations']<1 or row['iterations']>m['protocol']['max_iterations']or not math.isfinite(row['elapsed_ms'])or row['elapsed_ms']<=0:raise ValueError('sample validity')
  expected_groups={(f['id'],v)for f in fixtures if f['timed']for v in variants}
  if set(groups)-resident!=expected_groups:raise ValueError('timed coverage')
  for rows in groups.values():
   if len(rows)!=m['protocol']['rounds']or {r['round']for r in rows}!=set(range(m['protocol']['rounds'])):raise ValueError('round coverage')
  for phase in ['samples','calibration']:
   for row in r[phase]:
    f=by_id[row['frame']];e=f['expected'];code=(len(e)+sum((i+1)*v for i,v in enumerate(e)))%2**32 if isinstance(e,list)else e;n=len(e)if isinstance(e,list)else 1
    if int(row['checksum'])!=code*row['iterations']%2**32 or row['consumed_elements_per_call']!=n or row['consumed_elements']!=n*row['iterations']:raise ValueError('full-output consumption')
    if not math.isclose(row['ns_per_call'],row['elapsed_ms']*1e6/row['iterations'],rel_tol=1e-10):raise ValueError('derived duration')
  # Replay exact per-task per-frame seeded shuffle; train/heldout stay explicit.
  state=m['protocol']['seed']&0xffffffff
  def word():
   nonlocal state
   state^=(state<<13)&0xffffffff;state^=state>>17;state^=(state<<5)&0xffffffff;state&=0xffffffff;return state
  wanted=[]
  for t in tasks:
   for f in [f for f in fixtures if f['task']==t['name']and f['timed']]:
    order=[]
    for v in versions:
     order.extend(v+'_'+b for b in ['js_owned','wasm_full','wasm_prepared'])
     if a.host=='browser':order.append(v+'_gpu_requested')
     if (f['id'],v+'_gpu_resident')in resident:order.append(v+'_gpu_resident')
    order+=['expert_js_owned','rust_wasm_prepared','rust_wasm_full']
    for round in range(m['protocol']['rounds']):
     shuffled=order[:]
     for i in range(len(shuffled)-1,0,-1):j=word()%(i+1);shuffled[i],shuffled[j]=shuffled[j],shuffled[i]
     wanted.extend((f['id'],round,v)for v in shuffled)
  if wanted!=[(r['frame'],r['round'],r['variant'])for r in r['samples']]:raise ValueError('interleaving mismatch')
 o=dict(status='passed',host=a.host,timed=not a.validate_only,validation=len(seen),complete_output_checks=r['complete_output_checks'],samples=len(r['samples']),actual_gpu_validation=sum(x['actual_backend']=='gpu'for x in r['availability']),fallback_validation=sum(x['actual_backend']!='gpu'for x in r['availability']),resident_gpu_validation=len(resident),bindings=dict(metadata=sha(p/'metadata.json'),results=sha(p/(a.host+('-validation.json'if a.validate_only else'-results.json')))))
 (p/(a.host+('-validation-audit.json'if a.validate_only else'-audit.json'))).write_text(json.dumps(o,indent=2)+'\n');print(json.dumps(o))
def serve(a):
 class Handler(http.server.SimpleHTTPRequestHandler):
  def __init__(self,*x,**kw):super().__init__(*x,directory=str(a.report),**kw)
  def do_POST(self):
   data=self.rfile.read(int(self.headers['Content-Length']));value=json.loads(data);name=self.path.removeprefix('/save/')
   if self.path=='/failure':name='browser-failure.json'
   elif name not in ['browser-validation.json','browser-results.json']or value.get('status')!='passed':self.send_error(400);return
   if (a.report/name).exists():self.send_error(409,'preserve evidence');return
   (a.report/name).write_bytes(data);self.send_response(200);self.end_headers();self.wfile.write(b'ok')
 http.server.ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
def main():
 p=argparse.ArgumentParser();p.add_argument('mode',choices=['prepare','node','serve','audit','native-prepare','native']);p.add_argument('--report',type=Path,default=REPORT);p.add_argument('--compiler',type=Path,default=ROOT/'reports/web-stack-proofs-32-2026-10-11/main-integration/ink-main-publish');p.add_argument('--candidate-compiler',type=Path);p.add_argument('--knowledge',type=Path,default=ROOT/'knowledge');p.add_argument('--model',type=Path,default=ROOT/'reports/web-stack-proofs-32-2026-10-11/cpu-cost-model.json');p.add_argument('--zig',type=Path,default=ROOT.parent/'toolchain/zig-aarch64-macos-0.15.2/zig');p.add_argument('--host',choices=['node','browser'],default='node');p.add_argument('--port',type=int,default=8894);p.add_argument('--validate-only',action='store_true');p.add_argument('--serial-gate',type=Path);a=p.parse_args()
 if a.mode in ['node','native']and not a.validate_only:
  if not a.serial_gate:p.error('timing requires explicit --serial-gate bound to prepared metadata')
  gate=read(a.serial_gate)
  if gate.get('authorized')is not True or gate.get('metadata_sha256')!=sha(a.report/'metadata.json'):raise ValueError('unauthorized/unbound serial gate')
  shutil.copy2(a.serial_gate,a.report/'serial-gate.json')
 if a.mode=='prepare':prepare(a)
 elif a.mode=='node':subprocess.run(['node',str(a.report/'run-node.mjs')]+(['--validate-only']if a.validate_only else[]),cwd=ROOT,check=True)
 elif a.mode=='serve':serve(a)
 elif a.mode=='audit':audit(a)
 elif a.mode in ['native-prepare','native']:
  n=module('general39_native',ASSETS/'native.py');r=n.prepare(a.report)if a.mode=='native-prepare'else n.measure(a.report);print(json.dumps(dict(status=r['status'],validation=len(r.get('validation',[])),samples=len(r.get('samples',[])))))
if __name__=='__main__':main()
