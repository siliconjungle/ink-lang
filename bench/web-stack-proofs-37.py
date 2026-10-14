#!/usr/bin/env python3
"""Batch37 DB-only proof-effect harness: same frozen compiler, strict evidence.

Preparation is untimed. Models/catalogue overlays are supplied by the publisher;
all selected applications replay in the ordinary frozen checker. No imports.
"""
from pathlib import Path
import argparse,hashlib,http.server,importlib.util,json,math,random,shutil,statistics,subprocess,sys,time
ROOT=Path(__file__).resolve().parents[1];ASSETS=ROOT/'bench/web-stack-proofs-37';REPORT=ROOT/'reports/web-stack-proofs-37-2026-10-11'
sys.path[:0]=[str(ROOT/'bench'),str(ROOT/'knowledge')]
from compact_selection28 import plan
from ink_knowledge import Store
COMMAND_JOURNAL=None
PRIOR_PIN='7f5e7a94b49db567af55f5d1129dd07c5e2b469ebd45cb6e5cbc53595782b2be'
PIN='04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):return json.loads(Path(p).read_text())
def single_shader_contract(fn,frame,task):
 # Independently reconstruct final schema2 eager capacity, list input headers,
 # argument-count metadata and result length header from the emitted manifest.
 counts=[len(frame['xs'])]+([len(frame['ys'])]if task['list_inputs']==2 else[])+[1,1]
 capacity=max([0]+[counts[i]for i in fn['lengths']]);payload=sum(counts)
 return dict(dispatches=int(capacity>0),upload_bytes=4*(payload+task['list_inputs']+len(fn['params'])+1),readback_bytes=4*(capacity+1))
def run(argv,commands):
 r=subprocess.run(list(map(str,argv)),cwd=ROOT,capture_output=True,text=True);commands.append(dict(argv=list(map(str,argv)),exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr))
 if COMMAND_JOURNAL is not None:COMMAND_JOURNAL.write_text(json.dumps(commands,indent=2)+'\n')
 if r.returncode:raise RuntimeError(r.stderr+'\n'+r.stdout)
 return r.stdout

def prepare(a):
 global COMMAND_JOURNAL
 p=a.report;p.mkdir(parents=True,exist_ok=True)
 if (p/'metadata.json').exists()or(p/'commands.json').exists():raise ValueError('prepared or partial evidence already exists; use a new report directory')
 COMMAND_JOURNAL=p/'commands.json'
 if sha(a.compiler)!=PIN:raise ValueError('frozen published main compiler required')
 old,new=Store(a.prior),Store(a.knowledge);fresh=set(new.members())-set(old.members())
 if old.snapshot_id!=PRIOR_PIN:raise ValueError('exact full canonical batch36 prior snapshot required; isolated candidate stores are not a fair prior')
 if not fresh or not set(old.members())<=set(new.members()):raise ValueError('publisher must supply fair prior subset and new catalogue')
 module=importlib.util.spec_from_file_location('batch37_spec',ASSETS/'spec.py');specmodule=importlib.util.module_from_spec(module);module.loader.exec_module(specmodule)
 spec=specmodule.public_spec();fixtures=specmodule.fixtures();commands=[];selections={}
 for file in ASSETS.iterdir():
  if file.is_file():shutil.copy2(file,p/file.name)
 shutil.copy2(__file__,p/'harness.py');shutil.copy2(a.model,p/'cost-model.json')
 (p/'spec.json').write_text(json.dumps(spec,indent=2)+'\n');(p/'fixtures.json').write_text(json.dumps(fixtures,separators=(',',':'))+'\n')
 for t in spec['tasks']:
  td=p/'targets'/t['name'];td.mkdir(parents=True,exist_ok=True);src=td/'source.ink';src.write_text('module ProofRecipe;\n'+t['source']+'\n');core=td/'literal.core.json'
  run([a.compiler,'emit-core',src,'-o',core],commands);body=read(core)['program']['functions'][0]['body'];rows={}
  for version,store in [('prior',old),('checked',new)]:
   selected=td/f'{version}.selection.json';receipt=plan(a.compiler,core,store,a.model,selected,budget=4096)
   if receipt['search'].get('exhausted'):raise ValueError('selection search exhausted '+t['name'])
   target=td/f'{version}.core.json';run([a.compiler,'emit-core',core,'--core','--selection',selected,'-o',target],commands)
   rows[version]=dict(selection_path=str(selected.relative_to(p)),selected_core_path=str(target.relative_to(p)),selection_sha256=sha(selected),core_sha256=sha(target),laws=receipt['check']['laws'] if 'laws' in receipt['check'] else receipt['selected_roots'],applications=len(read(selected)['applications']),receipt_sha256=sha(selected.with_suffix('.receipt.json')))
  prior=read(td/'prior.core.json')['program']['functions'][0]['body'];checked=read(td/'checked.core.json')['program']['functions'][0]['body']
  used={x['law'] for x in read(td/'checked.selection.json')['applications']}&fresh
  if t.get('fresh_proof_required',True) and (not used or checked==prior):raise ValueError('no fresh checked proof effect '+t['name'])
  rows.update(input_core_sha256=receipt['check']['input_core_sha256'],literal_core_file_sha256=sha(core),source_sha256=sha(src),fresh_laws=sorted(used),prior_equals_literal=prior==body,checked_changes_prior=checked!=prior,fresh_proof_required=t.get('fresh_proof_required',True))
  rows['literal']=dict(core_sha256=sha(core))
  for version in ['literal','prior','checked']:
   target=td/version;run([a.compiler, 'build', td / f'{version}.core.json', '--core', '--target', 'webgpu', '-o', target],commands)
   # Benchmark-only accessor; source/position and resulting bytes are bound.
   host=target/'ink-gpu.mjs';text=host.read_text();anchor='    manifest,'
   if text.count(anchor)!=1:raise ValueError('memory instrumentation anchor')
   host.write_text(text.replace(anchor,anchor+'\n    benchmarkMemoryBytes(){return cpu?.memory.buffer.byteLength ?? 0;},',1))
   fn=next(f for f in read(target/'manifest.json')['functions'] if f['name']==t['name']);rows[version]['gpu']=dict(eligible=bool(fn.get('shader') or fn.get('graph_required')),fallback_reason=fn.get('fallback_reason'),graph_stages=len((fn.get('graph') or {}).get('nodes',[])),graph_required=fn.get('graph_required',False),nodes=[dict(op=n['op'],ordered=n['ordered'],capacity=n['capacity'])for n in(fn.get('graph')or{}).get('nodes',[])])
  selections[t['name']]=rows
  # Small/edge interpreter runs check independently authored full goldens.
  for f in fixtures['frames']:
   if f['task']!=t['name'] or len(f['xs'])>129 or len(f['ys'])>129:continue
   args=[f['xs']]+([f['ys']] if t['list_inputs']==2 else [])+[f['seed'],f['k']];argfile=td/'oracle-args.json';argfile.write_text(json.dumps(args))
   for version in ['literal','prior','checked']:
    actual=json.loads(run([a.compiler,'run',td/f'{version}.core.json',t['name'],argfile,'--core'],commands))
    if (actual!=f['expected'] if isinstance(f['expected'],list) else str(actual)!=str(f['expected'])):raise ValueError('interpreter golden mismatch '+f['id']+'/'+version)
 run(['rustc','--edition=2021','--crate-type=cdylib','--target','wasm32-unknown-unknown','-C','opt-level=3','-C','panic=abort','-C','target-feature=+simd128',p/'expert.rs','-o',p/'rust-expert.wasm'],commands)
 (p/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
 protocol=dict(rounds=9,warmups=2,target_ms=8,max_iterations=65536,seed=2026113701,sizes=[32,4096,65536],cohorts=['low','high'],boundaries={'captured-js-owned':'synchronous bound functions, identical typed-input copies and target-owned outputs','captured-wasm-owned':'runtime CPU capture/packing/scheduling/owned unpack','resident-wasm-destination':'dedicated instance, capture setup excluded; packed output borrowed until next run','instrumented-full-gpu-request':'runtime capture/upload/stage dispatch/readback/unpack; per-call device-counter instrumentation inside timer; fallback separately labeled'},result_kind='list_u32',consumption='Every returned vector word consumed inside timer with length + sum((index+1)*word) modulo2^32; common instrumentation overhead for all web variants; exact full output and lifetime checks outside timer',selection='same frozen engine/model; ordinary checked automatic planner; models are untrusted compile-time hypotheses')
 metadata=dict(status='prepared',engine_scope='DB-only: exact one frozen compiler, no backend-source changes or compiler rebuild',selection_policy='Same automatic structural/cost-model policy for fair prior/private union; every candidate/final app ordinarychecked. All four candidates are exposed to the same ordinary planner; unchanged cost-rejected candidates remain controls.',compiler=str(a.compiler.resolve()),compiler_sha256=PIN,planner_sha256=sha(ROOT/'planner/ink_planner/semantic_search.py'),context_prefilter_sha256=sha(ROOT/'planner/ink_planner/definition_context.py'),selection_helper_sha256=sha(ROOT/'bench/compact_selection28.py'),cost_model_sha256=sha(a.model),producer_sha256=sha(ROOT/'knowledge/producers/web_pipeline37_laws.py'),prior_catalogue_scope='Exact full canonical batch36 2512-object prior; unchanged automatic planner/costmodel, no exact candidate isolation',prior_snapshot=old.snapshot_id,new_snapshot=new.snapshot_id,selections=selections,protocol=protocol,harness_sha256=sha(__file__),control_scope='Strong already-fused one-pass controls inspect selected values only through paired min extent and preserve selected helper arithmetic, with separate owned/resident destination cohorts.',commands_sha256=sha(p/'commands.json'),bindings={str(f.relative_to(p)):sha(f) for f in sorted(p.rglob('*')) if f.is_file() and f.suffix!='.log' and f.name not in ['metadata.json']})
 (p/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n');print(json.dumps(dict(status='prepared',tasks=len(spec['tasks']),frames=len(fixtures['frames']),bindings=len(metadata['bindings']))))

def serve(a):
 class Handler(http.server.SimpleHTTPRequestHandler):
  def __init__(self,*x,**kw):super().__init__(*x,directory=str(a.report),**kw)
  def do_POST(self):
   data=self.rfile.read(int(self.headers['Content-Length']));value=json.loads(data);name=self.path.removeprefix('/save/')
   if self.path=='/failure':name=f'failure-{time.time_ns()}.json'
   elif name not in ['browser-validation.json','browser-results.json'] or value.get('status')!='passed':self.send_error(400);return
   if (a.report/name).exists():self.send_error(409,'preserve evidence');return
   (a.report/name).write_bytes(data);self.send_response(200);self.end_headers();self.wfile.write(b'ok')
 http.server.ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()

def audit(a):
 p=a.report;m=read(p/'metadata.json');r=read(p/(a.host+'-results.json'));f=read(p/'fixtures.json');fixtures_all=f['frames'];tasks=read(p/'spec.json')['tasks'];timed={x['id']:x for x in f['frames'] if x['timed']}
 if r['status']!='passed' or r['metadata_sha256']!=sha(p/'metadata.json'):raise ValueError('failed/unbound results')
 for path,h in m['bindings'].items():
  if sha(p/path)!=h:raise ValueError('frozen drift '+path)
 def stage_capacity(fn,inputs,task):
  if not fn.get('graph_required'):return None
  args=[len(inputs['xs'])]+([len(inputs['ys'])]if task['list_inputs']==2 else [])+[1,1];caps=[]
  def count(ref):return args[ref['param']]if 'param'in ref else caps[ref['node']]
  for node in fn['graph']['nodes']:
   values=[count(node['args'][i])for i in node['capacity']['args']];kind=node['capacity']['kind'];caps.append(1 if kind=='one'else values[0]if kind=='same'else min(values)if kind=='min'else sum(values)if kind=='sum'else None)
  return dict(capacities=caps,outputCount=count(fn['graph']['output']))
 groups={}
 for row in r['samples']:
  key=(row['frame'],row['variant']);groups.setdefault(key,[]).append(row)
  if row['frame'] not in timed or not 0<row['iterations']<=65536 or not math.isfinite(row['elapsed_ms']) or row['elapsed_ms']<=0 or not math.isfinite(row['ns_per_call']) or not math.isclose(row['ns_per_call'],row['elapsed_ms']*1e6/row['iterations'],rel_tol=1e-10):raise ValueError('invalid sample')
 for key,rows in groups.items():
  if len(rows)!=9 or {r['round'] for r in rows}!=set(range(9)):raise ValueError('round coverage')
 validations={(v['frame'],v['variant']) for v in r['validation']}
 if any(not v['passed'] or not v['nonmutation'] or (not v['variant'].endswith('_wasm_prepared') and v.get('changed_input_lifetime')is not True) for v in r['validation']):raise ValueError('validation/nonmutation/owned lifetime failure')
 declared={v+'_'+b for v in ['literal','prior','checked'] for b in ['js_owned','wasm_full','wasm_prepared']}|{'expert_js_owned','rust_wasm_full','rust_wasm_prepared'}
 if a.host=='browser':declared|={v+'_gpu_requested' for v in ['literal','prior','checked']}
 variants={t['name']:declared for t in tasks}
 expected={(x['id'],v) for x in f['frames'] for v in variants[x['task']]};expected_groups={(x['id'],v) for x in timed.values() for v in variants[x['task']]}
 if validations!=expected or len(validations)!=len(r['validation']) or set(groups)!=expected_groups:raise ValueError('variant/frame coverage')
 phases={};cal={}
 for row in r['calibration']:
  key=(row['frame'],row['variant']);cal.setdefault(key,[]).append(row)
  if row['iterations']<=0 or row['iterations']>65536 or not math.isfinite(row['elapsed_ms']) or row['elapsed_ms']<0 or not math.isfinite(row['ns_per_call']) or not math.isclose(row['ns_per_call'],row['elapsed_ms']*1e6/row['iterations'],rel_tol=1e-10):raise ValueError('invalid calibration')
 if set(cal)!=set(groups):raise ValueError('calibration coverage')
 for key,rows in cal.items():
  if rows[0]['iterations']!=1 or any(b['iterations']!=2*x['iterations'] or x['elapsed_ms']>=8 for x,b in zip(rows,rows[1:])) or (rows[-1]['elapsed_ms']<8 and rows[-1]['iterations']!=65536):raise ValueError('calibration escalation')
  if any(x['iterations']!=rows[-1]['iterations'] for x in groups[key]):raise ValueError('sample/calibration count')
 warm={(x['frame'],x['variant'],x['iteration']) for x in r['warmups']}
 if len(warm)!=len(r['warmups']) or warm!={(x,v,i) for x,v in groups for i in [0,1]} or any(not x['passed'] for x in r['warmups']):raise ValueError('warmup coverage')
 lookup={x['id']:x for x in f['frames']}
 for phase in ['samples','calibration']:
  for row in r[phase]:
   expected=lookup[row['frame']]['expected'];code=(len(expected)+sum((i+1)*v for i,v in enumerate(expected)))%2**32 if isinstance(expected,list) else int(expected)%2**32
   if int(row['checksum'])!=code*row['iterations']%2**32:raise ValueError('consumption checksum')
   elements=len(expected)if isinstance(expected,list)else 1
   if row.get('consumed_elements_per_call')!=elements or row.get('consumed_elements')!=elements*row['iterations'] or row.get('checksum_semantics')!='length + sum((index+1)*word) modulo2^32; every returned vector word read inside timer':raise ValueError('full-vector consumption journal')
   if 'wasm' in row['variant'] and (not isinstance(row['memory_before'],int) or not isinstance(row['memory_after'],int) or row['memory_before']<0 or row['memory_after']<=0):raise ValueError('missing linear memory metric')
   if row['variant'].endswith('_gpu_requested'):
    counts=row['actual_backend_counts']
    if sum(counts.values())!=row['iterations'] or any(k not in ['gpu','cpu','javascript']or not isinstance(v,int)or v<0 for k,v in counts.items()):raise ValueError('GPU backend accounting')
    gpu=counts.get('gpu',0);contract=row['contract']
    if gpu and (not isinstance(row['gpu_live_buffer_bytes_max'],int) or row['gpu_live_buffer_bytes_max']<0):raise ValueError('missing GPU live memory metric')
    if gpu and (not contract or any(row['counters_total'][k]!=v*gpu for k,v in contract.items())):raise ValueError('GPU counter accounting')
    version=row['variant'].split('_')[0];task=next(t for t in tasks if t['name']==lookup[row['frame']]['task']);fn=next(x for x in read(p/'targets'/task['name']/version/'manifest.json')['functions'] if x['name']==task['name'])
    inputs=lookup[row['frame']];payload=len(inputs['xs'])+(len(inputs['ys']) if task['list_inputs']==2 else 0)+2;output=len(expected) if isinstance(expected,list) else 2
    want=dict(dispatches=len(fn['graph']['nodes']),upload_bytes=4*(payload+task['list_inputs']),readback_bytes=4*(output+(1 if isinstance(expected,list) else 0))) if fn.get('graph_required') else single_shader_contract(fn,inputs,task)
    if gpu and (contract!=want or row.get('stage_capacity_model')!=stage_capacity(fn,inputs,task)):raise ValueError('manifest GPU contract/capacity mismatch')
    if not gpu and any(row['counters_total'].values()):raise ValueError('fallback mislabeled GPU')
 # Authenticate preset interleaving independently of observed row order.
 state=m['protocol']['seed']&0xffffffff
 def next_word():
  nonlocal state
  state^=(state<<13)&0xffffffff;state^=state>>17;state^=(state<<5)&0xffffffff;state&=0xffffffff;return state
 order=[]
 for version in ['literal','prior','checked']:
  order += [version+'_'+b for b in ['js_owned','wasm_full','wasm_prepared']]
  if a.host=='browser':order.append(version+'_gpu_requested')
 order+=['expert_js_owned','rust_wasm_prepared','rust_wasm_full'];wanted=[]
 for t in tasks:
  for f in [f for f in timed.values()if f['task']==t['name']]:
   for round in range(9):
    shuffled=order[:]
    for i in range(len(shuffled)-1,0,-1):
     j=next_word()%(i+1);shuffled[i],shuffled[j]=shuffled[j],shuffled[i]
    wanted.extend((f['id'],round,v)for v in shuffled)
 if [(x['frame'],x['round'],x['variant'])for x in r['samples']]!=wanted:raise ValueError('seeded round order mismatch')
 availability={(x['frame'],x['variant']):x for x in r['availability']}
 want_availability={(item['id'],v+'_gpu_requested')for item in fixtures_all for v in ['literal','prior','checked']}if a.host=='browser'else set()
 if set(availability)!=want_availability or len(availability)!=len(r['availability']):raise ValueError('GPU availability coverage')
 for (frame,variant),row in availability.items():
  if row['actual_backend'] not in ['gpu','cpu','javascript']:raise ValueError('unknown GPU backend')
  inputs=lookup[frame];task=next(t for t in tasks if t['name']==inputs['task']);version=variant.split('_')[0];fn=next(x for x in read(p/'targets'/task['name']/version/'manifest.json')['functions']if x['name']==task['name'])
  payload=len(inputs['xs'])+(len(inputs['ys'])if task['list_inputs']==2 else 0)+2;output=len(inputs['expected']);eligible=bool(fn.get('graph_required')or fn.get('shader'))
  if row['actual_backend']=='gpu':
   want=dict(dispatches=len(fn['graph']['nodes']),upload_bytes=4*(payload+task['list_inputs']),readback_bytes=4*(output+1))if fn.get('graph_required')else single_shader_contract(fn,inputs,task)
   if row.get('stage_capacity_model')!=stage_capacity(fn,inputs,task)or not eligible or row['contract']!=want or any(row['counters'][k]!=v for k,v in want.items())or not isinstance(row['counters'].get('live_buffer_bytes'),int):raise ValueError('GPU validation contract')
  elif eligible and payload>2:raise ValueError('unexpected eligible nonempty GPU fallback: '+frame+'/'+variant)
  elif row.get('reason')is None:raise ValueError('unexplained GPU fallback')
 result=dict(status='passed',host=a.host,samples=len(r['samples']),groups=len(groups),validation=len(validations),actual_gpu_validation=sum(x['actual_backend']=='gpu' for x in r['availability']),fallback_validation=sum(x['actual_backend']!='gpu' for x in r['availability']),bindings={'metadata':sha(p/'metadata.json'),'results':sha(p/(a.host+'-results.json'))})
 (p/(a.host+'-audit.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

def validation_audit(a):
 p=a.report;m=read(p/'metadata.json');r=read(p/(a.host+'-validation.json'));f=read(p/'fixtures.json');tasks=read(p/'spec.json')['tasks']
 if r['status']!='passed' or r.get('validate_only')is not True or r['metadata_sha256']!=sha(p/'metadata.json'):raise ValueError('failed/unbound/non-validation results')
 for path,h in m['bindings'].items():
  if sha(p/path)!=h:raise ValueError('frozen drift '+path)
 if any(r.get(k)for k in ['samples','calibration','warmups']):raise ValueError('untimed validation contains timing samples')
 variants={v+'_'+b for v in ['literal','prior','checked']for b in ['js_owned','wasm_full','wasm_prepared']}|{'expert_js_owned','rust_wasm_full','rust_wasm_prepared'}
 if a.host=='browser':variants|={v+'_gpu_requested'for v in ['literal','prior','checked']}
 expected={(x['id'],v)for x in f['frames']for v in variants};rows={(x['frame'],x['variant'])for x in r['validation']}
 if rows!=expected or len(rows)!=len(r['validation']):raise ValueError('complete variant/frame coverage')
 for v in r['validation']:
  borrowed=v['variant'].endswith('_wasm_prepared')
  if not v['passed']or not v['nonmutation']or (not borrowed and v.get('changed_input_lifetime')is not True)or(borrowed and v.get('changed_input_lifetime')is not None):raise ValueError('output/nonmutation/lifetime validation')
 checks=len(f['frames'])*(2*len(variants)+len([v for v in variants if not v.endswith('_wasm_prepared')]))
 if r['complete_output_checks']!=checks:raise ValueError('full check count')
 gpu_expected={(x['id'],v+'_gpu_requested')for x in f['frames']for v in ['literal','prior','checked']}if a.host=='browser'else set()
 gpu_rows={(x['frame'],x['variant'])for x in r['availability']}
 if gpu_rows!=gpu_expected or len(gpu_rows)!=len(r['availability']):raise ValueError('GPU availability coverage')
 frames={x['id']:x for x in f['frames']};by_task={x['name']:x for x in tasks}
 for row in r['availability']:
  if row['actual_backend']not in ['gpu','cpu','javascript']:raise ValueError('unknown actual backend')
  frame=frames[row['frame']];task=by_task[frame['task']];version=row['variant'].split('_')[0];fn=next(x for x in read(p/'targets'/task['name']/version/'manifest.json')['functions']if x['name']==task['name']);eligible=bool(fn.get('shader')or fn.get('graph_required'));payload=len(frame['xs'])+(len(frame['ys'])if task['list_inputs']==2 else 0)+2;output=len(frame['expected'])
  if row['actual_backend']=='gpu':
   contract=dict(dispatches=len(fn['graph']['nodes']),upload_bytes=4*(payload+task['list_inputs']),readback_bytes=4*(output+1))if fn.get('graph_required')else single_shader_contract(fn,frame,task)
   if not eligible or row['contract']!=contract or any(row['counters'][k]!=v for k,v in contract.items())or not isinstance(row['counters'].get('live_buffer_bytes'),int):raise ValueError('GPU physical contract')
  elif row.get('reason')is None:raise ValueError('unexplained fallback')
 result=dict(status='passed',host=a.host,timed=False,validation=len(rows),complete_output_checks=checks,actual_gpu_validation=sum(x['actual_backend']=='gpu'for x in r['availability']),fallback_validation=sum(x['actual_backend']!='gpu'for x in r['availability']),bindings={'metadata':sha(p/'metadata.json'),'results':sha(p/(a.host+'-validation.json'))})
 (p/(a.host+'-validation-audit.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

def summarize(a):
 p=a.report;r=read(p/(a.host+'-results.json'));groups={}
 for x in r['samples']:groups.setdefault((x['frame'],x['boundary']),{}).setdefault(x['variant'],{})[x['round']]=x
 rows=[]
 for (frame,boundary),variants in sorted(groups.items()):
  for ref,current in [('literal_js_owned','checked_js_owned'),('prior_js_owned','checked_js_owned'),('expert_js_owned','checked_js_owned'),('literal_wasm_full','checked_wasm_full'),('prior_wasm_full','checked_wasm_full'),('rust_wasm_full','checked_wasm_full'),('literal_wasm_prepared','checked_wasm_prepared'),('prior_wasm_prepared','checked_wasm_prepared'),('rust_wasm_prepared','checked_wasm_prepared'),('literal_gpu_requested','checked_gpu_requested'),('prior_gpu_requested','checked_gpu_requested')]:
   if ref not in variants or current not in variants:continue
   left,right=variants[ref],variants[current]
   if set(left)!=set(range(9)) or set(right)!=set(range(9)):raise ValueError('incomplete paired interval')
   # GPU-to-GPU ratios only when every timed invocation actually ran GPU.
   if ref.endswith('gpu_requested') and any(set(x.get('actual_backend_counts',{}))!={'gpu'} for x in list(left.values())+list(right.values())):continue
   logs=[math.log(left[i]['ns_per_call']/right[i]['ns_per_call']) for i in range(9)];ratio=math.exp(math.fsum(logs)/9)
   seed=int(hashlib.sha256((frame+'/'+ref+'/'+current).encode()).hexdigest()[:16],16);rng=random.Random(seed)
   draws=sorted(math.exp(math.fsum(rng.choices(logs,k=9))/9) for _ in range(4000));lo,hi=draws[100],draws[3899]
   rows.append(dict(frame=frame,boundary=boundary,reference=ref,current=current,ratio_reference_over_current=ratio,ci95=[lo,hi],classification='faster' if lo>1 else 'slower' if hi<1 else 'inconclusive',bootstrap_seed=seed))
 result=dict(status='passed',host=a.host,results_sha256=sha(p/(a.host+'-results.json')),comparisons=rows,method='nine paired log ratios;4000 bootstrap draws; nominal95% percentile interval; >1 favors checked; no multiplicity correction or broad language ranking')
 (p/(a.host+'-summary.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(dict(status='passed',comparisons=len(rows))))

def main():
 parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['prepare','node','serve','audit','summarize','native-prepare','native','native-audit']);parser.add_argument('--report',type=Path,default=REPORT);parser.add_argument('--compiler',type=Path,default=ROOT/'reports/web-stack-proofs-32-2026-10-11/main-integration/ink-main-publish');parser.add_argument('--zig',type=Path,default=ROOT.parent/'toolchain/zig-aarch64-macos-0.15.2/zig');parser.add_argument('--prior',type=Path);parser.add_argument('--knowledge',type=Path,default=ROOT/'knowledge');parser.add_argument('--model',type=Path);parser.add_argument('--host',choices=['node','browser'],default='node');parser.add_argument('--port',type=int,default=8877);parser.add_argument('--validate-only',action='store_true');a=parser.parse_args()
 if a.mode=='prepare':
  if a.prior is None or a.model is None:parser.error('prepare requires frozen --prior and --model')
  prepare(a)
 elif a.mode=='node':subprocess.run(['node',str(a.report/'run-node.mjs')]+(['--validate-only'] if a.validate_only else []),check=True,cwd=ROOT)
 elif a.mode=='serve':serve(a)
 elif a.mode=='audit':validation_audit(a) if a.validate_only else audit(a)
 elif a.mode=='summarize':summarize(a)
 elif a.mode=='native-audit':
  sys.path.insert(0,str(ASSETS));spec=importlib.util.spec_from_file_location('batch37_native_audit',ASSETS/'native-audit.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);print(json.dumps(module.audit(a.report)))
 elif a.mode in ['native-prepare','native']:
  spec=importlib.util.spec_from_file_location('batch37_native',ASSETS/'native.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);result=module.prepare(a.report) if a.mode=='native-prepare' else module.measure(a.report);print(json.dumps(dict(status=result['status'],samples=len(result.get('samples',[])))))
if __name__=='__main__':main()
