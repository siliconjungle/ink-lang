#!/usr/bin/env python3
"""Author a general indexed-loop frame theorem; kernel replay is mandatory."""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import value,var,op,word,arrow,term

def proposal():
 S=value({'Named':'S'});R=value({'Named':'R'});U=value('U32');B=value('Bool')
 count=var(U,'count');index=var(U,'index');state=var(S,'state')
 observe=var(arrow(S,R),'observe');stop=var(arrow(S,B),'stop');step=var(arrow(U,arrow(S,S)),'step')
 app=lambda f,a:op(f['sort']['Arrow'][1],'apply',f,a)
 obs=lambda s:app(observe,s)
 run=lambda n,i,s:op(S,'until.from',n,i,s,stop,step)
 previous=var(U,'previous');successor=op(U,'binary:+',previous,word('U32',1))
 increment=op(U,'binary:+',index,word('U32',1));changed=app(app(step,index),state)
 decrement=op(U,'binary:-',successor,word('U32',1))
 zero=op(B,'binary:==',successor,word('U32',0));stopped=app(stop,state)
 expanded=op(S,'call:choose',zero,state,op(S,'call:choose',stopped,state,run(decrement,increment,changed)))
 middle=obs(run(previous,increment,changed));observed=obs(changed)
 tail={'Trans':dict(middle=middle,left='Normalize',right={'Trans':dict(middle=observed,left={'GeneralizedHypothesis':dict(index=0,arguments=dict(index=increment,state=changed))},right={'Assume':dict(index=0,arguments=dict(item=index,current=state))})})}
 cases={'Cases':dict(condition=zero,on_true='Normalize',on_false={'Cases':dict(condition=stopped,on_true='Normalize',on_false=tail)})}
 proof={'GeneralizedInduction':dict(variable='count',generalize=['index','state'],names=['previous'],base='Normalize',step={'Trans':dict(middle=obs(expanded),left={'Congruence':['Normalize','Unfold']},right=cases)})}
 item=var(U,'item');current=var(S,'current')
 return dict(schema=1,semantics='ink-general-laws-v1',dependencies=[],types=['S','R'],params={x['node']['Free']:x['sort']for x in [count,index,state,observe,stop,step]},conditions=[],assumptions=[dict(name='preserved',params=dict(item=U,current=S),**{'from':obs(app(app(step,item),current)),'to':obs(current)})],**{'from':obs(run(count,index,state)),'to':obs(state)},proof=proof)

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--core',type=Path,required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
 obj=semantic_entry(proposal());key=identity(obj);store=Store.publish(a.o,[obj],{'until_frame':key});view=a.o/'view.json';view.write_bytes(canonical(store.bundle([key])))
 r=subprocess.run([a.compiler.resolve(),'knowledge-check',a.core.resolve(),view.resolve()],capture_output=True,text=True,timeout=120);(a.o/'admission.log').write_text(r.stdout+r.stderr)
 if r.returncode:raise ValueError(r.stderr[-3000:])
 (a.o/'checked-source.json').write_bytes(a.core.read_bytes());print(json.dumps(dict(status='checked',identity=key,scope='Arbitrary indexed bounded loop and observer; each application must prove every step preserves the observation.')))

if __name__=='__main__':main()
