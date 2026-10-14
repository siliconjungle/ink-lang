#!/usr/bin/env python3
"""Author a source-bound decoder/transition fold commutation proof.

This proposes ordinary generalized induction. Names, signatures and the decoder
composition grant no authority: the checker must establish the source step.
"""
import argparse,json,subprocess,sys,tempfile
from pathlib import Path
sys.path[:0]=[str(Path(__file__).resolve().parents[1]/'knowledge')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.definition_context28 import bind
from producers.semantic_laws import value,var,op,law,bound,lam

def author(core,subject,physical,decoder,logical,physical_state,logical_state,decode_step=False):
 fs={f['name']:f for f in core['program']['functions']};pf,df,lf=fs[physical],fs[decoder],fs[logical]
 pp,lp=dict(pf['params']),dict(lf['params'])
 if len(pp)!=2 or len(lp)!=2 or len(df['params'])!=1:raise ValueError('two transition arguments and one decoder argument required')
 pt,lt=pp[physical_state],lp[logical_state];item_parameter=next(n for n in pp if n!=physical_state);li=next(n for n in lp if n!=logical_state);item=pp[item_parameter]
 if pf['result']!=pt or df['params'][0][1]!=pt or df['result']!=lt or lp[li]!=item:raise ValueError('transition/decoder type mismatch')
 if decode_step:
  if lf['result']!=pt:raise ValueError('composed logical transition must return the decoder input')
 elif lf['result']!=lt:raise ValueError('logical transition must return its state')
 ps,ls,u,items_sort=value(pt),value(lt),value(item),value({'List':item})
 def decode(state):return op(ls,'call:'+decoder,state)
 def pc(state,item):
  args={physical_state:state,item_parameter:item};return op(ps,'call:'+physical,*(args[n]for n,_ in pf['params']))
 def lc(state,item):
  args={logical_state:state,li:item};out=op(value(lf['result']),'call:'+logical,*(args[n]for n,_ in lf['params']));return decode(out)if decode_step else out
 physical_step=lam(u,lam(ps,pc(bound(ps,0),bound(u,1))));logical_step=lam(u,lam(ls,lc(bound(ls,0),bound(u,1))))
 def physical_fold(items,state):return op(ps,'call:foldl',items,state,physical_step)
 def logical_fold(items,state):return op(ls,'call:foldl',items,state,logical_step)
 initial=var(ps,'initial');items=var(items_sort,'items');head=var(u,'head');tail=var(items_sort,'tail');changed=pc(initial,head)
 proof={'GeneralizedInduction':dict(variable='items',generalize=['initial'],names=['head','tail'],base='Normalize',step={
  'Trans':dict(middle=decode(physical_fold(tail,changed)),left='Normalize',right={
   'Trans':dict(middle=logical_fold(tail,decode(changed)),left={'GeneralizedHypothesis':dict(index=0,arguments={'initial':changed})},right='Normalize')})})}
 theorem=bind(law(dict(items=items_sort,initial=ps),decode(physical_fold(items,initial)),logical_fold(items,decode(initial)),proof),core,subject)
 obj=semantic_entry(theorem);return obj,identity(obj)

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--core',type=Path,required=True)
 p.add_argument('--physical',required=True);p.add_argument('--decoder',required=True);p.add_argument('--logical',required=True);p.add_argument('--physical-state',required=True);p.add_argument('--logical-state',required=True);p.add_argument('--decode-step',action='store_true');p.add_argument('-o',type=Path,required=True);a=p.parse_args()
 compiler=a.compiler.resolve();source=a.core.resolve()
 with tempfile.TemporaryDirectory(prefix='ink-source-fold-commutation-')as td:
  d=Path(td);subject=d/'semantic.json';r=subprocess.run([compiler,'emit-semantic',source,'--core','-o',subject],capture_output=True,text=True,timeout=180)
  if r.returncode:raise ValueError(r.stderr[-3000:])
  obj,lid=author(json.loads(source.read_bytes()),json.loads(subject.read_bytes()),a.physical,a.decoder,a.logical,a.physical_state,a.logical_state,a.decode_step)
  stage=Store.publish(d/'staged',[obj]);view=d/'view.json';view.write_bytes(canonical(stage.bundle([lid])))
  r=subprocess.run([compiler,'knowledge-check',source,view],capture_output=True,text=True,timeout=180)
  if r.returncode:raise ValueError(r.stderr[-3000:])
  a.o.mkdir(parents=True,exist_ok=True);store=Store.publish(a.o,[obj],{'source/fold_commutation':lid})
  for src,name in [(source,'checked-source.json'),(subject,'subject.json')]: (a.o/name).write_bytes(src.read_bytes())
  (a.o/'admission.json').write_text(r.stdout);(a.o/'scope.json').write_text(json.dumps(dict(physical=a.physical,decoder=a.decoder,logical=a.logical,decode_step=a.decode_step,law=lid))+'\n')
  print(json.dumps(dict(status='checked',law=lid,snapshot=store.snapshot['root'])))

if __name__=='__main__':main()
