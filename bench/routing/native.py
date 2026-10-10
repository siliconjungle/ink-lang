#!/usr/bin/env python3
"""Validate compiled native mixed routing; independent fixture oracle required."""
from pathlib import Path
import json,subprocess,os,sys
binary=Path(sys.argv[1]).resolve();out=Path(sys.argv[2]);fixtures=json.loads((out/'fixtures.json').read_text())
(out/'route-inputs.json').write_text(json.dumps([f['args'] for f in fixtures]))
(out/'cpu-script.json').write_text(json.dumps([dict(call='entry',args=f['args'],backend='cpu') for f in fixtures]))
run=lambda mode,file,env=None:json.loads(subprocess.check_output([str(binary),mode,str(out/file)],env=env,text=True))
results=run('--route-script','route-inputs.json');cpu=run('--script','cpu-script.json');fallback=run('--route-script','route-inputs.json',{**os.environ,'INK_GPU_DISABLE':'1'})
for f,r,c,b in zip(fixtures,results,cpu,fallback):
    assert r['value']==c['value']==b['value']==f['expected']
    assert [s['backend'] for s in r['stages']]==['gpu','cpu'],r
    assert [s['backend'] for s in b['stages']]==['cpu','cpu'],b
rejected=0
for args in [[[4294967296],1,1],[[1],-1,1],[[1],1,True],[[1],1]]:
    (out/'bad-args.json').write_text(json.dumps(args));p=subprocess.run([str(binary),'--route',str(out/'bad-args.json')],capture_output=True,text=True)
    assert p.returncode!=0,p.stdout;rejected+=1
report=dict(status='passed',comparisons=len(fixtures)*3,actual_gpu_stages=len(results),no_gpu_fallback=len(fallback),invalid_arguments_rejected=rejected,costs=results)
(out/'native.json').write_text(json.dumps(report,indent=2));print({k:v for k,v in report.items() if k!='costs'})
