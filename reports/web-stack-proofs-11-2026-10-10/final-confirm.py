import collections,hashlib,importlib.util,json,statistics
from pathlib import Path
p=Path(__file__).resolve().parent;root=p.parents[1];repeat=p.parent/'web-stack-proofs-11-gpu-confirmation-2026-10-10'
read=lambda path:json.loads(path.read_text());sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
h=module('h',root/'bench/web-stack-proofs-11.py');a=module('a',root/'bench/web-stack-proofs-11/analyse.py');h.audit(repeat,'browser');meta=read(repeat/'metadata.json');mainmeta=read(p/'metadata.json')
for name,value in meta['artifact_hashes'].items():assert sha(repeat/name)==value,name
for key in ['compiler_sha256','new_snapshot','prior_snapshot']:assert meta[key]==mainmeta[key]
f=read(repeat/'fixtures.json');original=read(p/'fixtures.json');oldinputs={x['id']:x for x in original['inputs']}
for x in f['inputs']:
 y=oldinputs[x['id']]
 for name in ['xs','seed','factor']:assert x[name]==y[name]
 for name,expected in x['expected'].items():assert expected==y['expected'][name]
identical=[]
for kind in ['baseline','prior','checked']:
 mainmanifest={x['name']:x for x in read(p/kind/'manifest.json')['functions']};newmanifest={x['name']:x for x in read(repeat/kind/'manifest.json')['functions']}
 for case in f['cases']:
  l,r=mainmanifest[case]['shader'],newmanifest[case]['shader'];assert l and r
  lp,rp=Path(kind)/l,Path(kind)/r;assert sha(p/lp)==sha(repeat/rp);identical.append(dict(main_path=str(lp),repeat_path=str(rp),sha256=sha(p/lp)))
 for name in ['ink-gpu.mjs','ink-device.mjs']:
  path=Path(kind)/name;assert sha(p/path)==sha(repeat/path);identical.append(dict(main_path=str(path),repeat_path=str(path),sha256=sha(p/path)))
r=read(repeat/'browser-results.json');s=read(repeat/'browser-summary.json');groups=collections.defaultdict(lambda:collections.defaultdict(list))
for x in r['samples']:groups[(x['case'],x['input'])][x['variant']].append(x)
verified=0;decisions=[]
for row in s['measurements']:
 values={v:[x['ns_per_call'] for x in sorted(xs,key=lambda x:x['round'])] for v,xs in groups[(row['case'],row['input'])].items()}
 assert {v:statistics.median(xs) for v,xs in values.items()}==row['median_ns']
 for name,saved in row['paired_ratios_95pct'].items():
  if name.startswith(('prior_over_checked_','baseline_over_checked_')):
   src,_,dst,backend=name.split('_',3);av,bv=f'ink_{src}_{backend}',f'ink_{dst}_{backend}'
  else:av,bv=name.split('_over_',1)
  assert a.interval(values[av],values[bv])==saved;verified+=1
 ci=row['paired_ratios_95pct']['prior_over_checked_gpu'];decisions.append(dict(case=row['case'],input=row['input'],ratio_95pct=ci,verdict=a.classify(ci)))
mainwins=[d for d in read(p/'profitability.json')['decisions'] if d['backend']=='gpu' and d['verdict']=='faster'];lookup={(d['case'],d['input']):d for d in decisions};replicated=[{**d,'confirmation':lookup[(d['case'],d['input'])]} for d in mainwins if lookup[(d['case'],d['input'])]['verdict']=='faster'];unreplicated=[{**d,'confirmation':lookup[(d['case'],d['input'])]} for d in mainwins if lookup[(d['case'],d['input'])]['verdict']!='faster']
conclusion=f'{len(replicated)} of {len(mainwins)} nominal main GPU gains replicate under separate same-input timing; {len(unreplicated)} remain unconfirmed. Individual intervals are exploratory and unadjusted for multiplicity.'
result=dict(status='passed',path=str(repeat),samples=len(r['samples']),exact_comparisons=r['validation']['comparisons'],actual_gpu_samples=sum(x['variant'].endswith('_gpu') for x in r['samples']),intervals_recomputed=verified,frozen_artifacts_verified=len(meta['artifact_hashes']),decisions=decisions,replicated=replicated,unreplicated=unreplicated,conclusion=conclusion,pooled=False,identical_gpu_artifacts=identical,canonical_observations_imported=0,input_scope='Independent repeat reuses byte-identical main word arrays, scalar parameters and expected outputs, narrowing only timed cases/shapes. Corresponding shader/runtime/device files are identical.',receipt_hashes={n:sha(repeat/n) for n in ['metadata.json','fixtures.json','browser-results.json','browser-summary.json','browser-evidence.jpg']})
(p/'gpu-confirmation.json').write_text(json.dumps(result,indent=2)+'\n');print(dict(status='passed',samples=result['samples'],gpu_samples=result['actual_gpu_samples'],replicated=len(replicated),unreplicated=len(unreplicated),decisions=decisions))
