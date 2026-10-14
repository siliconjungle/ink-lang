#!/usr/bin/env python3
"""Compose exact query-reuse and zero-argument proofs under a source guard.

The tool only authors a proposal. Exact source definitions, the complete result,
the branch premise and every dependency are replayed by the existing kernel.
"""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.definitional_roundtrips import _beta,_substitute
from producers.definition_context28 import bind
from producers.semantic_laws import law,value,var,op,term

def main():
 p=argparse.ArgumentParser(description=__doc__)
 for n in ['core','subject','compiler','reuse_store','zero_test']:p.add_argument('--'+n.replace('_','-'),type=Path,required=True)
 p.add_argument('--left',default='original');p.add_argument('--right',default='reused');p.add_argument('-o',type=Path,required=True);a=p.parse_args()
 if a.o.exists():raise ValueError('refusing to overwrite proof output')
 core=json.loads(a.core.read_text());subject=json.loads(a.subject.read_text());functions={f['name']:f for f in core['program']['functions']}
 parent=Store(a.reuse_store);names=json.loads((a.reuse_store/'store/names.json').read_text());objects=parent.bundle(list(names.values()))['objects']
 scalar=json.loads(a.zero_test.read_bytes());objects.update(scalar['objects']);test=next(iter(scalar['objects']))
 trans=lambda m,l,r:{'Trans':dict(middle=m,left=l,right=r)}
 def use(key,args,premises=()):return {'Use':dict(law=key,arguments=args,premises=list(premises))}
 def call(t):return t['node'].get('Op')if isinstance(t['node'],dict)else None
 left=functions[a.left];right=functions[a.right]
 if left['params']!=right['params']or left['result']!=right['result']:raise ValueError('matching source signatures required')
 params={n:value(t)for n,t in left['params']};args=[var(params[n],n)for n,_ in left['params']]
 # Only unfold the two wrappers and their immediate source helpers. Shared
 # queries and mutations remain opaque, with checked equalities used below.
 allowed={a.left,a.right}
 for name in list(allowed):
  c=call(subject['functions'][name])
  if c and c[0].startswith('call:'):allowed.add(c[0][5:])
 def head(t):
  c=call(t);after=None
  if c:
   name,xs=c
   if name.startswith('call:')and name[5:]in allowed:
    f=functions[name[5:]];after=_substitute(subject['functions'][f['name']],dict(zip((n for n,_ in f['params']),xs)))
   elif name=='apply'and isinstance(xs[0]['node'],dict)and'Lambda'in xs[0]['node']:after=_beta(xs[0]['node']['Lambda'],xs[1])
  if after is None:return t,'Normalize'
  result,proof=head(after);return result,trans(after,'Unfold',proof)
 start=op(value(left['result']),'call:'+a.left,*args);target=op(start['sort'],'call:'+a.right,*args)
 original,lp=head(start);choice,rp=head(target);cc=call(choice)
 if not cc or cc[0]!='call:choose':raise ValueError('replacement must choose a complete query result')
 guard,first,fallback=cc[1]
 if fallback!=original:raise ValueError('fallback differs from original source query')
 oc=call(original);qc=call(first)
 if not oc or not qc or oc[0]!=qc[0]or len(oc[1])!=2:raise ValueError('query shapes differ')
 split=call(oc[1][0]);comparison=call(guard)
 if not split or len(split[1])!=3 or not comparison or comparison[0]!='binary:==':raise ValueError('split and zero guard required')
 offset=comparison[1][0]
 if offset!=split[1][2]:raise ValueError('guard does not test split argument')
 engine,slot,_=split[1];once=op(original['sort'],oc[0],engine,oc[1][1])
 zero_condition=use(test,dict(value=offset),[{'Hypothesis':0}])
 split_proof=use(names['zero_argument'],dict(engine=engine,slot=slot,zero_argument=offset),[zero_condition])
 repeat_proof=use(names['query_reuse'],dict(engine=qc[1][0],position=qc[1][1]))
 def choose_branch(truth):
  literal=op(choice['sort'],'call:choose',term(value('Bool'),{'Bool':truth}),first,fallback)
  return trans(literal,{'Congruence':[{'Hypothesis':0},'Normalize','Normalize']},'Unfold')
 true_proof=trans(once,{'Congruence':[split_proof,'Normalize']},trans(first,repeat_proof,{'Sym':choose_branch(True)}))
 branches={'Cases':dict(condition=guard,on_true=true_proof,on_false={'Sym':choose_branch(False)})}
 candidate=law(params,start,target,trans(original,lp,trans(choice,branches,{'Sym':rp})),dependencies=[names['zero_argument'],names['query_reuse'],test]);candidate['semantics']='ink-general-laws-v1';candidate=bind(candidate,core,subject,[a.left,a.right]);obj=semantic_entry(candidate);ident=identity(obj);objects[ident]=obj
 expression=law(params,original,choice,branches,dependencies=candidate['dependencies']);expression['semantics']='ink-general-laws-v1';expression=bind(expression,core,subject);expr_obj=semantic_entry(expression);expr_id=identity(expr_obj);objects[expr_id]=expr_obj
 store=Store.publish(a.o,list(objects.values()),{'boundary_selection':ident,'boundary_selection_expression':expr_id});view=a.o/'view.json';view.write_bytes(canonical(store.bundle([ident,expr_id])))
 r=subprocess.run([a.compiler.resolve(),'knowledge-check',a.core.resolve(),view.resolve()],capture_output=True,text=True,timeout=120);(a.o/'admission.log').write_text(r.stdout+r.stderr)
 if r.returncode:raise ValueError(r.stderr[-3000:])
 (a.o/'checked-source.json').write_bytes(a.core.read_bytes());print(json.dumps(dict(status='checked',identity=ident,expression=expr_id,scope='Complete guarded source selection equality; no maintained-tree assumption.')))

if __name__=='__main__':main()
