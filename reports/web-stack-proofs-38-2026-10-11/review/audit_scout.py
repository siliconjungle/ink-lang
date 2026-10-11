from pathlib import Path
import sys,json,hashlib,collections
R=Path(__file__).resolve().parents[1];B=R.parents[1];sys.path.insert(0,str(B/'knowledge'))
from ink_knowledge import Store,canonical
from producers.semantic_laws import value,arrow,var,lam,bound,op
st=Store(B/'knowledge',snapshot=B/'knowledge/store/snapshots/6df4df9aae82d58eba9eac5e8d36b41ce37147ed5d661285903745f4c136d9e3.json');assert len(st.members())==2534
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
 s,ls,ix=value(t),value({'List':t}),value('U32');un=arrow(s,s);bi=arrow(s,un);isort=arrow(ix,un);xs,ys=var(ls,'xs'),var(ls,'ys');n=var('Nat','n');h=var(bi,'h');apply=lambda fn,x:op(fn['sort']['Arrow'][1],'apply',fn,x)
 for kind in ['indexed_public','indexed_nat_state','plain_map']:
  fs=isort if kind!='plain_map'else un;f,g=var(fs,'f'),var(fs,'g')
  mapper=lambda fun:op(ls,'method:map',xs,fun)if kind=='plain_map'else(op(ls,'method:map_indexed',xs,fun)if kind=='indexed_public'else op(ls,'indexed.from',xs,n,fun))
  a,b=mapper(f),mapper(g);index,item=bound(ix,1),bound(s,0)
  combined=apply(apply(h,apply(f,item)if kind=='plain_map'else apply(apply(f,index),item)),apply(g,item)if kind=='plain_map'else apply(apply(g,index),item))
  fused=lam(s,combined)if kind=='plain_map'else lam(ix,lam(s,combined));target=mapper(fused)
  for side in ['left','right']:
   concat=lambda v:op(ls,'method:concat',v,ys);source=op(ls,'method:zip',concat(a)if side=='left'else a,b if side=='left'else concat(b),h)
   candidates.append({'family':side+'_padded_'+kind+'_'+t.lower(),'matches':pairs.get(alpha(source,target),[]),'from':source,'to':target})
assert all(not x['matches']for x in candidates)
out={'status':'novel_direct_endpoints','snapshot':st.snapshot_id,'catalogue_objects':2534,'semantic_endpoint_objects_scanned':total,'indexed_public_candidates':8,'indexed_nat_state_candidates':8,'plain_map_candidates':8,'alpha_forward_reverse_duplicates':0,'candidates':candidates,'related_indexed_objects':related,'script_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(R/'review/padded-indexed-scout.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items()if k not in ['candidates','related_indexed_objects']}))
