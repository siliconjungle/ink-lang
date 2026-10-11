"""Run only the predeclared supplemental diagnostic plan after exclusive grant."""
import pathlib,json,hashlib,subprocess,sys
B=pathlib.Path(__file__).resolve().parents[3];R=pathlib.Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
ready=json.loads((R/'matched-esm-readiness.json').read_text());plan=json.loads((R/'matched-esm-plan.json').read_text())
for p,h in ready['bindings'].items():assert sha(B/p)==h,(p,'frozen diagnostic changed')
if '--run-authorized' not in sys.argv:print(json.dumps({'status':'ready_not_run','commands':len(plan['commands'])}));sys.exit(0)
results=[]
for command in plan['commands']:
 log=R/(command['name']+'.log')
 with log.open('x') as f:run=subprocess.run(command['argv'],cwd=B,stdout=f,stderr=subprocess.STDOUT)
 results.append({**command,'exit_code':run.returncode,'log_sha256':sha(log)})
 if run.returncode:break
result={'status':'passed' if len(results)==len(plan['commands']) and all(x['exit_code']==0 for x in results) else 'failed','commands':results,'plan_sha256':sha(R/'matched-esm-plan.json'),'readiness_sha256':sha(R/'matched-esm-readiness.json'),'script_sha256':sha(pathlib.Path(__file__))}
with (R/'matched-esm-commands.json').open('x') as f:json.dump(result,f,indent=2);f.write('\n')
print(json.dumps({'status':result['status'],'commands':len(results)}));sys.exit(0 if result['status']=='passed' else 1)
