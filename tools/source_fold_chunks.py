#!/usr/bin/env python3
"""Instantiate universal fold chunking for an actual checked source transition.

Function/type discovery is untrusted; definition contexts and equality proofs
must replay before publication. No application name grants rewrite authority.
"""
import argparse,json,subprocess,sys,tempfile
from pathlib import Path
sys.path[:0]=[str(Path(__file__).resolve().parents[1]/'knowledge')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from ink_knowledge.proposal_views import ProposalViews
from producers.definition_context28 import bind
from producers.semantic_laws import value,arrow,var,op,bound,lam,law

def author(core,subject,function,state_parameter,item_parameter,dependency,objects):
 f=next(f for f in core['program']['functions']if f['name']==function)
 if len(f['params'])!=2:raise ValueError('two-parameter transition required')
 params=dict(f['params']);state=params[state_parameter];item=params[item_parameter]
 if f['result']!=state or state_parameter==item_parameter:raise ValueError('state-returning transition required')
 s,a=value(state),value(item);ls=value({'List':item})
 args={state_parameter:bound(s,0),item_parameter:bound(a,1)}
 step=lam(a,lam(s,op(s,'call:'+function,*(args[n]for n,_ in f['params']))))
 xs,ys,start=var(ls,'prefix'),var(ls,'suffix'),var(s,'initial')
 left=op(s,'call:foldl',op(ls,'method:concat',xs,ys),start,step)
 right=op(s,'call:foldl',ys,op(s,'call:foldl',xs,start,step),step)
 # Source function parameters elaborate to an eta-expanded callback. Replay
 # that exact theorem instance, then normalize beta applications at each end.
 wrapped=lam(a,lam(s,op(s,'apply',op(arrow(s,s),'apply',step,bound(a,1)),bound(s,0))))
 middle_left=op(s,'call:foldl',op(ls,'method:concat',xs,ys),start,wrapped)
 middle_right=op(s,'call:foldl',ys,op(s,'call:foldl',xs,start,wrapped),wrapped)
 used=dict(Use=dict(law=dependency,arguments=dict(xs=xs,ys=ys,state=start,step=step),premises=[],types=dict(A=item,S=state)))
 proof=dict(Trans=dict(middle=middle_left,left='Normalize',right=dict(Trans=dict(middle=middle_right,left=used,right='Normalize'))))
 theorem=bind(law(dict(prefix=ls,suffix=ls,initial=s),left,right,proof,dependencies=[dependency]),core,subject,[function])
 theorem['semantics']='ink-general-laws-v1';obj=semantic_entry(theorem)
 return obj,identity(obj)

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--compiler',type=Path,required=True);p.add_argument('--core',type=Path,required=True)
 p.add_argument('--function',required=True);p.add_argument('--state-parameter',required=True);p.add_argument('--item-parameter',required=True)
 p.add_argument('--dependencies',type=Path,required=True);p.add_argument('--fold-law',required=True);p.add_argument('-o',type=Path,required=True)
 a=p.parse_args();compiler=a.compiler.resolve();core=a.core.resolve();store=Store(a.dependencies)
 dependencies=store.bundle([a.fold_law]);objects=dict(dependencies['objects'])
 with tempfile.TemporaryDirectory(prefix='ink-source-fold-chunks-')as td:
  d=Path(td);subject=d/'semantic.json'
  r=subprocess.run([compiler,'emit-semantic',core,'--core','-o',subject],capture_output=True,text=True,timeout=180)
  if r.returncode:raise ValueError(r.stderr[-3000:])
  obj,lid=author(json.loads(core.read_bytes()),json.loads(subject.read_bytes()),a.function,a.state_parameter,a.item_parameter,a.fold_law,objects)
  objects[lid]=obj;staged=Store.publish(d/'staged',list(objects.values()));view=d/'view.json';view.write_bytes(canonical(staged.bundle([lid])))
  r=subprocess.run([compiler,'knowledge-check',core,view],capture_output=True,text=True,timeout=180)
  if r.returncode:raise ValueError(r.stderr[-3000:])
  a.o.mkdir(parents=True,exist_ok=True);published=Store.publish(a.o,list(objects.values()),{'source/transition_chunks':lid})
  (a.o/'admission.json').write_text(r.stdout);(a.o/'subject.json').write_text(json.dumps(dict(function=a.function,state_parameter=a.state_parameter,item_parameter=a.item_parameter,law=lid))+'\n')
  print(json.dumps(dict(status='checked',law=lid,snapshot=published.snapshot['root'])))

if __name__=='__main__':main()
