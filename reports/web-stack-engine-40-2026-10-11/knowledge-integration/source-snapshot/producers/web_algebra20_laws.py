#!/usr/bin/env python3
"""Untrusted loop-invariant gate hoisting for pure total data computations."""
import argparse,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,bound,lam,law,op,term,value,var,word


def named_laws():
 rows=[]
 for t in ('U32','I32','U64','F32'):
  s,ls,b=value(t),value({'List':t}),value('Bool');fs,ps,gs=arrow(s,s),arrow(s,b),arrow(s,arrow(s,s))
  xs,c,z=var(ls,'xs'),var(b,'c'),var(s,'z');f,p,g=var(fs,'f'),var(ps,'p'),var(gs,'g')
  apply=lambda fn,x:op(fn['sort']['Arrow'][1],'apply',fn,x)
  choose=lambda sort,a,d:op(sort,'call:choose',c,a,d)
  induction=lambda step='Normalize':{'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step=step)}
  cases=lambda false,true:{'Cases':dict(condition=c,on_false=false,on_true=true)}
  def bridge(source,target,proof):return {'Trans':dict(middle=source,left='Normalize',right={'Trans':dict(middle=target,left=proof,right='Normalize')})}
  x=bound(s,0)
  if t!='F32':
   source=op(s,'call:sum',op(ls,'method:map',xs,lam(s,choose(s,apply(f,x),word(t,0)))))
   target=choose(s,op(s,'call:sum',op(ls,'method:map',xs,f)),word(t,0))
   rows.append(('gated_mapper_sum_'+t.lower(),law({'xs':ls,'c':b,'f':fs},source,target,cases(bridge(op(s,'call:sum',op(ls,'method:map',xs,lam(s,word(t,0)))),word(t,0),induction()),bridge(op(s,'call:sum',op(ls,'method:map',xs,lam(s,apply(f,x)))),op(s,'call:sum',op(ls,'method:map',xs,f)),induction())))))
  count=value('U64');false=term(b,{'Bool':False})
  source=op(count,'call:count',op(ls,'method:filter',xs,lam(s,choose(b,apply(p,x),false))))
  target=choose(count,op(count,'call:count',op(ls,'method:filter',xs,p)),word('U64',0))
  predcases={'Cases':dict(condition=apply(p,var(s,'head')),on_false='Normalize',on_true='Normalize')}
  rows.append(('gated_predicate_count_'+t.lower(),law({'xs':ls,'c':b,'p':ps},source,target,cases(bridge(op(count,'call:count',op(ls,'method:filter',xs,lam(s,false))),word('U64',0),induction()),bridge(op(count,'call:count',op(ls,'method:filter',xs,lam(s,apply(p,x)))),op(count,'call:count',op(ls,'method:filter',xs,p)),induction(predcases))))))
  item,acc=bound(s,1),bound(s,0)
  guarded=lam(s,lam(s,choose(s,apply(apply(g,item),acc),acc)))
  source=op(s,'call:foldr',xs,z,guarded);target=choose(s,op(s,'call:foldr',xs,z,g),z)
  rows.append(('gated_arbitrary_fold_'+t.lower(),law({'xs':ls,'c':b,'z':s,'g':gs},source,target,cases(bridge(op(s,'call:foldr',xs,z,lam(s,lam(s,acc))),z,induction()),bridge(op(s,'call:foldr',xs,z,lam(s,lam(s,apply(apply(g,item),acc)))),op(s,'call:foldr',xs,z,g),induction())))))
 return rows


def source_functions(heldout=False,t=None):
 rows=[]
 for name,_ in named_laws():
  typ=name.rsplit('_',1)[1]
  if t and typ!=t:continue
  flag='seed==k' if heldout else 'seed<k'
  mapper='choose(x<seed,seed-x,x-seed)+k' if heldout else 'quot_or(x+seed,k,seed)'
  predicate='x>k' if heldout else 'x<seed'
  reducer='choose(x<k,a+x*seed,a-x*k)' if heldout else '(x+seed)*(a+k)'
  if 'mapper_sum' in name:body=f'sum(xs.map(fn(x)=>choose({flag},{mapper},0)))';out=typ
  elif 'predicate_count' in name:body=f'count(xs.filter(fn(x)=>choose({flag},{predicate},false)))';out='u64'
  else:body=f'foldr(xs,seed,fn(x)=>fn(a)=>choose({flag},{reducer},a))';out=typ
  exported=name+('_heldout' if heldout else '')
  rows.append((exported,f'pub fn {exported}(xs:List<{typ}>,seed:{typ},k:{typ})->{out}{{return {body};}}'))
 return rows


def specialize(subject):
 """Checked source-derived instances; no task/export-name matcher extension."""
 import copy
 from producers.beta_sharing17 import beta_share
 from producers.beta_specialization15 import free_parameters
 from ink_planner.semantic_search import substitute
 generic=dict(named_laws());rows=[]
 for name,body in sorted(subject['functions'].items()):
  n=body['node']
  if not isinstance(n,dict) or 'Op' not in n:continue
  operation,args=n['Op'];family=None
  if operation in ('call:sum','call:count'):
   sequence=args[0];opname='method:map' if operation=='call:sum' else 'method:filter'
   if sequence['node'].get('Op',[None])[0]!=opname:continue
   xs,callback=sequence['node']['Op'][1]
   if 'Lambda' not in callback['node']:continue
   gated=callback['node']['Lambda'];sort=callback['sort']['Arrow'][0];t=sort.get('Value')
   if gated['node'].get('Op',[None])[0]!='call:choose':continue
   c,yes,_=gated['node']['Op'][1];callback=lam(sort,yes)
   family='gated_mapper_sum' if operation=='call:sum' else 'gated_predicate_count';values={'xs':xs,'c':c,'f' if operation=='call:sum' else 'p':callback}
  elif operation=='call:foldr':
   xs,z,callback=args
   if 'Lambda' not in callback['node'] or 'Lambda' not in callback['node']['Lambda']['node']:continue
   first=callback['sort']['Arrow'][0];gated=callback['node']['Lambda']['node']['Lambda'];t=first.get('Value')
   if gated['node'].get('Op',[None])[0]!='call:choose':continue
   c,yes,_=gated['node']['Op'][1];family='gated_arbitrary_fold';values={'xs':xs,'c':c,'z':z,'g':lam(first,lam(first,yes))}
  if not family or family+'_'+str(t).lower() not in generic:continue
  # The whole Normalize bridge also verifies the gate is invariant under its
  # callback binders and that the false branch is the correct zero/accumulator.
  g=generic[family+'_'+t.lower()];source=substitute(copy.deepcopy(g['from']),values);middle=substitute(copy.deepcopy(g['to']),values);target=beta_share(middle);gid=identity(semantic_entry(g))
  proof={'Trans':dict(middle=source,left='Normalize',right={'Trans':dict(middle=middle,left={'Use':dict(law=gid,arguments=dict(sorted(values.items())),premises=[])},right='Normalize')})}
  rows.append((name+'_static',law(free_parameters(body),body,target,proof,dependencies=[gid])))
  if family=='gated_mapper_sum':
   # Allocation-free CPU alternative, composed with an existing wrapping
   # mapped-sum theorem. The generic gate law itself is kept separate.
   from producers.web_collection14_laws import named_laws as prior_sum_laws
   old=dict(prior_sum_laws())['mapped_sum_'+t.lower()];oldid=identity(semantic_entry(old));oldargs={'xs':values['xs'],'f':values['f']}
   reduced=substitute(copy.deepcopy(old['to']),oldargs);folded=op(body['sort'],'call:choose',values['c'],reduced,word(t,0));compact=beta_share(folded)
   use_old={'Use':dict(law=oldid,arguments=oldargs,premises=[])}
   foldproof={'Trans':dict(middle=source,left='Normalize',right={'Trans':dict(middle=middle,left={'Use':dict(law=gid,arguments=dict(sorted(values.items())),premises=[])},right={'Trans':dict(middle=folded,left={'Congruence':['Normalize',use_old,'Normalize']},right='Normalize')})})}
   rows.append((name+'_fold_static',law(free_parameters(body),body,compact,foldproof,dependencies=[gid,oldid])))
 return rows


def publish(output,extra=()):
 output=Path(output);rows=named_laws()+list(extra);names={n:identity(semantic_entry(l)) for n,l in rows};st=Store.publish(output,[semantic_entry(l) for _,l in rows],names)
 (output/'view.json').write_bytes(canonical(st.bundle(sorted(names.values())))+b'\n');m=dict(schema=1,laws=len(rows),names=names,snapshot=st.snapshot_id,scope='Loop-invariant Boolean control and arbitrary pure total callbacks. Wrapping sums only; count and arbitrary right folds preserve F32 order. No runtime guards or profitability claim.');(output/'manifest.json').write_text(json.dumps(m,indent=2)+'\n');return st,m
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output-store',type=Path,required=True);_,m=publish(p.parse_args().output_store);print(json.dumps(m))
