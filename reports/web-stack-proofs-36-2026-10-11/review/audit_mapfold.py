"""Pinned full-catalogue alpha endpoint scout; read-only except this report lane."""
from pathlib import Path
import hashlib,json,sys
B=Path(__file__).resolve().parents[3];sys.path[:0]=[str(B/'knowledge')]
from ink_knowledge import Store,identity,canonical,semantic_entry
from producers.semantic_laws import arrow,value,var,bound,lam,op
from producers.web_fold17_laws import named_laws
R=Path(__file__).resolve().parent;pin='b7d979fd4861a1b82897f142737e9b8161f8c2946e9f7fa6514b50aefd45240b';st=Store(B/'knowledge',snapshot=B/'knowledge/store/snapshots'/f'{pin}.json');names=json.loads((B/'knowledge/store/names.json').read_text());reverse={}
for name,oid in names.items():reverse.setdefault(oid,[]).append(name)
def alpha(l):
 names={}
 def walk(v):
  if isinstance(v,dict):
   if set(v)=={'Free'}:
    names.setdefault(v['Free'],str(len(names)));return {'Free':names[v['Free']]}
   return {k:walk(v[k])for k in sorted(v)}
  if isinstance(v,list):return [walk(x)for x in v]
  return v
 return canonical(walk([l['from'],l['to']]))
rows={};count=0;fold_sources=[]
for oid in st.members():
 p=st.object(oid)['payload'];src=p.get('from',{})
 if not isinstance(src,dict) or 'node'not in src:continue
 count+=1;rows[oid]=p
 n=src['node']
 if isinstance(n,dict)and n.get('Op',[None])[0]=='call:foldr':
  a=n['Op'][1][0]['node']
  if isinstance(a,dict)and a.get('Op',[None])[0]=='method:map':fold_sources.append({'id':oid,'names':reverse.get(oid,[]),'parameters':p.get('params',{}),'callback_node':n['Op'][1][2]['node']})
results=[]
for t in ['U32','I32','U64','F32']:
 s,ls=value(t),value({'List':t});un=arrow(s,s);bi=arrow(s,un);xs,z,f,h=var(ls,'sequence'),var(s,'initial'),var(un,'mapper'),var(bi,'accumulator')
 apply=lambda f,x:op(f['sort']['Arrow'][1],'apply',f,x)
 source=op(s,'call:foldr',op(ls,'method:map',xs,f),z,h)
 target=op(s,'call:foldr',xs,z,lam(s,lam(s,apply(apply(h,apply(f,bound(s,1))),bound(s,0)))))
 candidate={'from':source,'to':target};matches=[]
 for oid,p in rows.items():
  if alpha(p)==alpha(candidate):matches.append({'id':oid,'names':reverse.get(oid,[]),'direction':'forward'})
  if alpha({'from':p['to'],'to':p['from']})==alpha(candidate):matches.append({'id':oid,'names':reverse.get(oid,[]),'direction':'reverse'})
 expected=next(l for n,l in named_laws()if n=='mapped_arbitrary_fold_'+t.lower());eid=identity(semantic_entry(expected));assert eid in st.members()and any(x['id']==eid for x in matches)
 results.append({'type':t,'candidate_is_novel':False,'matches':matches,'existing_generic_id':eid,'existing_proof':expected['proof'],'existing_conditions':expected['conditions']})
all17=[]
for n,l in named_laws():
 oid=identity(semantic_entry(l));assert oid in st.members();all17.append({'name':n,'id':oid,'current_discovery_names':reverse.get(oid,[])})
assert len(st.members())==2508
out={'status':'candidate_duplicate','snapshot':pin,'objects_audited':2508,'semantic_pairs_audited':count,'candidate_forms':results,'all12_existing_plain_prefix_concat_endpoints':all17,'mapped_fold_root_shapes':fold_sources,'conclusion':'Same-type arbitrary pure map→ordered foldr fusion is already canonical for U32/I32/U64/F32. Do not publish a renamed generic duplicate. A novel source-content-bound bridge or a genuinely different semantic/source shape needs separate prior automatic selection and novelty checks.','core_typing_limit':'call:foldr requires input element, initial, accumulator and result to be the same numeric type. A mixed mapper/input/result sort fusion cannot simply use current foldr on the original differently typed list.','bindings':{f:hashlib.sha256((B/f).read_bytes()).hexdigest()for f in ['knowledge/producers/web_fold17_laws.py','knowledge/producers/web_fold16_laws.py','core/src/semantic.rs','lowerings/gpu/src/compute_graph.rs','lowerings/gpu/src/compute.rs','lowerings/rust/src/pure_rust.rs']},'scope':'Alpha-normalized forward/reverse endpoint scan of all canonical semantic rewrites; no global nonderivability, backend correctness, or profitability claim.'}
(R/'mapfold-catalogue-audit.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'status':out['status'],'objects':2508,'semantic_pairs':count,'existing_generic_ids':{x['type']:x['existing_generic_id']for x in results},'direct_mapped_fold_roots':len(fold_sources),'all12_old17_endpoints_present':True}))
