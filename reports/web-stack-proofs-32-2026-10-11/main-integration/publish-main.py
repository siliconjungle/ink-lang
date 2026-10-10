#!/usr/bin/env python3
"""Fast-forward the explicitly authorized nine main branches; never force or create PRs."""
from pathlib import Path
import subprocess,json,datetime
M=Path(__file__).resolve().parent;B=M.parents[2]
repos=['knowledge','lowerings/c','lowerings/js','lowerings/gpu','lowerings/rust','lowerings/wasm','runtime','planner','.'];rows=[]
for repo in repos:
 p=B/repo
 assert subprocess.check_output(['git','branch','--show-current'],cwd=p,text=True).strip()=='main'
 assert not subprocess.check_output(['git','status','--short','-uno','--ignore-submodules=all'],cwd=p,text=True).strip()
 head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=p,text=True).strip()
 run=subprocess.run(['git','-c','credential.helper=','-c','credential.helper=!gh auth git-credential','-c','http.version=HTTP/1.1','-c','http.postBuffer=157286400','push','origin','main'],cwd=p,text=True,capture_output=True)
 row={'repository':repo,'commit':head,'exit_code':run.returncode,'stdout':run.stdout,'stderr':run.stderr};rows.append(row)
 (M/'source-main-publication.json').write_text(json.dumps({'status':'in_progress'if run.returncode==0 else 'failed','authorized':'Direct main integration; no PRs.','force':False,'pull_requests_created':0,'repositories':rows},indent=2)+'\n')
 print(repo,run.returncode,flush=True)
 if run.returncode:raise SystemExit(run.returncode)
(M/'source-main-publication.json').write_text(json.dumps({'status':'pushed','timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'force':False,'pull_requests_created':0,'repositories':rows},indent=2)+'\n')
