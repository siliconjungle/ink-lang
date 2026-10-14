#!/usr/bin/env python3
"""Author the universal indexed-loop projection theorem; kernel replay is mandatory."""
import argparse,sys
ROOT=__import__('pathlib').Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--compiler',type=__import__('pathlib').Path,required=True)
parser.add_argument('--core',type=__import__('pathlib').Path,required=True)
parser.add_argument('-o',type=__import__('pathlib').Path,required=True)
args=parser.parse_args()
if args.o.exists():raise ValueError('refusing to replace proof output')
import json,subprocess
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import value,var,op,term,lam,bound,arrow
S=value({'Named':'State'});R=value({'Named':'View'});U=value('U32');B=value('Bool')
n=var(U,'count');i=var(U,'index');s=var(S,'state');p=var(arrow(S,R),'project');st=var(arrow(S,B),'stop');rt=var(arrow(R,B),'reduced_stop');f=var(arrow(U,arrow(S,S)),'step');g=var(arrow(U,arrow(R,R)),'reduced')
app=lambda a,b:op(a['sort']['Arrow'][1],'apply',a,b)
proj=lambda x:app(p,x)
step=lambda x,y:app(app(f,x),y)
rstep=lambda x,y:app(app(g,x),y)
until=lambda c,j,x:op(S,'until.from',c,j,x,st,f)
runt=lambda c,j,x:op(R,'until.from',c,j,x,rt,g)
word=lambda x:term(U,{'Word':x})
prev=var(U,'previous');succ=op(U,'binary:+',prev,word(1));dec=op(U,'binary:-',succ,word(1));inc=op(U,'binary:+',i,word(1));changed=step(i,s)
zero=op(B,'binary:==',succ,word(0));stopped=app(st,s)
choose=lambda t,c,a,b:op(t,'call:choose',c,a,b)
unfold=choose(S,zero,s,choose(S,stopped,s,until(dec,inc,changed)))
logical_unfold=choose(R,zero,proj(s),choose(R,app(rt,proj(s)),proj(s),runt(dec,inc,rstep(i,proj(s)))))
# Normalize finite branch heads; recursive calls remain symbolic after explicit unfold.
false_mid=proj(until(prev,inc,changed));ih_mid=runt(prev,inc,proj(changed));sim_mid=runt(prev,inc,rstep(i,proj(s)))
trans=lambda middle,left,right:{'Trans':{'middle':middle,'left':left,'right':right}}
simproof={'Congruence':['Normalize','Normalize',{'Assume':{'index':0,'arguments':{'item':i,'current':s}}},'Normalize','Normalize']}
ihproof={'GeneralizedHypothesis':{'index':0,'arguments':{'index':inc,'state':changed}}}
logical_same=choose(R,zero,proj(s),choose(R,stopped,proj(s),runt(dec,inc,rstep(i,proj(s)))))
stopproof={'Sym':{'Assume':{'index':1,'arguments':{'current':s}}}}
stoprewrite={'Congruence':['Normalize','Normalize',{'Congruence':[stopproof,'Normalize','Normalize']}]}
expandedproof=trans(logical_unfold,'Unfold',stoprewrite)
falseproof=trans(false_mid,'Normalize',trans(ih_mid,ihproof,trans(sim_mid,simproof,{'Sym':trans(logical_same,expandedproof,'Normalize')})))
trueproof=trans(proj(s),'Normalize',{'Sym':trans(logical_same,expandedproof,'Normalize')})
right_cases={'Cases':{'condition':zero,'on_true':trueproof,'on_false':{'Cases':{'condition':stopped,'on_true':trueproof,'on_false':falseproof}}}}

proof={'GeneralizedInduction':{'variable':'count','generalize':['index','state'],'names':['previous'],'base':'Normalize','step':{'Trans':{'middle':proj(unfold),'left':{'Congruence':['Normalize','Unfold']},'right':right_cases}}}}
current=var(S,'current');item=var(U,'item')
theorem={'schema':1,'semantics':'ink-general-laws-v1','dependencies':[],'types':['State','View'],'params':{x['node']['Free']:x['sort'] for x in [n,i,s,p,st,rt,f,g]},'conditions':[],'assumptions':[{'name':'simulation','params':{'item':U,'current':S},'from':proj(step(item,current)),'to':rstep(item,proj(current))},{'name':'stopping','params':{'current':S},'from':app(st,current),'to':app(rt,proj(current))}], 'from':proj(until(n,i,s)),'to':runt(n,i,proj(s)),'proof':proof}
obj=semantic_entry(theorem);out=args.o;store=Store.publish(out,[obj]);view=out/'view.json';view.write_bytes(canonical(store.bundle([identity(obj)])))
r=subprocess.run([args.compiler.resolve(),'knowledge-check',args.core.resolve(),view],capture_output=True,text=True);print(r.returncode,r.stdout,r.stderr)
if r.returncode:raise RuntimeError('indexed projection proof rejected')
(out/'admission.json').write_text(r.stdout)
(out/'checked-source.json').write_bytes(args.core.read_bytes())
