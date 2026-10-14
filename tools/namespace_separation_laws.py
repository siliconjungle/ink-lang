#!/usr/bin/env python3
"""Author RUP-checked mathematical separation of low and high u64 namespaces.

This component does not certify source constructors, prefix shredding or CRDTs.
The supplied bit masks and bounds are explicit theorem hypotheses.
"""
import argparse,json,subprocess,tempfile
from pathlib import Path
from ink_knowledge import Store,identity,canonical
from ink_knowledge.store import entry
from producers.bitvector_proofs import certificate
from producers.inductive_proofs import var,binary

SEMANTICS='first-order-inductive-equality-v1'
LOW=(1<<32)-1;HIGH=((1<<64)-1)^LOW

def goals():
 key,base=var('key'),var('base');yes={'Bool':True}
 high=dict(**{'from':binary('!=',binary('&',key,{'U64':HIGH}),{'U64':0}),'to':yes})
 bounded=dict(**{'from':binary('<=',base,{'U64':LOW}),'to':yes})
 return [('above_low_namespace',dict(params=[['key','U64']],conditions=[high],**{'from':binary('>',key,{'U64':LOW}),'to':yes})),
         ('namespace_separation',dict(params=[['key','U64'],['base','U64']],conditions=[high,bounded],**{'from':binary('<',base,key),'to':yes}))]

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,required=True)
 p.add_argument('--core',type=Path,required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
 objects=[];names={}
 with tempfile.TemporaryDirectory() as td:
  d=Path(td)
  for name,goal in goals():
   path=d/'goal.json';path.write_bytes(canonical(goal)+b'\n');cnf=d/'cnf.json'
   subprocess.run([a.compiler,'bitvector-obligation',path,'-o',cnf],check=True,capture_output=True)
   proof=certificate(json.loads(cnf.read_bytes()),seconds=20,conflicts=100000)
   derivation={'BitVector':dict(**{'from':goal['from'],'to':goal['to']},hypotheses=list(range(len(goal['conditions']))),certificate=proof)}
   obj=entry('theorem',SEMANTICS,{'declaration':{'Theorem':dict(**goal,proof=derivation)}},parameters=dict(goal['params']),conditions=goal['conditions'])
   names[name]=identity(obj);objects.append(obj)
  staged=Store.publish(d/'staged',objects);view=d/'view.json';view.write_bytes(canonical(staged.bundle(list(names.values())))+b'\n')
  result=subprocess.run([a.compiler,'knowledge-check',a.core,view],capture_output=True,text=True)
  if result.returncode:raise ValueError(result.stderr[-3000:])
  # Corrupted proofs and missing namespace hypotheses must be rejected even
  # when all content identities and interface metadata are recomputed.
  import copy
  for kind in ['missing-high-bits','empty-hints']:
   bad=copy.deepcopy(objects[-1]);theorem=bad['payload']['declaration']['Theorem']
   if kind=='missing-high-bits':
    theorem['conditions']=theorem['conditions'][1:];bad['interface']['conditions']=theorem['conditions']
    theorem['proof']['BitVector']['hypotheses']=[0]
   else:theorem['proof']['BitVector']['certificate']['steps'][-1]['hints']=[]
   rejected=Store.publish(d/kind,[bad]);negative=d/(kind+'.json')
   negative.write_bytes(canonical(rejected.bundle([identity(bad)]))+b'\n')
   check=subprocess.run([a.compiler,'knowledge-check',a.core,negative],capture_output=True,text=True)
   if check.returncode==0:raise AssertionError('corrupt namespace proof accepted: '+kind)
  a.o.mkdir(parents=True,exist_ok=True);store=Store.publish(a.o,objects)
  (a.o/'names.json').write_text(json.dumps(names,sort_keys=True)+'\n')
  (a.o/'admission.json').write_text(result.stdout)
  print(json.dumps(dict(status='checked',snapshot=store.snapshot['root'],names=names)))
