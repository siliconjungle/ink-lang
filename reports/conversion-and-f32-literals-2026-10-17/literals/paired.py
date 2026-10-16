import json,statistics,subprocess,sys
from pathlib import Path
r=Path(__file__).resolve().parent;output_directory=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else r;output_directory.mkdir(exist_ok=True);rows=[]
for i in range(6):
 order=['before','after']if i%2==0 else['after','before'];record=dict(pair=i,order=order,variants={})
 for name in order:
  out=subprocess.check_output(['node',str(r/'measure.mjs'),str(r/(name+'.mjs')),str(i+1)],text=True);record['variants'][name]=json.loads(out);(output_directory/f'pair-{i}-{name}.json').write_text(out)
 a,b=[record['variants'][name]for name in ['before','after']]
 for x,y in zip(a['records'],b['records']):
  assert x['workload']==y['workload']and x['checksum']==y['checksum']
  if 'state'in x:assert x['state']==y['state']
 rows.append(record);print(json.dumps(dict(pair=i,ratios={x['workload']:x['seconds']/y['seconds']for x,y in zip(a['records'],b['records'])})),flush=True)
names=[v['workload']for v in rows[0]['variants']['before']['records']]
result=dict(schema=1,pairs=rows,median_paired_ratio={name:statistics.median(p['variants']['before']['records'][i]['seconds']/p['variants']['after']['records'][i]['seconds']for p in rows)for i,name in enumerate(names)})
(output_directory/'summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result['median_paired_ratio']),flush=True)
