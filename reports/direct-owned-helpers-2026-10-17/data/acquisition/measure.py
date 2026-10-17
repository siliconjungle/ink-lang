"""Matched current-published versus private numeric-owner emitter study."""
import argparse,hashlib,json,statistics,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--image',type=Path);p.add_argument('--pairs',type=int,default=6);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[2];here=Path(__file__).parent;data=root/'build/owned-carriers/neural-final';out=a.out.resolve();out.mkdir(exist_ok=False)
images={'baseline':data/'new.mjs','new':a.image.resolve() if a.image else here/'neural-prepared.mjs'}
protocol={'status':'private-unadmitted','node':subprocess.check_output(['node','--version'],text=True).strip(),'images':{n:{'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for n,p in images.items()},'runner_sha256':hashlib.sha256((data/'measure.mjs').read_bytes()).hexdigest(),'pairs':a.pairs,'started':time.time(),'scope':'Shared host. Same source, seed, complete replies and snapshots. No concurrent local compilation or other performance probes. Not planner evidence or upstream parity.'}
(out/'protocol.json').write_text(json.dumps(protocol,indent=2)+'\n');records=[]
for pair in range(a.pairs):
 order=['baseline','new']if pair%2==0 else['new','baseline'];r={}
 for name in order:
  cmd=['node',str(data/'measure.mjs'),str(images[name]),str(data),name,str(pair)]
  result=subprocess.run(cmd,capture_output=True,text=True,timeout=300)
  (out/f'{pair}-{name}.log').write_text(result.stderr);(out/f'{pair}-{name}.exit.json').write_text(json.dumps({'command':cmd,'exit_code':result.returncode})+'\n');result.check_returncode()
  (out/f'{pair}-{name}.json').write_text(result.stdout);r[name]=json.loads(result.stdout)
 assert r['baseline']['core_sha256']==r['new']['core_sha256']
 assert r['baseline']['verified_reference_outcomes']==r['new']['verified_reference_outcomes']==27
 assert r['baseline']['dense_predictions']==r['new']['dense_predictions']==16
 assert len(r['baseline']['rows'])==len(r['new']['rows'])==5
 for x,y in zip(r['baseline']['rows'],r['new']['rows']):
  assert x.keys()==y.keys()
  for key in x:
   if key!='samples_ms':assert x[key]==y[key],(pair,x['name'],key)
 records.append(r);print(json.dumps({'pair':pair,'ratios':{x['name']:statistics.median(x['samples_ms'])/statistics.median(y['samples_ms'])for x,y in zip(r['baseline']['rows'],r['new']['rows'])}}),flush=True)
ratios={}
for i,row in enumerate(records[0]['baseline']['rows']):
 values=[statistics.median(r['baseline']['rows'][i]['samples_ms'])/statistics.median(r['new']['rows'][i]['samples_ms'])for r in records];ratios[row['name']]={'median':statistics.median(values),'pairs':values,'min':min(values),'max':max(values)}
(out/'summary.json').write_text(json.dumps({'status':'measured-unadmitted','pairs':a.pairs,'ratios':ratios},indent=2)+'\n');print(json.dumps(ratios),flush=True)
