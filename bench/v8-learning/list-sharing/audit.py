"""Authenticate retained inputs, replay equations and recompute measured ratios."""
import argparse,hashlib,json,statistics,subprocess,tempfile
from pathlib import Path
HERE=Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('--ink',type=Path);a=p.parse_args()
index=json.loads((HERE/'sha256-index.json').read_bytes())
for name,expected in index['files'].items():
 path=(HERE/name).resolve();assert path.is_relative_to(HERE)
 assert hashlib.sha256(path.read_bytes()).hexdigest()==expected,name
summary=json.loads((HERE/'evidence/summary.json').read_bytes());fingerprints=[];guards={}
for split in ['training','holdout']:
 request=json.loads((HERE/('evidence/'+split+'-request.json')).read_bytes());phases=request['phases'];rows={phase:{m:[]for m in ['baseline','shared']}for phase in phases};seen=set()
 for process in range(3):
  result=json.loads((HERE/f'evidence/{split}-{process}.json').read_bytes());assert not result['rejected'];seen.update(result['input_fingerprints'])
  assert len(result['rows'])==len(phases)*2
  for row in result['rows']:
   samples=list(map(int,row['complete_call_ns']));assert len(samples)==11 and all(x>0 for x in samples)
   assert row['phase_calls']==2
   rows[row['phase']][row['measurement']].extend(samples)
  for phase in phases:
   r={v['measurement']:v for v in result['rows']if v['phase']==phase}
   ratio=statistics.median(map(int,r['baseline']['complete_call_ns']))/statistics.median(map(int,r['shared']['complete_call_ns']))
   assert str(ratio)==summary['results'][split][phase]['process_ratios'][process]
 for phase in phases:
  assert str(statistics.median(map(float,summary['results'][split][phase]['process_ratios'])))==summary['results'][split][phase]['median_ratio']
 lower=sum(min(v['baseline'])for v in rows.values());upper=sum(max(v['shared'])for v in rows.values())
 guards[split]=dict(baseline_weighted_lower_ns=lower,shared_weighted_upper_ns=upper,minimum_gain_ppm=100000,passes=upper*1000000<lower*900000)
 fingerprints.append(seen)
assert not fingerprints[0]&fingerprints[1]
if a.ink:
 compiler=a.ink.resolve();result=subprocess.run([compiler,'check-selection',HERE/'evidence/core.json',HERE/'evidence/selection.json'],capture_output=True,text=True,timeout=180)
 assert result.returncode==0,result.stderr
print(json.dumps(dict(status='authenticated',files=len(index['files']),proof_replayed=bool(a.ink),sample_guards=guards,scope='Finite independent measurements and ordinary proof replay; no automatic selection authority.')))
