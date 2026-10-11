#!/usr/bin/env python3
"""Medians over independent merged-main processes, without dropping losing cases."""
import argparse,json,statistics
from collections import defaultdict
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('directory',type=Path);a=p.parse_args();root=a.directory
all_cases=defaultdict(lambda:defaultdict(list));phase=defaultdict(lambda:defaultdict(list));stages=defaultdict(lambda:defaultdict(lambda:defaultdict(list)))
for path in sorted(root.glob('point-*.json')):
 for row in json.loads(path.read_text())['measurements']:
  key=('point',row['rows'],row['candidate'],'get',row['read_percent'])
  for name in ['native','baseline_ink','handwritten_rust']:
   all_cases[key][name+'_ns'].extend(x['ns']for x in row[name])
  for name in ['check_ns','initialise_ns','migration_ns']:phase[('point',row['rows'],row['candidate'])][name].append(row[name])
  for name,values in row['stages'].items():
   for measure,value in zip(['ns','allocations','allocated_bytes'],values):stages[key][name][measure].append(value)
for path in sorted(root.glob('aggregate-*.json')):
 data=json.loads(path.read_text())
 for row in data['measurements']:
  key=('aggregate',row['rows'],row['candidate'],row['query'],row['read_percent'])
  for sample in row['samples']:
   for name in ['native_ns','baseline_ink_ns','handwritten_rust_ns','handwritten_incremental_rust_ns']:all_cases[key][name].append(sample[name])
 for row in data['phases']:
  for name,value in row.items():
   if name.endswith('_ns')and value is not None:phase[('aggregate',row['rows'],row['candidate'])][name].append(value)
result=dict(schema=1,scope='Median across all recorded samples; ns per 100 complete calls; point samples, when present, allocation-instrumented; execution contract comes from raw scope/provenance; no cross-revision ratio from historical runs',measurements=[],phases=[],stages=[])
for (workload,rows,candidate,query,reads),metrics in sorted(all_cases.items()):
 med={name:statistics.median(values)for name,values in metrics.items()};result['measurements'].append(dict(workload=workload,rows=rows,candidate=candidate,query=query,read_percent=reads,calls_per_sample=100,**med,baseline_speedup=med['baseline_ink_ns']/med['native_ns']))
for (workload,rows,candidate),metrics in sorted(phase.items()):result['phases'].append(dict(workload=workload,rows=rows,candidate=candidate,**{name:statistics.median(values)for name,values in metrics.items()}))
for (workload,rows,candidate,query,reads),by_stage in sorted(stages.items()):result['stages'].append(dict(workload=workload,rows=rows,candidate=candidate,query=query,read_percent=reads,stages={stage:{name:statistics.median(values)for name,values in metrics.items()}for stage,metrics in by_stage.items()}))
(root/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
for row in result['measurements']:
 if row['rows']in [2048,4000]and (row['workload']=='point'or(row['query']=='total_query'and row['read_percent']in [0,10,50,90,100])):
  print(row['workload'],row['rows'],row['candidate'],row['query'],row['read_percent'],*[round(row[name]/1e6,3)for name in ['native_ns','baseline_ink_ns','handwritten_rust_ns']])
