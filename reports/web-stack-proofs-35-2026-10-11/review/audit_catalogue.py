from pathlib import Path
from ink_knowledge import Store,identity
from producers.semantic_laws import arrow,value,op,var,lam,bound
import json
R=Path(__file__).resolve().parent;B=R.parents[2];st=Store(B/'knowledge',snapshot=B/'knowledge/store/snapshots/7cf9b7ec48a8edd25b05951b8e424ea26444467fc176257aa34ac5a8e40aa644.json');entries=[(oid,st.object(oid)) for oid in st.members()];names=json.loads((B/'knowledge/store/names.json').read_text());rev={}
for n,i in names.items():rev.setdefault(i,[]).append(n)
def map_(xs,f):return op(xs['sort'],'method:map',xs,f)
def ap(f,x):return op(f['sort']['Arrow'][1],'apply',f,x)
candidates=[]
for t in ['U32','I32','U64','F32']:
 s,ls=value(t),value({'List':t});u=arrow(s,s);bi=arrow(s,u);xs,ys=var(ls,'xs'),var(ls,'ys');f,r,h=var(u,'f'),var(u,'r'),var(bi,'h')
 for family in ['left','right','both']:
  src=op(ls,'method:zip',map_(xs,f)if family!='right'else xs,map_(ys,r)if family!='left'else ys,h)
  a,b=bound(s,1),bound(s,0)
  combined=ap(ap(h,ap(f,a)if family!='right'else a),ap(r,b)if family!='left'else b)
  tgt=op(ls,'method:zip',xs,ys,lam(s,lam(s,combined)))
  matches=[]
  for oid,e in entries:
   p=e['payload']
   if p.get('from')==src and p.get('to')==tgt:matches.append({'id':oid,'names':rev.get(oid,[])})
  candidates.append({'name':family+'_'+t.lower(),'exact_pair_matches':matches,'from_sha256':identity(src),'to_sha256':identity(tgt)})
spines=[]
for oid,e in entries:
 p=e['payload'];src=p.get('from',{});
 if not isinstance(src,dict):continue
 n=src.get('node',{});
 if not isinstance(n,dict) or n.get('Op',[None])[0]!='method:zip':continue
 args=n['Op'][1];mapped=[];bases=[]
 for i,a in enumerate(args[:2]):
  an=a['node']
  if isinstance(an,dict) and an.get('Op',[None])[0]=='method:map':mapped.append(i);bases.append(an['Op'][1][0])
  else:bases.append(a)
 if mapped and all(isinstance(a['node'],dict) and 'Free' in a['node'] for a in bases) and bases[0]['node']!=bases[1]['node']:
  spines.append({'id':oid,'names':rev.get(oid,[]),'mapped_sides':mapped,'callback_node':args[2]['node']})
out={'status':'passed','prior_snapshot':st.snapshot_id,'prior_objects':len(entries),'direct_candidates':candidates,'root_independent_mapzip_spines':spines,'scope':'Exact typed endpoint pair equality only, not alpha-equivalence or global nonderivability. Generic typed candidates use existing parameter naming; old17 postmap laws derive the candidate.'};assert len(entries)==2495 and not any(c['exact_pair_matches']for c in candidates);(R/'catalogue-direct-mapzip-audit.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'snapshot':st.snapshot_id,'objects':len(entries),'candidate_count':len(candidates),'exact_pair_duplicates':0,'root_spines':len(spines),'names':[x['names'] for x in spines]}))
