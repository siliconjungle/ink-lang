"""Untimed independent scalar-target, graph-capacity and boundary audit."""
from pathlib import Path
import json,hashlib
B=Path(__file__).resolve().parents[3];R=B/'reports/web-stack-proofs-36-2026-10-11';P=R/'targets-measured'
rd=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def bind(root,d):
 for f,h in d.items():assert sha(root/f)==h,f
 return len(d)
m=rd(P/'metadata.json');n=rd(P/'native/metadata.json');base=rd(R/'production-baseline.json');mh=sha(P/'metadata.json');counts={'target':bind(P,m['bindings']),'native':bind(P/'native',n['bindings']),'production':bind(B,base['source_bindings'])};assert counts=={'target':394,'native':107,'production':122}
assert sha(m['compiler'])==m['compiler_sha256']==base['compiler_sha256']=='04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536';assert n['main_metadata_sha256']==mh and sha(P/'cost-model.json')==m['cost_model_sha256']
assert m['prior_snapshot']=='b7d979fd4861a1b82897f142737e9b8161f8c2946e9f7fa6514b50aefd45240b'and m['new_snapshot']=='7f5e7a94b49db567af55f5d1129dd07c5e2b469ebd45cb6e5cbc53595782b2be'
assert m['protocol']['result_kind']=='u32-scalar-value'
tasks={t['name']:t for t in rd(P/'spec.json')['tasks']};frames={f['id']:f for f in rd(P/'fixtures.json')['frames']};selected={}
for name,s in m['selections'].items():
 family=tasks[name]['family'];assert s['fresh_proof_required'] and s['checked_changes_prior'] and s['checked']['applications']==1 and set(s['fresh_laws'])<=set(s['checked']['laws'])
 if family=='concat':assert s['prior']['applications']==1 and s['prior']['laws']==['4a5cc1087ab886d514487cf7f26708d7a469e5d92467ae0d4f801693dadd076a']
 else:assert s['prior']['applications']==0 and not s['prior']['laws']
 stage_count={'plain':(2,2,1),'nested':(3,3,1),'filtered':(3,3,1),'concat':(4,4,2)}[family]
 for version,stages in zip(['literal','prior','checked'],stage_count):
  mf=rd(P/'targets'/name/version/'manifest.json');fn=next(f for f in mf['functions']if f['name']==name);assert fn['graph_required']is True and fn['result']['kind']=='u32'and len(fn['graph']['nodes'])==stages
  for node in fn['graph']['nodes']:
   if node['op']=='foldr':
    assert node['ordered']and node['workgroup_size']==1
    shader=(P/'targets'/name/version/node['shader']).read_text();assert 'cursor--'in shader and 'gid.x!=0u'in shader
 for version in ['prior','checked']:
  assert sha(P/s[version]['selection_path'])==s[version]['selection_sha256'] and sha(P/s[version]['selected_core_path'])==s[version]['core_sha256']
 js=(P/'targets'/name/'checked/program.mjs').read_text().split('function __fn1',1)[0]
 assert 'new Array('not in js and js.count('for(let ')==(2 if family=='concat'else 1)
 selected[name]={'family':family,'prior_apps':s['prior']['applications'],'prior_laws':s['prior']['laws'],'fresh_laws':s['fresh_laws'],'literal_prior_checked_stages':list(stage_count),'all_primaries_graph_required':True,'ordered_fold_workgroup':1}
filters=[]
for f in frames.values():
 if tasks[f['task']]['family']!='filtered':continue
 accepted=sum((x%f['k']if f['k']else 0)<f['seed']for x in f['xs']);assert accepted==f['acceptance']['accepted'] and f['acceptance']['observed']==len(f['xs'])
 assert f['acceptance']['fraction']==(accepted/len(f['xs'])if f['xs']else None)
 if f['timed']:
  assert f['seed']==(2 if f['mode']=='low'else 6)and f['k']==7
  filters.append({'frame':f['id'],'seed':f['seed'],'k':f['k'],'accepted':accepted,'observed':len(f['xs']),'fraction':f['acceptance']['fraction']})
assert len(filters)==6
validation={};gpu=[]
for host,count,checks in [('node',1152,3072),('browser',1440,3936)]:
 d=rd(P/f'{host}-validation.json');a=rd(P/f'{host}-validation-audit.json');assert d['status']=='passed'and d['validate_only']and not d['samples']and not d['warmups']and not d['calibration'];assert d['metadata_sha256']==mh and a['bindings']=={'metadata':mh,'results':sha(P/f'{host}-validation.json')};assert len(d['validation'])==count and d['complete_output_checks']==checks
 for row in d['validation']:
  assert row['passed']and row['nonmutation']and row['result_kind']=='scalar_u32'and row['output_lifetime']=='immutable-scalar-value'
  if row['input_residency']=='captured-per-call':assert row['changed_input_value_correspondence']
 for row in d['availability']:
  if '_gpu_'not in row['variant']:continue
  assert row['actual_backend']=='gpu'
  f=frames[row['frame']];version=row['variant'].split('_')[0];mf=rd(P/'targets'/row['name']/version/'manifest.json');fn=next(x for x in mf['functions']if x['name']==row['name']);g=fn['graph'];inputs=[len(f['xs']),len(f['ys']),1,1];caps=[];node_bytes=0
  for node in g['nodes']:
   lengths=[inputs[x['param']]if'param'in x else caps[x['node']]for x in node['args']];spec=node['capacity'];values=[lengths[i]for i in spec['args']];kind=spec['kind'];cap=1 if kind=='one'else(values[0]if kind=='same'else(sum(values)if kind=='sum'else min(values)))
   caps.append(cap);node_bytes+=4*(cap+(1 if node['result']['kind']=='list'else 0))
  upload=4*(sum(inputs)+2);expected={'dispatches':len(g['nodes']),'upload_bytes':upload,'readback_bytes':4};assert row['contract']==expected and all(row['counters'][k]==v for k,v in expected.items());assert row['counters']['live_buffer_bytes']==upload+node_bytes+4;assert row['stage_capacity_model']=={'capacities':caps,'outputCount':1};gpu.append(row)
 assert a['actual_gpu_validation']==(288 if host=='browser'else 0)and a['fallback_validation']==0
 validation[host]={'rows':count,'complete_scalar_checks':checks,'gpu':288 if host=='browser'else 0,'fallback':0}
assert len(gpu)==288 and len(n['validation'])==384 and all(row['passed']for row in n['validation']);validation['native']={'complete_scalar_nonmutation_checks':384}
control=rd(R/'benchmark-preparation/control-validation.json');assert control['status']=='passed'
runner=(P/'runner.mjs').read_text();assert 'ink_compute_scalar32(d.fn.index,ptrs,lengths)>>>0'in runner
# All JS-facing U32 controls should return immutable Numbers, matching Ink scalar32.
assert 'rust.bench_eval_scalar32(index,xp,xs.length,yp,ys.length,f.seed,f.k)>>>0' in runner
assert 'BigInt(words[0])'not in runner and 'BigInt(changedWords[0])'not in runner,'Strong Rust-Wasm U32 outputs still reconstructed as BigInt'
out={'status':'passed','bindings':counts,'metadata_sha256':mh,'validation':validation,'selections':selected,'filtered_timed_acceptance':filters,'physical_gpu':'All288 actual GPU graph calls recomputed from named function/node input references and capacity model; scalar readback4bytes with no length header. Live buffers input+all graph outputs+4-byte staging. Ordered folds descend serially on gid.x0.','scalar_fairness':'All captured/resident immutable U32 value cohorts; strong fused JS/Rust preserve accumulator dependence, original-input filter, nested order and concat suffix-before-prefix. Rust-Wasm host returns match Number scalar32. ABI correction is benchmark-only before timing. Unused ys ingress remains shared by all variants.','limits':'Untimed preparation; physical stage/buffer reduction is established but profitability is unmeasured. No new generic mathematics, runtime routing or core change.'};(R/'review/target-preflight-review.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'status':'passed','bindings':counts,'validation':validation,'filter_acceptance':filters}))
