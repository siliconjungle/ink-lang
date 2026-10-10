import collections,hashlib,importlib.util,json,statistics
from pathlib import Path
p=Path(__file__).resolve().parent;root=p.parents[1];repeat=p.parent/'web-stack-proofs-13-gpu-confirmation-2026-10-10'
read=lambda path:json.loads(path.read_text());sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
h=module('h',root/'bench/web-stack-proofs-13.py');a=module('a',root/'bench/web-stack-proofs-13/analyse.py');meta=read(repeat/'metadata.json');mainmeta=read(p/'metadata.json')
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

assert len(f['inputs'])==13 and len(identical)==9
(p/'gpu-confirmation-preflight.json').write_text(json.dumps(dict(status='passed',identical_inputs=13,identical_gpu_artifacts=identical,frozen_artifacts=len(meta['artifact_hashes']),scope='all corresponding shader/runtime/device bytes and exactmaininputs match before independenttiming'),indent=2)+'\n')
print('13 identicalinputs;9 exactGPUartifacts; frozen',len(meta['artifact_hashes']))
