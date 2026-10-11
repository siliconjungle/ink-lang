from pathlib import Path
import hashlib,json,collections
B=Path(__file__).resolve().parents[3];R=B/'reports/web-stack-engine-40-2026-10-11/parity';P=B/'build/generated-parity-memory40/gpu-module';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();prep=json.loads((R/'browser-preparation.json').read_text());actual=json.loads((R/'browser-parity.json').read_text());manifest=json.loads((P/'manifest.json').read_text());assert actual['status']=='passed'and actual['timing_samples']==0 and actual['metadata_sha256']==sha(R/'browser-preparation.json');assert len(prep['rows'])==actual['source_rows']==91
for p,h in prep['bindings'].items():assert sha(B/p)==h,p
functions={f['name']:f for f in manifest['functions']};want=[];states=[];physical_checked=0
width=lambda t:width(t['element'])if t['kind']=='list'else t['size']*width(t['element'])if t['kind']=='vector'else sum(width(f['type'])for f in t['fields'])if t['kind']=='record'else 2 if t['kind']=='u64'else 1
def counters(f,row):
 args=row['args'];counts=[len(v)if p['type']['kind']=='list'else 1 for v,p in zip(args,f['params'])];packed=sum(4*(n*width(p['type'])+(p['type']['kind']=='list'))for n,p in zip(counts,f['params']))
 if f['graph_required']:
  caps=[]
  for node in f['graph']['nodes']:
   values=[counts[r['param']]if'param'in r else caps[r['node']]for i in node['capacity']['args']for r in[node['args'][i]]];kind=node['capacity']['kind'];assert kind in['same','min','max','sum','one'];caps.append(values[0]if kind=='same'else min(values)if kind=='min'else max(values)if kind=='max'else sum(values)if kind=='sum'else 1)
  base=sum(max(4,4*(n*width(p['type'])+(p['type']['kind']=='list')))for n,p in zip(counts,f['params']))+sum(max(4,4*(n*width(node['result'])+(node['result']['kind']=='list')))for n,node in zip(caps,f['graph']['nodes']));payload=4*(len(row['expected'])*width(f['result']['element'])if f['result']['kind']=='list'else width(f['result']));return dict(upload_bytes=packed,readback_bytes=payload+4*(f['result']['kind']=='list'),dispatches=len(caps),live_buffer_bytes=base+max(4*(f['result']['kind']=='list'),payload))
 n=max(counts[i]for i in f['lengths']);output=4*(1+n*width(f['result']));return dict(upload_bytes=packed+4*(len(args)+1),readback_bytes=output,dispatches=int(n>0),live_buffer_bytes=sum(max(4,4*(n*width(p['type'])+(p['type']['kind']=='list')))for n,p in zip(counts,f['params']))+3*max(4,output)+4*(len(args)+1))
def scalar_counters(f,row):
 assert f['gpu']['stages']==[];n=len(row['args'][f['gpu']['list_param']]);cap=max(1,n);allocated=4*cap+4+4*len(row['args']);dispatches=0
 if f['gpu']['aggregate']=='count':dispatches=1;allocated+=4
 else:
  assert f['gpu']['aggregate']=='sum'
  while True:
   cap=(cap+255)//256;allocated+=4*cap+4;dispatches+=1
   if cap<=1:break
 return dict(upload_bytes=4*n+4+4*len(row['args']),dispatches=dispatches,readback_bytes=4,allocated_buffer_bytes=allocated+4)
raw_by_index={r['index']:r for r in prep['rows']};cursor=0
for row in prep['rows']:
 if not row['pure']:
  states.extend((row['index'],row['name'],b)for b in['cpu','javascript']);continue
 f=functions[row['name']]
 for backend in['cpu','javascript','gpu']:want.append((row['index'],row['name'],'complete-module',backend))
 if f['gpu']:
  pm=json.loads((P/f['bundle']/'manifest.json').read_text());scalar=pm['runtime_abi']=='ink-scalar-pipeline-v1';u32=any(p['type']['kind']=='list'and p['type']['element']['kind']=='u32'for p in row['params'])
  for backend in['cpu','javascript']+([]if row['cpu_only']else['gpu'])+(['auto']if u32 and not scalar else[]):want.append((row['index'],row['name'],'direct-target-native-borrowed-js'if backend=='javascript'else'direct-packed-capture',backend))
  if u32 and not scalar:want.append((row['index'],row['name'],'static-target-native-borrowed-js','auto'))
assert len(actual['rows'])==len(want)==612
assert[(r['index'],r['name'],r['scope'],r['requested'])for r in actual['rows']]==want
assert[(r['index'],r['name'],r['backend'])for r in actual['state_rows']]==states
for r in actual['state_rows']:assert r['complete_outcome']and r['exact_snapshot']
for r in actual['rows']:
 assert r['complete_output'];row=raw_by_index[r['index']];f=functions[row['name']]
 if r['requested']=='gpu'and row['expect_gpu']:assert r['backend']=='gpu'
 if row['cpu_only']and r['requested']=='gpu':assert r['backend']=='cpu'
 if r['requested']=='auto':assert r['backend']=='javascript'
 if r['scope']=='direct-packed-capture'and r['requested']=='auto':assert'no runtime probes'in r['reason']
 if r['backend']=='gpu':
  pm=json.loads((P/f['bundle']/'manifest.json').read_text());entry=next(g for g in pm['functions']if g['name']==row['name'])
  if pm['runtime_abi']=='ink-scalar-pipeline-v1':
   if r['scope']=='direct-packed-capture':assert r['observed_gpu_commands']==scalar_counters(entry,row);physical_checked+=1
   else:assert r['counters']is None
  else:
   expected=counters(entry,row)
   for k,v in expected.items():assert r['counters'][k]==v,(r['index'],r['scope'],k,r['counters'][k],v)
   physical_checked+=1
assert sum(r['backend']=='gpu'for r in actual['rows'])==actual['actual_gpu_calls']==150
assert physical_checked==144
for k in['all_retained_outputs_survive_next_call_and_close','packed_capture_mutation_checked','complete_module_inputs_stable_until_settled','cpu_only_f32_flags_respected','synthetic_saved_profile_forces_captured_adaptive_js','static_and_explicit_js_inputs_stable_until_settled']:assert actual[k]
result={'status':'passed','source_requests':91,'complete_value_checks':612,'state_outcome_checks':12,'exact_snapshot_checks_in_bound_harness':182,'actual_gpu_calls':150,'independent_physical_counter_checks':144,'physical_counter_limit':'138 modern GPU calls expose counters; six direct scalar calls observed at real WebGPU command layer. Six mixed scalar calls expose no counters and are asserted actual GPU with complete outputs.','bound_files_verified':len(prep['bindings']),'timing_samples':0,'bindings':{str(p.relative_to(B)):sha(p)for p in[R/'browser-preparation.json',R/'browser-parity.json',R/'browser-success.png',R/'browser-wasm-preparation.json',R/'browser-host-synchronization.json',R/'browser-oracle-tests-3.log',Path(__file__)]if p.exists()},'limits':['Fixtures and reference expectations bind a tested domain; conformance is not a target-correctness proof.','Saved rows contain verified verdicts/counters; complete raw outputs were compared inside the bound harness rather than stored in the receipt.','Synthetic profile forces eligible adaptive JS for correctness, grants no semantic authority and makes no measured profitability claim.','Explicit/static JS and complete asynchronous module inputs remain stable until settlement; packed CPU/GPU/adaptive auto capture is tested separately.','Existing F32 CPU-only bit contract and unsupported-carrier fallback remain explicit.']}
(R/'browser-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items()if k not in['bindings','limits']}))
