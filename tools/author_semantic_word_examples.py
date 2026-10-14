#!/usr/bin/env python3
"""Offline certificate examples; build core/examples/semantic-word-obligation first. Requires python-sat==1.9.dev5; compilation only replays the stored certificates."""
import json,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1];sys.path[:0]=[str(root/'knowledge'),str(root/'planner')]
from producers.semantic_laws import value,var,word,op,law,term
from producers.bitvector_proofs import certificate
scratch=root/'build/semantic-words';scratch.mkdir(parents=True,exist_ok=True)
b=value('Bool');u=value('U32');truth=term(b,{'Bool':True});x=var(u,'x')
def rel(n,a,c):return op(b,'binary:'+n,a,c)
def ar(n,a,c):return op(a['sort'],'binary:'+n,a,c)
def between(x,a,c):return rel('&&',rel('>=',x,word('U32',a)),rel('<=',x,word('U32',c)))
folded=op(u,'call:word_or',x,word('U32',32))
examples=[
 ('case_ranges',{'x':u},rel('||',between(x,65,90),between(x,97,122)),between(folded,97,122),[]),
 ('wrap_intermediate',{'x':u},ar('+',ar('+',x,word('U32',4294967295)),word('U32',1)),x,[]),
 ('conditional_increment',{'x':u},rel('>',ar('+',x,word('U32',1)),x),truth,[{'from':rel('<',x,word('U32',4294967295)),'to':truth}]),
]
u64=value('U64');a=var(u64,'a');c=var(u64,'b');examples.append(('u64_cancel',{'a':u64,'b':u64},ar('-',ar('+',a,c),c),a,[]))
q=var(b,'q');y=var(u,'y');choose=lambda q,x,y:op(u,'call:choose',q,x,y)
examples.append(('boolean_choice',{'q':b,'x':u,'y':u},choose(q,x,y),choose(rel('==',q,term(b,{'Bool':False})),y,x),[]))
rows=[]
for name,params,left,right,conditions in examples:
 request={'params':params,'conditions':conditions,'from':left,'to':right,'hypotheses':list(range(len(conditions)))}
 path=scratch/(name+'.json');path.write_text(json.dumps(request))
 cnf=scratch/(name+'.cnf.json');subprocess.run([root/'core/target/debug/examples/semantic-word-obligation',path,cnf],check=True)
 problem=json.loads(cnf.read_text());proof=certificate(problem,seconds=30);proof['encoding']=problem['encoding']
 proposal=law(params,left,right,{'Word':{'hypotheses':request['hypotheses'],'certificate':proof}},conditions=conditions);proposal['semantics']='ink-general-laws-v1'
 rows.append({'name':name,'law':proposal});print(name,problem['variables'],len(problem['clauses']),len(proof['steps']),flush=True)
(root/'core/tests/fixtures/semantic-word-laws.json').write_text(json.dumps(rows,indent=2)+'\n')

import gzip
(root/'knowledge/producers/data/source-word-laws.json.gz').write_bytes(gzip.compress(json.dumps(rows,indent=2).encode()+b'\n',mtime=0))
