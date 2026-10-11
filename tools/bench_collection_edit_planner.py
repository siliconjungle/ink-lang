#!/usr/bin/env python3
"""Measure generic term rebuilding; baseline reproduces previous shift code."""
import copy,json,statistics,time,sys
from pathlib import Path
sys.path[:0]=[str(Path(__file__).resolve().parents[1]/'planner'),str(Path(__file__).resolve().parents[1]/'knowledge')]
from ink_planner.semantic_search import children,set_child,shift

def old_shift(t,amount,cutoff=0):
    t=copy.deepcopy(t);n=t['node']
    if isinstance(n,dict) and 'Bound'in n and n['Bound']>=cutoff:
        n['Bound']+=amount
        if n['Bound']<cutoff:raise ValueError('binder capture')
    else:
        for i,c in enumerate(children(t)):
            t=set_child(t,i,old_shift(c,amount,cutoff+int('Lambda'in n)))
    return t

for width in (16,32,64):
    s={'Value':'U32'};branch=dict(sort=s,node={'Bound':0})
    for i in range(8):branch=dict(sort=s,node={'Op':['binary:+',[branch,dict(sort=s,node={'Word':i})]]})
    tree=dict(sort=s,node={'Op':['call:wide',[branch]*width]})
    expected=old_shift(tree,1);samples={f.__name__:[] for f in (old_shift,shift)}
    for _ in range(9):
        for f in (old_shift,shift):
            start=time.perf_counter_ns();actual=f(tree,1);elapsed=time.perf_counter_ns()-start
            assert actual==expected;samples[f.__name__].append(elapsed)
    print(json.dumps(dict(width=width,branch_depth=8,samples=9,baseline_median_ns=statistics.median(samples['old_shift']),single_pass_median_ns=statistics.median(samples['shift']))))
