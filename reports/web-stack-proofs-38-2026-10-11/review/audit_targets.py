import pathlib,json,hashlib
B=pathlib.Path(__file__).resolve().parents[3];R=B/'reports/web-stack-proofs-38-2026-10-11';P=R/'targets'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rd(p):return json.loads(p.read_text())
def bind(root,d):
 for k,v in d.items():assert sha(root/k)==v,(root,k)
 return len(d)
m=rd(P/'metadata.json');n=rd(P/'native/metadata.json');b=rd(R/'production-baseline.json');mh=sha(P/'metadata.json')
counts={'target_bindings':bind(P,m['bindings']),'native_bindings':bind(P/'native',n['bindings']),'production_bindings':bind(B,b['source_bindings'])}
assert counts['target_bindings']==350 and counts['production_bindings']==122
assert n['main_metadata_sha256']==mh and sha(pathlib.Path(m['compiler']))==m['compiler_sha256']==b['compiler_sha256']
assert m['prior_snapshot']=='6df4df9aae82d58eba9eac5e8d36b41ce37147ed5d661285903745f4c136d9e3'
assert m['new_snapshot']=='8d1f3460cc2aa16bfd176081e2b7fab552e9ec8ea858755c566b3708107c80ef'
assert sha(P/'cost-model.json')==m['cost_model_sha256']
families={t['name']:t['family'] for t in rd(P/'spec.json')['tasks']}
selections={}
for name,s in m['selections'].items():
 assert s['fresh_proof_required'] and s['checked_changes_prior']
 assert set(s['fresh_laws']) <= set(s['checked']['laws']) and s['checked']['applications']>0
 assert s['prior']['gpu']['graph_required'] is True and s['checked']['gpu']['graph_required'] is False
 prior_stages=4
 assert s['prior']['gpu']['graph_stages']==prior_stages and s['checked']['gpu']['graph_stages']==1
 assert s['prior']['applications']==0 and not s['prior']['laws']
 js=(P/'targets'/name/'checked/program.mjs').read_text().split('function __fn1',1)[0]
 assert js.count('new Array(')==1 and js.count('for(let ')==1
 assert 'v0.length' in js or '.length' in js
 for helper in ['left_word','right_word','pair_word']:assert js.count('/* inline '+helper+' */')==1
 if '_heldout'in name:
  for helper in ['left_signal','right_signal','pair_signal']:assert js.count('/* inline '+helper+' */')==1
 for version in ['literal','prior','checked']:
  mf=rd(P/'targets'/name/version/'manifest.json');fn=next(f for f in mf['functions'] if f['name']==name)
  assert fn['graph_required'] is (version!='checked')
  if version=='checked':assert fn['lengths']==[0] and fn['shader'] is not None
  else:assert fn['shader']is None and len(fn['graph']['nodes'])==4
 for version in ['prior','checked']:
  assert sha(P/s[version]['selection_path'])==s[version]['selection_sha256']
  assert sha(P/s[version]['selected_core_path'])==s[version]['core_sha256']
 selections[name]={'prior':s['prior']['laws'],'checked':s['checked']['laws'],'prior_declared_stages':prior_stages,'family':families[name],'checked_declared_stages':1,'prior_graph_required':True,'checked_graph_required':False}
frames={f['id']:f for f in rd(P/'fixtures.json')['frames']};valid={}
for host,rows,checks in [('node',1152,3072),('browser',1440,3936)]:
 d=rd(P/f'{host}-validation.json');a=rd(P/f'{host}-validation-audit.json')
 assert d['status']=='passed' and d['validate_only'] and not d['samples'] and not d['warmups'] and not d['calibration']
 assert d['metadata_sha256']==mh and a['bindings']['metadata']==mh and a['bindings']['results']==sha(P/f'{host}-validation.json')
 assert len(d['validation'])==rows and d['complete_output_checks']==checks
 for v in d['validation']:
  assert v['passed'] and v['nonmutation']
  if v['output_lifetime']=='owned':assert v['changed_input_lifetime']
 gpu=[v for v in d['availability'] if v.get('actual_backend')=='gpu']
 for v in gpu:
  f=frames[v['frame']];version=v['variant'].split('_')[0];mf=rd(P/'targets'/v['name']/version/'manifest.json');fn=next(fn for fn in mf['functions'] if fn['name']==v['name'])
  nx,ny=len(f['xs']),len(f['ys']);words=nx+ny+4
  if fn['graph_required']:
   inputs=[nx,ny,1,1];caps=[]
   for node in fn['graph']['nodes']:
    lengths=[inputs[x['param']]if'param'in x else caps[x['node']]for x in node['args']];c=node['capacity'];vals=[lengths[i]for i in c['args']];cap=vals[0]if c['kind']=='same'else sum(vals)if c['kind']=='sum'else min(vals);caps.append(cap)
   expected={'dispatches':4,'upload_bytes':4*words,'readback_bytes':4*(nx+1)}
   assert caps[-1]==nx and v['stage_capacity_model']=={'capacities':caps,'outputCount':nx}
   assert v['counters']['live_buffer_bytes']==4*words+sum(4*(c+1)for c in caps)+4*max(1,nx)
  else:
   assert fn['lengths']==[0];expected={'dispatches':int(nx>0),'upload_bytes':4*(words+len(fn['params'])+1),'readback_bytes':4*(nx+1)}
   assert v['stage_capacity_model']is None and v['counters']['live_buffer_bytes']==4*words+20+12*(nx+1)
  assert expected==v['contract'] and all(v['counters'][k]==value for k,value in expected.items())
 assert len(gpu)==(288 if host=='browser' else 0)
 assert a['fallback_validation']==0
 valid[host]={'rows':rows,'complete_output_checks':checks,'actual_gpu':len(gpu),'fallback':0}
assert len(n['validation'])==384 and all(v['passed'] for v in n['validation'])
valid['native']={'rows':384,'passed':True}
# Independent ring-valued both-observed indexed oracle, full xs extent.
for f in frames.values():
 seed,k=f['seed'],f['k'];expected=[]
 for i,x in enumerate(f['xs']):
  if '_heldout'in f['task']:
   a=((x//k if k else 0)+(i%k if k else 0)+seed)&0xffffffff;b=(x+k if i<seed else x*3)&0xffffffff;z=(a//k if k else 0)+b if a<b else (b%k if k else 0)+a
  else:
   a=(x+k if i<seed else x-seed)&0xffffffff;b=(x*k if i%3==0 else x+seed)&0xffffffff;z=a+b*k if a<b else a-b+seed
  expected.append(z&0xffffffff)
 assert expected==f['expected']and len(expected)==len(f['xs'])and f['web_consumption_code']==(len(expected)+sum((i+1)*v for i,v in enumerate(expected)))%2**32
runner=(P/'runner.mjs').read_text();assert 'for(let i=0;i<a.length;i++)code=(code+Math.imul((i+1)>>>0,a[i]))>>>0'in runner and 'consumed_elements:'in runner and 'every returned vector word read inside timer'in runner
control=rd(R/'benchmark-preparation/control-validation.json');assert control['status']=='passed'and not control['timed']and control['frames']==96 and control['complete_outputs']==192
for f,h in control['bindings'].items():
 p=R/'benchmark-preparation'/f
 if not p.exists():p=B/'bench/web-stack-proofs-38'/f
 assert sha(p)==h
assert all(v['input_nonmutation']and v['js_owned_lifetime']and v['full_vector_consumption_code']for v in control['rows'])
receipt={'status':'passed','metadata_sha256':mh,'counts':counts,'validation':valid,'selections':selections,'physical_gpu_contracts':'All 288 actual GPU rows recomputed by named primary. Literal/prior use 4 active graph stages; checked uses legacy shader capacity xs.length (manifest lengths [0]), 1 dispatch if xs is nonempty and 0 otherwise. Graph upload is 4*(nx+ny+4), legacy is 4*(nx+ny+9); both read back 4*(nx+1). Graph live bytes are 4*(5*nx+2*ny+8+max(1,nx)): header and payload staging buffers are read and destroyed sequentially. Legacy live bytes are 4*(4*nx+ny+12). No universal memory saving claim on empty or tiny inputs.','fairness':'Exact same frozen compiler/model, complete prior 2534 objects with no extra shared certificates; 2550-object new union. Four fresh ordinary selections. Strong JS fresh-output and Rust destination controls directly traverse xs and observe both indexed mappers and noncommutative pair callback once per xs element; irrelevant suffix removed after same-origin structural matching; zero divisors/wrap preserved.','full_word_consumption':'Web length plus index-weighted U32 checksum reads every output word inside timer; native complete-vector U64 consumption remains separately bounded.','limits':'Untimed preparation only; no profitability or broad language superiority conclusion.'}
(R/'review/target-preflight-review.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'status':'passed','counts':counts,'validation':valid}))
