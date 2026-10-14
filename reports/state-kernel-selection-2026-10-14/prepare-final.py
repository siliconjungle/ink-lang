from pathlib import Path
import json,gzip,copy,subprocess,hashlib
r=Path.cwd();d=r/'build/state-lifecycle-gap';p=json.load(open('build/raw-signals-gap/accepted/zero-dense.json'));proof=json.loads(gzip.decompress((r/'knowledge/producers/data/commit-word53.json.gz').read_bytes()))
for name,events,compact in [('final-objects',False,False),('final-columns',True,False),('final-compact',True,True),('final-inline',True,True)]:
 q=copy.deepcopy(p)
 for s in q['steps']:
  if s['kind']=='protocol':
   s['package']['event_columns']=events
   s['package']['inline_maintenance']=name=='final-inline'
   if compact:s['package']['compact_commits']=proof
   else:s['package'].pop('compact_commits',None)
 path=d/(name+'.plan.json');path.write_text(json.dumps(q))
 for args in [['check-plan',str(r/'reports/planner-reliability-2026-10-14/filtered-input.core.json'),str(path),'--core'],['emit-plan',str(r/'reports/planner-reliability-2026-10-14/filtered-input.core.json'),str(path),'--core','--target','javascript','-o',str(d/(name+'.mjs'))]]:
  result=subprocess.run(['target/release/ink',*args],capture_output=True,text=True,check=True)
  if args[0]=='check-plan':(d/(name+'.receipt.json')).write_text(result.stdout)
 print(name,'checked',flush=True)
(r/'build/state-lifecycle-gap/final-compiler.sha256').write_text(hashlib.sha256((r/'target/release/ink').read_bytes()).hexdigest())
