#!/usr/bin/env python3
"""Deterministic independent state histories for complete lifecycle selection.

The public actions and profiles are benchmark inputs, never proof premises.
Writes, module import, construction, checkpoint and restore all have a price.
"""
import argparse,json
from pathlib import Path

def workload(reads,heldout):
    n=1536 if heldout else 1024
    salt=23 if heldout else 7
    setup=[dict(call='write',args=[i,dict(active=i%3==0,weight=i*19),False]) for i in range(n)]
    calls=[]
    for i in range(64):
        calls.append(dict(call='write',args=[(i*43+salt)%n,dict(active=(i+salt)%5!=0,weight=i*101+salt),False]))
        calls.extend(dict(call='odd_count',args=[]) for _ in range(reads))
    phases={k:dict(kind=k) for k in ['module_load','initialise','checkpoint','restore']}
    phases['updates']=dict(kind='history',calls=calls)
    return dict(schema=2,setup=setup,phases=phases,
                profile=dict(module_load=1,initialise=1,updates=16,checkpoint=1,restore=1),
                workload=dict(shape=dict(rows=n,updates=64,reads_per_update=reads),
                              distribution='independent-heldout' if heldout else 'development',
                              concurrency=1,residency='restored-logical-state'))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('output',type=Path);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
    for reads,name in [(0,'write-only'),(1,'read-update')]:
        for heldout in [False,True]:
            path=a.output/(name+('-heldout' if heldout else '-train')+'.json')
            path.write_text(json.dumps(workload(reads,heldout),separators=(',',':'))+'\n')
            print(path)
