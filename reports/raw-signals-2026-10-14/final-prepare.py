import json,copy,subprocess
from pathlib import Path
from producers.maintained_updates import guarded_word_update
r=Path.cwd();d=r/'build/raw-signals-gap/final';d.mkdir(exist_ok=True)
a=r/'build/raw-signals-gap/artifacts';src=r/'reports/planner-reliability-2026-10-14/filtered-input.core.json'
base=json.loads((a/'kernel-map.json').read_text())
for name,zero,dense in [('map',False,False),('dense',False,True),('zero-map',True,False),('zero-dense',True,True)]:
 plan=copy.deepcopy(base)
 for step in plan['steps']:
  if step['kind']=='maintained':step['package']=guarded_word_update(step['package'],d/(name+'-knowledge'),zero=zero)
 if dense:plan['steps'].insert(-1,dict(kind='physical',package=dict(schema=1,semantics='ink-physical-plan-v1',input_core_sha256=plan['steps'][-1]['package']['input_core_sha256'],dense_prefixes=[dict(table=n,capacity=4096)for n in sorted({v['table']for s in plan['steps']if s['kind']=='maintained'for v in s['package']['views']})])))
 path=d/(name+'.json');path.write_text(json.dumps(plan))
 for command in [['check-plan',str(src),str(path),'--core'],['emit-plan',str(src),str(path),'--core','--target','javascript','-o',str(d/(name+'.mjs'))]]:
  result=subprocess.run(['target/release/ink',*command],capture_output=True,text=True,check=True)
  if command[0]=='check-plan':(d/(name+'.receipt.json')).write_text(result.stdout)
 print('emitted',name,flush=True)
