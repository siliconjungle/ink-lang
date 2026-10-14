"""Summarize fresh-process medians without pooling different harness epochs."""
import argparse,json,statistics
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('directory',type=Path);a=p.parse_args()
runs=[json.loads(p.read_text()) for p in sorted(a.directory.glob('process-*.json'))]
assert len(runs)>=3,'need at least three fresh processes'
for r in runs[1:]:
 assert r['provenance']==runs[0]['provenance']
 assert r['profile_sha256']==runs[0]['profile_sha256']
 assert r['validation']==runs[0]['validation']
keys=sorted({(r['rows'],r['trace'],r['lane']) for r in runs[0]['measurements']})
summary=[]
for rows,trace,lane in keys:
 samples=[];setup=[];switches=[]
 for run in runs:
  cells=[r for r in run['measurements'] if (r['rows'],r['trace'],r['lane'])==(rows,trace,lane)]
  assert len(cells)==3
  samples.append(statistics.median(r['elapsed_ns'] for r in cells)/1e6)
  setup.append(statistics.median(r['setup_ns'] for r in cells)/1e6)
  switches.extend(len(r['switches']) for r in cells)
 summary.append(dict(rows=rows,trace=trace,lane=lane,median_ms=statistics.median(samples),process_medians_ms=samples,setup_median_ms=statistics.median(setup),switch_counts=switches,calls=cells[0]['calls']))
out=dict(processes=len(runs),rounds_per_process=3,measurements=summary)
(a.directory/'summary.json').write_text(json.dumps(out,indent=2)+'\n')
for rows,trace in sorted({(r['rows'],r['trace'])for r in summary}):
 cells={r['lane']:r for r in summary if (r['rows'],r['trace'])==(rows,trace)}
 print(rows,trace,' '.join(f"{lane}={r['median_ms']:.2f}" for lane,r in cells.items()),'Frontier/adaptive',round(cells['frontier_state']['median_ms']/cells['ink_adaptive']['median_ms'],3))
