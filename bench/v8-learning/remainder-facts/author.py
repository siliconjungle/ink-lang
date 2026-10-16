"""Author two self-contained laws using generic explicit equality assistance.

Read the pinned quotient proofs once; no solver result is trusted. Fresh work is
bounded and every final law replays its premise and body under shared limits.
"""
import argparse,hashlib,json,subprocess,time
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.equality_assistance import prove_with_equalities
from producers.v8_integer_laws import templates
from producers.frozen_laws import index,load,update
from producers.bitvector_proofs import certificate
from producers.rup_transport import pack_certificate

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--compiler',type=Path,required=True);p.add_argument('--scratch',type=Path,required=True)
 p.add_argument('--data',type=Path,default=Path('knowledge/producers/data/v8-integer-laws'))
 args=p.parse_args();compiler=args.compiler.resolve();scratch=args.scratch.resolve();scratch.mkdir(parents=True,exist_ok=False)
 def write(path,value):path.write_bytes(canonical(value)+b'\n')
 write(scratch/'storage-retention.json',dict(schema=1,keep=[dict(path='.',reason='Active required bounded proof authoring; preserve live checker inputs. Retire duplicate generated publication after selected proof/input retention.')],safe_to_remove=[]))
 source=scratch/'source.ink';source.write_text('module remainder_authoring; fn identity(x:u64)->u64{return x;}\n');core=scratch/'core.json'
 def run(*command):return subprocess.run(list(map(str,[compiler,*command])),capture_output=True,text=True,check=True,timeout=120)
 run('emit-core',source,'-o',core);image=hashlib.sha256(compiler.read_bytes()).hexdigest();rows=[]
 for row in templates():
  name=row['name']
  if name not in ['u64_rem_or_self','u64_rem_or_zero_numerator']:continue
  directory=scratch/name;directory.mkdir();goal=row['goal'];qrow=next(r for r in index(args.data)if r['name']==name.replace('rem_or','quot_or'));quotient=load(args.data,qrow)
  def author(strengthened):
   write(directory/'goal.json',strengthened)
   run('semantic-bitvector-obligation',core,directory/'goal.json','--core','--semantics','fixed-scalars-v4','--encoding','shared-v2','-o',directory/'cnf.json')
   problem=json.loads((directory/'cnf.json').read_bytes())
   cert=pack_certificate(certificate(problem,seconds=20,conflicts=100000,total_seconds=60))
   return {'BitVector':dict(semantics='fixed-scalars-v4',hypotheses=list(range(len(strengthened['conditions']))),certificate=cert)}
  started=time.monotonic();claim=prove_with_equalities(goal,[{k:quotient[k]for k in ['from','to','proof']}],author)
  write(directory/'law.json',claim);entry=semantic_entry(claim);store=Store.publish(directory/'candidate',[entry]);view=directory/'view.json';write(view,store.bundle([identity(entry)]));result=run('knowledge-check',core,view)
  (directory/'check.stdout').write_text(result.stdout);(directory/'check.stderr').write_text(result.stderr)
  update(scratch/'laws',[dict(name=name,law=claim)])
  receipt=dict(name=name,law=identity(claim),entry=identity(entry),law_bytes=len(canonical(claim)),quotient_input=qrow['sha256'],author_and_check_seconds=str(time.monotonic()-started))
  rows.append(receipt);print(json.dumps(receipt),flush=True)
 assert hashlib.sha256(compiler.read_bytes()).hexdigest()==image
 write(scratch/'terminal.json',dict(schema=1,exit_status=0,compiler_sha256=image,rows=rows,scope='Untrusted authoring duration; no compiler/runtime performance claim. Complete self-contained ordinary admission with unchanged limits.'))

if __name__=='__main__':main()
