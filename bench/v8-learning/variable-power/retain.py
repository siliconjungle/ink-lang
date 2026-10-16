"""Retain useful completed proofs, required performance inputs and conformance."""
from pathlib import Path
import gzip,hashlib,json,shutil,tarfile
b=Path('build/v8-variable-power-cases');out=Path('bench/v8-learning/variable-power');files={}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def add(p):
 assert p.is_file()and not p.is_symlink();files[str(p.relative_to(b))]=p
assert b'\nOK\n'in(b/'knowledge-tests.log').read_bytes()and b'\nOK\n'in(b/'focused-tests.log').read_bytes()
for name in ['runtime-javascript','runtime-rust','runtime-javascript-refined','runtime-rust-refined']:
 r=json.loads((b/name/'result.json').read_bytes());assert not r['heldout_accepted']
 for split in ['training','holdout']:assert not json.loads((b/name/(split+'-report.json')).read_bytes())['acquisition']['rejected']
for name in ['runtime-gpu','runtime-gpu-refined','conformance']:
 assert json.loads((b/name/'terminal.json').read_bytes())['exit_status']==0
for name in ['core.json','goal.json','law.json','terminal.json','check.stdout','check.stderr','boundary.json','wide.stdout','wide.stderr','source-terminal.json','application.ink','application.core.json','application.subject.json','source_check.py']:
 add(b/name)
for name in ['balanced-baseline/law.json','balanced-baseline/terminal.json','balanced-baseline/source-terminal.json','mixed/law.json','mixed/terminal.json','mixed/check.stdout','mixed/check.stderr','quotient-assisted/source.ink','quotient-assisted/core.json','quotient-assisted/terminal.json','zero-refinement/zero-goal.json','zero-refinement/zero-cnf.json','zero-refinement/zero-proof.json','zero-refinement/law.json','zero-refinement/terminal.json','zero-refinement/check.stdout','zero-refinement/check.stderr']:
 add(b/name)
for name in ['chain-last','power-zero']:
 for p in(b/name).iterdir():
  if p.is_file():add(p)
for k in [23,24]:
 for name in ['goal.json','strengthened.json','cnf.json','check.stdout','check.stderr']:add(b/'quotient-assisted'/str(k)/name)
for name in ['program','program-refined']:
 for p in(b/name).iterdir():
  if p.is_file()and p.name!='selection.json':add(p)
for name in ['runtime-javascript','runtime-rust','runtime-javascript-refined','runtime-rust-refined']:
 for p in(b/name).rglob('*'):
  if p.is_file()and not p.is_symlink()and not any(part in {'knowledge','target','__pycache__'}for part in p.relative_to(b/name).parts)and not p.name.endswith('.plan.json'):add(p)
for name in ['runtime-gpu','runtime-gpu-refined']:
 for p in(b/name).rglob('*'):
  if not p.is_file()or p.is_symlink()or'cpu-target'in p.relative_to(b/name).parts:continue
  if p.name.startswith('plan-')or p.name.endswith('.plan.json')or p.name=='source.core.json':continue
  add(p)
for p in(b/'conformance').rglob('*'):
 if p.is_file()and not p.is_symlink()and not any(part in {'target','empty-store','proposal-transport','__pycache__'}for part in p.relative_to(b/'conformance').parts):add(p)
for name in ['knowledge-tests.log','focused-tests.log','author.log','combine.log','boundary.log','program-prepare.log','prepare-refined.log','refine-zero.log','runtime-javascript.log','runtime-rust.log','runtime-javascript-refined.log','runtime-rust-refined.log','runtime-gpu.log','runtime-gpu-refined.log','conformance.log']:
 (out/(name+'.gz')).write_bytes(gzip.compress((b/name).read_bytes(),mtime=0))
index={name:dict(bytes=p.stat().st_size,sha256=sha(p))for name,p in sorted(files.items())}
with tarfile.open(out/'selected-inputs.tar.gz','w:gz',compresslevel=9)as archive:
 for name,p in sorted(files.items()):archive.add(p,arcname=name,recursive=False)
assert index=={name:dict(bytes=p.stat().st_size,sha256=sha(p))for name,p in sorted(files.items())}
(out/'selected-inputs-index.json').write_text(json.dumps(dict(schema=1,archive_sha256=sha(out/'selected-inputs.tar.gz'),files=index,scope='Only selected proof/boundary baselines, original source/plans, required complete-call input/oracle/adapter/artifact/lock/raw process receipts and literal conformance inputs. Private stores, proof views, nonselected author trials and generated targets excluded.'),indent=2)+'\n')
(out/'validation-terminal.json').write_text(json.dumps(dict(schema=1,exit_status=0,full_suite_methods=31,focused_methods=3,full_suite_log_sha256=sha(b/'knowledge-tests.log'),focused_log_sha256=sha(b/'focused-tests.log'),compiler_sha256=sha(Path('build/v8-proof-dependencies-final-cli/frozen/ink-integrated')),all_integer_roots=341,word_roots=83,float_roots=15,conformance=json.loads((b/'conformance/terminal.json').read_bytes()),scope='Local proof/integrity/source/conformance only. No CI-complete or general runtime speedup claim.'),indent=2)+'\n')
(out/'storage-retention.json').write_text(json.dumps(dict(schema=1,keep=[dict(path='.',reason='Useful admitted guarded-U32 proof and exact source-transport boundary, selected original/zero-first performance baselines, required cross-target/corpus/observation evidence and reproduction inputs. Canonical laws live in pinned knowledge; generated stores/targets omitted.')],safe_to_remove=[]),indent=2)+'\n');print(json.dumps(dict(files=len(files),bytes=(out/'selected-inputs.tar.gz').stat().st_size)))
