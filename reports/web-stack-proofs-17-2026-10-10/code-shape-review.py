"""Read-only generated-source audit; does not compile or execute workloads."""
from pathlib import Path
import hashlib,json,re
HERE=Path(__file__).resolve().parent
KINDS=('baseline','prior','checked')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def block(text,start):
 opening=text.index('{',start);level=0
 for i in range(opening,len(text)):
  if text[i]=='{':level+=1
  elif text[i]=='}':
   level-=1
   if not level:return text[opening+1:i]
 raise ValueError('unclosed generated function')
def root_js(t):return block(t,t.index('function __fn0('))
def root_c(t,name):
 m=re.search(r'lang_fn_'+re.escape(name)+r'\([^;]*?\)\s*\{',t)
 if not m:raise ValueError('missing C function '+name)
 return block(t,m.start())
def inspect(name,kind):
 folder=HERE/kind/name;js=folder/'program.mjs';c=folder/'cpu.c';manifest=folder/'manifest.json'
 if not all(p.exists() for p in [js,c,manifest]):return None
 jt=js.read_text();ct=c.read_text();jb=root_js(jt);cb=root_c(ct,name);m=json.loads(manifest.read_text())
 calls={k:len(re.findall(r'\b'+re.escape(k)+r'\(',jb)) for k in ['__map','__zip','__concat','__foldr']}
 helpers={}
 for helper,n in calls.items():
  if n:
   body=block(jt,jt.index('function '+helper+'('));helpers[helper]=dict(calls=n,allocation_sites=body.count('new Array('),loop_sites=len(re.findall(r'\bfor\s*\(',body)),body_sha256=hashlib.sha256(body.encode()).hexdigest())
 js_alloc=sum(v['calls']*v['allocation_sites'] for v in helpers.values())+jb.count('new Array(')
 js_loops=sum(v['calls']*v['loop_sites'] for v in helpers.values())+len(re.findall(r'\bfor\s*\(',jb))
 bridge=ct[ct.index('void ink_compute_call('):] if 'void ink_compute_call(' in ct else ct[ct.index('uint64_t ink_cpu_call('):]
 core=HERE/'tasks'/name/f'{"checked" if kind=="checked" else kind}-selected.core.json'
 if kind=='baseline':core=HERE/'tasks'/name/'core.json'
 ast=json.loads(core.read_text())['program']['functions'][0]['body'] if core.exists() else None
 def count_key(v,key):
  if isinstance(v,dict):return int(key in v)+sum(count_key(x,key) for x in v.values())
  if isinstance(v,list):return sum(count_key(x,key) for x in v)
  return 0
 return dict(kind=kind,function=name,manifest_schema=m['schema'],artifact_sha256={str(p.relative_to(HERE)):sha(p) for p in [js,c,manifest]+([core] if core.exists() else [])},javascript=dict(helper_calls=calls,helpers=helpers,collection_allocation_sites_per_call=js_alloc,collection_loop_sites_per_call=js_loops,local_const_bindings=len(re.findall(r'\bconst v\d+\s*=',jb)),iife_sites=jb.count('(()=>'),imul_calls=jb.count('Math.imul('),root_body=jb),c=dict(root_collection_allocation_sites=cb.count('ink_alloc(')+cb.count('lang_allocate('),root_loop_sites=len(re.findall(r'\bfor\s*\(',cb)),root_copy_calls=cb.count('ink_copy('),scalar_bridge_allocation_sites=bridge.count('ink_alloc('),root_body=cb),selected_ast_let_nodes=count_key(ast,'Let') if ast is not None else None,c_loop_headers=re.findall(r'for\s*\(([^)]*)\)',cb))
def main():
 spec=json.loads((HERE/'spec.json').read_text());names=[t['name'] for t in spec['tasks']];rows=[];missing=[]
 for name in names:
  for kind in KINDS:
   row=inspect(name,kind)
   if row is None:missing.append(kind+'/'+name)
   else:rows.append(row)
 result=dict(schema=1,status='source audit complete' if not missing and (HERE/'metadata.json').exists() else 'partial; preparation ongoing',task_count=len(names),records=rows,missing=missing,scope='Static generated-function allocation/loop/copy sites. No execution, compilation, timing, host capture cost, JIT behavior or allocation byte measurements. Scalar packed bridge counted separately.',metadata_sha256=sha(HERE/'metadata.json') if (HERE/'metadata.json').exists() else None,auditor_sha256=sha(Path(__file__)))
 if not missing and (HERE/'metadata.json').exists():
  metadata=json.loads((HERE/'metadata.json').read_text())
  result['pins']={k:metadata[k] for k in ['compiler_sha256','prior_snapshot','effective_prior_snapshot','new_snapshot','cost_model_sha256','gpu_cost_model_sha256','planner_policy_sha256']}
  result['metadata_bound_source_checks']=[]
  for row in rows:
   for path,actual in row['artifact_sha256'].items():
    expected=metadata['artifact_hashes'].get(path)
    if expected is not None:
     if actual!=expected:raise ValueError('frozen artifact changed '+path)
     result['metadata_bound_source_checks'].append(path)
  result['totals']={kind:dict(js_collection_allocations=sum(r['javascript']['collection_allocation_sites_per_call'] for r in rows if r['kind']==kind),js_loop_sites=sum(r['javascript']['collection_loop_sites_per_call'] for r in rows if r['kind']==kind),c_collection_allocations=sum(r['c']['root_collection_allocation_sites'] for r in rows if r['kind']==kind),c_loop_sites=sum(r['c']['root_loop_sites'] for r in rows if r['kind']==kind),c_copy_calls=sum(r['c']['root_copy_calls'] for r in rows if r['kind']==kind),scalar_bridge_allocation_sites=sum(r['c']['scalar_bridge_allocation_sites'] for r in rows if r['kind']==kind)) for kind in KINDS}
  reviewed=[]
  for row in rows:
   if row['kind']!='checked':continue
   name=row['function'];j=row['javascript'];c=row['c']
   if name.startswith('independent_'):
    assert j['helper_calls']==dict(__map=0,__zip=1,__concat=0,__foldr=0)
    assert '(a0.len < a1.len ? a0.len : a1.len)' in c['root_body']
    assert c['root_collection_allocation_sites']==1 and c['root_loop_sites']==1
    finding='one fresh min(nx,ny) result; no intermediate arrays'
   else:
    assert j['collection_allocation_sites_per_call']==c['root_collection_allocation_sites']==0
    assert j['helper_calls']['__map']==j['helper_calls']['__concat']==0
    if name.startswith(('mapped_prefix_','mapped_concat_')):
     assert len(row['c_loop_headers'])==2 and '=a1.len;' in row['c_loop_headers'][0] and '=a0.len;' in row['c_loop_headers'][1]
     assert '__foldr(v0,__foldr(v1,' in j['root_body']
     finding='reverse suffix before reverse prefix; accumulator carried between loops'
    else:
     assert len(row['c_loop_headers'])==1 and '=a0.len;' in row['c_loop_headers'][0]
     finding='one reverse fold over xs; unused ys is not traversed by compute'
   assert not re.search(r'a[01]\.data\[[^]]+\]\s*=',c['root_body'])
   reviewed.append(dict(function=name,finding=finding,let_nodes=row['selected_ast_let_nodes'],js_iifes=j['iife_sites'],scalar_bridge_allocations=c['scalar_bridge_allocation_sites']))
  result['checked_function_findings']=reviewed
 (HERE/'code-shape-review.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(dict(status=result['status'],records=len(rows),missing=len(missing))))
if __name__=='__main__':main()
