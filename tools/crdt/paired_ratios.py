#!/usr/bin/env python3
"""Paired-round bootstrap intervals for eligible native comparison reports.

Intervals describe this acquisition's timing uncertainty, not proof or cross-host
performance. Full outputs must have been validated by the benchmark harness.
"""
import argparse,json,random,statistics
from pathlib import Path

def ratios(report,draws=5000,seed=821020,variant='ink_batched_graph',baseline='diamond_types'):
 if report.get('timing_eligible') is not True:raise ValueError('diagnostic timing is ineligible')
 rng=random.Random(seed);result=[]
 rows=report['results']
 for row in rows:
  if row['variant']!=variant:continue
  other=next(x for x in rows if x['case']==row['case'] and x['variant']==baseline)
  a,b=row['samples_ns'],other['samples_ns'];n=len(a)
  if n<2 or n!=len(b) or min(a+b)<=0:raise ValueError('positive equal-length samples, at least two rounds, required')
  estimates=[]
  for _ in range(draws):
   indices=[rng.randrange(n) for _ in range(n)]
   estimates.append(statistics.median([a[i] for i in indices])/statistics.median([b[i] for i in indices]))
  estimates.sort()
  result.append(dict(case=row['case'],rounds=n,ratio=statistics.median(a)/statistics.median(b),
                     low=estimates[int(draws*.025)],high=estimates[min(draws-1,int(draws*.975))]))
 return dict(method='paired-round bootstrap, ratio of medians',variant=variant,baseline=baseline,seed=seed,draws=draws,interval=.95,results=result)

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('report',type=Path);p.add_argument('-o',type=Path,required=True)
 p.add_argument('--draws',type=int,default=5000);p.add_argument('--seed',type=int,default=821020)
 p.add_argument('--variant',default='ink_batched_graph');p.add_argument('--baseline',default='diamond_types');a=p.parse_args()
 if a.draws<100:p.error('at least 100 bootstrap draws required')
 a.o.write_text(json.dumps(ratios(json.loads(a.report.read_text()),a.draws,a.seed,a.variant,a.baseline),indent=2)+'\n')
