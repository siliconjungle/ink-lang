#!/usr/bin/env python3
"""Replay selected exact external propositions; never grants Ink rewrite authority."""
import argparse,hashlib,json,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--lean',type=Path,required=True);p.add_argument('--root',type=Path,default=Path('build/crdt/hunchroom'));p.add_argument('ids',type=int,nargs='+');a=p.parse_args()
out=a.root/'replay';out.mkdir(exist_ok=True);receipts=json.loads((out/'receipts.json').read_text())if(out/'receipts.json').exists()else[]
for id in a.ids:
 d=json.loads((a.root/'problems'/f'{id}.json').read_text());q=d['problem']
 submissions=[s for s in d['submissions']if s['status']=='verified']
 if not submissions:raise ValueError(f'#{id} has no verified proof')
 s=submissions[0];proof=(a.root/'proofs'/f"{s['id']}.lean").read_text();name=f'ink_external_{id}'
 source='import Lean\nset_option maxRecDepth 4096\nset_option maxHeartbeats 0\n'
 source+='\n'.join(m['source']for m in q.get('module_context',[]))
 source+='\ntheorem '+name+' : '+q['statement']+' :=\n'+proof+'\n#print axioms '+name+'\n'
 path=out/f'{id}.lean';path.write_text(source)
 t=time.perf_counter();r=subprocess.run([str(a.lean),str(path)],capture_output=True,text=True)
 (out/f'{id}.log').write_text(r.stdout+r.stderr)
 receipt=dict(problem=id,submission=s['id'],title=q['title'],exit_code=r.returncode,
  source_sha256=hashlib.sha256(source.encode()).hexdigest(),statement_hash=q['statement_hash'],
  proof_sha256=hashlib.sha256(proof.encode()).hexdigest(),elapsed_seconds=time.perf_counter()-t,
  kernel_output=r.stdout[-2000:],scope=q.get('scope'))
 receipts=[r for r in receipts if r['problem']!=id];receipts.append(receipt);(out/'receipts.json').write_text(json.dumps(receipts,indent=2)+'\n')
 print(id,s['id'],'passed'if r.returncode==0 else 'FAILED',flush=True)
 if r.returncode:raise SystemExit(r.returncode)
