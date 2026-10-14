#!/usr/bin/env python3
"""Author source-bound field preservation with bounded Boolean case discovery.

Beta reduction and guard discovery are untrusted. The existing checker replays
every case and source definition; only its admission permits publication.
"""
import argparse,copy,json,subprocess,sys,tempfile
from pathlib import Path
sys.path[:0]=[str(Path(__file__).resolve().parents[1]/'knowledge')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.definition_context28 import bind
from producers.semantic_laws import value,var,op,law

def shift(t,amount,depth=0):
 t=copy.deepcopy(t);node=t['node']
 if isinstance(node,dict)and 'Bound'in node:
  if node['Bound']>=depth:node['Bound']+=amount
 elif isinstance(node,dict)and 'Lambda'in node:node['Lambda']=shift(node['Lambda'],amount,depth+1)
 elif isinstance(node,dict)and 'Op'in node:node['Op'][1]=[shift(a,amount,depth)for a in node['Op'][1]]
 elif isinstance(node,dict)and 'Cons'in node:node['Cons']=[shift(a,amount,depth)for a in node['Cons']]
 return t
def substitute(t,arg,depth=0):
 t=copy.deepcopy(t);node=t['node']
 if isinstance(node,dict)and 'Bound'in node:
  index=node['Bound']
  if index==depth:return shift(arg,depth)
  if index>depth:node['Bound']-=1
 elif isinstance(node,dict)and 'Lambda'in node:node['Lambda']=substitute(node['Lambda'],arg,depth+1)
 elif isinstance(node,dict)and 'Op'in node:node['Op'][1]=[substitute(a,arg,depth)for a in node['Op'][1]]
 elif isinstance(node,dict)and 'Cons'in node:node['Cons']=[substitute(a,arg,depth)for a in node['Cons']]
 return t
def beta(t,budget):
 budget[0]-=1
 if budget[0]<0:raise ValueError('authoring beta budget exhausted')
 t=copy.deepcopy(t);node=t['node']
 if isinstance(node,dict)and 'Lambda'in node:node['Lambda']=beta(node['Lambda'],budget)
 elif isinstance(node,dict)and 'Op'in node:
  node['Op'][1]=[beta(a,budget)for a in node['Op'][1]];name,args=node['Op']
  if name=='apply'and len(args)==2 and isinstance(args[0]['node'],dict)and 'Lambda'in args[0]['node']:return beta(substitute(args[0]['node']['Lambda'],args[1]),budget)
 elif isinstance(node,dict)and 'Cons'in node:node['Cons']=[beta(a,budget)for a in node['Cons']]
 return t
def author(core,subject,function,state_parameter,fields,max_guards=4):
 f=next(f for f in core['program']['functions']if f['name']==function);args={n:var(value(t),n)for n,t in f['params']};state=dict(f['params'])[state_parameter]
 if f['result']!=state:raise ValueError('function must return its state type')
 def observe(t):
  ty=state
  for name in fields:
   if not isinstance(ty,dict)or 'Named'not in ty:raise ValueError('declared record field required')
   ty=dict(core['program']['records'][ty['Named']])[name];t=op(value(ty),'field:'+name,t)
  return t
 guards={}
 def walk(t,depth=0):
  node=t['node']
  if isinstance(node,dict)and 'Op'in node:
   name,children=node['Op']
   if name=='call:choose'and depth==0:guards.setdefault(identity(children[0]),children[0])
   for child in children:walk(child,depth)
  elif isinstance(node,dict)and 'Lambda'in node:walk(node['Lambda'],depth+1)
  elif isinstance(node,dict)and 'Cons'in node:
   for child in node['Cons']:walk(child,depth)
 walk(beta(subject['functions'][function],[100000]));guards=list(guards.values())
 if not 0<=max_guards<=6 or len(guards)>max_guards:raise ValueError('bounded guard discovery limit')
 def proof(i):return 'Normalize'if i==len(guards)else{'Cases':dict(condition=guards[i],on_false=proof(i+1),on_true=proof(i+1))}
 left=observe(op(value(state),'call:'+function,*(args[n]for n,t in f['params'])));right=observe(args[state_parameter])
 theorem=bind(law({n:a['sort']for n,a in args.items()},left,right,proof(0)),core,subject);obj=semantic_entry(theorem);return obj,identity(obj)
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--core',type=Path,required=True);p.add_argument('--function',required=True);p.add_argument('--state-parameter',required=True);p.add_argument('--field',required=True);p.add_argument('--max-guards',type=int,default=4);p.add_argument('-o',type=Path,required=True);a=p.parse_args();compiler=a.compiler.resolve();source=a.core.resolve()
 with tempfile.TemporaryDirectory(prefix='ink-source-field-')as td:
  d=Path(td);subject=d/'semantic.json'
  def run(*args):
   r=subprocess.run(list(map(str,args)),capture_output=True,text=True,timeout=180)
   if r.returncode:raise ValueError(r.stderr[-3000:])
   return r
  run(compiler,'emit-semantic',source,'--core','-o',subject)
  obj,lid=author(json.loads(source.read_bytes()),json.loads(subject.read_bytes()),a.function,a.state_parameter,a.field.split('.'),a.max_guards)
  stage=Store.publish(d/'staged',[obj]);view=d/'view.json';view.write_bytes(canonical(stage.bundle([lid])));r=run(compiler,'knowledge-check',source,view)
  a.o.mkdir(parents=True,exist_ok=True);store=Store.publish(a.o,[obj],{'source/field_preservation':lid})
  for src,name in [(source,'checked-source.json'),(subject,'subject.json')]: (a.o/name).write_bytes(src.read_bytes())
  (a.o/'admission.json').write_text(r.stdout);(a.o/'scope.json').write_text(json.dumps(dict(function=a.function,field=a.field,law=lid))+'\n')
  print(json.dumps(dict(status='checked',law=lid,snapshot=store.snapshot['root'])))
if __name__=='__main__':main()
