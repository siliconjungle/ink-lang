#!/usr/bin/env python3
"""Independent callback complementary partitions fused into one word fold."""
import argparse,copy,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,binary,bound,lam,law,op,term,value,var,word


def named_laws():
 rows=[]
 for t in ('U32','I32','U64'):
  s,ls,b=value(t),value({'List':t}),value('Bool');un,ps=arrow(s,s),arrow(s,b)
  xs,f,g,p=var(ls,'xs'),var(un,'f'),var(un,'g'),var(ps,'p');k,d=var(s,'k'),var(s,'d')
  ap=lambda fn,x:op(fn['sort']['Arrow'][1],'apply',fn,x)
  negative=lam(s,op(b,'binary:==',ap(p,bound(s,0)),term(b,{'Bool':False})))
  total=lambda pred,callback:op(s,'call:sum',op(ls,'method:map',op(ls,'method:filter',xs,pred),callback))
  first,second=total(p,f),total(negative,g);x,a=bound(s,1),bound(s,0)
  fx,gx=ap(f,x),ap(g,x)
  induction={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step={'Cases':dict(condition=ap(p,var(s,'head')),on_false='Normalize',on_true='Normalize')})}
  for family,source,yes,no,extra in [
   ('partition_dual_add',binary('+',first,second),fx,gx,{}),
   ('partition_dual_subtract',binary('-',first,second),fx,binary('-',word(t,0),gx),{}),
   ('partition_dual_weighted',binary('+',binary('*',first,k),binary('*',second,d)),binary('*',fx,k),binary('*',gx,d),{'k':s,'d':s}),
  ]:
   contribution=op(s,'call:choose',ap(p,x),yes,no)
   target=op(s,'call:foldr',xs,word(t,0),lam(s,lam(s,binary('+',contribution,a))))
   rows.append((family+'_'+t.lower(),law(dict(xs=ls,f=un,g=un,p=ps,**extra),source,target,{'Sym':induction})))
 return rows


def source_functions(heldout=False,t=None):
 rows=[]
 for name,_ in named_laws():
  typ=name.rsplit('_',1)[1]
  if t and t!=typ:continue
  predicate='x>k' if heldout else 'x<seed'
  first='choose(x>seed,x-seed,seed-x)*3' if heldout else 'quot_or(x+seed,k,seed)'
  second='quot_or(x*k+seed,seed,k)' if heldout else 'choose(x<k,k-x,x-k)+seed'
  a=f'sum(xs.filter(fn(x)=>{predicate}).map(fn(x)=>{first}))';b=f'sum(xs.filter(fn(x)=>({predicate})==false).map(fn(x)=>{second}))'
  body=f'{a}*k+{b}*3' if 'weighted' in name else f'{a}-{b}' if 'subtract' in name else f'{a}+{b}'
  exported=name+('_heldout' if heldout else '')
  rows.append((exported,f'pub fn {exported}(xs:List<{typ}>,seed:{typ},k:{typ})->{typ}{{return {body};}}'))
 return rows


def specialize(subject):
 """Untrusted source-derived static compositions; complete correlation checked."""
 from producers.beta_sharing17 import beta_share
 from producers.beta_specialization15 import free_parameters
 from ink_planner.semantic_search import substitute
 generic=dict(named_laws());rows=[]
 for name,body in sorted(subject['functions'].items()):
  n=body['node']
  if not isinstance(n,dict) or n.get('Op',[None])[0] not in ('binary:+','binary:-'):continue
  operation,args=n['Op'];first,second=args;weighted=False
  if operation=='binary:+' and first['node'].get('Op',[None])[0]=='binary:*' and second['node'].get('Op',[None])[0]=='binary:*':
   first,k=first['node']['Op'][1];second,d=second['node']['Op'][1];weighted=True
  if first['node'].get('Op',[None])[0]!='call:sum' or second['node'].get('Op',[None])[0]!='call:sum':continue
  mapped=first['node']['Op'][1][0];other=second['node']['Op'][1][0]
  if mapped['node'].get('Op',[None])[0]!='method:map' or other['node'].get('Op',[None])[0]!='method:map':continue
  filtered,f=mapped['node']['Op'][1];_,g=other['node']['Op'][1]
  if filtered['node'].get('Op',[None])[0]!='method:filter':continue
  xs,p=filtered['node']['Op'][1];typ=body['sort'].get('Value');family='partition_dual_weighted' if weighted else 'partition_dual_subtract' if operation=='binary:-' else 'partition_dual_add'
  if typ not in ('U32','I32','U64'):continue
  base=generic[family+'_'+typ.lower()];values={'xs':xs,'f':f,'g':g,'p':p}
  if weighted:values.update(k=k,d=d)
  source=substitute(copy.deepcopy(base['from']),values);middle=substitute(copy.deepcopy(base['to']),values);target=beta_share(middle);gid=identity(semantic_entry(base))
  proof={'Trans':dict(middle=source,left='Normalize',right={'Trans':dict(middle=middle,left={'Use':dict(law=gid,arguments=dict(sorted(values.items())),premises=[])},right='Normalize')})}
  rows.append((name+'_static',law(free_parameters(body),body,target,proof,dependencies=[gid])))
 return rows


def publish(output,extra=()):
 output=Path(output);rows=named_laws()+list(extra);names={n:identity(semantic_entry(l)) for n,l in rows};st=Store.publish(output,[semantic_entry(l) for _,l in rows],names)
 (output/'view.json').write_bytes(canonical(st.bundle(sorted(names.values())))+b'\n');(output/'manifest.json').write_text(json.dumps(dict(schema=1,names=names,snapshot=st.snapshot_id,scope='Arbitrary independent pure total unary callbacks on complementary partitions; wrapping words only. One ordered fold, no arrays in target; no runtime checks or profitability claim.'),indent=2)+'\n');return st
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output-store',type=Path,required=True);st=publish(p.parse_args().output_store);print(json.dumps(dict(entries=len(st.members()),snapshot=st.snapshot_id)))
