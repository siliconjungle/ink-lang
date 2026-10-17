#!/usr/bin/env python3
"""Audit retained private experiments; no proposal or profitability admission."""
import argparse,hashlib,io,json,math,statistics,subprocess,tarfile,tempfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--run',action='store_true');a=p.parse_args();root=Path(__file__).resolve().parent
def sha(data):return hashlib.sha256(data).hexdigest()
manifest=json.loads((root/'files.json').read_text())
assert set(manifest)=={str(p.relative_to(root))for p in root.rglob('*')if p.is_file()and p.name!='files.json'}
for name,digest in manifest.items():assert sha((root/name).read_bytes())==digest,name
study=json.loads((root/'study.json').read_text());archives={}
for name,expected in study['archives'].items():
 with tarfile.open(fileobj=io.BytesIO((root/name).read_bytes()),mode='r:gz')as t:
  raw={}
  for member in t.getmembers():
   path=Path(member.name);assert member.isfile()and not path.is_absolute()and'..'not in path.parts and member.name not in raw
   raw[member.name]=t.extractfile(member).read()
  assert {n:sha(v)for n,v in raw.items()}==expected,name;archives[name]=raw
def source_inventory(label,receipt):
 raw=archives[f'sources/{label}.tar.gz'];inventory=json.loads((root/receipt).read_text())['after']
 assert {n:sha(v)for n,v in raw.items()}==inventory,label
source_inventory('numbers','validation/numbers/sources.json')
source_inventory('typed','validation/typed/sources.json')
source_inventory('decoded','validation/decoded/sources.json')
for label in ['typed','decoded']:
 receipt=json.loads((root/f'validation/{label}/receipts.json').read_text());assert len(receipt)==2
 for r in receipt:assert r['exit_code']==0 and r['sources_sha256']==sha((root/f'validation/{label}/sources.json').read_bytes())
 assert receipt[0]['command']==['cargo','build','--locked','--examples']
for name in ['build-receipt.json','controls-receipt.json']:
 receipt=json.loads((root/f'validation/numbers/{name}').read_text());assert receipt['exit_code']==0
 assert receipt['sources_sha256']==sha((root/'validation/numbers/sources-stage-1.json').read_bytes())
receipt=json.loads((root/'validation/numbers/number-buffers-receipt.json').read_text());assert receipt['exit_code']==0
assert receipt['sources_sha256']==sha((root/'validation/numbers/sources.json').read_bytes())
def semantic_rows(record):return [{k:v for k,v in row.items()if k!='samples_ms'}for row in record['rows']]
processes=0;canonical=None;summary={}
for cohort in study['cohorts']:
 raw=archives[cohort['archive']];protocol=json.loads(raw['protocol.json']);assert protocol['pairs']==6
 assert protocol['images']['baseline']['sha256']==sha((root/'images/baseline.mjs').read_bytes())
 assert protocol['images']['new']['sha256']==sha((root/cohort['image']).read_bytes())
 assert protocol['runner_sha256']==sha((root/'workload/measure.mjs').read_bytes())
 pairs=[]
 for pair in range(6):
  records={}
  for variant in ['baseline','new']:
   assert json.loads(raw[f'{pair}-{variant}.exit.json'])['exit_code']==0
   r=json.loads(raw[f'{pair}-{variant}.json']);assert r['pair']==pair and r['variant']==variant
   assert r['core_sha256']==sha((root/'workload/source.core.json').read_bytes())
   assert r['node']=='v22.22.1'and r['v8']=='12.4.254.21-node.35'
   assert(r['verified_reference_outcomes'],r['dense_predictions'],len(r['rows']))==(27,16,5)
   for row in r['rows']:
    assert len(row['samples_ms'])==7 and all(math.isfinite(v)and v>0 for v in row['samples_ms'])
   if canonical is None:canonical=r
   assert semantic_rows(r)==semantic_rows(canonical)
   records[variant]=r;processes+=1
  pairs.append(records)
 calculated={}
 for i,row in enumerate(canonical['rows']):
  ratios=[statistics.median(r['baseline']['rows'][i]['samples_ms'])/statistics.median(r['new']['rows'][i]['samples_ms'])for r in pairs]
  calculated[row['name']]={'median':statistics.median(ratios),'pairs':ratios,'min':min(ratios),'max':max(ratios)}
 retained=json.loads(raw['summary.json']);assert retained=={'status':'measured-unadmitted','pairs':6,'ratios':calculated}
 summary[cohort['name']]={name:row['median']for name,row in calculated.items()}
if a.run:
 with tempfile.TemporaryDirectory(prefix='ink-storage-experiment-audit-')as temporary:
  temp=Path(temporary)
  for source in ['workload','images','controls/typed']:
   for p in (root/source).iterdir():
    if p.is_file():target=temp/source/p.name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(p.read_bytes())
  control=subprocess.run(['node',str(temp/'controls/typed/test.mjs')],capture_output=True,text=True,timeout=120)
  assert control.returncode==0,control.stderr
  assert json.loads(control.stdout)['cases']==1540
  for label in ['baseline','numbers','typed','decoded']:
   result=subprocess.run(['node',str(temp/'workload/measure.mjs'),str(temp/f'images/{label}.mjs'),str(temp/'workload'),label,'0'],capture_output=True,text=True,timeout=300)
   assert result.returncode==0,(label,result.stderr)
   r=json.loads(result.stdout);assert semantic_rows(r)==semantic_rows(canonical),label
print(json.dumps({'status':'audited','processes':processes,'cohorts':3,'semantic_replay':a.run,'median_time_ratios':summary,'shipped':False,'automatic_admission':False}))
