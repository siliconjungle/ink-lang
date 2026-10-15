#!/usr/bin/env python3
"""Validate retained browser receipts and summarize page medians.

This audits historical observations. It does not benchmark this machine, prove
correctness or authorize a runtime selection.
"""
import argparse,hashlib,json,math,statistics
from pathlib import Path
PATTERNS={'error','connection reset','zzzzzzzz'}
CPU={'ink-js-baseline','ink-js-utf8-no-encoding','native-regexp','handwritten-indexOf'}
GPU={'handwired-resident-gpu','ink-resident-gpu-dfa','ink-resident-gpu-packed'}
SEEDS={20261013:'bbb1eaceeed8a6c60059878c76fa9e9490e0c2b41aeae280221433eb598fe2b5',20261015:'199830ea30a4a5ab1095f69abfe4e4a04fa2016ff29b19c8b7ed5313c441251a'}
def summarize(directory):
 metadata=json.loads((directory/'metadata.json').read_bytes())
 actual={p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in (directory/'raw').glob('*.json')}
 if actual!=metadata['receipt_sha256']:raise ValueError('raw receipt bytes differ from retained metadata')
 runs=[]
 for path in sorted((directory/'raw').glob('*.json')):
  r=json.loads(path.read_bytes())
  if r.get('experiment')!='packed-circuits-v1':continue
  if r['schema']!=1 or r['status']!='measured' or r['handwired']!='09f23d276d3b9284cea4eec61ffd934950cc979e':raise ValueError('receipt identity')
  if r['documents']not in [100,10000,100000]or r['seed']not in SEEDS:raise ValueError('corpus')
  if r['documents']==100000 and r['documentsSha256']!=SEEDS[r['seed']]:raise ValueError('corpus hash')
  observed=set();answers={}
  for row in r['rows']:
   key=(row['pattern'],row['lane'],row['mode'])
   if key in observed:raise ValueError('duplicate measurement')
   observed.add(key)
   samples=row['samplesMs'];expected=5 if row['mode']=='after-250ms-pause' else 9
   if len(samples)!=expected or any(isinstance(x,bool)or not isinstance(x,(int,float))or not math.isfinite(x)or x<0 for x in samples):raise ValueError('invalid samples')
   if abs(statistics.median(samples)-row['medianMs'])>1e-9:raise ValueError('median differs from samples')
   answer=tuple(row[k]for k in ['digest','matchedDocuments','totalMatches'])
   if row['pattern']in answers and answers[row['pattern']]!=answer:raise ValueError('answer disagreement')
   answers[row['pattern']]=answer
  wanted={(p,l,'cpu')for p in PATTERNS for l in CPU}|{(p,l,m)for p in PATTERNS for l in GPU for m in ['back-to-back','after-250ms-pause']}
  if observed!=wanted:raise ValueError('missing or extra lane')
  runs.append(r)
 groups=[]
 for count,seed in sorted({(r['documents'],r['seed'])for r in runs}):
  pages=[r for r in runs if r['documents']==count and r['seed']==seed]
  if count==100000 and len(pages)!=3:raise ValueError('expected three page loads per large corpus')
  rows=[]
  for key in sorted({(x['pattern'],x['lane'],x['mode'])for r in pages for x in r['rows']}):
   values=[x['medianMs']for r in pages for x in r['rows']if (x['pattern'],x['lane'],x['mode'])==key]
   rows.append(dict(zip(['pattern','lane','mode'],key),medianMs=statistics.median(values),pageMediansMs=values))
  groups.append({'documents':count,'seed':seed,'pageLoads':len(pages),'rows':rows})
 if {(g['documents'],g['seed'])for g in groups}!={(100,20261013),(10000,20261013),(100000,20261013),(100000,20261015)}:raise ValueError('missing workload control')
 return {'schema':1,'statistic':'median of page medians; one browser process','groups':groups}
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('report',type=Path);p.add_argument('--check',action='store_true');a=p.parse_args()
 result=summarize(a.report)
 target=a.report/'summary.json'
 if a.check:
  if json.loads(target.read_bytes())!=result:raise ValueError('summary differs from raw receipts')
 else:target.write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({'status':'checked','groups':len(result['groups'])}))
