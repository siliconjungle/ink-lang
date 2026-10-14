#!/usr/bin/env python3
"""Paired timing uncertainty for explicit retained lifecycle phases."""
import argparse,json,random,statistics
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('report',type=Path);p.add_argument('-o',type=Path,required=True);p.add_argument('--baseline',default='ink_control');p.add_argument('--variant',default='ink_retained_causal');p.add_argument('--phases',nargs='+',choices=['merge','save','load'],default=['merge','save','load']);a=p.parse_args()
r=json.loads(a.report.read_text());rng=random.Random(821020);out=[]
for row in r['results']:
 if row['variant']!=a.variant:continue
 other=next(x for x in r['results']if x['case']==row['case']and x['variant']==a.baseline)
 assert row.get('merge_chunk',r['merge_chunk'])==other.get('merge_chunk',r['merge_chunk']) and row['retained_batches']==other['retained_batches'] and row['merged_batches']==other['merged_batches'] and row['output_codepoints']==other['output_codepoints']
 phases={}
 for phase in a.phases:
  x,y=row[phase+'_samples_ns'],other[phase+'_samples_ns'];n=len(x);assert n==len(y)==r['rounds']and n>=2 and min(x+y)>0
  estimates=[]
  for _ in range(5000):
   indices=[rng.randrange(n)for _ in range(n)];estimates.append(statistics.median([x[i]for i in indices])/statistics.median([y[i]for i in indices]))
  estimates.sort();phases[phase]=dict(ratio=statistics.median(x)/statistics.median(y),low=estimates[125],high=estimates[4875])
 out.append(dict(case=row['case'],phases=phases))
assert out,'requested variant is absent'
a.o.write_text(json.dumps(dict(method='Paired-round bootstrap ratio of medians; 5000 draws; nominal95%; acquisition-specific uncertainty only',variant=a.variant,baseline=a.baseline,rounds=r['rounds'],results=out),indent=2)+'\n')
