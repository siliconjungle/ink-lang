#!/usr/bin/env python3
"""Reacquire unchanged lifecycle artifacts without rebuilding timed programs."""
import argparse,hashlib,json,os,statistics,subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('report',type=Path);p.add_argument('--project',type=Path,required=True);p.add_argument('--cases',type=Path,required=True);p.add_argument('--rounds',type=int,required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
if a.rounds<2:p.error('at least two rounds required')
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
r=json.loads(a.report.read_text());exe=a.project/'target/release/persistent_compare'
assert sha(exe)==r['executable_sha256'] and sha(a.cases)==r['input_sha256']
env={**os.environ,'INK_LIFECYCLE_ROUNDS':str(a.rounds),'INK_LIFECYCLE_CHUNK':str(r['merge_chunk'])}
out=subprocess.check_output([exe.resolve(),a.cases.resolve()],env=env,text=True)
assert sha(exe)==r['executable_sha256']
rows=[json.loads(line)for line in out.splitlines()]
assert {(x['case'],x['variant'])for x in rows}=={(x['case'],x['variant'])for x in r['results']}
for row in rows:
 for phase in ['merge','save','load']:
  xs=row[phase+'_samples_ns'];assert len(xs)==a.rounds and all(type(x)is int and x>0 for x in xs)
  row[phase+'_median_ns']=statistics.median(xs)
r.update(rounds=a.rounds,results=rows,reacquired_from_sha256=sha(a.report))
a.o.write_text(json.dumps(r,indent=2)+'\n')
