from pathlib import Path
import sys,json,subprocess
B=Path(__file__).resolve().parents[3]
sys.path[:0]=[str(B/'knowledge'),str(B/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,bound,lam,law,nat,op,term,value,var
from producers.web_pipeline32_laws import chain,use,apply
from tests.test_web_pipeline32_laws import alpha
R=Path(__file__).resolve().parent
prior=Store(B/'knowledge',snapshot=B/'knowledge/store/snapshots/6df4df9aae82d58eba9eac5e8d36b41ce37147ed5d661285903745f4c136d9e3.json')
assert len(prior.members())==2534
supports=[];roots=[];plain=[]
for t in ('U32','I32','U64'):
 s,ls=value(t),value({'List':t});index=value('U32');un=arrow(s,s);ix=arrow(index,un);bi=arrow(s,un)
 xs,ys=var(ls,'xs'),var(ls,'ys');f,g,h=var(ix,'f'),var(ix,'g'),var(bi,'h');tail=var(ls,'tail');head=var(s,'head');n=var('Nat','n')
 indexed=lambda a,start,fn:op(ls,'indexed.from',a,start,fn)
 combine=lambda i,x:apply(apply(h,apply(apply(f,i),x)),apply(apply(g,i),x))
 fused=lam(index,lam(s,combine(bound(index,1),bound(s,0))))
 for side in ('left','right'):
  params=dict(xs=ls,ys=ls,f=ix,g=ix,h=bi)
  def source(a,start):
   l,r=indexed(a,start,f),indexed(a,start,g)
   if side=='left':l=op(ls,'method:concat',l,ys)
   else:r=op(ls,'method:concat',r,ys)
   return op(ls,'method:zip',l,r,h)
  target=lambda a,start:indexed(a,start,fused)
  function=lambda a,selected:lam('Nat',(target if selected else source)(a,bound('Nat',0)))
  transport=law(dict(params,n='Nat'),source(xs,n),apply(function(xs,False),n));tid=identity(semantic_entry(transport));supports.append((side+'_padded_indexed_beta_'+t.lower(),transport))
  start=var('Nat','__congruence');nxt=op('Nat','nat.succ',start);out=combine(op(index,'nat.word',start),head)
  cons=lambda rest:term(ls,{'Cons':[out,rest]})
  a0=cons(source(tail,nxt));a1=cons(apply(function(tail,False),nxt));a2=cons(apply(function(tail,True),nxt))
  step=chain(a0,'Normalize',chain(a1,{'Congruence':['Normalize',use(tid,xs=tail,ys=ys,n=nxt,f=f,g=g,h=h)]},chain(a2,{'Congruence':['Normalize',{'Congruence':[{'Hypothesis':0},'Normalize']}]},'Normalize')))
  functional={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step={'Congruence':[step]})}
  a,b=apply(function(xs,False),nat(0)),apply(function(xs,True),nat(0));proof=chain(a,'Normalize',chain(b,{'Congruence':[functional,'Normalize']},'Normalize'))
  l,r=op(ls,'method:map_indexed',xs,f),op(ls,'method:map_indexed',xs,g)
  if side=='left':l=op(ls,'method:concat',l,ys)
  else:r=op(ls,'method:concat',r,ys)
  roots.append((side+'_padded_indexed_zip_'+t.lower(),law(params,op(ls,'method:zip',l,r,h),op(ls,'method:map_indexed',xs,fused),proof,dependencies=[tid])))
  pf,pg=var(un,'f'),var(un,'g');pl,pr=op(ls,'method:map',xs,pf),op(ls,'method:map',xs,pg)
  if side=='left':pl=op(ls,'method:concat',pl,ys)
  else:pr=op(ls,'method:concat',pr,ys)
  targetplain=op(ls,'method:map',xs,lam(s,apply(apply(h,apply(pf,bound(s,0))),apply(pg,bound(s,0)))))
  plain.append((side+'_padded_plain_mapped_zip_'+t.lower(),law(dict(xs=ls,ys=ls,f=un,g=un,h=bi),op(ls,'method:zip',pl,pr,h),targetplain,{'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step='Normalize')})))
rows=supports+roots+plain
candidates={alpha(v):n for n,v in rows};dups=[];count=0
for oid in prior.members():
 v=prior.object(oid)['payload']
 if not isinstance(v.get('from'),dict) or 'node' not in v['from']:continue
 count+=1
 for direction,q in [('forward',v),('reverse',dict(v,**{'from':v['to'],'to':v['from']}))]:
  if alpha(q) in candidates:dups.append(dict(candidate=candidates[alpha(q)],id=oid,direction=direction))
report=dict(prior_snapshot=prior.snapshot_id,entries=len(prior.members()),semantic_pairs=count,candidates=len(rows),duplicates=dups,rows=[dict(name=n,id=identity(semantic_entry(v))) for n,v in rows]);(R/'padded-catalogue-scout.json').write_text(json.dumps(report,indent=2)+'\n')
store=Store.publish(R/'padded-prototype-store',[semantic_entry(v) for _,v in rows],{n:identity(semantic_entry(v)) for n,v in rows});view=store.root/'view.json';view.write_bytes(canonical(store.bundle([identity(semantic_entry(v)) for _,v in rows]))+b'\n')
C=B/'reports/web-stack-proofs-32-2026-10-11/main-integration/ink-main-publish';dummy=B/'reports/web-stack-proofs-32-2026-10-11/proofs/dummy.core.json';p=subprocess.run([str(C),'knowledge-check',str(dummy),str(view)],capture_output=True,text=True);report['admission']=dict(exit_code=p.returncode,stdout=p.stdout,stderr=p.stderr);(R/'padded-catalogue-scout.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));raise SystemExit(p.returncode)
