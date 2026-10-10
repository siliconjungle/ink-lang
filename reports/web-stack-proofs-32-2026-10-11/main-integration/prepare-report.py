#!/usr/bin/env python3
"""Summarize already-recorded integration evidence without changing frozen results."""
from pathlib import Path
import json,subprocess,hashlib
M=Path(__file__).resolve().parent; B=M.parents[2]
def read(p):return json.loads((M/p).read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
repos=['.','knowledge','planner','runtime','lowerings/c','lowerings/js','lowerings/rust','lowerings/wasm','lowerings/gpu']
rows=[]
for repo in repos:
 r=B/repo
 head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=r,text=True).strip()
 remote=subprocess.check_output(['git','remote','get-url','origin'],cwd=r,text=True).strip()
 rows.append({'path':repo,'commit':head,'remote':remote,'branch':subprocess.check_output(['git','branch','--show-current'],cwd=r,text=True).strip()})
(M/'source-main-inventory.json').write_text(json.dumps({'status':'local_main_integrated','repositories':rows},indent=2)+'\n')
print(json.dumps(rows,indent=2))
