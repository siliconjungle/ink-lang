#!/usr/bin/env python3
"""Fit the existing Ink cost-profile model from immutable browser observations."""
import hashlib,json,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'planner'),str(ROOT/'knowledge')]
from ink_knowledge import Store
from ink_planner.cost_profiles import fit

output=pathlib.Path(sys.argv[1]);paths=[pathlib.Path(p) for p in sys.argv[2:]]
assert len(paths)>=3
records=[json.loads(p.read_text()) for p in paths]
assert all(r['mode']=='train' and len(r['receipts'])==6 for r in records)
assert all(r['source_hashes']==records[0]['source_hashes'] and r['targetKey']==records[0]['targetKey'] for r in records)
private=output.parent/'profile-knowledge'
assert not private.exists(),'preserve previous observations; choose a fresh output directory'
store=Store.publish(private,[]);rows=[]
for record in records:
    for case in record['receipts']:
        assert case['validated']
        for backend in ['cpu','gpu']:
            assert case['backends'][backend]==backend
            observation=dict(schema=1,program=case['core_sha256'],entries=[],plan=case['core_sha256'],
                target=dict(hardware=json.dumps(record['device'],sort_keys=True),driver=record['environment']['browser'],toolchain=record['source_hashes']['build/projected-read-compiler/ink'],backend=backend,bridge='packed-v1'),
                workload=dict(shape={'features':case['features']},distribution={'dataset':'deterministic-word-and-finite-binary32-portfolio','kernel':case['kernel'],'n':case['n']},concurrency=1,residency=case['boundary']),
                metrics=dict(complete_call_ns=[str(max(1,round(ns))) for ns in case['samples_ns'][backend]],peak_bytes=None))
            rows.append(dict(scope=case['scope'],observation=store.observe(observation)))
identity,profile=fit(store,rows,records[0]['targetKey'])
output.write_text(json.dumps(profile,indent=2)+'\n')
(output.parent/'fit-receipt.json').write_text(json.dumps(dict(model=identity,observations=rows,training_files={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},fitter_sha256=hashlib.sha256((ROOT/'planner/ink_planner/cost_profiles.py').read_bytes()).hexdigest(),authority='Profitability only; no training inputs are held-out evaluation cases.'),indent=2)+'\n')
print(json.dumps(dict(model=identity,observations=len(rows),output=str(output))))
