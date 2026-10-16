"""Retain declared terminal proof/call inputs, excluding stores and targets."""
from pathlib import Path
import json,hashlib,tarfile,gzip,shutil
base=Path('build/v8-proof-dependencies');out=Path('bench/v8-learning/proof-dependencies');files={}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def add(p):
 assert p.is_file()and not p.is_symlink();files[str(p.relative_to(base))]=p
assert json.loads((base/'reproduction/terminal.json').read_bytes())['exit_status']==0
assert b'\nOK\n' in (base/'knowledge-tests.log').read_bytes()
for target in ['javascript','rust']:
 result=json.loads((base/('runtime-'+target)/'result.json').read_bytes());assert not result['heldout_accepted']
 for split in ['training','holdout']:
  x=json.loads((base/('runtime-'+target)/(split+'-report.json')).read_bytes());assert not x['acquisition']['rejected']
assert json.loads((base/'runtime-gpu/terminal.json').read_bytes())['exit_status']==0
for name in ['source.ink','core.json','library-update.json','boundary.json','composition.json','gpu-summary.json']:
 shutil.copyfile(base/name,out/name)
for name in ['knowledge-tests.log','index-tests.log','legacy-index-tests.log','boundary.log','derive.log','composed.log','program-prepare.log','runtime-javascript.log','runtime-rust.log','runtime-gpu.log','reproduction.log']:
 data=(base/name).read_bytes();(out/(name+'.gz')).write_bytes(gzip.compress(data,mtime=0))
for name in ['source.ink','core.json','subject.json','baseline.plan.json','searched.plan.json','training.json','holdout.json']:add(base/'program'/name)
for p in (base/'reproduction').rglob('*'):
 if p.is_file()and not any(s in {'candidate','laws','__pycache__'}for s in p.relative_to(base/'reproduction').parts)and p.name not in {'law.json','view.json'}:add(p)
for name in ['runtime-javascript','runtime-rust']:
 for p in (base/name).rglob('*'):
  if (p.is_file()and not p.is_symlink()and not any(s in {'knowledge','target','__pycache__'}for s in p.relative_to(base/name).parts)
      and not p.name.endswith('.plan.json')):add(p)
for p in (base/'runtime-gpu').rglob('*'):
 if not p.is_file()or p.is_symlink()or'cpu-target'in p.relative_to(base/'runtime-gpu').parts:continue
 if p.name in {'plan-0.json','plan-1.json','source.core.json','artifact-0.plan.json','artifact-1.plan.json'}:continue
 add(p)
for name in ['boundary.json','inline.stdout','inline.stderr']:add(base/'boundary-reproduction'/name)
for name in ['shared.stdout','shared.stderr','u64_rem_or_self.stdout','u64_rem_or_self.stderr','u64_rem_or_zero_numerator.stdout','u64_rem_or_zero_numerator.stderr']:add(base/name)
index={name:dict(bytes=p.stat().st_size,sha256=sha(p))for name,p in sorted(files.items())}
with tarfile.open(out/'selected-inputs.tar.gz','w:gz',compresslevel=9)as archive:
 for name,p in sorted(files.items()):archive.add(p,arcname=name,recursive=False)
assert index=={name:dict(bytes=p.stat().st_size,sha256=sha(p))for name,p in sorted(files.items())}
(out/'selected-inputs-index.json').write_text(json.dumps(dict(schema=1,archive_sha256=sha(out/'selected-inputs.tar.gz'),files=index),indent=2)+'\n')
print(json.dumps(dict(files=len(files),bytes=(out/'selected-inputs.tar.gz').stat().st_size)))
