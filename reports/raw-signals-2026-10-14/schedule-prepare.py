import json,subprocess,copy
from pathlib import Path
r=Path.cwd();old=r/'build/raw-signals-gap/final';d=r/'build/raw-signals-gap/accepted';d.mkdir(exist_ok=True);src=r/'reports/planner-reliability-2026-10-14/filtered-input.core.json'
for name in ['map','dense','zero-map','zero-dense']:
 p=json.loads((old/(name+'.json')).read_text())
 if 'dense' in name:
  for step in p['steps']:
   if step['kind']=='physical':
    for prefix in step['package']['dense_prefixes']:prefix['capacity']=16384
 path=d/(name+'.json');path.write_text(json.dumps(p))
 for cmd in [['check-plan',str(src),str(path),'--core'],['emit-plan',str(src),str(path),'--core','--target','javascript','-o',str(d/(name+'.mjs'))]]:
  result=subprocess.run(['target/release/ink',*cmd],capture_output=True,text=True,check=True)
  if cmd[0]=='check-plan':(d/(name+'.receipt.json')).write_text(result.stdout)
 print('accepted emitter',name,flush=True)
