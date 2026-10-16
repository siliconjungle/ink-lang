import json,subprocess,time,statistics
from pathlib import Path
r=Path(__file__).resolve().parent
rows=[]
for pair in range(6):
 order=['baseline','projected']if pair%2==0 else ['projected','baseline']
 row=dict(pair=pair,order=order,records={})
 for name in order:
  p=subprocess.run(['node',str(r/'measure.mjs'),str(r/(name+'.mjs')),'250000',str(pair+1)],capture_output=True,text=True,check=True)
  result=json.loads(p.stdout);row['records'][name]=result
  (r/f'benchmark-projection-pair-{pair}-{name}.json').write_text(p.stdout)
 a,b=[row['records'][x]for x in ['baseline','projected']]
 for x,y in zip(a['records'],b['records']):
  assert x['checksum']==y['checksum']and x['snapshot']==y['snapshot']
 rows.append(row);print(json.dumps(dict(pair=pair,speedups=[x['seconds']/y['seconds']for x,y in zip(a['records'],b['records'])])),flush=True)
summary=dict(schema=1,pairs=6,measurements=rows,median_paired_speedup={str(stride):statistics.median(row['records']['baseline']['records'][i]['seconds']/row['records']['projected']['records'][i]['seconds']for row in rows)for i,stride in enumerate([0,8,1])})
(r/'benchmark-projection-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary['median_paired_speedup']),flush=True)
