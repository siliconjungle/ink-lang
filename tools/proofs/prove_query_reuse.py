#!/usr/bin/env python3
"""Compose checked state-frame observations into ordinary source rewrite laws.

The two observers are supplied by the caller. Their exact typed bodies and
already checked proofs determine the query, projection and zero argument.
There are no algorithm or record-name recognizers in the compiler.
"""
import argparse,copy,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.definitional_roundtrips import _beta,_substitute
from producers.definition_context28 import bind
from producers.semantic_laws import law,value,var,op,word,lam,bound

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--core',type=Path,required=True);p.add_argument('--subject',type=Path,required=True);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--state-observer',required=True);p.add_argument('--state-proof',type=Path,required=True);p.add_argument('--zero-observer',required=True);p.add_argument('--zero-proof',type=Path,required=True);p.add_argument('--read-laws',type=Path,required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
 core=json.loads(a.core.read_text());subject=json.loads(a.subject.read_text());functions={f['name']:f for f in core['program']['functions']};objects={}
 def dependency(root,name):
  store=Store(root);key=store.names[name];objects.update(store.bundle([key])['objects']);return key
 frame=dependency(a.state_proof,a.state_observer);zero=dependency(a.zero_proof,a.zero_observer);reuse=dependency(a.read_laws,'repeat_read')
 def call(t):return t['node'].get('Op')if isinstance(t['node'],dict)else None
 def app(f,x):return op(f['sort']['Arrow'][1],'apply',f,x)
 def trans(m,left,right):return {'Trans':dict(middle=m,left=left,right=right)}
 def use(key,args,**extra):return {'Use':dict(law=key,arguments=args,premises=[],**extra)}
 def expose_observer(key,name):
  # Export the observer's actual equation. The wrapper is a proof-authoring
  # convenience and must not be required in every application using this law.
  original=objects[key];candidate=dict(copy.deepcopy(original['payload']),schema=1,semantics=original['semantics'],dependencies=original['dependencies'])
  body=subject['functions'][name]
  def drop_first_unfold(proof,end):
   if proof=='Unfold'and end==body:return 'Normalize'
   if isinstance(proof,dict)and'Trans'in proof:
    p=proof['Trans'];return trans(p['middle'],drop_first_unfold(p['left'],p['middle']),p['right'])
   raise ValueError('observer proof has no exact source unfolding prefix')
  candidate['proof']=drop_first_unfold(candidate['proof'],candidate['to']);candidate['from']=body
  candidate=bind(candidate,core,subject);obj=semantic_entry(candidate);ident=identity(obj);objects[ident]=obj;return ident
 frame=expose_observer(frame,a.state_observer);zero=expose_observer(zero,a.zero_observer)
 def beta(t):
  c=call(t)
  if not c:return t,'Normalize'
  name,args=c
  if name=='apply'and isinstance(args[0]['node'],dict)and'Lambda'in args[0]['node']:
   middle=_beta(args[0]['node']['Lambda'],args[1]);result,proof=beta(middle);return result,trans(middle,'Unfold',proof)
  children=[beta(x)for x in args];result=op(t['sort'],name,*(x for x,_ in children))
  return result,{'Congruence':[proof for _,proof in children]}
 observer=functions[a.state_observer];params={n:value(t)for n,t in observer['params']}
 if any(n.startswith('__assumed_')for n in params):raise ValueError('reserved proof parameter collision')
 if not observer['params']or observer['params'][0][1]!=observer['result']:raise ValueError('state observer must return its first parameter type')
 state_name=observer['params'][0][0];state=var(params[state_name],state_name);body=subject['functions'][a.state_observer];projection=call(body)
 if not projection or not projection[0].startswith('field:')or len(projection[1])!=1:raise ValueError('state observer must directly project a query result')
 query=projection[1][0];qc=call(query)
 if not qc or not qc[0].startswith('call:'):raise ValueError('state observer requires a named query')
 if not any(x==state for x in qc[1]):raise ValueError('state query does not read the observed parameter')
 read=lam(state['sort'],_substitute(query,{state_name:bound(state['sort'],0)}));recover=lam(query['sort'],op(state['sort'],projection[0],bound(query['sort'],0)))
 original=app(read,app(recover,app(read,state)));single=app(read,state)
 left,lp=beta(original);right,rp=beta(single)
 current=var(state['sort'],'__assumed_current');preserved=app(recover,app(read,current));projected,pp=beta(preserved)
 arguments={n:current if n==state_name else var(sort,n)for n,sort in params.items()};helper=op(state['sort'],'call:'+a.state_observer,*(arguments[n]for n,_ in observer['params']))
 if _substitute(body,arguments)!=projected:raise ValueError('state observer does not match query recovery')
 assumption=trans(projected,pp,use(frame,arguments))
 proof=trans(original,{'Sym':lp},trans(single,use(reuse,dict(state=state,read=read,recover=recover),types=dict(S=state['sort']['Value'],R=query['sort']['Value']),assumptions=[assumption]),rp))
 candidate=law(params,left,right,proof,dependencies=[frame,reuse]);candidate['semantics']='ink-general-laws-v1';candidate=bind(candidate,core,subject);obj=semantic_entry(candidate);objects[identity(obj)]=obj;names={'query_reuse':identity(obj)}
 # A zero-argument observer also supplies a conditional rewrite at the actual
 # source call, with an explicit equality premise for the replaced argument.
 observer=functions[a.zero_observer];body=subject['functions'][a.zero_observer];bc=call(body)
 if not bc or not bc[0].startswith('call:'):raise ValueError('zero observer must be a direct source call')
 zeros=[i for i,x in enumerate(bc[1])if x==word('U32',0)]
 if len(zeros)!=1:raise ValueError('zero observer requires one literal u32 zero argument')
 params={n:value(t)for n,t in observer['params']}
 if 'zero_argument'in params:raise ValueError('zero argument name collision')
 offset=var(value('U32'),'zero_argument');params['zero_argument']=value('U32');arguments=[var(value(t),n)for n,t in observer['params']];source_args=list(bc[1]);source_args[zeros[0]]=offset
 left=op(body['sort'],bc[0],*source_args);helper=op(body['sort'],'call:'+a.zero_observer,*arguments);right=arguments[0]
 proofs=['Normalize']*len(source_args);proofs[zeros[0]]={'Hypothesis':0}
 proof=trans(body,{'Congruence':proofs},use(zero,dict(zip((n for n,_ in observer['params']),arguments))))
 candidate=law(params,left,right,proof,conditions=[dict(**{'from':offset,'to':word('U32',0)})],dependencies=[zero]);candidate=bind(candidate,core,subject);obj=semantic_entry(candidate);objects[identity(obj)]=obj;names['zero_argument']=identity(obj)
 store=Store.publish(a.o,list(objects.values()),names);view=a.o/'view.json';view.write_bytes(canonical(store.bundle(list(names.values()))));r=subprocess.run([a.compiler.resolve(),'knowledge-check',a.core.resolve(),view.resolve()],capture_output=True,text=True,timeout=120);(a.o/'admission.log').write_text(r.stdout+r.stderr)
 if r.returncode:raise ValueError(r.stderr[-3000:])
 (a.o/'checked-source.json').write_bytes(a.core.read_bytes());print(json.dumps(dict(status='checked',names=names,scope='Concrete source query reuse and explicit zero-argument replacement; prerequisites replayed, no algorithm/convergence bridge claimed.')))

if __name__=='__main__':main()
