#!/usr/bin/env python3
"""Bounded source-field proof author using already checked observer laws.
No proof authority: exact Unfold, Congruence and Use replay in the kernel.
"""
import argparse,copy,json,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner'),str(Path(__file__).resolve().parent)]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import law,value,var,op,term
from producers.definition_context28 import bind
from ink_planner.semantic_search import children,match,substitute,replace
from source_field_preservation import substitute as beta,shift

def author(core,subject,function,parameter,field,objects,limit=96,input_field=None,unfold=(),equation=None):
 if not 1<=limit<=256 or len(objects)>256:raise ValueError('composition resource bound')
 functions={f['name']:f for f in core['program']['functions']};f=functions[function];params={n:value(t)for n,t in f['params']};state=dict(f['params'])[parameter]
 def observe(x,ty,path):
  for name in path.split('.'):
   ty=dict(core['program']['records'][ty['Named']])[name];x=op(value(ty),'field:'+name,x)
  return x
 if equation is None:
  start=observe(op(value(f['result']),'call:'+function,*(var(params[n],n)for n,_ in f['params'])),f['result'],field)
  target=observe(var(params[parameter],parameter),state,input_field or field)
 else:
  if set(equation)!={'params','from','to'}:raise ValueError('explicit equation fields')
  params=equation['params'];start=equation['from'];target=equation['to']
 if start['sort']!=target['sort']:raise ValueError('observer result mismatch')
 dependencies=set()
 allowed={function,*unfold}
 if not allowed.issubset(functions):raise ValueError('unknown source unfold')
 def reflexive(t):
  parts=children(t)
  return {'Congruence':[reflexive(x)for x in parts]}if parts else 'Normalize'
 def source_head(t,budget):
  budget[0]-=1
  if budget[0]<0:raise ValueError('pattern unfolding resource bound')
  out=copy.deepcopy(t)
  for i,x in enumerate(children(t)):out=replace(out,[i],source_head(x,budget))
  call=out['node'].get('Op')if isinstance(out['node'],dict)else None
  if call and call[0].startswith('call:')and call[0][5:]in unfold:
   source=functions[call[0][5:]];return source_head(substitute(subject['functions'][source['name']],{n:x for(n,_),x in zip(source['params'],call[1])}),budget)
  if call and call[0]=='apply'and isinstance(call[1][0]['node'],dict)and'Lambda'in call[1][0]['node']:
   return source_head(beta(call[1][0]['node']['Lambda'],call[1][1]),budget)
  return out
 def conversion_step(t):
  call=t['node'].get('Op')if isinstance(t['node'],dict)else None
  if call:
   name,args=call
   if name.startswith('call:')and name[5:]in unfold:
    source=functions[name[5:]];return substitute(subject['functions'][source['name']],{n:x for(n,_),x in zip(source['params'],args)}),'Unfold'
   if name=='apply'and isinstance(args[0]['node'],dict)and'Lambda'in args[0]['node']:return beta(args[0]['node']['Lambda'],args[1]),'Unfold'
  for i,x in enumerate(children(t)):
   found=conversion_step(x)
   if found:
    y,p=found;proofs=[reflexive(x)for x in children(t)];proofs[i]=p;return replace(t,[i],y),{'Congruence':proofs}
  return None
 def convert(left,right,budget,env=None):
  env=set(params)if env is None else env
  budget[0]-=1
  if budget[0]<0:raise ValueError('conversion resource bound')
  if left==right:return reflexive(left)
  # Congruence avoids unfolding unrelated source terms in sibling arguments.
  a,b=left['node'],right['node']
  if left['sort']==right['sort']and isinstance(a,dict)and isinstance(b,dict)and'Op'in a and'Op'in b and a['Op'][0]==b['Op'][0]:
   return {'Congruence':[convert(x,y,budget,env)for x,y in zip(children(left),children(right))]}
  if left['sort']==right['sort']and isinstance(a,dict)and isinstance(b,dict)and'Lambda'in a and'Lambda'in b:
   name='__congruence'
   while name in env:name+='_'
   argument=var(left['sort']['Arrow'][0],name)
   return {'Congruence':[convert(beta(a['Lambda'],argument),beta(b['Lambda'],argument),budget,env|{name})]}
  found=conversion_step(left)
  if found:
   middle,p=found;return {'Trans':dict(middle=middle,left=p,right=convert(middle,right,budget,env))}
  found=conversion_step(right)
  if found:
   middle,p=found;return {'Trans':dict(middle=middle,left=convert(left,middle,budget,env),right={'Sym':p})}
  raise ValueError('no exact source conversion')
 def reduction(t,guards=(),env=None):
  env=set(params)if env is None else env
  for lid,obj in objects.items():
   p=obj['payload']
   if p.get('conditions')or p.get('type_params')or p.get('assumptions')or p['from']==p['to']:continue
   bindings={}
   pattern=source_head(p['from'],[10000])if unfold else p['from']
   actual=source_head(t,[10000])if unfold else t
   if match(pattern,actual,p['params'],bindings):
    if set(bindings)!=set(p['params']):continue
    dependencies.add(lid);middle=substitute(p['from'],bindings);proof={'Use':dict(law=lid,arguments=bindings,premises=[])}
    if t!=middle:proof={'Trans':dict(middle=middle,left=convert(t,middle,[256]),right=proof)}
    return substitute(p['to'],bindings),proof
  call=t['node'].get('Op')if isinstance(t['node'],dict)else None
  if not call:
   node=t['node']
   if isinstance(node,dict)and 'Lambda'in node:
    name='__congruence'
    while name in env:name+='_'
    argument=var(t['sort']['Arrow'][0],name)
    opened=beta(node['Lambda'],argument);found=reduction(opened,guards,env|{name})
    if found:
     changed,p=found
     def close(x,depth=0):
      n=x['node']
      if isinstance(n,dict)and n.get('Free')==name:return term(x['sort'],{'Bound':depth})
      out=x
      for i,child in enumerate(children(x)):out=replace(out,[i],close(child,depth+int(isinstance(n,dict)and 'Lambda'in n)))
      return out
     return term(t['sort'],{'Lambda':close(shift(changed,1))}),{'Congruence':[p]}
   else:
    for i,x in enumerate(children(t)):
     found=reduction(x,guards,env)
     if found:
      y,p=found;proofs=[reflexive(x)for x in children(t)];proofs[i]=p;return replace(t,[i],y),{'Congruence':proofs}
   return None
  name,args=call
  if name=='call:choose':
   for hypothesis,(guard,truth)in enumerate(guards):
    if args[0]!=guard:continue
    boolean=term(value('Bool'),{'Bool':truth});middle=op(t['sort'],name,boolean,args[1],args[2]);return args[1 if truth else 2],{'Trans':dict(middle=middle,left={'Congruence':[{'Hypothesis':hypothesis},'Normalize','Normalize']},right='Unfold')}
  if name.startswith('record:'):return None
  if name=='apply'and isinstance(args[0]['node'],dict)and'Lambda'in args[0]['node']:return beta(args[0]['node']['Lambda'],args[1]),'Unfold'
  if name.startswith('call:')and name[5:]in allowed:
   source=functions[name[5:]];return substitute(subject['functions'][source['name']],{n:x for(n,_),x in zip(source['params'],args)}),'Unfold'
  if name.startswith('field:')and len(args)==1:
   c=args[0]['node'].get('Op')if isinstance(args[0]['node'],dict)else None
   if c and c[0].startswith('record:'):
    i=next(i for i,(n,_)in enumerate(core['program']['records'][c[0][7:]])if n==name[6:]);return c[1][i],'Unfold'
  for i,x in enumerate(children(t)):
   found=reduction(x,guards,env)
   if found:
    y,p=found;proofs=[reflexive(x)for x in children(t)];proofs[i]=p;return replace(t,[i],y),{'Congruence':proofs}
  return None
 def prove(t,budget,guards=()):
  budget[0]-=1
  if budget[0]<0:raise ValueError('bounded composition exhausted')
  if t==target:return 'Normalize'
  r=reduction(t,guards)
  if r:
   middle,p=r;return {'Trans':dict(middle=middle,left=p,right=prove(middle,budget,guards))}
  if len(guards)<4:
   def conditions(x):
    node=x['node']
    if isinstance(node,dict)and'Lambda'in node:return
    call=node.get('Op')if isinstance(node,dict)else None
    if call and call[0]=='call:choose':yield call[1][0]
    for child in children(x):yield from conditions(child)
   condition=next((x for x in conditions(t)if all(x!=g for g,_ in guards)),None)
   if condition is not None:return {'Cases':dict(condition=condition,on_false=prove(t,budget,guards+((condition,False),)),on_true=prove(t,budget,guards+((condition,True),)))}
  # A bounded fallback proposes exact semantic normalization; the independent
  # checker may reject it and no packet is published on failure.
  if equation is not None:
   def finish(left,right,env):
    if left==right:return reflexive(left)
    a,b=left['node'],right['node']
    if left['sort']==right['sort']and isinstance(a,dict)and isinstance(b,dict):
     if 'Op'in a and 'Op'in b and a['Op'][0]==b['Op'][0]and len(children(left))==len(children(right)):
      return {'Congruence':[finish(x,y,env)for x,y in zip(children(left),children(right))]}
     if 'Lambda'in a and 'Lambda'in b:
      name='__congruence'
      while name in env:name+='_'
      argument=var(left['sort']['Arrow'][0],name)
      return {'Congruence':[finish(beta(a['Lambda'],argument),beta(b['Lambda'],argument),env|{name})]}
    return 'Normalize'
   return finish(t,target,set(params))
  raise ValueError('unreduced source field: '+json.dumps(t)[:1200])
 if equation is not None:
  original_target=target;current=target;trail=[]
  for _ in range(limit):
   reduced=reduction(current)
   if reduced is None:break
   following,step_proof=reduced;trail.append((current,following,step_proof));current=following
  else:raise ValueError('bounded target composition exhausted')
  target=current;left=prove(start,[limit])
  if trail:
   backward='Normalize'
   for before,after,step_proof in trail:
    backward={'Trans':dict(middle=before,left={'Sym':step_proof},right=backward)}
   proof={'Trans':dict(middle=current,left=left,right=backward)}
  else:proof=left
  target=original_target
 else:proof=prove(start,[limit])
 theorem=law(params,start,target,proof,dependencies=sorted(dependencies));theorem['semantics']='ink-general-laws-v1';from producers.definition_context28 import calls
 roots=calls(theorem,functions)|set(unfold)
 for dependency in dependencies:
  context=objects[dependency]['payload'].get('definition_context',{})
  roots.update(name for name in context.get('definitions',{})if name in functions)
 obj=semantic_entry(bind(theorem,core,subject,roots=roots));return obj,identity(obj)

def main():
 p=argparse.ArgumentParser(description=__doc__)
 for n in ['compiler','core','dependency-store']:p.add_argument('--'+n,type=Path,required=True)
 for n in ['function','state-parameter','field']:p.add_argument('--'+n,required=True)
 p.add_argument('--input-field')
 p.add_argument('--equation',type=Path,help='explicit params/from/to endpoints; every proof still replays')
 p.add_argument('--unfold',action='append',default=[])
 p.add_argument('-o',type=Path,required=True);a=p.parse_args();source=a.core.resolve();c=a.compiler.resolve();dependencies=Store(a.dependency_store);objects={i:dependencies.object(i)for i in dependencies.members()}
 def run(*args):
  r=subprocess.run(list(map(str,[c,*args])),capture_output=True,text=True,timeout=180)
  if r.returncode:raise ValueError(r.stderr[-1800:])
  return r
 with tempfile.TemporaryDirectory(prefix='ink-field-compose-')as td:
  d=Path(td);subject=d/'subject.json';run('emit-semantic',source,'--core','-o',subject);obj,lid=author(json.loads(source.read_bytes()),json.loads(subject.read_bytes()),a.function,a.state_parameter,a.field,objects,input_field=a.input_field,unfold=a.unfold,equation=json.loads(a.equation.read_bytes())if a.equation else None);staged=Store.publish(d/'stage',[*objects.values(),obj]);v=d/'view.json';v.write_bytes(canonical(staged.bundle([lid])));r=run('knowledge-check',source,v)
  if a.o.exists():raise ValueError('refusing existing output')
  s=Store.publish(a.o,[*objects.values(),obj],{'source/composed_field':lid});(a.o/'checked-source.json').write_bytes(source.read_bytes());(a.o/'admission.json').write_text(r.stdout);(a.o/'scope.json').write_text(json.dumps(dict(law=lid,function=a.function,field=a.field,scope='source field preservation only'))+'\n');print(json.dumps(dict(status='checked',law=lid,snapshot=s.snapshot['root'])))
if __name__=='__main__':main()
