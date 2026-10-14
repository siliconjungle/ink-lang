#!/usr/bin/env python3
"""Exact ancestor-difference counts for a supplied topological history.

Diagnostic only: Python bitsets are an independent model, not a CRDT backend,
proof, or timed competitor. Limit input size explicitly to bound memory.
"""
import argparse,json
from pathlib import Path

def counts(changes):
    reached={};previous=0;retreated=advanced=queries=maximum=0
    for index,c in enumerate(changes):
        target=0
        for parent in c['parents']:target |= reached[parent]
        if target!=previous:
            queries+=1
            removed=(previous & ~target).bit_count()
            retreated+=removed;advanced+=(target & ~previous).bit_count()
            maximum=max(maximum,removed)
        previous=target | (1<<index)
        reached[c['id']+c['remove']+len(c['text'])-1]=previous
    return dict(changes=len(changes),queries=queries,retreated=retreated,
                advanced=advanced,maximum_retreat=maximum)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('cases',type=Path);p.add_argument('--case',required=True)
    p.add_argument('--max-changes',type=int,default=60000)
    p.add_argument('-o',type=Path,required=True);a=p.parse_args()
    case=next(c for c in json.loads(a.cases.read_text()) if c['name']==a.case)
    if len(case['changes'])>a.max_changes:raise ValueError('explicit diagnostic size limit exceeded')
    a.o.write_text(json.dumps(dict(case=a.case,**counts(case['changes'])),indent=2)+'\n')
