from pathlib import Path
import json,statistics
b=Path('build/v8-variable-power-cases');out=Path('bench/v8-learning/variable-power')
median=lambda r:statistics.median(map(int,r['complete_call_ns']))
summary=dict(schema=1,source=json.loads((b/'program/terminal.json').read_bytes())['source'],cpu={},gpu={})
for variant in ['original','refined']:
 for target in ['javascript','rust']:
  d=b/('runtime-'+target+(''if variant=='original'else'-refined'));result=json.loads((d/'result.json').read_bytes());phases={}
  for split in ['training','holdout']:
   report=json.loads((d/(split+'-report.json')).read_bytes());rows=report['acquisition']['acquisition']['rows'];phases[split]={}
   for phase in ['power','nonpower','zero','empty']:
    a=[r for r in rows if r['phase']==phase and r['measurement']==result['measurements'][0]];z=[r for r in rows if r['phase']==phase and r['measurement']==result['measurements'][1]];assert len(a)==len(z)==3
    phases[split][phase]=dict(baseline_ns=statistics.median(map(median,a)),rewrite_ns=statistics.median(map(median,z)),paired_median_ratio=statistics.median([median(x)/median(y)for x,y in zip(a,z)]))
  summary['cpu'][target+'-'+variant]=dict(heldout_accepted=result['heldout_accepted'],phases=phases)
for variant,directory in [('original','runtime-gpu'),('three-way','runtime-gpu-refined')]:
 r=json.loads((b/directory/'receipt.json').read_bytes());base=r['artifacts'][0]['measurement'];variants={a['measurement']:['baseline','original','refined'][i]for i,a in enumerate(r['artifacts'])};phases={}
 for split,receipt in r['phases'].items():
  phases[split]={}
  for phase in ['power','nonpower','zero']:
   phases[split][phase]={}
   for measure,name in variants.items():
    paired=[];passes=[];cost=[]
    for report in receipt['reports']:
     a=next(x for x in report['rows']if x['measurement']==base and x['phase']==phase);z=next(x for x in report['rows']if x['measurement']==measure and x['phase']==phase);cost.append(median(z));paired.append(median(a)/median(z));passes.append(max(map(int,z['complete_call_ns']))*10<=min(map(int,a['complete_call_ns']))*9)
    phases[split][phase][name]=dict(process_medians_ns=cost,median_ns=statistics.median(cost),paired_median_ratio=statistics.median(paired),ten_percent_extrema_by_process=passes)
 summary['gpu'][variant]=dict(phases=phases,processes_per_split=3,rounds=11,actual_device_required=True,peak_memory=None)
summary['scope']='Complete resident-call controls, independent original-source oracles and disjoint normalized holdout; shared host. Aggregate process medians and median paired ratios are distinct. CPU gate retains baseline. GPU is explicit provided-device execution, never CPU placement; build/setup excluded and peak memory unknown. Refined zero-first proof is a separate checked prototype, not an installed discovery row in this batch.'
(out/'runtime-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps({k:{n:r['heldout_accepted']for n,r in v.items()}if k=='cpu'else str(type(v).__name__)for k,v in summary.items()}))
