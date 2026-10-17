import argparse,hashlib,json,statistics,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--pairs',type=int,default=6);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
assert 1<=a.pairs<=20
root=Path(__file__).resolve().parent;out=a.out.resolve();out.mkdir(parents=True,exist_ok=False)
records=[]
for pair in range(a.pairs):
    order=['baseline','new']if pair%2==0 else['new','baseline'];r={}
    for name in order:
        command=['node',str(root/'measure.mjs'),str(root/(name+'.mjs')),str(root/'data.json'),name,str(pair)]
        result=subprocess.run(command,capture_output=True,text=True,timeout=300)
        (out/f'{pair}-{name}.log').write_text(result.stderr);result.check_returncode()
        (out/f'{pair}-{name}.json').write_text(result.stdout);r[name]=json.loads(result.stdout)
    assert len(r['baseline']['records'])==len(r['new']['records'])==24
    for x,y in zip(r['baseline']['records'],r['new']['records']):
        for key in ['name','scenario','checksum','first','snapshot']:assert x[key]==y[key],(pair,x['name'],key)
    records.append(r)
    print(json.dumps(dict(pair=pair,ratios={x['name']:x['median_ms']/y['median_ms']for x,y in zip(r['baseline']['records'],r['new']['records'])})),flush=True)
ratios={}
for i,row in enumerate(records[0]['baseline']['records']):
    values=[r['baseline']['records'][i]['median_ms']/r['new']['records'][i]['median_ms']for r in records]
    ratios[row['name']]=dict(median=statistics.median(values),pairs=values,min=min(values),max=max(values))
summary=dict(status='measured-unadmitted',pairs=a.pairs,ratios=ratios,images={name:hashlib.sha256((root/(name+'.mjs')).read_bytes()).hexdigest()for name in ['baseline','new']},source=hashlib.sha256((root/'source.core.json').read_bytes()).hexdigest(),scope='Same checked source, old/new literal JavaScript emission.96finite values and335complete exact-state reference outcomes per process before24timing cases. Sharedhost; no planner admission, fulltrainingalgorithm or upstream/device claim.')
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary),flush=True)
