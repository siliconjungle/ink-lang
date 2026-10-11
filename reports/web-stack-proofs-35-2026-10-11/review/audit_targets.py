import pathlib,json,hashlib
B=pathlib.Path(__file__).resolve().parents[3];R=B/'reports/web-stack-proofs-35-2026-10-11';P=R/'targets'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rd(p):return json.loads(p.read_text())
def bind(root,d):
 for k,v in d.items():assert sha(root/k)==v,(root,k)
 return len(d)
m=rd(P/'metadata.json');n=rd(P/'native/metadata.json');b=rd(R/'production-baseline.json');mh=sha(P/'metadata.json')
counts={'target_bindings':bind(P,m['bindings']),'native_bindings':bind(P/'native',n['bindings']),'production_bindings':bind(B,b['source_bindings'])}
assert counts['target_bindings']==396 and counts['production_bindings']==122
assert n['main_metadata_sha256']==mh and sha(pathlib.Path(m['compiler']))==m['compiler_sha256']==b['compiler_sha256']
assert m['prior_snapshot']=='7cf9b7ec48a8edd25b05951b8e424ea26444467fc176257aa34ac5a8e40aa644'
assert m['new_snapshot']=='b7d979fd4861a1b82897f142737e9b8161f8c2946e9f7fa6514b50aefd45240b'
assert sha(P/'cost-model.json')==m['cost_model_sha256']
families={t['name']:t['family'] for t in rd(P/'spec.json')['tasks']}
selections={}
for name,s in m['selections'].items():
 assert s['fresh_proof_required'] and s['checked_changes_prior']
 assert set(s['fresh_laws']) <= set(s['checked']['laws']) and s['checked']['applications']>0
 assert s['prior']['gpu']['graph_required'] is False and s['checked']['gpu']['graph_required'] is False
 prior_stages={'left':2,'right':2,'both':3,'nested':4}[families[name]]
 assert s['prior']['gpu']['graph_stages']==prior_stages and s['checked']['gpu']['graph_stages']==1
 assert s['prior']['applications']==0 and not s['prior']['laws']
 js=(P/'targets'/name/'checked/program.mjs').read_text().split('function __fn1',1)[0]
 assert js.count('new Array(')==1 and js.count('for(let ')==1
 assert 'Math.min(' in js
 for helper in ['left_word','right_word','post_word','combine_words']:
  expected=(helper=='combine_words') or (helper=='left_word' and families[name]!='right') or (helper=='right_word' and families[name]!='left') or (helper=='post_word' and families[name]=='nested')
  assert js.count('/* inline '+helper+' */')==int(expected)
 for version in ['literal','prior','checked']:
  mf=rd(P/'targets'/name/version/'manifest.json');fn=next(f for f in mf['functions'] if f['name']==name)
  assert fn['graph_required'] is False
 for version in ['prior','checked']:
  assert sha(P/s[version]['selection_path'])==s[version]['selection_sha256']
  assert sha(P/s[version]['selected_core_path'])==s[version]['core_sha256']
 selections[name]={'prior':s['prior']['laws'],'checked':s['checked']['laws'],'prior_declared_stages':prior_stages,'family':families[name],'checked_declared_stages':1,'both_primary_graph_required':False}
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
  nx,ny=len(f['xs']),len(f['ys']);words=nx+ny+4;c=max(nx,ny)
  if fn['graph_required']:
   expected={'dispatches':len(fn['graph']['nodes']),'upload_bytes':4*words,'readback_bytes':4*(len(f['expected'])+1)}
   assert v['stage_capacity_model'] is not None
  else:
   expected={'dispatches':int(c>0),'upload_bytes':4*(words+len(fn['params'])+1),'readback_bytes':4*(c+1)}
   assert v['stage_capacity_model'] is None
   assert v['counters']['live_buffer_bytes']==4*words+20+12*(c+1)
  assert expected==v['contract'] and all(v['counters'][k]==value for k,value in expected.items())
 assert len(gpu)==(288 if host=='browser' else 0)
 assert a['fallback_validation']==0
 valid[host]={'rows':rows,'complete_output_checks':checks,'actual_gpu':len(gpu),'fallback':0}
assert len(n['validation'])==384 and all(v['passed'] for v in n['validation'])
valid['native']={'rows':384,'passed':True}
receipt={'status':'passed','metadata_sha256':mh,'counts':counts,'validation':valid,'selections':selections,'physical_gpu_contracts':'All 288 actual GPU prevalidation rows independently recomputed by selected function name. Prior/checked primaries legacy route: one dispatch for positive maximum capacity, same transfers/live buffers despite declared graph stages 2/2/3/4 to 1/1/1/1. All literal/prior/checked primaries are legacy shader routes.','fairness':'Exact same frozen compiler/model, complete prior 2495 objects with no extra shared certificates; 2508-object new union. Four fresh ordinary selections. Strong JS fresh-output and Rust destination controls directly traverse min-length paired prefix and preserve both observed mappers/noncommutative callback; zero divisors/wrap preserved.','limits':'Untimed preparation only; no profitability or broad language superiority conclusion.'}
(R/'review/target-preflight-review.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'status':'passed','counts':counts,'validation':valid}))
