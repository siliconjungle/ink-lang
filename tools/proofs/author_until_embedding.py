#!/usr/bin/env python3
"""Author a loop simulation on embedded states; ordinary kernel replay is mandatory.

Unlike projection over every possible large state, this theorem only needs the
transition and stopping facts on the image of the embedding. Captured immutable
data can therefore be left outside the smaller loop accumulator.
"""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import value,var,op,word,arrow

def proposal(projection):
 S=value({'Named':'State'});R=value({'Named':'Reduced'});U=value('U32');B=value('Bool')
 count=var(U,'count');index=var(U,'index');state=var(R,'state')
 embed=var(arrow(R,S),'embed');stop=var(arrow(S,B),'stop');reduced_stop=var(arrow(R,B),'reduced_stop')
 step=var(arrow(U,arrow(S,S)),'step');reduced_step=var(arrow(U,arrow(R,R)),'reduced_step')
 app=lambda f,x:op(f['sort']['Arrow'][1],'apply',f,x)
 image=lambda x:app(embed,x)
 advance=lambda i,s:app(app(step,i),s)
 reduced=lambda i,s:app(app(reduced_step,i),s)
 run=lambda n,i,s:op(S,'until.from',n,i,s,stop,step)
 small=lambda n,i,s:op(R,'until.from',n,i,s,reduced_stop,reduced_step)
 # The existing projection theorem is also a simulation on embedded states,
 # with State/Reduced exchanged. Reverse its equation and both assumptions.
 item=var(U,'__assumed_item');current=var(R,'__assumed_current')
 proof={'Sym':{'Use':dict(law=projection,types=dict(State=R['Value'],View=S['Value']),arguments=dict(count=count,index=index,state=state,project=embed,stop=reduced_stop,reduced_stop=stop,step=reduced_step,reduced=step),premises=[],assumptions=[{'Sym':{'Assume':dict(index=0,arguments=dict(item=item,current=current))}},{'Sym':{'Assume':dict(index=1,arguments=dict(current=current))}}])}}
 current=var(R,'current');item=var(U,'item')
 return dict(schema=1,semantics='ink-general-laws-v1',dependencies=[projection],types=['State','Reduced'],params={x['node']['Free']:x['sort']for x in [count,index,state,embed,stop,reduced_stop,step,reduced_step]},conditions=[],assumptions=[dict(name='transition',params=dict(item=U,current=R),**{'from':advance(item,image(current)),'to':image(reduced(item,current))}),dict(name='stopping',params=dict(current=R),**{'from':app(stop,image(current)),'to':app(reduced_stop,current)})],**{'from':run(count,index,image(state)),'to':image(small(count,index,state))},proof=proof)

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--core',type=Path,required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
 if a.o.exists():raise ValueError('refusing to overwrite proof output')
 parent=Store(ROOT/'knowledge/libraries/proofs/until-projection');projection=next(iter(parent.members()));obj=semantic_entry(proposal(projection));key=identity(obj);store=Store.publish(a.o,[*parent.bundle([projection])['objects'].values(),obj],{'until_embedding':key});view=a.o/'view.json';view.write_bytes(canonical(store.bundle([key])))
 r=subprocess.run([a.compiler.resolve(),'knowledge-check',a.core.resolve(),view.resolve()],capture_output=True,text=True,timeout=120);(a.o/'admission.log').write_text(r.stdout+r.stderr)
 if r.returncode:raise ValueError(r.stderr[-3000:])
 (a.o/'checked-source.json').write_bytes(a.core.read_bytes());print(json.dumps(dict(status='checked',identity=key,scope='Arbitrary bounded indexed loops; transition and stopping equality required only on embedded states.')))

if __name__=='__main__':main()
