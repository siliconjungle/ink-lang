#!/usr/bin/env python3
"""Untrusted guarded contribution fusion in wrapping words; pure total inputs."""
import copy,json
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,binary,bound,lam,law,op,term,value,var,word

TYPES=('U32','I32','U64')
FAMILIES=('guard_complement_add','guard_complement_subtract','guard_same_choice_add')

def scalar_laws():
 rows=[]
 for t in TYPES:
  s,b=value(t),value('Bool');c=var(b,'c');a,v,d,e=[var(s,n) for n in ('a','b','d','e')]
  choose=lambda flag,x,y:op(s,'call:choose',flag,x,y)
  neg=op(b,'binary:==',c,term(b,{'Bool':False}));zero=word(t,0)
  pairs=[(FAMILIES[0],binary('+',choose(c,a,zero),choose(neg,v,zero)),choose(c,a,v),dict(c=b,a=s,b=s)),(FAMILIES[1],binary('-',choose(c,a,zero),choose(neg,v,zero)),choose(c,a,binary('-',zero,v)),dict(c=b,a=s,b=s)),(FAMILIES[2],binary('+',choose(c,a,v),choose(c,d,e)),choose(c,binary('+',a,d),binary('+',v,e)),dict(c=b,a=s,b=s,d=s,e=s))]
  for name,source,target,params in pairs:rows.append((name+'_'+t.lower(),law(params,source,target,{'Cases':dict(condition=c,on_false='Normalize',on_true='Normalize')})))
 return rows

def deployment_laws():
 rows=[]
 for t in TYPES:
  s,ls,b=value(t),value({'List':t}),value('Bool');un=arrow(s,s);ps=arrow(s,b)
  xs,p=var(ls,'xs'),var(ps,'p');f,g,h,j=[var(un,n) for n in ('f','g','h','j')]
  ap=lambda fn,x:op(fn['sort']['Arrow'][1],'apply',fn,x)
  choose=lambda c,a,d:op(s,'call:choose',c,a,d)
  x=bound(s,0);c=ap(p,x);neg=op(b,'binary:==',c,term(b,{'Bool':False}));zero=word(t,0)
  for family in FAMILIES:
   if family==FAMILIES[2]:source_item=binary('+',choose(c,ap(f,x),ap(g,x)),choose(c,ap(h,x),ap(j,x)));target_item=choose(c,binary('+',ap(f,x),ap(h,x)),binary('+',ap(g,x),ap(j,x)));params=dict(xs=ls,p=ps,f=un,g=un,h=un,j=un)
   else:
    operator='-' if family==FAMILIES[1] else '+'
    source_item=binary(operator,choose(c,ap(f,x),zero),choose(neg,ap(g,x),zero));target_item=choose(c,ap(f,x),binary('-',zero,ap(g,x)) if operator=='-' else ap(g,x));params=dict(xs=ls,p=ps,f=un,g=un)
   source=op(s,'call:sum',op(ls,'method:map',xs,lam(s,source_item)))
   from ink_planner.semantic_search import shift
   target=op(s,'call:foldr',xs,zero,lam(s,lam(s,binary('+',shift(target_item,1),bound(s,0)))))
   proof={'Sym':{'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step={'Cases':dict(condition=ap(p,var(s,'head')),on_false='Normalize',on_true='Normalize')})}}
   rows.append((family+'_fold_'+t.lower(),law(params,source,target,proof)))
 return rows

OLD_WITNESSES=Path(__file__).resolve().parents[1]/'research/web-stack-proofs-22/guard/old-consequence/all-accepted.json'

def old_composition_laws():
 """Exact checked consequences of prior1588, offered symmetrically."""
 return [(r['name'],r['law']) for r in json.loads(OLD_WITNESSES.read_text())['rows'] if not r['name'].endswith('_static_old_composition')]

def old_source_laws():
 return [(r['name'],r['law']) for r in json.loads(OLD_WITNESSES.read_text())['rows'] if r['name'].endswith('_static_old_composition')]

def named_laws():
 # Complementary add/subtract endpoints are existing-law consequences. Keeping
 # separate Cases proofs here would add redundant proof IDs for exact endpoints.
 return [(n,l) for n,l in scalar_laws()+deployment_laws() if 'same_choice' in n]


def source_functions(heldout=False,t=None):
 rows=[]
 for typ in ('u32','i32','u64'):
  if t and t!=typ:continue
  c='quot_or(x*k+seed,seed,k)>k' if heldout else 'quot_or(x+seed,k,k)<seed'
  f='choose(x>seed,x-seed,seed-x)*3' if heldout else 'quot_or(x*k+seed,seed,k)'
  g='quot_or(x+seed,k,seed)' if heldout else 'choose(x<k,k-x,x-k)+seed'
  h='quot_or(x*k,k,seed)' if heldout else 'x+seed'
  j='x+k' if heldout else 'quot_or(x+seed,k,seed)'
  for family in FAMILIES:
   if family==FAMILIES[2]:item=f'choose({c},{f},{g})+choose({c},{h},{j})'
   else:item=f'choose({c},{f},0)'+('-' if family==FAMILIES[1] else '+')+f'choose(({c})==false,{g},0)'
   name=family+'_'+typ+('_heldout' if heldout else '')
   rows.append((name,f'pub fn {name}(xs:List<{typ}>,seed:{typ},k:{typ})->{typ}{{return sum(xs.map(fn(x)=>{item}));}}'))
 return rows

def specialize(subject):
 """Source-derived candidates, with every complete correlation kernel checked."""
 from producers.beta_sharing17 import beta_share
 from producers.beta_specialization15 import free_parameters
 from ink_planner.semantic_search import substitute
 rows=[];generic={n.replace('_old_composition',''):l for n,l in old_composition_laws() if '_fold_' in n};generic.update({n:l for n,l in deployment_laws() if 'same_choice' in n})
 for name,body in sorted(subject['functions'].items()):
  if body['node'].get('Op',[None])[0]!='call:sum':continue
  mapped=body['node']['Op'][1][0]
  if mapped['node'].get('Op',[None])[0]!='method:map':continue
  xs,mapper=mapped['node']['Op'][1]
  if 'Lambda' not in mapper['node']:continue
  item=mapper['node']['Lambda'];kind=item['node'].get('Op',[None])[0]
  if kind not in ('binary:+','binary:-'):continue
  left,right=item['node']['Op'][1]
  if any(v['node'].get('Op',[None])[0]!='call:choose' for v in (left,right)):continue
  c,f,g=left['node']['Op'][1];other,h,j=right['node']['Op'][1];typ=body['sort'].get('Value')
  if typ not in TYPES:continue
  s=value(typ);zero=word(typ,0)
  if g==zero and j==zero:
   family=FAMILIES[1] if kind=='binary:-' else FAMILIES[0];vals=dict(xs=xs,p=lam(s,c),f=lam(s,f),g=lam(s,h))
  elif kind=='binary:+':family=FAMILIES[2];vals=dict(xs=xs,p=lam(s,c),f=lam(s,f),g=lam(s,g),h=lam(s,h),j=lam(s,j))
  else:continue
  base=generic[family+'_fold_'+typ.lower()];source=substitute(copy.deepcopy(base['from']),vals);middle=substitute(copy.deepcopy(base['to']),vals);target=beta_share(middle);gid=identity(semantic_entry(base))
  proof={'Trans':dict(middle=source,left='Normalize',right={'Trans':dict(middle=middle,left={'Use':dict(law=gid,arguments=dict(sorted(vals.items())),premises=[])},right='Normalize')})}
  rows.append((name+'_static',law(free_parameters(body),body,target,proof,dependencies=[gid])))
 return rows

def publish(output,extra=()):
 output=Path(output);rows=named_laws()+old_composition_laws()+list(extra);names={n:identity(semantic_entry(l)) for n,l in rows};objects={identity(semantic_entry(l)):semantic_entry(l) for _,l in rows}
 prior=Store(Path(__file__).resolve().parents[1],Path(__file__).resolve().parents[1]/'store/snapshots/edd38a3302391d76195c377189a95c4f9f893c497198b2c599ce6002df906d37.json')
 pending=[d for e in list(objects.values()) for d in e['dependencies']]
 while pending:
  dependency=pending.pop()
  if dependency in objects:continue
  objects[dependency]=prior.object(dependency);pending+=objects[dependency]['dependencies']
 st=Store.publish(output,list(objects.values()),names)
 (output/'view.json').write_bytes(canonical(st.bundle(sorted(names.values())))+b'\n');(output/'manifest.json').write_text(json.dumps(dict(names=names,snapshot=st.snapshot_id,roles=dict(fresh_pointwise=3,fresh_deployments=3,old_pointwise=6,old_deployments=6,static=len(extra))),indent=2)+'\n');return st
