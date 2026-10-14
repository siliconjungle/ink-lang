#!/usr/bin/env python3
"""Bounded source equality authoring with explicit, independently checked steps.

Shared callees stay opaque. This search supplies no authority: the kernel checks
every unfold, congruence, branch hypothesis and complete definition context.
"""
import argparse,copy,json,subprocess,sys,tempfile
from pathlib import Path
sys.path[:0]=[str(Path(__file__).resolve().parents[1]/'knowledge'),str(Path(__file__).resolve().parents[1]/'planner'),str(Path(__file__).resolve().parent)]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.definition_context28 import bind
from producers.semantic_laws import law,value,var,op,term
from ink_planner.semantic_search import children,positions,substitute,replace
from source_field_preservation import substitute as beta_substitute

def author(core,subject,left,right,limit=128,unfold=(),guard_term=None):
 functions={f['name']:f for f in core['program']['functions']};records=core['program']['records']
 a,b=functions[left],functions[right]
 if a['result']!=b['result']or[t for _,t in a['params']]!=[t for _,t in b['params']]:raise ValueError('matching parameter and result types required')
 params={n:value(t)for n,t in a['params']};arguments=[var(params[n],n)for n,_ in a['params']]
 start=op(value(a['result']),'call:'+left,*arguments);target=op(value(b['result']),'call:'+right,*arguments)
 def reach(root):
  seen=set();pending=[root]
  while pending:
   name=pending.pop()
   if name in seen:continue
   seen.add(name)
   for _,t in positions(subject['functions'][name]):
    call=t['node'].get('Op')if isinstance(t['node'],dict)else None
    if call and call[0].startswith('call:')and call[0][5:]in functions:pending.append(call[0][5:])
  return seen
 left_calls,right_calls=reach(left),reach(right);allowed=(left_calls|right_calls)-(left_calls&right_calls)
 if not set(unfold).issubset(functions):raise ValueError('unknown explicit source unfold')
 allowed.update(unfold)
 # A shared constructor-only adapter can itself hide the compared fields.
 # Unfold these small adapters; computational shared callees stay opaque.
 for name in left_calls&right_calls:
  body=subject['functions'][name];node=body['node'];call=node.get('Op')if isinstance(node,dict)else None
  parts=list(positions(body))
  if call and call[0].startswith('record:')and len(parts)<=32 and not any(isinstance(t['node'],dict)and t['node'].get('Op',[''])[0].startswith('call:')for _,t in parts):allowed.add(name)
 def fixed(t):
  node=t['node'];call=node.get('Op')if isinstance(node,dict)else None
  if not call:return None
  name,args=call
  if name=='apply'and isinstance(args[0]['node'],dict)and'Lambda'in args[0]['node']:return beta_substitute(args[0]['node']['Lambda'],args[1])
  if name.startswith('call:')and name[5:]in allowed:
   f=functions[name[5:]];return substitute(subject['functions'][f['name']],{n:x for (n,_),x in zip(f['params'],args)})
  if name.startswith('field:')and len(args)==1:
   constructor=args[0]['node'].get('Op')if isinstance(args[0]['node'],dict)else None
   if constructor and constructor[0].startswith('record:'):
    schema=records[constructor[0][7:]];index=next(i for i,(n,_)in enumerate(schema)if n==name[6:]);return constructor[1][index]
  if name=='call:choose'and 'Bool'in args[0]['node']:return args[1 if args[0]['node']['Bool']else 2]
  return None
 def shallow(t,budget):
  budget[0]-=1
  if budget[0]<0:raise ValueError('branch discovery budget')
  current=copy.deepcopy(t)
  for i,c in enumerate(children(current)):current=replace(current,[i],shallow(c,budget))
  changed=fixed(current)
  return shallow(changed,budget)if changed is not None else current
 def reflexive(t):
  parts=children(t)
  return {'Congruence':[reflexive(x)for x in parts]}if parts else 'Normalize'
 def one(t,guard=None,truth=None):
  changed=fixed(t)
  if changed is not None:return changed,'Unfold'
  call=t['node'].get('Op')if isinstance(t['node'],dict)else None
  if call and call[0]=='call:choose':
   condition,yes,no=call[1]
   if guard is None or (condition!=guard and shallow(condition,[10000])!=shallow(guard,[10000])):return None
   boolean=term(value('Bool'),{'Bool':truth});middle=op(t['sort'],'call:choose',boolean,yes,no)
   observed={'Trans':dict(middle=guard,left='Normalize',right={'Hypothesis':0})}
   proof={'Trans':dict(middle=middle,left={'Congruence':[observed,reflexive(yes),reflexive(no)]},right='Unfold')}
   return yes if truth else no,proof
  # Field projection must not evaluate the other constructor arguments.
  if call and call[0].startswith('record:'):return None
  for i,c in enumerate(children(t)):
   result=one(c,guard,truth)
   if result is not None:
    changed,proof=result;proofs=[reflexive(c)for c in children(t)];proofs[i]=proof
    return replace(t,[i],changed),{'Congruence':proofs}
  return None
 current=start
 for _ in range(limit):
  result=one(current)
  if result is None:break
  current=result[0]
 else:raise ValueError('source head discovery limit')
 def discover_guard(t,budget):
  budget[0]-=1
  if budget[0]<0:raise ValueError('source branch discovery limit')
  changed=fixed(t)
  if changed is not None:return discover_guard(changed,budget)
  call=t['node'].get('Op')if isinstance(t['node'],dict)else None
  if call and call[0]=='call:choose':return call[1][0]
  for child in children(t):
   found=discover_guard(child,budget)
   if found is not None:return found
  return None
 guard=guard_term if guard_term is not None else discover_guard(current,[10000])
 if guard is not None and guard['sort']!=value('Bool'):raise ValueError('branch guard must be Boolean')
 def prove(x,y,truth,budget):
  budget[0]-=1
  if budget[0]<0:raise ValueError('source equality authoring limit')
  if x==y:return reflexive(x)
  result=one(x,guard,truth)
  if result is not None:
   middle,p=result;return {'Trans':dict(middle=middle,left=p,right=prove(middle,y,truth,budget))}
  result=one(y,guard,truth)
  if result is not None:
   middle,p=result;return {'Trans':dict(middle=middle,left=prove(x,middle,truth,budget),right={'Sym':p})}
  nx,ny=x['node'],y['node']
  if x['sort']==y['sort']and isinstance(nx,dict)and isinstance(ny,dict)and 'Op'in nx and 'Op'in ny and nx['Op'][0]==ny['Op'][0]and len(children(x))==len(children(y))and all(a['sort']==b['sort']for a,b in zip(children(x),children(y))):
   return {'Congruence':[prove(i,j,truth,budget)for i,j in zip(children(x),children(y))]}
  return 'Normalize'
 proof=prove(start,target,None,[limit])if guard is None else {'Cases':dict(condition=guard,on_false=prove(start,target,False,[limit]),on_true=prove(start,target,True,[limit]))}
 theorem=law(params,start,target,proof);theorem['semantics']='ink-general-laws-v1'
 obj=semantic_entry(bind(theorem,core,subject));return obj,identity(obj)

def main():
 p=argparse.ArgumentParser(description=__doc__)
 for n in ['compiler','core']:p.add_argument('--'+n,type=Path,required=True)
 for n in ['left','right']:p.add_argument('--'+n,required=True)
 p.add_argument('--guard',type=Path,help='explicit typed Boolean guard; all branch uses still replay');p.add_argument('--unfold',action='append',default=[]);p.add_argument('--limit',type=int,default=128);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
 if not 1<=a.limit<=512:p.error('authoring limit must be between 1 and 512')
 def run(*args):
  r=subprocess.run(list(map(str,[a.compiler.resolve(),*args])),capture_output=True,text=True,timeout=180)
  if r.returncode:raise ValueError(r.stderr[-3000:])
  return r
 with tempfile.TemporaryDirectory(prefix='ink-source-pair-')as temporary:
  d=Path(temporary);semantic=d/'subject.json';run('emit-semantic',a.core.resolve(),'--core','-o',semantic)
  obj,lid=author(json.loads(a.core.read_bytes()),json.loads(semantic.read_bytes()),a.left,a.right,a.limit,a.unfold,json.loads(a.guard.read_bytes())if a.guard else None)
  store=Store.publish(d/'stage',[obj]);view=d/'view.json';view.write_bytes(canonical(store.bundle([lid])))
  result=run('knowledge-check',a.core.resolve(),view)
  if a.o.exists():raise ValueError('refusing to replace existing proof output')
  final=Store.publish(a.o,[obj],{'source/paired_function_equality':lid})
  (a.o/'checked-source.json').write_bytes(a.core.read_bytes());(a.o/'admission.json').write_text(result.stdout)
  (a.o/'scope.json').write_text(json.dumps(dict(left=a.left,right=a.right,law=lid,scope='paired pure function equality; caller simulation and representation invariants require separate proofs'))+'\n')
  print(json.dumps(dict(status='checked',law=lid,snapshot=final.snapshot_id)))

if __name__=='__main__':main()
