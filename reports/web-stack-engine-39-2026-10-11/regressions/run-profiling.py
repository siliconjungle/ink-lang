"""Predeclared serial diagnosis window. No new benchmark/source tuning."""
from pathlib import Path
import argparse,json,hashlib,subprocess,shutil
R=Path(__file__).resolve().parent;B=R.parents[2];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
a=argparse.ArgumentParser();a.add_argument('--run-authorized',action='store_true');args=a.parse_args()
ready=json.loads((R/'readiness.json').read_text());assert all(sha(B/p)==h for p,h in ready['bindings'].items())
node=shutil.which('node');frame='pipeline38_left_padded_zip_heldout_u32-high-65536';harness=str(B/'bench/diagnose-pipeline38.mjs');profiles=R/'profiles';profiles.mkdir(exist_ok=True);commands=[]
for version in ['prior','checked']:
 name=version+'-js';commands.append({'name':name,'kind':'instrumented_profile','argv':[node,'--trace-opt','--trace-deopt','--trace-gc-nvp','--trace-file-names','--trace-turbo-inlining','--cpu-prof','--cpu-prof-dir='+str(profiles),'--cpu-prof-name='+name+'.cpuprofile',harness,'--mode=profile','--timing-authorized','--frame='+frame,'--variant='+version+'_js_owned','--calls=256','--warmups=64','--output='+str(R/('profile-'+name+'.json'))]})
for version,index in [('prior',6),('checked',4)]:
 name=version+'-wasm';commands.append({'name':name,'kind':'instrumented_profile','argv':[node,'--print-wasm-code','--print-wasm-code-function-index='+str(index),'--trace-wasm-lazy-compilation',harness,'--mode=profile','--timing-authorized','--frame='+frame,'--variant='+version+'_wasm_prepared','--calls=128','--warmups=64','--output='+str(R/('profile-'+name+'.json'))]})
variants='prior_js_owned,checked_js_owned,expert_js_owned,control_no_padding_js_owned,control_no_pluszero_js_owned,prior_wasm_prepared,checked_wasm_prepared,prior_novec_wasm_prepared,checked_novec_wasm_prepared,prior_wasm_full,checked_wasm_full'
for index in range(1,4):
 name='reproduce-process-'+str(index);commands.append({'name':name,'kind':'uninstrumented_fresh_process','argv':[node,harness,'--mode=reproduce','--timing-authorized','--frame=regressions','--variant='+variants,'--warmups=64','--rounds=9','--seed='+str(2026113900+index),'--output='+str(R/(name+'.json'))]})
plan={'status':'predeclared','axes_frozen':True,'seven_archived_frames':'all unique original regression frames, no subset selected by rerun results','original_hosts':{'node':11,'browser':9},'profile_scope':'One predeclared representative composed high-word 65536 frame, with separate prior/checked processes; instrumented times excluded from ordinary ratios.','reproduction_scope':'All seven frames x 11 variants x 9 rounds in each of three fresh Node processes. Actual browser nine-cell reproduction is separate parent-driven evidence.','commands':commands,'script_sha256':sha(Path(__file__)),'readiness_sha256':sha(R/'readiness.json')}
planpath=R/'profiling-plan.json'
if not args.run_authorized:
 planpath.write_text(json.dumps(plan,indent=2)+'\n');print('Prepared 4 profiles and 3 fresh process reproductions; no execution.');raise SystemExit(0)
assert json.loads(planpath.read_text())==plan,'predeclared plan changed'
for item in commands:
 log=R/(item['name']+'.log');assert not log.exists(),'preserve existing log'
 print('Running '+item['name'],flush=True)
 with log.open('xb')as handle:result=subprocess.run(item['argv'],cwd=B,stdout=handle,stderr=subprocess.STDOUT)
 assert result.returncode==0,(item['name'],result.returncode)
 item['exit_code']=result.returncode;item['log_sha256']=sha(log)
(R/'profiling-commands.json').write_text(json.dumps({'status':'passed','commands':commands,'script_sha256':sha(Path(__file__)),'plan_sha256':sha(planpath),'readiness_sha256':sha(R/'readiness.json')},indent=2)+'\n');print('All serial diagnosis commands complete.',flush=True)
