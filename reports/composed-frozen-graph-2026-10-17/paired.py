import json,statistics,subprocess
from pathlib import Path
r=Path(__file__).resolve().parent;out=r/'paired';out.mkdir(exist_ok=True);pairs=[]
orders=[['baseline','projected','selected'],['selected','projected','baseline'],['projected','baseline','selected'],['selected','baseline','projected'],['baseline','selected','projected'],['projected','selected','baseline']]
for i,order in enumerate(orders):
 row=dict(pair=i,order=order,variants={})
 for name in order:
  data=subprocess.check_output(['node',str(r/'measure.mjs'),str(r/(name+'.mjs')),'250000',str(i+1)],text=True);(out/f'pair-{i}-{name}.json').write_text(data);row['variants'][name]=json.loads(data)
 base=row['variants']['baseline']['records']
 for name in ['projected','selected']:
  for a,b in zip(base,row['variants'][name]['records']):assert a['checksum']==b['checksum']and a['snapshot']==b['snapshot']
 pairs.append(row);print(json.dumps(dict(pair=i,ratios={name:[a['seconds']/b['seconds']for a,b in zip(base,row['variants'][name]['records'])]for name in ['projected','selected']})),flush=True)
ratios={name:[statistics.median(p['variants']['baseline']['records'][j]['seconds']/p['variants'][name]['records'][j]['seconds']for p in pairs)for j in range(3)]for name in ['projected','selected']}
result=dict(schema=1,pairs=pairs,median_paired_throughput=ratios,scope='All complete outputs consumed; exact final snapshots and checksums agree. Six fresh-process orders rotate all three variants. No concurrent test or compiler build; local Node evidence, no automatic selection.')
(out/'summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(ratios),flush=True)
