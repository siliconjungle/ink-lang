#!/usr/bin/env python3
"""Untrusted capture-safe scalar sharing during known-callback specialization.

A nontrivial scalar argument used repeatedly by a known lambda is evaluated once
in the existing apply(lambda, value) representation, which reifies to typed Let.
Curried application spines are substituted together before bindings are wrapped,
so no partially-applied function-valued Let needs target emission. All generated
certificates are ordinary Normalize or checked Use/Normalize compositions.
"""
import copy
from producers.beta_specialization15 import instantiate_bound,free_parameters,outside_lambda_positions,lift_use
from producers.semantic_laws import bound,lam,law,op
from ink_knowledge import identity,semantic_entry
from ink_planner.semantic_search import children,set_child,shift,match,substitute,replace

def beta_share(t,budget=10000):
 remaining=[budget];counter=[0];occupied=set(free_parameters(t))
 def occurrences(body,depth=0):
  n=body['node']
  if isinstance(n,dict) and 'Bound' in n:return int(n['Bound']==depth)
  return sum(occurrences(c,depth+int(isinstance(n,dict) and 'Lambda' in n)) for c in children(body))
 def trivial(t):
  n=t['node'];return isinstance(n,dict) and any(k in n for k in ['Free','Bound','Word','Float','Bool'])
 def scalar(t):return isinstance(t['sort'],dict) and t['sort'].get('Value') in ('U32','I32','U64','F32','Bool')
 def marker(sort):
  while True:
   name='__beta_share_'+str(counter[0]);counter[0]+=1
   if name not in occupied:occupied.add(name);return dict(sort=sort,node={'Free':name})
 def abstract(body,name):
  body=shift(body,1)
  def walk(v,depth=0):
   n=v['node']
   if isinstance(n,dict) and n.get('Free')==name:return bound(v['sort'],depth)
   for i,c in enumerate(children(v)):v=set_child(v,i,walk(c,depth+int(isinstance(n,dict) and 'Lambda' in n)))
   return v
  return walk(body)
 def visit(v):
  remaining[0]-=1
  if remaining[0]<0:raise ValueError('shared beta specialization budget exceeded')
  v=copy.deepcopy(v);n=v['node']
  if isinstance(n,dict) and 'Op' in n and n['Op'][0]=='apply':
   args=[];fn=v
   while isinstance(fn['node'],dict) and 'Op' in fn['node'] and fn['node']['Op'][0]=='apply':
    fn,arg=fn['node']['Op'][1];args.append(arg)
   args.reverse();bindings=[];current=visit(fn);reduced=False
   for raw in args:
    argument=visit(raw)
    if isinstance(current['node'],dict) and 'Lambda' in current['node']:
     reduced=True;body=current['node']['Lambda']
     if occurrences(body)>1 and scalar(argument) and not trivial(argument):
      placeholder=marker(argument['sort']);bindings.append((placeholder['node']['Free'],argument));current=instantiate_bound(body,placeholder)
     else:current=instantiate_bound(body,argument)
    else:current=op(current['sort']['Arrow'][1],'apply',current,argument)
   current=visit(current) if reduced else current
   # The current emitter cannot execute function-valued Let results. Fully
   # applied curried spines share scalar values; partial results stay lambdas.
   if isinstance(current['sort'],dict) and 'Arrow' in current['sort']:
    for name,arg in reversed(bindings):current=substitute(current,{name:arg})
    bindings=[]
   for name,arg in reversed(bindings):current=op(current['sort'],'apply',lam(arg['sort'],abstract(current,name)),arg)
   return current
  for i,c in enumerate(children(v)):v=set_child(v,i,visit(c))
  return v
 result=visit(t)
 if set(free_parameters(result))-set(free_parameters(t)):raise ValueError('sharing marker escaped')
 return result

def derive(subject,generic_named):
 result=[]
 for fn,body in sorted(subject['functions'].items()):
  direct=beta_share(body)
  if direct!=body:result.append((fn+'_shared_beta',law(free_parameters(body),body,direct)))
  for path,term in outside_lambda_positions(body):
   for name,generic in generic_named:
    args={}
    if not match(generic['from'],term,generic['params'],args) or set(args)!=set(generic['params']):continue
    middle=replace(body,path,substitute(generic['to'],args));target=beta_share(middle)
    if target==body:continue
    gid=identity(semantic_entry(generic));use={'Use':dict(law=gid,arguments=dict(sorted(args.items())),premises=['Normalize']*len(generic['conditions']))}
    proof={'Trans':dict(middle=middle,left=lift_use(body,path,use),right='Normalize')}
    result.append((fn+'_shared_'+name,law(free_parameters(body),body,target,proof,dependencies=[gid])))
 unique={identity(semantic_entry(l)):(n,l) for n,l in result}
 return [unique[k] for k in sorted(unique)]
