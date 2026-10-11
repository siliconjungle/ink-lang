"""Observed same-origin indexed zip fusion with an appended padded suffix.

Arbitrary pure total indexed mappers and paired callbacks preserve expression
order, wrapping U32 indices, and the full prefix length. The suffix contributes
no paired values. Generalized Nat offsets are proved by ordinary list induction;
initial deployment covers U32/I32/U64. All source helpers remain content-bound.
"""
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,bound,lam,law,nat,op,term,value,var
from producers.web_pipeline32_laws import chain,use,apply

PRIOR_SNAPSHOT=Path(__file__).resolve().parents[1]/'store/snapshots/6df4df9aae82d58eba9eac5e8d36b41ce37147ed5d661285903745f4c136d9e3.json'


def grouped_laws():
 supports=[];roots=[]
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

 return supports,roots


def named_laws():
 a,b=grouped_laws();return a+b


def law_roles():
 a,b=grouped_laws();return {**{n:'proof_support' for n,_ in a},**{n:'optimization_endpoint' for n,_ in b}}


def publish(output,extra=()):
 rows=named_laws()+list(extra);objects={identity(semantic_entry(v)):semantic_entry(v) for _,v in rows};names={n:identity(semantic_entry(v)) for n,v in rows}
 store=Store.publish(Path(output),objects.values(),names);store.rebuild();(store.root/'view.json').write_bytes(canonical(store.bundle(names.values()))+b'\n');return store


def source_functions(held_out=False):
 rows=[]
 for side in ('left','right'):
  name='pipeline38_'+side+'_padded_zip'+('_heldout' if held_out else '')+'_u32'
  left='xs.map_indexed(fn(i)=>fn(x)=>left_word(i,x,seed,k))'
  right='xs.map_indexed(fn(i)=>fn(x)=>right_word(i,x,seed,k))'
  if side=='left':left+='.concat(ys)'
  else:right+='.concat(ys)'
  expr=left+'.zip('+right+',fn(a)=>fn(b)=>pair_word(a,b,seed,k))'
  if held_out:
   helpers='\nfn left_word(i:u32,x:u32,seed:u32,k:u32)->u32{return left_signal(i,x,seed,k); }\nfn left_signal(i:u32,x:u32,seed:u32,k:u32)->u32{return quot_or(x,k,0)+rem_or(i,k,0)+seed;}\nfn right_word(i:u32,x:u32,seed:u32,k:u32)->u32{return right_signal(i,x,seed,k); }\nfn right_signal(i:u32,x:u32,seed:u32,k:u32)->u32{return choose(i<seed,x+k,x*3);}\nfn pair_word(a:u32,b:u32,seed:u32,k:u32)->u32{return pair_signal(a,b,seed,k); }\nfn pair_signal(a:u32,b:u32,seed:u32,k:u32)->u32{return choose(a<b,quot_or(a,k,0)+b,rem_or(b,k,0)+a);}'
  else:
   helpers='\nfn left_word(i:u32,x:u32,seed:u32,k:u32)->u32{return choose(i<seed,x+k,x-seed);}\nfn right_word(i:u32,x:u32,seed:u32,k:u32)->u32{return choose(rem_or(i,3,0)==0,x*k,x+seed);}\nfn pair_word(a:u32,b:u32,seed:u32,k:u32)->u32{return choose(a<b,a+b*k,a-b+seed);}'
  rows.append((name,'u32',f'pub fn {name}(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>'+'{return '+expr+';}'+helpers))
 return rows


def specialize(subject,core=None):
 from producers.beta_sharing17 import derive
 from producers.definition_context28 import bind
 rows=derive(subject,grouped_laws()[1])
 return [(n,bind(v,core,subject) if core is not None else v) for n,v in rows]
