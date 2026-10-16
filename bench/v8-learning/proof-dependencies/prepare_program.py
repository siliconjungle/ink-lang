from pathlib import Path
import json,tarfile,shutil,subprocess
from ink_knowledge import canonical
base=Path('build/v8-proof-dependencies');out=base/'program';out.mkdir(exist_ok=False);compiler=Path('build/v8-proof-transport/frozen/ink-integrated').resolve()
for name in ['source.ink','core.json','subject.json']:shutil.copyfile(base/name,out/name)
selection=json.loads((base/'shared.selection.json').read_bytes())
with tarfile.open('bench/v8-learning/remainder-facts/selected-inputs.tar.gz')as archive:
 baseline=json.load(archive.extractfile('program/baseline.plan.json'));baseline['input_core_sha256']=selection['input_core_sha256'];(out/'baseline.plan.json').write_bytes(canonical(baseline));searched=dict(baseline,steps=[dict(kind='rewrite',package=selection)]);(out/'searched.plan.json').write_bytes(canonical(searched))
 for name in ['training.json','holdout.json']:
  workload=json.load(archive.extractfile('program/'+name));workload['workload']['shape']['domain']='U64 self quotient, self remainder and zero-numerator remainder wrapping fold; observed cohort';(out/name).write_text(json.dumps(workload,indent=2)+'\n')
for name in ['baseline','searched']:
 r=subprocess.run([compiler,'check-plan',out/'core.json',out/(name+'.plan.json'),'--core'],capture_output=True,text=True,timeout=120);(out/(name+'.check.stdout')).write_text(r.stdout);(out/(name+'.check.stderr')).write_text(r.stderr);assert not r.returncode,r.stderr
print('Prepared exact checked three-law composed plans',selection['input_core_sha256'])
