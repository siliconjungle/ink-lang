#!/usr/bin/env python3
"""Untrusted complementary-partition reduction laws over wrapping words."""
import argparse,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,binary,bound,lam,law,op,term,value,var,word


def named_laws():
 result=[]
 for t in ('U32','I32','U64'):
  s,ls,b=value(t),value({'List':t}),value('Bool');fs,ps=arrow(s,s),arrow(s,b)
  xs,f,p=var(ls,'xs'),var(fs,'f'),var(ps,'p');k,d=var(s,'k'),var(s,'d');x=bound(s,0)
  px=op(b,'apply',p,x);fx=op(s,'apply',f,x)
  negative=lam(s,op(b,'binary:==',px,term(b,{'Bool':False})))
  def total(predicate):return op(s,'call:sum',op(ls,'method:map',op(ls,'method:filter',xs,predicate),f))
  a,z=total(p),total(negative)
  selected=lambda yes,no:op(s,'call:choose',px,yes,no)
  summed=lambda callback:op(s,'call:sum',op(ls,'method:map',xs,callback))
  proof={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step={'Cases':dict(condition=op(b,'apply',p,var(s,'head')),on_false='Normalize',on_true='Normalize')})}
  params={'xs':ls,'f':fs,'p':ps}
  for name,source,target,extra in [
   ('partition_recombine',binary('+',a,z),summed(f),{}),
   ('partition_contrast',binary('-',a,z),summed(lam(s,selected(fx,binary('-',word(t,0),fx)))),{}),
   ('partition_weighted',binary('+',binary('*',a,k),binary('*',z,d)),summed(lam(s,selected(binary('*',fx,k),binary('*',fx,d)))),{'k':s,'d':s}),
  ]:result.append((name+'_'+t.lower(),law(dict(params,**extra),source,target,{'Sym':proof})))
 return result


def source_functions(heldout=False,t=None):
 result=[]
 for name,_ in named_laws():
  typ=name.rsplit('_',1)[1]
  if t and typ!=t:continue
  predicate='x>seed' if heldout else 'x<seed'
  mapper='choose(x<k,k-x,x-k)+seed' if heldout else '(x+7)*(x+seed)'
  a=f'sum(xs.filter(fn(x)=>{predicate}).map(fn(x)=>{mapper}))'
  b=f'sum(xs.filter(fn(x)=>({predicate})==false).map(fn(x)=>{mapper}))'
  body=f'{a}*k+{b}*3' if 'weighted' in name else f'{a}-{b}' if 'contrast' in name else f'{a}+{b}'
  exported=name+('_heldout' if heldout else '')
  result.append((exported,f'pub fn {exported}(xs:List<{typ}>,seed:{typ},k:{typ})->{typ}{{return {body};}}'))
 return result


def publish(output):
 output=Path(output);rows=named_laws();names={n:identity(semantic_entry(l)) for n,l in rows}
 st=Store.publish(output,[semantic_entry(l) for _,l in rows],names)
 (output/'view.json').write_bytes(canonical(st.bundle(sorted(names.values())))+b'\n')
 manifest=dict(schema=1,laws=len(rows),names=names,snapshot=st.snapshot_id,scope='Arbitrary pure total unary mapper and predicate; complementary partitions, wrapping U32/I32/U64 only. Callback/predicate scheduling changes; no runtime or profitability conditions. F32 excluded.')
 (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');return st,manifest
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output-store',type=Path,required=True);_,m=publish(p.parse_args().output_store);print(json.dumps(m))


def specialize(subject):
 """Produce untrusted checked instantiations from complementary source stages.

 No name whitelist: source operands supply xs, f, p and weights. Normalize
 checks the complete correlation between positive/negative stage callbacks.
 These explicit certificates do not extend planner pattern matching.
 """
 import copy
 from producers.beta_sharing17 import beta_share
 from producers.beta_specialization15 import free_parameters
 from ink_planner.semantic_search import substitute
 generic=dict(named_laws());result=[]
 for name,body in sorted(subject['functions'].items()):
  n=body['node']
  if not isinstance(n,dict) or 'Op' not in n or n['Op'][0] not in ('binary:+','binary:-'):continue
  first,second=n['Op'][1];weighted=False
  if first['node'].get('Op',[None])[0]=='binary:*' and second['node'].get('Op',[None])[0]=='binary:*':
   first,k=first['node']['Op'][1];second,d=second['node']['Op'][1];weighted=True
  if first['node'].get('Op',[None])[0]!='call:sum' or second['node'].get('Op',[None])[0]!='call:sum':continue
  mapped=first['node']['Op'][1][0]
  if mapped['node'].get('Op',[None])[0]!='method:map':continue
  filtered,f=mapped['node']['Op'][1]
  if filtered['node'].get('Op',[None])[0]!='method:filter':continue
  xs,p=filtered['node']['Op'][1];typ=body['sort'].get('Value')
  if typ not in ('U32','I32','U64'):continue
  family='partition_weighted' if weighted else 'partition_contrast' if n['Op'][0]=='binary:-' else 'partition_recombine'
  g=generic[family+'_'+typ.lower()];args={'xs':xs,'f':f,'p':p}
  if weighted:args.update(k=k,d=d)
  source=substitute(copy.deepcopy(g['from']),args);middle=substitute(copy.deepcopy(g['to']),args);target=beta_share(middle)
  gid=identity(semantic_entry(g));use={'Use':dict(law=gid,arguments=dict(sorted(args.items())),premises=[])}
  proof={'Trans':dict(middle=source,left='Normalize',right={'Trans':dict(middle=middle,left=use,right='Normalize')})}
  result.append((name+'_static',law(free_parameters(body),body,target,proof,dependencies=[gid])))
 return result
