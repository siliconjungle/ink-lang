#!/usr/bin/env python3
"""Checked-data candidates for arbitrary idempotent callback iteration."""
from producers.semantic_laws import arrow,bound,lam,law,op,value,var
from ink_knowledge import Store,canonical,identity,semantic_entry

def grouped_laws():
 support=[];functions=[];scalar=[]
 for t in ('U32','I32','U64','F32','Bool'):
  s=value(t);fs=arrow(s,s);f=var(fs,'f');n=var('Nat','n');x=var(s,'x');b=bound(s,0)
  apply=lambda a:op(s,'apply',f,a)
  condition={'from':lam(s,apply(apply(b))),'to':lam(s,apply(b))}
  callback=lam(value('U32'),lam(s,apply(bound(s,0))))
  repeat=lambda count,initial:op(s,'call:repeat',count,initial,callback)
  plain=lambda count:lam(s,repeat(count,b))
  transport=law({'n':'Nat','x':s,'f':fs},repeat(n,x),op(s,'apply',plain(n),x))
  transport_id=identity(semantic_entry(transport));support.append(('repeat_beta_transport_'+t.lower(),transport))
  source=lambda count:plain(op('Nat','nat.succ',count))
  target=lam(s,apply(b));prev=var('Nat','previous_count')
  mid0=lam(s,apply(repeat(op('Nat','nat.succ',prev),b)))
  mid1=lam(s,apply(op(s,'apply',source(prev),b)))
  mid2=lam(s,apply(op(s,'apply',target,b)))
  use={'Use':dict(law=transport_id,arguments={'n':op('Nat','nat.succ',prev),'x':var(s,'__congruence'),'f':f},premises=[])}
  step={'Trans':dict(middle=mid0,left='Normalize',right={'Trans':dict(middle=mid1,
   left={'Congruence':[{'Congruence':['Normalize',use]}]},
   right={'Trans':dict(middle=mid2,left={'Congruence':[{'Congruence':['Normalize',{'Congruence':[{'Hypothesis':1},'Normalize']}]}]},
    right={'Trans':dict(middle=condition['from'],left='Normalize',right={'Hypothesis':0})})})})}
  proof={'Induction':dict(variable='n',names=['previous_count'],base='Normalize',step=step)}
  function=law({'n':'Nat','f':fs},source(n),target,proof,conditions=[condition],dependencies=[transport_id])
  fid=identity(semantic_entry(function));functions.append(('idempotent_positive_repeat_function_'+t.lower(),function))
  mid=op(s,'apply',source(n),x);last=op(s,'apply',target,x)
  scalarproof={'Trans':dict(middle=mid,left={'Use':dict(law=transport_id,arguments={'n':op('Nat','nat.succ',n),'x':x,'f':f},premises=[])},right={
   'Trans':dict(middle=last,left={'Congruence':[{'Use':dict(law=fid,arguments={'n':n,'f':f},premises=[{'Hypothesis':0}])},'Normalize']},right='Normalize')})}
  scalar.append(('idempotent_positive_repeat_'+t.lower(),law({'n':'Nat','f':fs,'x':s},repeat(op('Nat','nat.succ',n),x),apply(x),scalarproof,conditions=[condition],dependencies=[transport_id,fid])))
 return support,functions,scalar

def named_laws():return [row for group in grouped_laws() for row in group]

def source_functions(alternate=False,t='u32'):
 expressions=[('lower_projection_repeat',8,'choose(a<k,k,a)' if alternate else 'choose(a<seed,seed,a)'),('upper_projection_repeat',32,'choose(a>seed,seed,a)' if alternate else 'choose(a>k,k,a)'),('keyed_projection_repeat',64,'choose(a==k,seed,a)' if alternate else 'choose(a==seed,k,a)')]
 return [(name+('_heldout' if alternate else ''),f'pub fn {name}{"_heldout" if alternate else ""}(xs:List<{t}>,ys:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>repeat({count},x,fn(i)=>fn(a)=>{body}));}}') for name,count,body in expressions]

def premise_proof(predicate):
 return {'Congruence':[{'Cases':dict(condition=predicate,on_false='Normalize',on_true='Normalize')}]}

def callback_laws():
 """Three reusable projection idempotence premises per numeric type."""
 from producers.beta_specialization15 import instantiate_bound
 result=[]
 for t in ('U32','I32','U64','F32'):
  s=value(t);a=bound(s,0);threshold=var(s,'threshold');key=var(s,'key');replacement=var(s,'replacement')
  choices=[('lower',{'threshold':s},op(s,'call:choose',op(value('Bool'),'binary:<',a,threshold),threshold,a)),('upper',{'threshold':s},op(s,'call:choose',op(value('Bool'),'binary:>',a,threshold),threshold,a)),('keyed',{'key':s,'replacement':s},op(s,'call:choose',op(value('Bool'),'binary:==',a,key),replacement,a))]
  for name,params,body in choices:
   f=lam(s,body);single=lam(s,op(s,'apply',f,a));twice=lam(s,op(s,'apply',f,op(s,'apply',f,a)));predicate=instantiate_bound(body['node']['Op'][1][0],var(s,'__congruence'))
   result.append(('projection_idempotence_'+name+'_'+t.lower(),law(params,twice,single,premise_proof(predicate))))
 return result

def specialization_laws():
 """Unconditional scalar examples, each requiring checked generic application."""
 from producers.semantic_laws import nat
 from producers.beta_specialization15 import beta_normalize
 from ink_planner.semantic_search import substitute
 callbacks=callback_laws();scalar=dict(grouped_laws()[2]);rows=[]
 for name,premise in callbacks:
  t=name.rsplit('_',1)[1];s=value(t.upper());x=var(s,'x');f=premise['to']['node']['Lambda']['node']['Op'][1][0]
  kind=name.split('_')[-2];count={'lower':8,'upper':32,'keyed':64}[kind];generic=scalar['idempotent_positive_repeat_'+t];args={'n':nat(count-1),'f':f,'x':x};middle=substitute(generic['from'],args);result=substitute(generic['to'],args)
  callback=lam(value('U32'),lam(s,f['node']['Lambda']));source=op(s,'call:repeat',nat(count),x,callback);params={'x':s,**premise['params']};premiseargs={n:var(sort,n) for n,sort in premise['params'].items()}
  proof={'Trans':dict(middle=middle,left='Normalize',right={'Trans':dict(middle=result,left={'Use':dict(law=identity(semantic_entry(generic)),arguments=args,premises=[{'Use':dict(law=identity(semantic_entry(premise)),arguments=premiseargs,premises=[])}])},right='Normalize')})}
  rows.append(('projection_repeat_'+kind+'_'+t,law(params,source,beta_normalize(result),proof,dependencies=[identity(semantic_entry(generic)),identity(semantic_entry(premise))])))
 return rows

def named_laws():return [row for group in grouped_laws() for row in group]+callback_laws()+specialization_laws()

def publish(output):
 from pathlib import Path
 import json
 output=Path(output);rows=named_laws();names={n:identity(semantic_entry(l)) for n,l in rows};st=Store.publish(output,[semantic_entry(l) for _,l in rows],names);st.rebuild();(output/'view.json').write_bytes(canonical(st.bundle(sorted(names.values())))+b'\n');manifest={'schema':1,'entries':len(rows),'roles':{'beta_transport_support':5,'conditional_function_induction_support':5,'generic_scalar_optimization':5,'projection_idempotence_premises':12,'scalar_static_literal_instances':12},'names':names,'snapshot':st.snapshot_id,'scope':'One arbitrary pure total idempotent callback optimization over five supported types; three reusable numeric projection premises, exact F32 values. Positive source counts8/32/64; no runtime premises or validation.'};(output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');return st,manifest

if __name__=='__main__':
 import argparse,json
 from pathlib import Path
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output-store',required=True,type=Path);args=p.parse_args();_,manifest=publish(args.output_store);print(json.dumps(manifest))
