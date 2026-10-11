#!/usr/bin/env python3
"""Untrusted complementary cardinality and first-accepted consumer equalities."""
import copy,json
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,binary,bound,lam,law,op,term,value,var,word,nat

TYPES=('U32','I32','U64','F32','Bool')
FAMILIES=('skip_partition_count','skip_first_accepted','skip_mapped_first_accepted')

def candidate_laws():
 rows=[]
 for t in TYPES:
  s,ls,b,c=value(t),value({'List':t}),value('Bool'),value('U64');un,ps=arrow(s,s),arrow(s,b)
  xs,p,f,z=var(ls,'xs'),var(ps,'p'),var(un,'f'),var(s,'z');apply=lambda fn,x:op(fn['sort']['Arrow'][1],'apply',fn,x)
  x=bound(s,0);neg=lam(s,binary('==',apply(p,x),term(b,{'Bool':False})));filtered=op(ls,'method:filter',xs,p);count=lambda v:op(c,'call:count',v)
  proof={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step={'Cases':dict(condition=apply(p,var(s,'head')),on_false='Normalize',on_true='Normalize')})}
  source=binary('+',count(filtered),count(op(ls,'method:filter',xs,neg)));rows.append((FAMILIES[0]+'_'+t.lower(),law(dict(xs=ls,p=ps),source,count(xs),{'Sym':proof})))
  if t=='Bool':continue
  for mapped in (False,True):
   sequence=op(ls,'method:map',filtered,f) if mapped else filtered
   source=op(s,'method:at_or',sequence,word('U32',0),z)
   item,acc=bound(s,1),bound(s,0);selected=apply(f,item) if mapped else item
   target=op(s,'call:foldr',xs,z,lam(s,lam(s,op(s,'call:choose',apply(p,item),selected,acc))))
   params=dict(xs=ls,p=ps,z=s)
   if mapped:params['f']=un
   rows.append((FAMILIES[2 if mapped else 1]+'_'+t.lower(),law(params,source,target,proof)))
 return rows

DATA=Path(__file__).resolve().parents[1]/'research/web-stack-proofs-23/skip'

def old_composition_laws():
 row=json.loads((DATA/'old-cardinality/receipt.json').read_text())
 return [(row['name'],row['law'])]

def old_source_laws():return []

def named_laws():
 deployments={r['name']:r['law'] for r in json.loads((DATA/'mapped-deployment/accepted.json').read_text())}
 return [(n,deployments.get(n,l)) for n,l in candidate_laws() if n!='skip_partition_count_u64']

def law_roles():
 return {n:('deployment_composition' if 'mapped_first' in n else 'optimization_endpoint') for n,_ in named_laws()}


def source_functions(heldout=False,t=None):
 rows=[]
 for typ in ('u32','i32','u64','f32','bool'):
  if t and t!=typ:continue
  predicate='x<k' if heldout else 'x>seed'
  mapper='choose(x<seed,x+k,x-seed)' if heldout else 'choose(x>k,x-k,x+k)'
  if typ=='bool':predicate='x==k' if heldout else 'x==seed';mapper='choose(x,k,seed)'
  for family in FAMILIES:
   if typ=='bool' and family!=FAMILIES[0]:continue
   filtered=f'xs.filter(fn(x)=>{predicate})'
   if family==FAMILIES[0]:body=f'count({filtered})+count(xs.filter(fn(x)=>({predicate})==false))';output='u64'
   else:body=filtered+('.map(fn(x)=>'+mapper+')' if family==FAMILIES[2] else '')+'.at_or(0,seed)';output=typ
   name=family+'_'+typ+('_heldout' if heldout else '')
   decl='Bool' if typ=='bool' else typ
   rows.append((name,f'pub fn {name}(xs:List<{decl}>,seed:{decl},k:{decl})->{output}{{return {body};}}'))
 return rows

def specialize(subject):
 """Candidate bindings only; complete source correspondence is kernel checked."""
 from producers.beta_sharing17 import beta_share
 from producers.beta_specialization15 import free_parameters
 from ink_planner.semantic_search import substitute
 generic=dict(named_laws());generic.update({n.replace('_old_composition',''):l for n,l in old_composition_laws()});rows=[]
 for name,body in sorted(subject['functions'].items()):
  n=body['node'];kind=n.get('Op',[None])[0];vals=None
  if kind=='binary:+':
   first,second=n['Op'][1]
   if any(v['node'].get('Op',[None])[0]!='call:count' for v in (first,second)):continue
   sequence=first['node']['Op'][1][0]
   if sequence['node'].get('Op',[None])[0]!='method:filter':continue
   xs,p=sequence['node']['Op'][1];t=xs['sort']['Value']['List'];family=FAMILIES[0];vals=dict(xs=xs,p=p)
  elif kind=='method:at_or':
   sequence,index,z=n['Op'][1];mapped=sequence['node'].get('Op',[None])[0]=='method:map'
   if mapped:sequence,f=sequence['node']['Op'][1]
   if sequence['node'].get('Op',[None])[0]!='method:filter':continue
   xs,p=sequence['node']['Op'][1];t=xs['sort']['Value']['List'];family=FAMILIES[2 if mapped else 1];vals=dict(xs=xs,p=p,z=z)
   if mapped:vals['f']=f
  else:continue
  if t not in TYPES:continue
  base=generic[family+'_'+t.lower()];source=substitute(copy.deepcopy(base['from']),vals);middle=substitute(copy.deepcopy(base['to']),vals);target=beta_share(middle);gid=identity(semantic_entry(base))
  proof={'Trans':dict(middle=source,left='Normalize',right={'Trans':dict(middle=middle,left={'Use':dict(law=gid,arguments=dict(sorted(vals.items())),premises=[])},right='Normalize')})}
  rows.append((name+'_static',law(free_parameters(body),body,target,proof,dependencies=[gid])))
 return rows

def publish(output,extra=()):
 rows=named_laws()+old_composition_laws()+list(extra);output=Path(output);names={n:identity(semantic_entry(l)) for n,l in rows};objects={identity(semantic_entry(l)):semantic_entry(l) for _,l in rows}
 prior=Store(Path(__file__).resolve().parents[1],Path(__file__).resolve().parents[1]/'store/snapshots/95c096ab4a28114fb70c334b662057bd8abfffe135a3198032f4ea38a679bd57.json');pending=[d for e in objects.values() for d in e['dependencies']]
 while pending:
  d=pending.pop()
  if d in objects:continue
  objects[d]=prior.object(d);pending+=objects[d]['dependencies']
 st=Store.publish(output,list(objects.values()),names)
 (output/'view.json').write_bytes(canonical(st.bundle(sorted(names.values())))+b'\n');(output/'manifest.json').write_text(json.dumps(dict(names=names,snapshot=st.snapshot_id,roles=dict(cardinality=4,first_accepted=4,mapped_lookup_deployments=4,old_cardinality_composition=1,static=len(extra))),indent=2)+'\n');return st
