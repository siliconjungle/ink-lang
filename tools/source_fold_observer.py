#!/usr/bin/env python3
"""Prove a source transition's scalar preservation or append decoder by induction.

Field paths and function choices are untrusted authoring inputs. Only ordinary
source normalization and generalized list induction grant equality authority.
"""
import argparse,json,subprocess,sys,tempfile
from pathlib import Path
sys.path[:0]=[str(Path(__file__).resolve().parents[1]/'knowledge')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.definition_context28 import bind
from producers.semantic_laws import value,var,op,law,bound,lam
from source_field_preservation import shift

def author(core,subject,function,state_parameter,item_parameter,fields,append=False,projector=None,state_projector=False):
 program=core['program'];f=next(f for f in program['functions']if f['name']==function)
 params=dict(f['params'])
 if len(params)!=2 or state_parameter==item_parameter:raise ValueError('two distinct parameters required')
 state,item=params[state_parameter],params[item_parameter]
 if f['result']!=state:raise ValueError('transition must return its state type')
 ps,u,ls=value(state),value(item),value({'List':item})
 field_types=[];ty=state
 for name in fields:
  if not isinstance(ty,dict)or 'Named'not in ty:raise ValueError('observer path requires declared records')
  ty=dict(program['records'][ty['Named']])[name];field_types.append((name,ty))
 decoded=isinstance(ty,dict)and 'Buffer'in ty
 if decoded:ty={'List':ty['Buffer']}
 if projector is not None and not append:raise ValueError('projector requires append observation')
 if append and projector is None and ty!={'List':item}:raise ValueError('append observation must decode a list of the item type')
 if projector is not None:
  if not isinstance(ty,dict)or 'List'not in ty:raise ValueError('projected append requires decoded list')
  expected={'Arrow':[ps,{'Arrow':[value(item),value(ty['List'])]}]}if state_projector else {'Arrow':[value(item),value(ty['List'])]}
  if projector['sort']!=expected:raise ValueError('projector signature')
 result=value(ty)
 def observe(state_term):
  for name,field_type in field_types:state_term=op(value(field_type),'field:'+name,state_term)
  return op(result,'method:freeze',state_term)if decoded else state_term
 def transition(state_term,item_term):
  args={state_parameter:state_term,item_parameter:item_term}
  return op(ps,'call:'+function,*(args[name]for name,_ in f['params']))
 physical=lam(u,lam(ps,transition(bound(ps,0),bound(u,1))))
 def physical_fold(items,state_term):return op(ps,'call:foldl',items,state_term,physical)
 def target(items,state_term):
  if not append:return observe(state_term)
  projection=op(projector['sort']['Arrow'][1],'apply',projector,state_term)if state_projector else projector
  projected=op(value(ty['List']),'apply',shift(projection,2),bound(u,1))if projection is not None else bound(u,1)
  logical=lam(u,lam(result,op(result,'local:append',bound(result,0),projected)))
  return op(result,'call:foldl',items,observe(state_term),logical)
 initial=var(ps,'initial');items=var(ls,'items');head=var(u,'head');tail=var(ls,'tail')
 changed=transition(initial,head)
 proof={'GeneralizedInduction':dict(variable='items',generalize=['initial'],names=['head','tail'],base='Normalize',step={
  'Trans':dict(middle=observe(physical_fold(tail,changed)),left='Normalize',right={
   'Trans':dict(middle=target(tail,changed),left={'GeneralizedHypothesis':dict(index=0,arguments={'initial':changed})},right='Normalize')})})}
 theorem=bind(law(dict(items=ls,initial=ps),observe(physical_fold(items,initial)),target(items,initial),proof),core,subject)
 obj=semantic_entry(theorem);return obj,identity(obj)

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--core',type=Path,required=True)
 p.add_argument('--transition',required=True);p.add_argument('--state-parameter',required=True);p.add_argument('--item-parameter',required=True)
 p.add_argument('--observer',required=True,help='dot-separated record fields; final Buffer is decoded by freeze')
 p.add_argument('--state-projector',action='store_true',help='projector takes initial state then item; checked transition must preserve its meaning');p.add_argument('--projector',type=Path,help='typed semantic projection term; source theorem must establish it');p.add_argument('--append',action='store_true',help='prove decoded list fold, otherwise prove observer preservation');p.add_argument('-o',type=Path,required=True);a=p.parse_args()
 compiler=a.compiler.resolve();source=a.core.resolve()
 with tempfile.TemporaryDirectory(prefix='ink-source-fold-observer-')as td:
  d=Path(td);subject=d/'semantic.json'
  r=subprocess.run([compiler,'emit-semantic',source,'--core','-o',subject],capture_output=True,text=True,timeout=180)
  if r.returncode:raise ValueError(r.stderr[-3000:])
  obj,lid=author(json.loads(source.read_bytes()),json.loads(subject.read_bytes()),a.transition,a.state_parameter,a.item_parameter,a.observer.split('.'),a.append,json.loads(a.projector.read_bytes())if a.projector else None,a.state_projector)
  staged=Store.publish(d/'staged',[obj]);view=d/'view.json';view.write_bytes(canonical(staged.bundle([lid])))
  r=subprocess.run([compiler,'knowledge-check',source,view],capture_output=True,text=True,timeout=180)
  if r.returncode:raise ValueError(r.stderr[-3000:])
  a.o.mkdir(parents=True,exist_ok=True);published=Store.publish(a.o,[obj],{'source/fold_observer':lid})
  (a.o/'checked-source.json').write_bytes(source.read_bytes());(a.o/'subject.json').write_bytes(subject.read_bytes());(a.o/'admission.json').write_text(r.stdout)
  (a.o/'scope.json').write_text(json.dumps(dict(function=a.transition,observer=a.observer,append=a.append,law=lid))+'\n')
  print(json.dumps(dict(status='checked',law=lid,snapshot=published.snapshot['root'])))

if __name__=='__main__':main()
