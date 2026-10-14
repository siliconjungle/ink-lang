#!/usr/bin/env python3
"""Fit immutable complete resident-session observations; evaluation is separate."""
import hashlib,json,pathlib,sys
from collections import Counter
ROOT=pathlib.Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'planner'),str(ROOT/'knowledge')]
from ink_knowledge import Store
from ink_planner.cost_profiles import fit
output=pathlib.Path(sys.argv[1]);paths=[pathlib.Path(p)for p in sys.argv[2:]]
if len(paths)<3:raise ValueError('at least three fresh training processes required')
records=[json.loads(p.read_text())for p in paths]
if any(r['mode'] not in ('train','cold-train')or len(r['receipts'])!=18 or r['source_hashes']!=records[0]['source_hashes']or r['targetKey']!=records[0]['targetKey']for r in records):raise ValueError('training provenance differs')
if any(n<3 for n in Counter(r['mode'] for r in records).values()):raise ValueError('three fresh processes per preparation regime required')
private=output.parent/'profile-knowledge'
if private.exists():raise ValueError('preserve previous observations; choose a fresh output directory')
store=Store.publish(private,[]);rows=[]
for record in records:
 for case in record['receipts']:
  if not case['validated']:raise ValueError('unvalidated candidate')
  for backend in ['cpu','gpu']:
   if case['backends'][backend]!=backend:raise ValueError('fallback is not device evidence')
   observation=dict(schema=1,program=case['core_sha256'],entries=[],plan=case['core_sha256'],
    target=dict(hardware=json.dumps(record['device'],sort_keys=True),driver=record['environment']['browser'],toolchain=record['source_hashes']['build/resident-profile/manifest.json'],backend=backend,bridge='packed-v1'),
    workload=dict(shape={'features':case['features']},distribution={'dataset':'resident-profile-v1','kernel':case['kernel'],'preparation':record['mode'],'n':case['n'],'iterations':case['iterations']},concurrency=1,residency=case['boundary']),
    metrics=dict(complete_call_ns=[str(max(1,round(ns)))for ns in case['samples_ns'][backend]],peak_bytes=None))
   rows.append(dict(scope=case['scope'],observation=store.observe(observation)))
id,profile=fit(store,rows,records[0]['targetKey']);output.write_text(json.dumps(profile,indent=2)+'\n')
(output.parent/'fit-receipt.json').write_text(json.dumps(dict(model=id,observations=rows,training_files={str(p):hashlib.sha256(p.read_bytes()).hexdigest()for p in paths},fitter_sha256=hashlib.sha256((ROOT/'planner/ink_planner/cost_profiles.py').read_bytes()).hexdigest(),basis_sha256=hashlib.sha256((ROOT/'knowledge/ink_knowledge/cost-model-basis.json').read_bytes()).hexdigest(),authority='Profitability only; held-out sizes and horizons are excluded.'),indent=2)+'\n')
print(json.dumps(dict(model=id,observations=len(rows),output=str(output))))
