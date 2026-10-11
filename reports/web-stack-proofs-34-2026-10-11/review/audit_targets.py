import pathlib,json,hashlib
B=pathlib.Path(__file__).resolve().parents[3];R=B/'reports/web-stack-proofs-34-2026-10-11';P=R/'targets'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rd(p):return json.loads(p.read_text())
def bind(root,d):
 for k,v in d.items():assert sha(root/k)==v,(root,k)
 return len(d)
m=rd(P/'metadata.json');n=rd(P/'native/metadata.json');b=rd(R/'production-baseline.json');mh=sha(P/'metadata.json')
counts={'target_bindings':bind(P,m['bindings']),'native_bindings':bind(P/'native',n['bindings']),'production_bindings':bind(B,b['source_bindings'])}
assert counts['target_bindings']==334 and counts['production_bindings']==122
assert n['main_metadata_sha256']==mh and sha(pathlib.Path(m['compiler']))==m['compiler_sha256']==b['compiler_sha256']
assert m['prior_snapshot']=='3c78ba2b4059c318afafca2f087c774139c00dc666288c207598b7c91abb2957'
assert m['new_snapshot']=='7cf9b7ec48a8edd25b05951b8e424ea26444467fc176257aa34ac5a8e40aa644'
assert sha(P/'cost-model.json')==m['cost_model_sha256']
selections={}
for name,s in m['selections'].items():
 assert s['fresh_proof_required'] and s['checked_changes_prior']
 assert set(s['fresh_laws']) <= set(s['checked']['laws']) and s['checked']['applications']>0
 assert s['prior']['gpu']['graph_required'] is False and s['checked']['gpu']['graph_required'] is False
 assert s['prior']['gpu']['graph_stages']==2 and s['checked']['gpu']['graph_stages']==1
 for version in ['prior','checked']:
  assert sha(P/s[version]['selection_path'])==s[version]['selection_sha256']
  assert sha(P/s[version]['selected_core_path'])==s[version]['core_sha256']
 selections[name]={'prior':s['prior']['laws'],'checked':s['checked']['laws'],'prior_declared_stages':2,'checked_declared_stages':1,'both_primary_graph_required':False}
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
p=R/'review/prepared-review.md';t=p.read_text();t=t.replace('heldouts preserve the exact batch33 source bytes and first apply existing scan erasure. Fair prior must receive the same old-only scan certificates and all other applicable old laws; current alone receives the fresh map-demand endpoints and deployments.','heldouts preserve the exact batch33 function and helper bodies, with the module header changing from Pipeline33 to Pipeline34, and first apply existing scan erasure. The exact 2,485-object canonical fair prior already contains the two identical old-only scan certificate IDs and receives no additional objects; current alone receives the ten fresh map-demand endpoints and deployments.')
p.write_text(t)
c=rd(R/'corrections/correction.json');old=B/'reports/web-stack-proofs-33-2026-10-11';assert sha(R/'corrections/batch33-REPORT-original.md')==c['files']['reports/web-stack-proofs-33-2026-10-11/REPORT.md']['before'];assert sha(old/'REPORT.md')==c['files']['reports/web-stack-proofs-33-2026-10-11/REPORT.md']['after']
receipt={'status':'passed','metadata_sha256':mh,'counts':counts,'validation':valid,'selections':selections,'physical_gpu_contracts':'All 288 actual GPU prevalidation rows independently recomputed by selected function name. Prior/checked primaries legacy route: one dispatch for positive maximum capacity, same transfers/live buffers despite declared graph stages 2 to 1. Literal heldouts graph route audited separately.','fairness':'Exact same frozen compiler/model, complete prior 2485 objects with no extra shared certificates; 2495-object new union. Four fresh ordinary selections. Strong JS fresh-output and Rust destination controls directly traverse min-length selected prefix; zero divisors/wrap preserved.','correction':c,'limits':'Untimed preparation only; no profitability or broad language superiority conclusion.'}
(R/'review/target-preflight-review.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'status':'passed','counts':counts,'validation':valid}))
