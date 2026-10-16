import hashlib,json,statistics,subprocess
from pathlib import Path
import argparse
p=argparse.ArgumentParser();p.add_argument('--pairs',type=int,default=5);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parent;out=a.out.resolve();out.mkdir(parents=True,exist_ok=False)
rows=[]
for pair in range(a.pairs):
 order=['baseline','new']if pair%2==0 else ['new','baseline'];r={}
 for name in order:
  command=['node',str(root/'measure.mjs'),str(root/(name+'.mjs')),str(root/'controls-final'),name,str(pair)]
  result=subprocess.run(command,capture_output=True,text=True,timeout=180)
  (out/f'pair-{pair}-{name}.log').write_text(result.stderr)
  result.check_returncode();r[name]=json.loads(result.stdout);(out/f'pair-{pair}-{name}.json').write_text(result.stdout)
 for x,y in zip(r['baseline']['records'],r['new']['records']):
  for key in ['name','count','checksums','first','snapshot']:assert x[key]==y[key],(pair,x['name'],key)
 assert r['baseline']['core_sha256']==r['new']['core_sha256']
 rows.append(r);print(json.dumps(dict(pair=pair,ratios={x['name']:x['median_ms']/y['median_ms']for x,y in zip(r['baseline']['records'],r['new']['records'])})),flush=True)
ratios={}
for i,case in enumerate(rows[0]['baseline']['records']):
 values=[r['baseline']['records'][i]['median_ms']/r['new']['records'][i]['median_ms']for r in rows]
 ratios[case['name']]=dict(median=statistics.median(values),pairs=values,min=min(values),max=max(values))
summary=dict(status='measured-unadmitted',pairs=a.pairs,ratios=ratios,images={n:hashlib.sha256((root/(n+'.mjs')).read_bytes()).hexdigest()for n in ['baseline','new']})
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(ratios),flush=True)
