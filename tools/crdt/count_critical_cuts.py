#!/usr/bin/env python3
"""Diagnostic critical-cut coverage for topological, endpoint-based batch traces.

This mirrors the conservative criterion of the separately tested causal_cuts
library; it is not a source-refinement certificate or optimisation authority.
"""
import argparse,json
from pathlib import Path

def cuts(changes):
 tips=set();maximum=[0];flags=[True];ends={}
 for index,c in enumerate(changes,1):
  parents=[ends[p] for p in c['parents']]
  tips.difference_update(parents);tips.add(index)
  flags.append(len(tips)==1);maximum.append(max(parents,default=0))
  ends[(c['id']+c['remove']+len(c['text'])-1)&((1<<64)-1)]=index
 minimum=(1<<32)-1
 for index in range(len(flags)-1,-1,-1):
  flags[index]=flags[index] and index<=minimum
  minimum=min(minimum,maximum[index])
 return flags

def summary(case):
 flags=cuts(case['changes']);runs=[];active=0
 for marked in flags[1:]:
  if marked:
   if active:runs.append(active);active=0
  else:active+=1
 if active:runs.append(active)
 return dict(case=case['name'],changes=len(case['changes']),critical=sum(flags[1:]),
             concurrent_regions=len(runs),concurrent_batches=sum(runs),maximum_region=max(runs,default=0))

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('cases',type=Path);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
 a.o.write_text(json.dumps([summary(c) for c in json.loads(a.cases.read_text())],indent=2)+'\n')
