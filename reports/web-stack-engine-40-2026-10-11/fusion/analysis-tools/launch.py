#!/usr/bin/env python3
"""Parent-only ordinary serial launcher; requires the fixed bound gate."""
from pathlib import Path
import json,hashlib,subprocess,datetime
B=Path(__file__).resolve().parents[4];R=B/'reports/web-stack-engine-40-2026-10-11/fusion'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
g=json.loads((R/'serial-gate.json').read_text());assert g['authorized'] and g['manifest_sha256']==sha(R/'manifest-final.json') and g['harness_sha256']==sha(B/'bench/diagnose-pipeline40.mjs')
assert not (R/'processes.json').exists()
receipt={'status':'running','contention_status':'unobserved','records':[],'scope':'Trusted launcher provenance; no scheduler isolation guarantee.'}
for i,seed in enumerate([2026114001,2026114002,2026114003],1):
 out=R/f'reproduce-{i}.json';assert not out.exists()
 (R/f'processes-before-{i}.txt').write_text(subprocess.check_output(['ps','-axo','pid,pcpu,etime,command'],text=True))
 argv=['node',str(B/'bench/diagnose-pipeline40.mjs'),'--mode=reproduce','--manifest=manifest-final.json',f'--seed={seed}',f'--output={out}']
 with (R/f'reproduce-{i}.log').open('x')as log:
  proc=subprocess.Popen(argv,cwd=B,stdout=log,stderr=subprocess.STDOUT)
  row={'pid':proc.pid,'argv':argv,'start_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()};receipt['records'].append(row)
  code=proc.wait();row.update(exit_code=code,end_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),raw_sha256=sha(out)if out.exists()else None)
 (R/f'processes-after-{i}.txt').write_text(subprocess.check_output(['ps','-axo','pid,pcpu,etime,command'],text=True))
 with (R/'processes.json').open('w')as f:json.dump(receipt,f,indent=2);f.write('\n')
 if code:raise SystemExit(code)
receipt['status']='passed';receipt['contention_status']='observed' # External concurrent jobs are explicitly disclosed for this run.
with (R/'processes.json').open('w')as f:json.dump(receipt,f,indent=2);f.write('\n')
print('three fresh processes completed')
