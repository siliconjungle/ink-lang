#!/usr/bin/env python3
"""Untrusted certificate search for source-derived unsigned scalar laws.

The compiler elaborates the claimed source meanings and reconstructs circuits.
SAT search supplies hints; only emit-laws admission grants equality authority.
"""
import argparse,hashlib,json,subprocess,sys,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'knowledge'))
from producers.bitvector_proofs import certificate

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--compiler',type=Path,required=True)
 p.add_argument('--source',type=Path,required=True)
 p.add_argument('--laws',nargs='+',required=True)
 p.add_argument('--seconds',type=int,default=30)
 p.add_argument('-o',type=Path,required=True,help='checked bundle destination')
 a=p.parse_args()
 if len(a.laws)>64 or len(set(a.laws))!=len(a.laws) or not 1<=a.seconds<=120:p.error('bounded, unique law names and 1..120 solver seconds required')
 compiler=a.compiler.resolve();source=a.source.resolve()
 def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
 compiler_hash,source_hash=digest(compiler),digest(source)
 def run(*args):
  r=subprocess.run(list(map(str,args)),capture_output=True,text=True,timeout=180)
  if r.returncode:raise ValueError(r.stderr[-4000:])
  return r
 with tempfile.TemporaryDirectory(prefix='ink-source-bit-laws-')as td:
  d=Path(td);evidence={}
  for name in a.laws:
   problem=d/'problem.json'
   receipt=json.loads(run(compiler,'law-bitvector-obligation',source,name,'-o',problem).stdout)
   proof=certificate(json.loads(problem.read_text()),seconds=a.seconds,conflicts=100000)
   evidence[name]=dict(proof=dict(BitVector=dict(hypotheses=list(range(receipt['conditions'])),certificate=proof)))
  proofs=d/'evidence.json';proofs.write_text(json.dumps(evidence,separators=(',',':'))+'\n')
  checked=d/'checked.json';receipt=json.loads(run(compiler,'emit-laws',source,'--proofs',proofs,'-o',checked).stdout)
  if digest(compiler)!=compiler_hash or digest(source)!=source_hash:raise ValueError('compiler or source changed during proof acquisition')
  a.o.parent.mkdir(parents=True,exist_ok=True);a.o.write_bytes(checked.read_bytes())
  Path(str(a.o)+'.evidence.json').write_bytes(proofs.read_bytes())
  Path(str(a.o)+'.receipt.json').write_text(json.dumps(dict(receipt,compiler_sha256=compiler_hash,source_sha256=source_hash))+'\n')
  print(json.dumps(dict(status='checked',laws=receipt['names'],snapshot=receipt['snapshot'])))

if __name__=='__main__':main()
