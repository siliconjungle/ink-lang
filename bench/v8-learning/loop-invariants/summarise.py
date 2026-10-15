"""Aggregate every retained process, separating zero-iteration diagnostics."""
import json,statistics
from pathlib import Path
d=Path(__file__).resolve().parent
def summarise(root):
 out={}
 for split in ['training','holdout']:
  reports=[json.loads((root/f'{split}-{i}.json').read_text())for i in range(3)]
  assert all(not r['rejected'] for r in reports)
  for phase in [split,split+'-empty']:
   medians={lane:statistics.median(int(x)for r in reports for row in r['rows']if row['measurement']==lane and row['phase']==phase for x in row['complete_call_ns'])for lane in ['baseline','hoisted']}
   ratios=[]
   for r in reports:
    times={lane:statistics.median(int(x)for row in r['rows']if row['measurement']==lane and row['phase']==phase for x in row['complete_call_ns'])for lane in medians}
    ratios.append(times['baseline']/times['hoisted'])
   out[phase]=dict(median_ns=medians,baseline_over_hoisted=medians['baseline']/medians['hoisted'],process_ratios=ratios)
 return out
summary=dict(schema=1,scope='Explicit checked plan; complete steady-state calls; every result consumed; shared arm64 host; no automatic-selection or broad-program speedup claim',processes_per_split=3,javascript=summarise(d),native=summarise(d/'native'))
(d/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary))
