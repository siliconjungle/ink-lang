#!/usr/bin/env python3
"""Lift a checked query equality through a source let continuation.

Only beta computation and explicit source unfolding expose the same continuation;
the supplied equation must prove the complete argument replacement. This keeps
large shared continuations opaque, without adding a checker rule or budget.
"""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.definitional_roundtrips import _beta,_substitute
from producers.definition_context28 import bind
from producers.semantic_laws import law,value,var,op
from ink_planner.semantic_search import match

def main():
 p=argparse.ArgumentParser(description=__doc__)
 for n in ['core','subject','compiler','equation_store']:p.add_argument('--'+n.replace('_','-'),type=Path,required=True)
 for n in ['left','right','equation']:p.add_argument('--'+n,required=True)
 p.add_argument('-o',type=Path,required=True);a=p.parse_args()
 if a.o.exists():raise ValueError('refusing to overwrite proof output')
 core=json.loads(a.core.read_bytes());subject=json.loads(a.subject.read_bytes());functions={f['name']:f for f in core['program']['functions']}
 parent=Store(a.equation_store);key=json.loads((parent.root/'store/names.json').read_text())[a.equation];equation=parent.object(key)['payload']
 if equation['conditions']:raise ValueError('unconditional argument equation required')
 left=functions[a.left];right=functions[a.right]
 if left['params']!=right['params']or left['result']!=right['result']:raise ValueError('matching source signatures required')
 params={n:value(t)for n,t in left['params']};args=[var(params[n],n)for n,_ in left['params']]
 trans=lambda m,l,r:{'Trans':dict(middle=m,left=l,right=r)}
 def call(t):return t['node'].get('Op')if isinstance(t['node'],dict)else None
 def expose(t,pattern,steps=64):
  c=call(t);bindings={}
  if c and c[0]=='apply'and match(pattern,c[1][1],equation['params'],bindings):return t,bindings,'Normalize'
  if steps==0:raise ValueError('source continuation discovery budget')
  after=None
  if c:
   name,xs=c
   if name.startswith('call:')and name[5:]in functions:
    f=functions[name[5:]];after=_substitute(subject['functions'][f['name']],dict(zip((n for n,_ in f['params']),xs)))
   elif name=='apply'and isinstance(xs[0]['node'],dict)and'Lambda'in xs[0]['node']:after=_beta(xs[0]['node']['Lambda'],xs[1])
  if after is None:raise ValueError('no matching query argument before source result')
  result,bindings,proof=expose(after,pattern,steps-1);return result,bindings,trans(after,'Unfold',proof)
 source=op(value(left['result']),'call:'+a.left,*args);target=op(source['sort'],'call:'+a.right,*args)
 old,bindings,lp=expose(source,equation['from']);new,other,rp=expose(target,equation['to'])
 if bindings!=other or call(old)[1][0]!=call(new)[1][0]:raise ValueError('source continuations or query arguments differ')
 argument={'Use':dict(law=key,arguments=bindings,premises=[])}
 proof=trans(old,lp,trans(new,{'Congruence':['Normalize',argument]},{'Sym':rp}))
 candidate=law(params,source,target,proof,dependencies=[key]);candidate['semantics']='ink-general-laws-v1';candidate=bind(candidate,core,subject,[a.left,a.right]);obj=semantic_entry(candidate);ident=identity(obj)
 store=Store.publish(a.o,[*parent.bundle([key])['objects'].values(),obj],{'source_query_context':ident});view=a.o/'view.json';view.write_bytes(canonical(store.bundle([ident])))
 r=subprocess.run([a.compiler.resolve(),'knowledge-check',a.core.resolve(),view.resolve()],capture_output=True,text=True,timeout=120);(a.o/'admission.log').write_text(r.stdout+r.stderr)
 if r.returncode:raise ValueError(r.stderr[-3000:])
 (a.o/'checked-source.json').write_bytes(a.core.read_bytes());print(json.dumps(dict(status='checked',identity=ident,scope='Complete source function equality through an unchanged let continuation.')))

if __name__=='__main__':main()
