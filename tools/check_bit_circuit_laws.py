#!/usr/bin/env python3
"""Replay the published packed-circuit laws and reject damaged evidence.

Names select test fixtures only. The compiler reconstructs the typed obligations
and checks the proof bytes; publication and names confer no authority.
"""
import argparse,copy,json,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--compiler',type=Path,default=ROOT/'target/debug/ink')
p.add_argument('--receipt',type=Path,required=True)
a=p.parse_args();compiler=a.compiler.resolve()
source=(ROOT/'knowledge/libraries/bit-circuit-laws.ink').read_text()
view=json.loads((ROOT/'knowledge/store/bit-circuit-view.json').read_bytes())
admission=json.loads((ROOT/'knowledge/libraries/bit-circuit-admission.json').read_bytes())
evidence={name:{'proof':view['objects'][ident]['payload']['proof']} for name,ident in admission['names'].items()}
results=[]
with tempfile.TemporaryDirectory(prefix='ink-bit-laws-') as td:
 d=Path(td)
 for kind in ['original','missing-hypothesis','corrupt-hint','changed-conclusion']:
  ev=copy.deepcopy(evidence);text=source
  if kind=='missing-hypothesis':ev['bit_gate']['proof']['BitVector']['hypotheses']=[]
  if kind=='corrupt-hint':ev['bit_gate']['proof']['BitVector']['certificate']['steps'][0]['hints']=[4294967295]
  if kind=='changed-conclusion':text=text.replace('choose(bit==1,value,0)','choose(bit==1,value,1)')
  (d/'laws.ink').write_text(text);(d/'evidence.json').write_text(json.dumps(ev))
  r=subprocess.run([str(compiler),'emit-laws',str(d/'laws.ink'),'--proofs',str(d/'evidence.json'),'-o',str(d/'checked.json')],capture_output=True,text=True,timeout=120)
  if kind=='original':
   if r.returncode:raise ValueError(r.stderr)
   if json.loads(r.stdout)['names']!=admission['names']:raise ValueError('law identities differ from publication')
   results.append({'case':kind,'status':'checked','laws':len(evidence)})
  else:
   if r.returncode==0:raise ValueError(kind+' admitted')
   results.append({'case':kind,'status':'rejected','diagnostic':r.stderr.strip()})
a.receipt.parent.mkdir(parents=True,exist_ok=True);a.receipt.write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results))
