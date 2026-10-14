#!/usr/bin/env python3
"""Untrusted SAT authoring for named typed goals over an actual checked core.

Imported definitions are bound from the emitted semantic subject. Certificates
and every resulting source-bound equation replay before publication.
"""
import argparse,hashlib,json,subprocess,sys,tempfile
from pathlib import Path
sys.path[:0]=[str(Path(__file__).resolve().parents[1]/'knowledge')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.bitvector_proofs import certificate
from producers.definition_context28 import bind
from producers.semantic_laws import law

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--core',type=Path,required=True);p.add_argument('--goals',type=Path,required=True);p.add_argument('--seconds',type=int,default=30);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
 compiler=a.compiler.resolve();source=a.core.resolve();goals=json.loads(a.goals.read_bytes())
 if not isinstance(goals,dict)or not 1<=len(goals)<=64 or not 1<=a.seconds<=120:p.error('1..64 named goals and 1..120 solver seconds required')
 def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
 compiler_hash,source_hash=digest(compiler),digest(source)
 def run(*args):
  r=subprocess.run(list(map(str,args)),capture_output=True,text=True,timeout=180)
  if r.returncode:raise ValueError(r.stderr[-4000:])
  return r
 with tempfile.TemporaryDirectory(prefix='ink-source-bit-goals-')as td:
  d=Path(td);subject=d/'semantic.json';run(compiler,'emit-semantic',source,'--core','-o',subject);core=json.loads(source.read_bytes());semantic=json.loads(subject.read_bytes());objects=[];names={}
  for name,goal in goals.items():
   request=d/'goal.json';request.write_bytes(canonical(goal));problem=d/'problem.json';run(compiler,'semantic-bitvector-obligation',source,request,'--core','-o',problem)
   proof=certificate(json.loads(problem.read_bytes()),seconds=a.seconds,conflicts=100000)
   theorem=bind(law(goal['params'],goal['from'],goal['to'],dict(BitVector=dict(hypotheses=list(range(len(goal['conditions']))),certificate=proof)),conditions=goal['conditions']),core,semantic)
   obj=semantic_entry(theorem);objects.append(obj);names[name]=identity(obj)
  staged=Store.publish(d/'staged',objects,names);view=d/'view.json';view.write_bytes(canonical(staged.bundle(list(names.values()))));receipt=run(compiler,'knowledge-check',source,view)
  if digest(compiler)!=compiler_hash or digest(source)!=source_hash:raise ValueError('source/compiler changed during acquisition')
  a.o.mkdir(parents=True,exist_ok=True);store=Store.publish(a.o,objects,names)
  (a.o/'checked-source.json').write_bytes(source.read_bytes());(a.o/'subject.json').write_bytes(subject.read_bytes());(a.o/'goals.json').write_bytes(canonical(goals));(a.o/'admission.json').write_text(receipt.stdout)
  (a.o/'scope.json').write_text(json.dumps(dict(compiler_sha256=compiler_hash,source_sha256=source_hash,laws=names))+'\n')
  print(json.dumps(dict(status='checked',laws=names,snapshot=store.snapshot['root'])))

if __name__=='__main__':main()
