#!/usr/bin/env python3
"""Untrusted independent-list mapped zip/postmap fusion, pure total callbacks."""
import argparse,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,bound,lam,law,op,value,var,term

def grouped_laws():
 rows=[];supports=[]
 for t in ('U32','I32','U64','F32'):
  s,ls=value(t),value({'List':t});un=arrow(s,s);bi=arrow(s,un)
  xs,ys=var(ls,'xs'),var(ls,'ys');f,r,h,g=var(un,'f'),var(un,'r'),var(bi,'h'),var(un,'g')
  def ap(fn,arg):return op(fn['sort']['Arrow'][1],'apply',fn,arg)
  def mapped(seq,fn):return op(ls,'method:map',seq,fn)
  for family in ('left','right','both'):
   left=lambda seq:mapped(seq,f) if family in ('left','both') else seq
   right=lambda seq:mapped(seq,r) if family in ('right','both') else seq
   def combine(a,b):return ap(g,ap(ap(h,ap(f,a) if family in ('left','both') else a),ap(r,b) if family in ('right','both') else b))
   zipper=lam(s,lam(s,combine(bound(s,1),bound(s,0))))
   def source(a,b):return mapped(op(ls,'method:zip',left(a),right(b),h),g)
   def target(a,b):return op(ls,'method:zip',a,b,zipper)
   def function(a,selected):return lam(ls,(target if selected else source)(a,bound(ls,0)))
   tx,ty=var(ls,'tail_x'),var(ls,'tail_y');hx,hy=var(s,'head_x'),var(s,'head_y')
   cons=lambda a,b:term(ls,{'Cons':[a,b]})
   a1=cons(combine(hx,hy),ap(function(tx,False),ty));a2=cons(combine(hx,hy),ap(function(tx,True),ty))
   params=dict(xs=ls,ys=ls,h=bi,g=un)
   if family in ('left','both'):params['f']=un
   if family in ('right','both'):params['r']=un
   transport=law(params,source(xs,ys),ap(function(xs,False),ys))
   transport_id=identity(semantic_entry(transport))
   supports.append(('independent_'+family+'_zip_beta_transport_'+t.lower(),transport))
   arguments={n:var(sort,n) for n,sort in params.items()};arguments.update(xs=tx,ys=ty)
   use={'Use':dict(law=transport_id,arguments=dict(sorted(arguments.items())),premises=[])}
   a0=cons(combine(hx,hy),source(tx,ty))
   innerstep={'Trans':dict(middle=a0,left='Normalize',right={'Trans':dict(middle=a1,left={'Congruence':['Normalize',use]},right={'Trans':dict(middle=a2,left={'Congruence':['Normalize',{'Congruence':[{'Hypothesis':0},'Normalize']}]},right='Normalize')})})}
   functionalproof={'Induction':dict(variable='xs',names=['head_x','tail_x'],base='Normalize',step={'Congruence':[{'Induction':dict(variable='__congruence',names=['head_y','tail_y'],base='Normalize',step=innerstep)}]})}
   a=ap(function(xs,False),ys);b=ap(function(xs,True),ys)
   proof={'Trans':dict(middle=a,left='Normalize',right={'Trans':dict(middle=b,left={'Congruence':[functionalproof,'Normalize']},right='Normalize')})}
   params=dict(xs=ls,ys=ls,h=bi,g=un)
   if family in ('left','both'):params['f']=un
   if family in ('right','both'):params['r']=un
   rows.append(('independent_'+family+'_mapped_zip_postmap_'+t.lower(),law(params,source(xs,ys),target(xs,ys),proof,dependencies=[transport_id])))
 return supports,rows

def named_laws():
 support,optimization=grouped_laws();return support+optimization

def specialize(subject):
 # Offline author selection of complete independent-list fusion certificates.
 # derive() may also propose partial one-sided stages or beta identity entries.
 from producers.beta_specialization15 import derive
 rows=derive(subject,grouped_laws()[1]);result=[]
 for name,candidate in rows:
  node=candidate['to']['node']
  if not isinstance(node,dict) or 'Op' not in node:continue
  operation,args=node['Op']
  if operation=='method:zip' and all(isinstance(a['node'],dict) and 'Free' in a['node'] for a in args[:2]):result.append((name,candidate))
 return result

def source_functions(held_out=False):
 rows=[]
 for name,_ in grouped_laws()[1]:
  t=name.rsplit('_',1)[1];family=name.split('_')[1]
  fm='fn(x)=>choose(x<seed,seed-x,x-seed)' if held_out else 'fn(x)=>x*3+seed'
  rm='fn(y)=>y*y+k' if held_out else 'fn(y)=>y+k'
  hm='fn(a)=>fn(b)=>choose(a<seed,a+b*k,a-b)' if held_out else 'fn(a)=>fn(b)=>a-b*k'
  gm='fn(z)=>z*k+seed' if held_out else 'fn(z)=>z+seed'
  left='xs'+('.map('+fm+')' if family in ('left','both') else '')
  right='ys'+('.map('+rm+')' if family in ('right','both') else '')
  body=left+'.zip('+right+','+hm+').map('+gm+')'
  rows.append((name,f'pub fn {name}(xs:List<{t}>,ys:List<{t}>,seed:{t},k:{t})->List<{t}>{{return {body};}}'))
 return rows

def publish(output):
 named=named_laws();names={n:identity(semantic_entry(l)) for n,l in named};st=Store.publish(output,[semantic_entry(l) for _,l in named],names);st.rebuild();Path(output,'view.json').write_bytes(canonical(st.bundle(sorted(names.values())))+b'\n');manifest=dict(schema=1,laws=len(named),snapshot=st.snapshot_id,names=names);Path(output,'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');return st,manifest
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output-store',type=Path,required=True);print(json.dumps(publish(p.parse_args().output_store)[1]))
