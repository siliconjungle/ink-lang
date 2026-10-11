#!/usr/bin/env python3
"""General40 web-stack suite: reproducible preparation, separate boundaries.
No timing without an explicitly supplied metadata-bound serial gate file.
"""
from pathlib import Path
import argparse,hashlib,importlib.util,json,subprocess,shutil,sys,http.server,math,random
ROOT=Path(__file__).resolve().parents[1];ASSETS=ROOT/'bench/web-stack-general40';REPORT=ROOT/'reports/web-stack-engine-40-2026-10-11/general/prepared-baseline'
PIN='cc6afa0fce8e30bcb960d67724d07ba2f10d69c80244a8fbe9ba90b0f2f91277'
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
def declare():
 p=ROOT/'reports/web-stack-engine-40-2026-10-11/general/declaration'
 if p.exists():raise ValueError('preserve prior suite declaration')
 p.mkdir(parents=True);s=module('general40_declaration',ASSETS/'spec.py');spec=s.public_spec();fixtures=s.fixtures()
 (p/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');(p/'fixtures.json').write_text(json.dumps(fixtures,separators=(',',':'))+'\n')
 m=dict(status='declared-before-candidate-measurement',tasks=len(spec['tasks']),frames=len(fixtures['frames']),timed_cells=sum(f['timed']for f in fixtures['frames']),suite_spec_sha256=sha(p/'spec.json'),suite_fixtures_sha256=sha(p/'fixtures.json'),source_spec_sha256=sha(ASSETS/'spec.py'),historical_families='Engine39 was already observed. Reused families/controls are exploratory; fresh split governs model fitting, not independent confirmatory inference.',split='train affine/compaction/scan64,8192;512 and all other families held out',timed_or_profiled=False)
 (p/'receipt.json').write_text(json.dumps(m,indent=2)+'\n');print(json.dumps(m))
def prepare(a):
 p=a.report
 if p.exists() and any(p.iterdir()):raise ValueError('preserve preparation; choose fresh --report')
 if sha(a.compiler)!=PIN:raise ValueError('baseline must be exact frozen Engine40 baseline compiler')
 p.mkdir(parents=True);log=[];s=module('general40_spec',ASSETS/'spec.py')
 frozen=ROOT/'reports/web-stack-engine-40-2026-10-11/general/declaration'
 specpath=frozen/'spec.json';fixturepath=frozen/'fixtures.json'
 spec=read(specpath);fixtures=read(fixturepath)
 if spec!=s.public_spec()or fixtures!=s.fixtures():raise ValueError('source/golden suite changed after freeze; preserve holdout and start new suite')
 for f in ASSETS.iterdir():
  if f.is_file():shutil.copy2(f,p/f.name)
 shutil.copy2(__file__,p/'harness.py');shutil.copy2(a.model,p/'cost-model.json')
 if a.snapshot:shutil.copy2(a.snapshot,p/'knowledge-snapshot.json')
 (p/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');(p/'fixtures.json').write_text(json.dumps(fixtures,separators=(',',':'))+'\n')
 store=Store(a.knowledge,a.snapshot);rust_targets={};compilers={'baseline':a.compiler}if a.baseline_only else{'baseline':a.compiler,'candidate':a.candidate_compiler or a.compiler};selections={};unsupported=[]
 try:
  for task in spec['tasks']:
   name=task['name'];td=p/'targets'/name;td.mkdir(parents=True);src=td/'source.ink';src.write_text('module General40;\n'+task['source']+'\n');rows={}
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
    rows[version]=dict(compiler_sha256=sha(compiler),source_sha256=sha(src),core_sha256=sha(core),selection_sha256=sha(selected),applications=len(read(selected)['applications']),initial_cost=receipt['search']['initial_cost'],selected_cost=receipt['search']['selected_cost'],gpu=dict(eligible=bool(fn.get('shader')or fn.get('graph_required')),graph_required=fn.get('graph_required',False),shader=fn.get('shader'),fallback_reason=fn.get('fallback_reason'),graph_ops=[n['op']for n in(fn.get('graph')or{}).get('nodes',[])]),resident_gpu_api='prepareGpuPipeline'in text)
    if not rows[version]['gpu']['eligible']:unsupported.append(dict(task=name,version=version,path='actual-gpu',reason=fn.get('fallback_reason')or'no emitted GPU route'))
    if not rows[version]['resident_gpu_api']:unsupported.append(dict(task=name,version=version,path='resident-gpu-input-owned-readback',reason='prepared device session API absent in this compiler'))
    for frame in fixtures['frames']:
     if frame['task']!=name or len(frame['xs'])>32 or len(frame['ys'])>39:continue
     args=td/'oracle-args.json';args.write_text(json.dumps([frame['xs'],frame['ys'],frame['seed'],frame['k']]))
     actual=json.loads(run([compiler,'run',core,name,args,'--core'],log))
     if actual!=frame['expected']:raise ValueError('source interpreter disagrees with independent golden '+frame['id'])
   selections[name]=rows
  rust_adapter=module('general40_rust_target',ASSETS/'rust-target.py')
  for version,compiler in compilers.items():
   try:rust_targets[version]=rust_adapter.adapter(p,version,spec['tasks'],compiler,log)
   except ValueError as error:
    rust_targets[version]=dict(status='unsupported',reason=str(error));unsupported.append(dict(version=version,path='emitted-rust-native-and-wasm',reason=str(error)))
  run(['rustc','--edition=2021','--crate-type=cdylib','--target','wasm32-unknown-unknown','-C','opt-level=3','-C','panic=abort','-C','target-feature=+simd128',p/'expert.rs','-o',p/'rust-expert.wasm'],log)
 finally:(p/'commands.json').write_text(json.dumps(log,indent=2)+'\n')
 protocol=dict(rounds=5,warmups=2,target_ms=2,max_iterations=16384,seed=2026114001,result_kind='mixed_u32',timed_cells=sum(f['timed']for f in fixtures['frames']),selection='ordinary complete pinned DB selection; same fixed model; proofs are checked separately from profitability',consumption='all returned vector words read inside timer using U32 weighted checksum; scalar U32 value read directly; common consumer overhead included',boundaries={'captured-js-owned':'captured typed inputs, owned Array output; scalar uses captured-js-value','captured-wasm-owned':'runtime capture/packing/scheduling/owned output; scalar uses captured-wasm-value','resident-wasm-destination':'setup outside timer; borrowed vector output into dedicated packed destination; scalar uses resident-wasm-scalar','instrumented-full-gpu-request':'capture, upload, dispatch, full owned readback; actual backend and device counters per call','resident-gpu-input-owned-readback':'input upload and pipeline setup excluded; each run dispatches and returns full owned readback; supported only with real prepared session API'})
 m=dict(status='prepared',suite='general40',engine_scope='old baseline and separate candidate compiler capability; identical candidate compiler is explicitly a parity preparation, not an upgrade measurement',suite_bindings={'spec':sha(specpath),'fixtures':sha(fixturepath)},baseline_compiler_sha256=sha(a.compiler),versions=list(compilers),candidate_compiler_sha256=sha(compilers['candidate'])if 'candidate'in compilers else None,candidate_is_baseline=sha(a.compiler)==sha(compilers['candidate'])if 'candidate'in compilers else None,snapshot=store.snapshot_id,catalogue_members=len(store.members()),cost_model_sha256=sha(a.model),selection_policy='ordinary planner, no forced candidates',selections=selections,unsupported=unsupported,protocol=protocol,split_policy='fresh fit: train affine/compaction/scan at64,8192; all512cells held out; all other families wholly held out. Prior Engine39 families/controls have been observed and remain exploratory. Four new composition/gather families disjoint from this fit, not an independent confirmation of seen workloads.',startup_scope='Per-bundle import/runtime initialization after integrity prefetch; warm file/network caches, not fresh-process cold start. First-call validation durations and prepared input-upload setup remain separate from kernel timings.',incremental_scope='pure fixed overwrite batch with unique cadence indices; dense payload ABI identical; no maintained-state or stateful proof authority; full recompute control explicit',native_scope='Ink emitted C destination vs expert Rust destination; separate emitted Ink Rust owned Vec vs expert Rust owned Vec. Resident/captured ingress priced explicitly; no Rust output buffer reuse claimed',rust_targets=rust_targets,harness_sha256=sha(__file__),bindings={str(f.relative_to(p)):sha(f)for f in sorted(p.rglob('*'))if f.is_file()and f.suffix!='.log'})
 (p/'metadata.json').write_text(json.dumps(m,indent=2)+'\n');print(json.dumps(dict(status='prepared',tasks=len(spec['tasks']),frames=len(fixtures['frames']),timed_cells=protocol['timed_cells'],bindings=len(m['bindings']),unsupported=len(unsupported))))
def verify_bindings(p,m):
 for path,digest in m['bindings'].items():
  if sha(p/path)!=digest:raise ValueError('bound file drift '+path)
def audit(a):
 p=a.report;m=read(p/'metadata.json');verify_bindings(p,m);r=read(p/(a.host+('-validation.json'if a.validate_only else'-results.json')));fixtures=read(p/'fixtures.json')['frames'];tasks=read(p/'spec.json')['tasks']
 if r['status']!='passed'or r['metadata_sha256']!=sha(p/'metadata.json'):raise ValueError('unbound/failed results')
 versions=m.get('versions',['baseline','candidate']);variants={v+'_'+b for v in versions for b in ['js_owned','wasm_full','wasm_prepared']}|{'expert_js_owned','rust_wasm_full','rust_wasm_prepared'}
 variants|={'expert_rust_wasm_owned','expert_rust_wasm_resident_owned'}
 variants|={v+'_'+kind for v in versions if m.get('rust_targets',{}).get(v,{}).get('status')=='prepared'for kind in ['rust_wasm_owned','rust_wasm_resident_owned']}
 if a.host=='browser':variants|={v+'_gpu_requested'for v in versions}
 expected={(f['id'],v)for f in fixtures for v in variants};seen={(v['frame'],v['variant'])for v in r['validation']}
 # Resident sessions are separately accounted; never substitute for full requests.
 resident={(v['frame'],v['variant'])for v in r['validation']if v['variant'].endswith('_gpu_resident')}
 expected_resident={(f['id'],v+'_gpu_resident')for f in fixtures for v in versions if a.host=='browser'and m['selections'][f['task']][v]['resident_gpu_api']and m['selections'][f['task']][v]['gpu']['eligible']}
 if resident!=expected_resident:raise ValueError('resident capability coverage')
 if seen-resident!=expected or len(seen)!=len(r['validation']):raise ValueError('validation coverage')
 expected_availability={(f['id'],v+'_gpu_requested')for f in fixtures for v in versions if a.host=='browser'}|expected_resident
 availability={(row['frame'],row['variant'])for row in r['availability']}
 if availability!=expected_availability or len(availability)!=len(r['availability']):raise ValueError('GPU availability coverage')
 if any(not v['passed']or not v['nonmutation']or(not v['variant'].endswith('_wasm_prepared')and v.get('changed_input_lifetime')is not True)for v in r['validation']):raise ValueError('output/nonmutation/lifetime')
 if any(v.get('resident_input_capture')is not True for v in r['validation']if v['variant'].endswith('_gpu_resident')):raise ValueError('resident input capture not checked')
 if a.validate_only and any(r[k]for k in ['samples','calibration','warmups']):raise ValueError('timed data in untimed validation')
 checks=sum(2+(not v.endswith('_wasm_prepared'))for _,v in seen)
 if not a.validate_only:checks+=len(r['warmups'])+len(r['calibration'])+3*len(r['samples'])
 if r['complete_output_checks']!=checks:raise ValueError('complete output check count')
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
   kind='value'if by_task[f['task']]['output_kind']=='scalar_u32'else'owned';v=row['variant']
   boundary=('resident-rust-wasm-scalar'if kind=='value'else'resident-rust-wasm-owned-readback')if v.endswith('_rust_wasm_resident_owned')else'captured-rust-wasm-'+kind if v.endswith('_rust_wasm_owned')else'resident-gpu-input-owned-readback'if v.endswith('_gpu_resident')else'instrumented-full-gpu-request'if v.endswith('_gpu_requested')else'resident-wasm-scalar'if v.endswith('_wasm_prepared')and kind=='value'else'resident-wasm-destination'if v.endswith('_wasm_prepared')else'captured-wasm-'+kind if v.endswith('_wasm_full')else'captured-js-'+kind
   if row['boundary']!=boundary:raise ValueError('sample ownership boundary')
  expected_groups={(f['id'],v)for f in fixtures if f['timed']for v in variants}
  if set(groups)-resident!=expected_groups:raise ValueError('timed coverage')
  for rows in groups.values():
   if len(rows)!=m['protocol']['rounds']or {r['round']for r in rows}!=set(range(m['protocol']['rounds'])):raise ValueError('round coverage')
  calibration={}
  for row in r['calibration']:calibration.setdefault((row['frame'],row['variant']),[]).append(row)
  if any(not isinstance(row['iterations'],int)or not 1<=row['iterations']<=m['protocol']['max_iterations']or not math.isfinite(row['elapsed_ms'])or row['elapsed_ms']<0 for row in r['calibration']):raise ValueError('calibration validity')
  if set(calibration)!=set(groups):raise ValueError('calibration coverage')
  for key,rows in calibration.items():
   if rows[0]['iterations']!=1 or any(b['iterations']!=2*a['iterations']or a['elapsed_ms']>=m['protocol']['target_ms']for a,b in zip(rows,rows[1:]))or(rows[-1]['elapsed_ms']<m['protocol']['target_ms']and rows[-1]['iterations']!=m['protocol']['max_iterations']):raise ValueError('calibration escalation')
   if any(row['iterations']!=rows[-1]['iterations']for row in groups[key]):raise ValueError('sample calibration count')
  warm={(x['frame'],x['variant'],x['iteration'])for x in r['warmups']}
  if warm!={(f,v,i)for f,v in groups for i in range(m['protocol']['warmups'])}or len(warm)!=len(r['warmups'])or any(not x['passed']for x in r['warmups']):raise ValueError('warmup coverage')

  for phase in ['samples','calibration']:
   for row in r[phase]:
    f=by_id[row['frame']];e=f['expected'];code=(len(e)+sum((i+1)*v for i,v in enumerate(e)))%2**32 if isinstance(e,list)else e;n=len(e)if isinstance(e,list)else 1
    if int(row['checksum'])!=code*row['iterations']%2**32 or row['consumed_elements_per_call']!=n or row['consumed_elements']!=n*row['iterations']:raise ValueError('full-output consumption')
    if not math.isclose(row['ns_per_call'],row['elapsed_ms']*1e6/row['iterations'],rel_tol=1e-10):raise ValueError('derived duration')
    if 'wasm'in row['variant']and(not isinstance(row['memory_before'],int)or not isinstance(row['memory_after'],int)or row['memory_after']<=0):raise ValueError('Wasm memory metric')
    if '_gpu_'in row['variant']:
     counts=row['actual_backend_counts'];gpu=counts.get('gpu',0)
     if sum(counts.values())!=row['iterations']or any(k not in ['gpu','cpu','javascript']or not isinstance(v,int)or v<0 for k,v in counts.items()):raise ValueError('actual GPU backend counts')
     if gpu and (not row['contract']or any(row['counters_total'][k]!=v*gpu for k,v in row['contract'].items())):raise ValueError('actual GPU timed counters')
     if not gpu and any(row['counters_total'].values()):raise ValueError('GPU fallback mislabeled')
     if row['variant'].endswith('_gpu_resident')and(set(counts)!= {'gpu'}or row['counters_total']['upload_bytes']!=0):raise ValueError('resident route uploaded/fell back')

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
    for v in versions:
     if m.get('rust_targets',{}).get(v,{}).get('status')=='prepared':order.extend([v+'_rust_wasm_owned',v+'_rust_wasm_resident_owned'])
    order+=['expert_rust_wasm_owned','expert_rust_wasm_resident_owned']
    for round in range(m['protocol']['rounds']):
     shuffled=order[:]
     for i in range(len(shuffled)-1,0,-1):j=word()%(i+1);shuffled[i],shuffled[j]=shuffled[j],shuffled[i]
     wanted.extend((f['id'],round,v)for v in shuffled)
  if wanted!=[(r['frame'],r['round'],r['variant'])for r in r['samples']]:raise ValueError('interleaving mismatch')
 o=dict(status='passed',host=a.host,timed=not a.validate_only,validation=len(seen),complete_output_checks=r['complete_output_checks'],samples=len(r['samples']),actual_gpu_validation=sum(x['actual_backend']=='gpu'for x in r['availability']),fallback_validation=sum(x['actual_backend']!='gpu'for x in r['availability']),resident_gpu_validation=len(resident),expected_resident_gpu_validation=len(expected_resident),gpu_availability=len(availability),audit_tool_sha256=sha(__file__),bindings=dict(metadata=sha(p/'metadata.json'),results=sha(p/(a.host+('-validation.json'if a.validate_only else'-results.json')))))
 output=getattr(a,'audit_output',None)or p/(a.host+('-validation-audit.json'if a.validate_only else'-audit.json'))
 if getattr(a,'audit_output',None)and output.exists():raise ValueError('preserve supplementary audit')
 output.write_text(json.dumps(o,indent=2)+'\n');print(json.dumps(o))
def summarize(a):
 p=a.report;audited=read(p/('native/audit.json'if a.host=='native'else a.host+'-audit.json'));assert audited['status']=='passed'
 result_path=p/('native/results.json'if a.host=='native'else a.host+'-results.json');audit_metadata=p/('native/metadata.json'if a.host=='native'else'metadata.json')
 if audited['bindings']['results']!=sha(result_path)or audited['bindings']['metadata']!=sha(audit_metadata):raise ValueError('saved audit bindings changed before summary')
 m=read(p/'metadata.json');verify_bindings(p,m)
 if a.host=='native':
  native=read(audit_metadata)
  if native['main_metadata_sha256']!=sha(p/'metadata.json'):raise ValueError('native/main metadata changed before summary')
  verify_bindings(p/'native',native)
 r=read(result_path)
 if r['metadata_sha256']!=sha(audit_metadata):raise ValueError('unbound results before summary')
 fixtures={f['id']:f for f in read(p/'fixtures.json')['frames']};groups={}
 for row in r['samples']:groups.setdefault((row['frame'],row['boundary']),{}).setdefault(row['variant'],{})[row['round']]=row
 comparisons=[]
 for (frame,boundary),variants in sorted(groups.items()):
  if a.host=='native':pairs=[('baseline','candidate'),('expert','candidate'),('baseline_rust','candidate_rust'),('expert_rust_owned','candidate_rust')]
  else:pairs=[('baseline_'+b,'candidate_'+b)for b in ['js_owned','wasm_full','wasm_prepared','gpu_requested','gpu_resident','rust_wasm_owned','rust_wasm_resident_owned']]+[('expert_js_owned','candidate_js_owned'),('rust_wasm_full','candidate_wasm_full'),('rust_wasm_prepared','candidate_wasm_prepared'),('expert_rust_wasm_owned','candidate_rust_wasm_owned'),('expert_rust_wasm_resident_owned','candidate_rust_wasm_resident_owned')]
  for reference,current in pairs:
   if reference not in variants or current not in variants:continue
   left,right=variants[reference],variants[current];rounds=m['protocol']['rounds']
   if set(left)!=set(range(rounds))or set(right)!=set(range(rounds)):raise ValueError('incomplete paired rounds')
   if '_gpu_'in reference and any(set(x['actual_backend_counts'])!={'gpu'}for x in list(left.values())+list(right.values())):continue
   logs=[math.log(left[i]['ns_per_call']/right[i]['ns_per_call'])for i in range(rounds)]
   ratio=math.exp(math.fsum(logs)/rounds);seed=int(hashlib.sha256((frame+'/'+reference+'/'+current).encode()).hexdigest()[:16],16);rng=random.Random(seed);draws=sorted(math.exp(math.fsum(rng.choices(logs,k=rounds))/rounds)for _ in range(2000));lo,hi=draws[50],draws[1949];f=fixtures[frame]
   comparisons.append(dict(frame=frame,split=f['split'],dimensions=f['dimensions'],boundary=boundary,reference=reference,current=current,ratio_reference_over_current=ratio,ci95=[lo,hi],classification='faster'if lo>1 else'slower'if hi<1 else'inconclusive',bootstrap_seed=seed))
 o=dict(status='passed',host=a.host,metadata_sha256=sha(p/'metadata.json'),results_sha256=sha(p/('native/results.json'if a.host=='native'else a.host+'-results.json')),comparisons=comparisons,method='five paired log ratios; 2000 bootstrap draws; exploratory nominal95% percentile interval, no multiplicity correction; >1 favors candidate; no cross-boundary pooling or universal language ranking',startup_scope=m['startup_scope'])
 (p/('native/summary.json'if a.host=='native'else a.host+'-summary.json')).write_text(json.dumps(o,indent=2)+'\n');print(json.dumps(dict(status='passed',comparisons=len(comparisons))))

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
 p=argparse.ArgumentParser();p.add_argument('mode',choices=['declare','prepare','node','serve','audit','summarize','native-prepare','native','native-audit']);p.add_argument('--report',type=Path,default=REPORT);p.add_argument('--compiler',type=Path,default=ROOT/'reports/web-stack-engine-40-2026-10-11/ink-baseline-frozen');p.add_argument('--candidate-compiler',type=Path);p.add_argument('--baseline-only',action='store_true');p.add_argument('--knowledge',type=Path,default=ROOT/'knowledge');p.add_argument('--snapshot',type=Path);p.add_argument('--model',type=Path,default=ROOT/'reports/web-stack-proofs-32-2026-10-11/cpu-cost-model.json');p.add_argument('--zig',type=Path,default=ROOT.parent/'toolchain/zig-aarch64-macos-0.15.2/zig');p.add_argument('--host',choices=['node','browser','native'],default='node');p.add_argument('--port',type=int,default=8904);p.add_argument('--validate-only',action='store_true');p.add_argument('--serial-gate',type=Path);p.add_argument('--audit-output',type=Path);a=p.parse_args()
 if a.mode=='native'or(a.mode=='node'and not a.validate_only):
  if not a.serial_gate:p.error('timing requires explicit --serial-gate bound to prepared metadata')
  gate=read(a.serial_gate)
  if gate.get('authorized')is not True or gate.get('metadata_sha256')!=sha(a.report/'metadata.json'):raise ValueError('unauthorized/unbound serial gate')
  
  if a.serial_gate.resolve()!=(a.report/'serial-gate.json').resolve():shutil.copy2(a.serial_gate,a.report/'serial-gate.json')
 if a.mode=='declare':declare()
 elif a.mode=='prepare':prepare(a)
 elif a.mode=='node':subprocess.run(['node',str(a.report/'run-node.mjs')]+(['--validate-only']if a.validate_only else[]),cwd=ROOT,check=True)
 elif a.mode=='serve':serve(a)
 elif a.mode=='audit':audit(a)
 elif a.mode=='summarize':summarize(a)
 elif a.mode=='native-audit':
  sys.path.insert(0,str(ASSETS));n=module('general40_native_audit',ASSETS/'native-audit.py');print(json.dumps(n.audit(a.report,a.audit_output)))
 elif a.mode in ['native-prepare','native','native-audit']:
  n=module('general40_native',ASSETS/'native.py');r=n.prepare(a.report)if a.mode=='native-prepare'else n.measure(a.report);print(json.dumps(dict(status=r['status'],validation=len(r.get('validation',[])),samples=len(r.get('samples',[])))))
if __name__=='__main__':main()
