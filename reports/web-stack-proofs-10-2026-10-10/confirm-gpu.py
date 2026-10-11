import collections,hashlib,importlib.util,json
from pathlib import Path
p=Path(__file__).resolve().parent;root=p.parents[1];repeat=p.parent/'web-stack-proofs-10-gpu-confirmation-2026-10-10'
read=lambda path:json.loads(path.read_text());sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
h=module('h',root/'bench/web-stack-proofs-10.py');a=module('a',root/'bench/web-stack-proofs-10/analyse.py');h.audit(repeat,'browser');meta=read(repeat/'metadata.json');mainmeta=read(p/'metadata.json')
for name,value in meta['artifact_hashes'].items():assert sha(repeat/name)==value,name
assert meta['compiler_sha256']==mainmeta['compiler_sha256'] and meta['new_snapshot']==mainmeta['new_snapshot'];assert meta['prior_snapshot']==mainmeta['prior_snapshot']
maininputs={x['id']:x for x in read(p/'fixtures.json')['inputs']};repeatinputs={x['id']:x for x in read(repeat/'fixtures.json')['inputs']};
for name,x in repeatinputs.items():
 y=maininputs[name];assert x['seed']==y['seed'] and x['factor']==y['factor'] and len(x['xs'])==len(y['xs']);assert (x['xs']==y['xs'])==(name not in ['small-65536','full-65536'])
identical={}
for kind in ['baseline','prior','checked']:
 for name in ['compute-0.wgsl','ink-gpu.mjs','ink-device.mjs']:
  path=Path(kind)/name;assert sha(p/path)==sha(repeat/path);identical[str(path)]=sha(p/path)
r=read(repeat/'browser-results.json');s=read(repeat/'browser-summary.json');groups=collections.defaultdict(lambda:collections.defaultdict(list))
for x in r['samples']:groups[x['input']][x['variant']].append(x)
verified=0
for row in s['measurements']:
 values={v:[x['ns_per_call'] for x in sorted(xs,key=lambda x:x['round'])] for v,xs in groups[row['input']].items()}
 for name,saved in row['paired_ratios_95pct'].items():
  if name.startswith(('prior_over_checked_','baseline_over_checked_')):
   src,_,dst,backend=name.split('_',3);av,bv=f'ink_{src}_{backend}',f'ink_{dst}_{backend}'
  else:av,bv=name.split('_over_',1)
  assert a.interval(values[av],values[bv])==saved;verified+=1
full=next(x for x in s['measurements'] if x['input']=='full-65536');ci=full['paired_ratios_95pct']['prior_over_checked_gpu'];verdict=a.classify(ci)
conclusion=f'The original cubic full65536 GPU gain did not replicate: separate prior/new ratio {ci[0]:.5f}× [{ci[1]:.5f}, {ci[2]:.5f}], {verdict}. No repeatable GPU performance gain is established by this batch.'
result=dict(status='passed',path=str(repeat),samples=len(r['samples']),exact_comparisons=r['validation']['comparisons'],actual_gpu_samples=sum(x['variant'].endswith('_gpu') for x in r['samples']),intervals_recomputed=verified,frozen_artifacts_verified=len(meta['artifact_hashes']),ratio_95pct=ci,verdict=verdict,conclusion=conclusion,pooled=False,identical_gpu_artifact_hashes=identical,canonical_observations_imported=0,input_scope='Separate same-profile confirmation: narrowing cases/sizes changes RNG consumption and both timed word arrays; scalar parameters, distributions and protocol remain the same. Seven correctness inputs match. GPU shader/runtime/device files are byte-identical; this is not an identical-input repeat.',receipt_hashes={n:sha(repeat/n) for n in ['metadata.json','browser-results.json','browser-summary.json','browser-evidence.jpg']})
(p/'gpu-confirmation.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
