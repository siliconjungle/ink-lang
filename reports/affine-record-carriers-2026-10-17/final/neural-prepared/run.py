import argparse,json,statistics,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--pairs',type=int,default=6);p.add_argument('--out',type=Path,required=True);a=p.parse_args();root=Path(__file__).resolve().parent;out=a.out.resolve();out.mkdir(parents=True,exist_ok=False);records=[]
for pair in range(a.pairs):
 order=['baseline','new']if pair%2==0 else ['new','baseline'];r={}
 for name in order:
  result=subprocess.run(['node',str(root/'measure.mjs'),str(root/(name+'.mjs')),str(root),name,str(pair)],capture_output=True,text=True,timeout=300);(out/f'{pair}-{name}.log').write_text(result.stderr);result.check_returncode();(out/f'{pair}-{name}.json').write_text(result.stdout);r[name]=json.loads(result.stdout)
 assert r['baseline']['core_sha256']==r['new']['core_sha256']
 for x,y in zip(r['baseline']['rows'],r['new']['rows']):
  assert x.keys()==y.keys()
  for key in x:
   if key!='samples_ms':assert x[key]==y[key],(pair,x['name'],key)
 records.append(r);print(json.dumps(dict(pair=pair,ratios={x['name']:statistics.median(x['samples_ms'])/statistics.median(y['samples_ms'])for x,y in zip(r['baseline']['rows'],r['new']['rows'])})),flush=True)
ratios={}
for i,row in enumerate(records[0]['baseline']['rows']):
 values=[statistics.median(r['baseline']['rows'][i]['samples_ms'])/statistics.median(r['new']['rows'][i]['samples_ms'])for r in records];ratios[row['name']]=dict(median=statistics.median(values),pairs=values,min=min(values),max=max(values))
(out/'summary.json').write_text(json.dumps(dict(status='measured-unadmitted',pairs=a.pairs,ratios=ratios),indent=2)+'\n');print(json.dumps(ratios),flush=True)
