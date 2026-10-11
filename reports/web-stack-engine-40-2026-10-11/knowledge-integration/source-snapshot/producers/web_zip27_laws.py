#!/usr/bin/env python3
"""Aligned independent-list nested zip fusion under pure total callbacks.

These standard fusion identities preserve min-length truncation and each scalar
expression's exact grouping. They change callback scheduling and remove one
intermediate list. The small kernel checks ordinary functional list induction.
"""
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,bound,lam,law,op,value,var,term

def grouped_laws():
 rows=[];supports=[]
 for t in ('U32','I32','U64','F32'):
  s,ls=value(t),value({'List':t});un=arrow(s,s);bi=arrow(s,un)
  xs,ys=var(ls,'xs'),var(ls,'ys');h,g=var(bi,'h'),var(bi,'g')
  def ap(fn,arg):return op(fn['sort']['Arrow'][1],'apply',fn,arg)
  def mapped(seq,fn):return op(ls,'method:map',seq,fn)
  for family in ('left','right'):
   def combine(a,b):return ap(ap(g,ap(ap(h,a),b)),a if family=='left' else b)
   zipper=lam(s,lam(s,combine(bound(s,1),bound(s,0))))
   def source(a,b):return op(ls,'method:zip',op(ls,'method:zip',a,b,h),a if family=='left' else b,g)
   def target(a,b):return op(ls,'method:zip',a,b,zipper)
   def function(a,selected):return lam(ls,(target if selected else source)(a,bound(ls,0)))
   tx,ty=var(ls,'tail_x'),var(ls,'tail_y');hx,hy=var(s,'head_x'),var(s,'head_y')
   cons=lambda a,b:term(ls,{'Cons':[a,b]})
   a1=cons(combine(hx,hy),ap(function(tx,False),ty));a2=cons(combine(hx,hy),ap(function(tx,True),ty))
   params=dict(xs=ls,ys=ls,h=bi,g=bi)
   transport=law(params,source(xs,ys),ap(function(xs,False),ys))
   transport_id=identity(semantic_entry(transport))
   supports.append(('aligned_'+family+'_nested_zip_beta_transport_'+t.lower(),transport))
   arguments={n:var(sort,n) for n,sort in params.items()};arguments.update(xs=tx,ys=ty)
   use={'Use':dict(law=transport_id,arguments=dict(sorted(arguments.items())),premises=[])}
   a0=cons(combine(hx,hy),source(tx,ty))
   innerstep={'Trans':dict(middle=a0,left='Normalize',right={'Trans':dict(middle=a1,left={'Congruence':['Normalize',use]},right={'Trans':dict(middle=a2,left={'Congruence':['Normalize',{'Congruence':[{'Hypothesis':0},'Normalize']}]},right='Normalize')})})}
   functionalproof={'Induction':dict(variable='xs',names=['head_x','tail_x'],base='Normalize',step={'Congruence':[{'Induction':dict(variable='__congruence',names=['head_y','tail_y'],base='Normalize',step=innerstep)}]})}
   a=ap(function(xs,False),ys);b=ap(function(xs,True),ys)
   proof={'Trans':dict(middle=a,left='Normalize',right={'Trans':dict(middle=b,left={'Congruence':[functionalproof,'Normalize']},right='Normalize')})}
   params=dict(xs=ls,ys=ls,h=bi,g=bi)
   rows.append(('aligned_'+family+'_nested_zip_'+t.lower(),law(params,source(xs,ys),target(xs,ys),proof,dependencies=[transport_id])))
 return supports,rows

def named_laws():
 supports,roots=grouped_laws();return supports+roots

def law_roles():
 supports,roots=grouped_laws();return {**{n:'proof_support' for n,_ in supports},**{n:'optimization_endpoint' for n,_ in roots}}

def specialize(subject):
 from producers.beta_sharing17 import derive
 return derive(subject,grouped_laws()[1])

def source_functions(held_out=False):
 rows=[]
 for t in ('u32','i32','u64','f32'):
  for side in ('left','right'):
   name='aligned_'+side+'_pair_'+t+('_heldout' if held_out else '')
   h='fn(a)=>fn(b)=>choose(a<seed,a+b*k,a-b)' if not held_out else 'fn(a)=>fn(b)=>choose(b>seed,a*b+k,a+b)'
   g='fn(v)=>fn(x)=>choose(v<seed,v+x*k,v-x)' if not held_out else 'fn(v)=>fn(x)=>choose(x<k,v*k+x,v+x*seed)'
   other='xs' if side=='left' else 'ys'
   source=f'pub fn {name}(xs:List<{t}>,ys:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.zip(ys,{h}).zip({other},{g});}}'
   rows.append((name,t,source))
 return rows
