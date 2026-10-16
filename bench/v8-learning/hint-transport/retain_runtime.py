"""Retain declared terminal runtime/proof inputs; omit stores, indexes and targets."""
import hashlib,json,subprocess,tarfile,shutil
from pathlib import Path
base=Path('build/v8-proof-transport');out=Path('bench/v8-learning/hint-transport');out.mkdir(exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*args):return subprocess.check_output(['git',*args],text=True).strip()
files={}
def add(p):
 assert p.is_file()and not p.is_symlink();files[str(p.relative_to(base))]=p
for p in (base/'program').iterdir():
 if p.is_file()and p.name in {'source.ink','core.json','subject.json','baseline.plan.json','searched.plan.json','training.json','holdout.json'}:add(p)
for name in ['runtime-javascript','runtime-rust']:
 for p in (base/name).rglob('*'):
  if not p.is_file()or any(x in {'knowledge','target','__pycache__'}for x in p.relative_to(base/name).parts):continue
  if p.name.endswith('.plan.json'):continue
  if '.native' in str(p) and p.name != 'Cargo.toml':continue
  add(p)
for p in (base/'runtime-gpu').rglob('*'):
 if not p.is_file()or 'cpu-target'in p.parts:continue
 if p.name in {'plan-0.json','plan-1.json','artifact-0.plan.json','artifact-1.plan.json','source.core.json'}:continue
 add(p)
for p in (base/'cli-packed').rglob('*'):
 if p.is_file():add(p)
for name in ['add_commute.cnf.json','add_commute.goal.json','given_equal.cnf.json','given_equal.goal.json','checked.rs']:
 p=Path('knowledge/research/build/bitvector-producer')/name;assert p.is_file();files['cli-authoring/'+name]=p
for directory in (base/'packages').iterdir():
 for p in directory.iterdir():
  if p.is_file()and not p.is_symlink():add(p)
for p in Path('build/rup-crosscheck/export-only').iterdir():
 if p.is_file():files['rup-audit/'+p.name]=p
index={name:dict(bytes=p.stat().st_size,sha256=sha(p))for name,p in sorted(files.items())}
with tarfile.open(out/'selected-inputs.tar.gz','w:gz',compresslevel=9)as t:
 for name,p in sorted(files.items()):t.add(p,arcname=name,recursive=False)
assert index=={name:dict(bytes=p.stat().st_size,sha256=sha(p))for name,p in sorted(files.items())}
(out/'selected-inputs-index.json').write_text(json.dumps(dict(schema=1,archive_sha256=sha(out/'selected-inputs.tar.gz'),files=index),indent=2)+'\n')
for name in ['assembly.json','admission.json','library-update.json','core-package.json','isolated-core.json','legacy-source-pins.json','gpu-summary.json','core-tests-final.log','isolated-core.log','knowledge-tests-final.log','wide-source-tests.log','cli-packed.log','rup-crosscheck.log','admission-final.log','producer-tests.log','root-preflight.json','cli-build-pinned.log','legacy-build.log']:
 shutil.copyfile(base/name,out/name)
for name in ['assemble.py','check_assembled.py','measure_checker.py','measure_program.py','prepare_program.py','prepare_legacy.py','repair_legacy.py','retain_runtime.py']:shutil.copyfile(base/name,out/name)
pins=dict(schema=1,distribution=git('rev-parse','HEAD'),core_tree=git('rev-parse','HEAD:core'),core_package=json.loads((base/'core-package.json').read_text())['commit'],planner=git('-C','planner','rev-parse','HEAD'),packages={n:json.loads((base/'packages'/n/'publication.json').read_text())for n in ['lowerings-rust','lowerings-js','lowerings-wasm','lowerings-gpu','runtime']},compilers={n:dict(path=str(base/'frozen'/n),sha256=sha(base/'frozen'/n))for n in ['ink-final','ink-legacy']},root_lock_sha256=sha(Path('Cargo.lock')),scope='Selected executable built from the same committed core and pinned backend trees. Documentation/audit/test-only edits do not relabel historical timed images. Root and isolated core470 tests pass; two audit export tests pass without configured external checkers.')
(out/'source-pins.json').write_text(json.dumps(pins,indent=2)+'\n');(out/'storage-retention.json').write_text(json.dumps(dict(schema=1,keep=[dict(path='.',reason='Selected checked proof assembly, complete-call measurements, exact source/generated inputs, logs and reproducibility recipes; immutable standalone package and prior conditional inputs retained by Git pins.')],safe_to_remove=[]),indent=2)+'\n')
print(json.dumps(dict(files=len(files),archive_bytes=(out/'selected-inputs.tar.gz').stat().st_size,archive_sha256=sha(out/'selected-inputs.tar.gz'))))
