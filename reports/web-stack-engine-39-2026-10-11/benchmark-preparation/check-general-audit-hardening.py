from pathlib import Path
from types import SimpleNamespace
import copy,importlib.util,json,tempfile,hashlib
ROOT=Path(__file__).resolve().parents[3]
tool=ROOT/'bench/web-stack-general39.py';spec=importlib.util.spec_from_file_location('general39_audit_check',tool);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
versions=['baseline','candidate'];variants={v+'_'+b for v in versions for b in ['js_owned','wasm_full','wasm_prepared']}|{'expert_js_owned','rust_wasm_full','rust_wasm_prepared'}|{v+'_gpu_requested'for v in versions}|{'candidate_gpu_resident'}
frame={'id':'frame','task':'task','xs':[],'ys':[],'expected':[],'timed':False}
meta={'bindings':{},'selections':{'task':{v:{'resident_gpu_api':v=='candidate','gpu':{'eligible':True}}for v in versions}}}
contract={'dispatches':0,'upload_bytes':36,'readback_bytes':4}
raw={'status':'passed','metadata_sha256':'digest','samples':[],'calibration':[],'warmups':[],'complete_output_checks':33,'validation':[{'frame':'frame','variant':v,'passed':True,'nonmutation':True,'changed_input_lifetime':True,'resident_input_capture':True}for v in sorted(variants)],'availability':[{'frame':'frame','variant':v,'actual_backend':'gpu','contract':{**contract,'upload_bytes':0 if v.endswith('_resident')else 36},'counters':{**contract,'upload_bytes':0 if v.endswith('_resident')else 36}}for v in sorted(variants)if'_gpu_'in v]}
fn={'name':'task','shader':'compute.wgsl','lengths':[0,1],'params':[{}, {}, {}, {}]}
checks=[]
with tempfile.TemporaryDirectory(prefix='general39-audit-hardening-')as td:
 report=Path(td);current=copy.deepcopy(raw)
 def read(path):
  name=Path(path).name
  if name=='metadata.json':return meta
  if name in ['browser-validation.json','browser-results.json']:return current
  if name=='fixtures.json':return {'frames':[frame]}
  if name=='spec.json':return {'tasks':[{'name':'task','output_kind':'list_u32'}]}
  if name=='manifest.json':return {'functions':[fn]}
  raise AssertionError(path)
 m.read=read;m.sha=lambda path:'digest'
 def exercise(name,mutate,want,validate_only=True):
  global current
  current=copy.deepcopy(raw);mutate(current);output=report/(name+'.json')
  try:m.audit(SimpleNamespace(report=report,host='browser',validate_only=validate_only,audit_output=output))
  except ValueError as e:
   assert want in str(e),(name,str(e));checks.append({'check':name,'status':'passed','rejection':str(e)})
  else:raise AssertionError('accepted '+name)
 exercise('missing-capable-resident',lambda r:r['validation'].pop(next(i for i,v in enumerate(r['validation'])if v['variant']=='candidate_gpu_resident')),'resident capability coverage')
 exercise('missing-gpu-availability',lambda r:r['availability'].pop(0),'GPU availability coverage')
 exercise('duplicate-gpu-availability',lambda r:r['availability'].append(copy.deepcopy(r['availability'][0])),'GPU availability coverage')
 exercise('wrong-complete-check-count',lambda r:r.update(complete_output_checks=34),'complete output check count')
 frame['timed']=True;meta['protocol']={'max_iterations':16384,'rounds':5,'target_ms':2,'warmups':2,'seed':1}
 exercise('mislabeled-sample-boundary',lambda r:r.update(complete_output_checks=36,samples=[{'frame':'frame','variant':'candidate_wasm_prepared','iterations':1,'elapsed_ms':1,'round':0,'boundary':'captured-wasm-owned'}]),'sample ownership boundary',False)
 frame['timed']=False
 current=copy.deepcopy(raw);output=report/'valid.json';m.audit(SimpleNamespace(report=report,host='browser',validate_only=True,audit_output=output));assert output.exists();checks.append({'check':'complete-capable-resident-and-availability','status':'passed'})
 for changed in ['results','metadata']:
  audit={'status':'passed','bindings':{'results':'digest','metadata':'digest'}};audit['bindings'][changed]='stale';m.read=lambda p:audit
  try:m.summarize(SimpleNamespace(report=report,host='node'))
  except ValueError as e:assert 'saved audit bindings changed' in str(e);checks.append({'check':'stale-'+changed+'-summary','status':'passed','rejection':str(e)})
  else:raise AssertionError('accepted stale '+changed)
 m.read=lambda p:{'status':'passed','bindings':{'results':'digest','metadata':'digest'}} if Path(p).name=='audit.json'else {'main_metadata_sha256':'stale','bindings':{}}if Path(p).parent.name=='native'else {'bindings':{}}
 try:m.summarize(SimpleNamespace(report=report,host='native'))
 except ValueError as e:assert 'native/main metadata changed' in str(e);checks.append({'check':'stale-native-main-summary','status':'passed','rejection':str(e)})
 else:raise AssertionError('accepted stale native main metadata')
receipt={'status':'passed','timed':False,'method':'synthetic structurally complete audit fixture with one-at-a-time missing/duplicate capability records, and stale audit binding negative controls; no performance statistics','tool_sha256':hashlib.sha256(tool.read_bytes()).hexdigest(),'checks':checks}
out=ROOT/'reports/web-stack-engine-39-2026-10-11/benchmark-preparation/general-audit-hardening-smoke.json';out.write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'status':'passed','checks':len(checks)}))
