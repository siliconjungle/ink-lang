#!/usr/bin/env python3
"""Publish physical lifecycle samples separately from mathematical knowledge.

Plan identity is SHA256 of the exact checked-request file, binding admission
cost to its witness/closure bytes. The caller supplies target provenance.
Measurements never assert proof or compiler correctness.
"""
import argparse,hashlib,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
from ink_knowledge import Store

def publish(store,requests,reports,target):
    identities={label:hashlib.sha256(path.read_bytes()).hexdigest() for label,path in requests.items()}
    parsed={label:json.loads(path.read_bytes()) for label,path in requests.items()}
    bridges={label:hashlib.sha256((requests[label].parent/name).read_bytes()).hexdigest() for label,name in [('direct','reverse.json'),('delta','forward.json')]}
    sources={r['input_core_sha256'] for r in parsed.values()}
    if len(sources)!=1:raise ValueError('requests do not share a source')
    source=sources.pop();published=[]
    for report in reports:
        if report['schema']!=1 or report['source']!=source:raise ValueError('measurement source mismatch')
        for row in report['measurements']:
            phase=row['phase']
            workload=dict(shape={'rows':row['rows']},distribution=dict(workload='point query; one call per restored session',phase=phase),concurrency=1,residency='native process; all candidates/proofs resident; requested live heap')
            for label,request in parsed.items():
                samples=[s for s in row['samples'] if s['candidate']==label]
                if not samples or any(s['plan']!=request['representation'] for s in samples):raise ValueError('measurement plan mismatch')
                measured_workload=dict(workload)
                if phase=='migrate':measured_workload['distribution']=dict(workload=workload['distribution']['workload'],phase='migrate:'+identities['refresh']+(':'+bridges[label] if label in bridges else ''))
                obj=dict(schema=1,program=source,entries=sorted(request['knowledge']['objects']),plan=identities[label],target=target,workload=measured_workload,metrics=dict(complete_call_ns=[str(s['ns']) for s in samples],peak_bytes=(max(s['peak_bytes'] for s in samples) if all(s['peak_bytes'] is not None for s in samples) else None)))
                published.append(store.observe(obj))
    return identities,published
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--knowledge-root',type=Path,required=True);p.add_argument('--requests',type=Path,required=True);p.add_argument('--reports',type=Path,nargs='+',required=True);p.add_argument('--target',type=Path,required=True);a=p.parse_args()
    ids,observations=publish(Store(a.knowledge_root),{label:a.requests/(label+'.json') for label in ('direct','refresh','delta')},[json.loads(p.read_text()) for p in a.reports],json.loads(a.target.read_text()))
    print(json.dumps(dict(request_sha256=ids,observations=len(observations))))
