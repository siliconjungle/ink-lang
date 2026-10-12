#!/usr/bin/env python3
"""Offline tuning with disjoint measured warm rounds and charged first-use costs."""
import hashlib,json,statistics,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'planner'),str(ROOT/'knowledge')]
from ink_planner.autotune import tune
from ink_knowledge.search_artifacts import publish
path=ROOT/'reports/probabilistic-planner-2026-10-12/gpu.json';data=json.loads(path.read_text());receipts=[]
target=json.dumps(dict(browser=data['browser'],cpu=data['hostCpu'],adapter=data['adapter']),sort_keys=True)
code=hashlib.sha256(json.dumps(data['hashes'],sort_keys=True).encode()).hexdigest()
configs=[dict(backend=b) for b in ['Ink JavaScript','Ink Wasm','Ink GPU']]
for kind in ('score','evaluate'):
    for n in data['sizes']:
        cohort=[r for r in data['samples'] if r['kind']==kind and r['n']==n]
        observations={};startup={}
        for c in configs:
            label=c['backend'];train=[round(r['ms']*1e6) for r in cohort if r['label']==label and r['round']<4]
            first=[round(r['ms']*1e6) for r in data['startup'] if r['kind']==kind and r['label']==label]
            # First-use was measured at 65536 only. Charge its full observed
            # cost conservatively to every cohort; do not claim size-specific cold measurements.
            cold=statistics.median(first);startup[label]=max(0,round(cold-statistics.median(train)))
            observations[label]=dict(correct=True,fallback=False,samples_ns=train,setup_ns=startup[label],
                setup_scope='derived: full first-use median at 65536 minus training warm median; shared-page caches')
        def holdout(a,b):
            checks=[]
            for round_index in (4,5,6):
                base=next(r for r in cohort if r['label']==a['backend'] and r['round']==round_index)['ms']*1e6
                candidate=next(r for r in cohort if r['label']==b['backend'] and r['round']==round_index)['ms']*1e6
                checks.append(dict(round=round_index,correct=True,baseline_ns=base,candidate_ns=candidate,
                    baseline_total_ns=startup[a['backend']]+256*base,candidate_total_ns=startup[b['backend']]+256*candidate))
            return checks
        receipt=tune(configs,lambda c:observations[c['backend']],budget=3,seed=173,expected_calls=256,
            context=dict(target=target,code=code,boundary='complete owned output including transfers',workload=f'{kind}:{n}'),heldout=holdout)
        receipt['evidence_sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
        receipt['artifact']=publish(ROOT/'build/probabilistic-planner/knowledge','observations',receipt)
        receipts.append(receipt)
report=dict(schema=1,receipts=receipts,scope='offline replay of measured alternatives; disjoint warm rounds; first-use estimate charged; no runtime profile installed or automatic target admission')
(path.parent/'autotune.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps([dict(workload=r['context']['workload'],proposal=r['proposal'],selected=r['selected'],heldout_pass=r['released']) for r in receipts],indent=2))
