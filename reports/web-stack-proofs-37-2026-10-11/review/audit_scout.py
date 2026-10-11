from pathlib import Path
import sys,json,hashlib,collections
R=Path(__file__).resolve().parents[1];B=R.parents[1];sys.path.insert(0,str(B/'knowledge'))
from ink_knowledge import Store,canonical
from producers.semantic_laws import value,arrow,var,lam,bound,op
st=Store(B/'knowledge',snapshot=B/'knowledge/store/snapshots/7f5e7a94b49db567af55f5d1129dd07c5e2b469ebd45cb6e5cbc53595782b2be.json');assert len(st.members())==2512
names=json.loads((st.data/'names.json').read_text());reverse=collections.defaultdict(list)
for n,h in names.items():reverse[h].append(n)
def alpha(a,b):
 rename={}
 def go(v):
  if isinstance(v,dict):
   if set(v)=={'Free'}:rename.setdefault(v['Free'],str(len(rename)));return {'Free':rename[v['Free']]}
   return {k:go(v[k])for k in sorted(v)}
  if isinstance(v,list):return [go(x)for x in v]
  return v
 return canonical(go([a,b]))
pairs=collections.defaultdict(list);related=[];total=0
for oid in st.members():
 p=st.object(oid)['payload']
 if not isinstance(p.get('from'),dict)or'node'not in p['from']:continue
 total+=1;pairs[alpha(p['from'],p['to'])].append(oid);pairs[alpha(p['to'],p['from'])].append(oid)
 text=canonical([p['from'],p['to']]).decode()
 if 'method:map_indexed'in text or'indexed.from'in text:
  related.append({'id':oid,'names':reverse[oid],'zip':'method:zip'in text,'scan':'method:scan'in text,'count':'call:count'in text,'choose':'call:choose'in text,'from':p['from'],'to':p['to']})
candidates=[]
for t in ['U32','I32','U64','F32']:
 s,ls,ix=value(t),value({'List':t}),value('U32');f=var(arrow(ix,arrow(s,s)),'f');g=var(arrow(s,s),'g');xs,ys=var(ls,'xs'),var(ls,'ys');n=var('Nat','n');apply=lambda fn,x:op(fn['sort']['Arrow'][1],'apply',fn,x)
 for side in ['left','right']:
  cb=lam(s,lam(s,apply(g,bound(s,0 if side=='left'else 1))))
  zip=lambda a,b:op(ls,'method:zip',a,b,cb)
  for kind in ['public','nat_state']:
   indexed=op(ls,'method:map_indexed',xs,f)if kind=='public'else op(ls,'indexed.from',xs,n,f)
   a=zip(indexed,ys)if side=='left'else zip(ys,indexed);b=zip(xs,ys)if side=='left'else zip(ys,xs)
   candidates.append({'family':'independent_'+side+'_indexed_projection_'+kind+'_'+t.lower(),'matches':pairs.get(alpha(a,b),[]),'from':a,'to':b})
assert all(not x['matches']for x in candidates)
out={'status':'novel_direct_endpoints','snapshot':st.snapshot_id,'catalogue_objects':2512,'semantic_endpoint_objects_scanned':total,'candidate_public_endpoints':8,'candidate_nat_state_endpoints':8,'alpha_forward_reverse_duplicates':0,'candidates':candidates,'related_indexed_objects':related,'source_backend_risk':'No new core lowering required for projection erasure: target uses existing independent zip only. F32 does not reassociate observed arithmetic; erased pure callback result is unobserved. Index wrapping must be retained in support proof even though callback outputs erase.','script_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(R/'review/indexed-projection-scout.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items()if k not in ['candidates','related_indexed_objects']}));print('Indexed roots with zip:',[(x['id'],x['names'][:2])for x in related if x['zip']])
