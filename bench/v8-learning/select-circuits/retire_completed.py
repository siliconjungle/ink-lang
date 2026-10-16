"""Retire only these completed owned campaigns, after capsule and open-file checks."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,time
ROOT=Path(__file__).resolve().parents[3];HERE=Path(__file__).resolve().parent
# Every selected proof/measurement input is in these authenticated capsules or
# their exact committed Git histories; compiler baselines remain local.
env=dict(os.environ,PYTHONPATH='knowledge:planner')
for script in ['bench/v8-learning/counts/audit.py','bench/v8-learning/counts/audit_merged.py','bench/v8-learning/select-circuits/audit.py']:
 subprocess.run([str(ROOT/'build/proof-python/bin/python'),script],cwd=ROOT,env=env,check=True)
keepers={
 'build/v8-constructed-powers':{'current-frozen','count-frozen','count-final-frozen','merged-frozen','current-build-pins.json','count-source-inputs.json','count-final-source-pins.json','merged-source-pins.json','storage-retention.json','progress.json','retirement.json'},
 'build/v8-select-circuits':{'frozen','final-frozen','source-inputs.json','source-commit-readback.json','final-source-pins.json','storage-retention.json','progress.json','retirement.json'},
}
plan=[];blocked=[]
for relative,keep in keepers.items():
 base=ROOT/relative
 for child in sorted(base.iterdir()):
  if child.name in keep:continue
  git=False
  if child.is_dir()and not child.is_symlink():
   for directory,dirs,files in os.walk(child,followlinks=False):
    if '.git'in dirs or'.git'in files:git=True;break
  if git:blocked.append(dict(path=str(child.relative_to(ROOT)),reason='Embedded Git metadata requires separate preservation review'));continue
  plan.append(dict(path=str(child.relative_to(ROOT)),reason='Owned completed generated output:503 private tests,647 legacy seeds,proof/source/target checks and frozen corpus are terminal. Selected proofs/measurements and required reproduction inputs are authenticated in the two count capsules and shared-select capsule or pinned Git history. Frozen compilers retained; symlinks are never followed.'))
# Open files are a final exclusion, never the reason an input was classified unused.
lsof=subprocess.run(['/usr/sbin/lsof','-n','-Fpn'],capture_output=True,text=True)
assert lsof.returncode in [0,1],lsof.stderr
open_paths=[line[1:]for line in lsof.stdout.splitlines()if line.startswith('n/')]
closed=[]
for row in plan:
 path=str(ROOT/row['path'])
 if any(name==path or name.startswith(path+'/')for name in open_paths):blocked.append(dict(path=row['path'],reason='Open file beneath completed path; preserve it'))
 else:closed.append(row)
root_manifest=ROOT/'storage-retention.json';manifest=json.loads(root_manifest.read_text());manifest['keep']=[row for row in manifest['keep']if row['path']not in keepers]
for relative,keep in keepers.items():
 base=ROOT/relative;safe=[dict(path=str(Path(row['path']).relative_to(relative)),reason=row['reason'])for row in closed if row['path'].startswith(relative+'/')];local=dict(schema=1,keep=[dict(path=name,reason='Selected immutable compiler baseline, exact source context, retirement record or owner manifest')for name in sorted(keep)],safe_to_remove=safe,blocked=[row for row in blocked if row['path'].startswith(relative+'/')]);(base/'storage-retention.json').write_text(json.dumps(local,indent=2)+'\n')
 for name in sorted(keep):manifest['keep'].append(dict(path=relative+'/'+name,reason='Selected compiler baseline/source context and completed campaign owner manifest; proofs and measurement inputs retained in authenticated capsules/Git history.'))
seen={row['path']for row in manifest['safe_to_remove']}
for row in closed:
 if row['path']not in seen:manifest['safe_to_remove'].append(row);seen.add(row['path'])
root_manifest.write_text(json.dumps(manifest,indent=2)+'\n')
before=shutil.disk_usage(ROOT).free;removed=[];failures=[]
for row in closed:
 path=ROOT/row['path']
 try:
  if path.is_symlink()or path.is_file():path.unlink()
  elif path.exists():shutil.rmtree(path)
  removed.append(row['path'])
 except OSError as error:failures.append(dict(path=row['path'],reason=str(error)))
result=dict(schema=1,removed=removed,blocked=blocked,failures=failures,free_before=before,free_after=shutil.disk_usage(ROOT).free,reserve_bytes=100000000000,scope='Exact owner-declared completed generated paths only, after authenticated retained closures and open-file checks; nested symlinks not followed. Shared reuse/Cargo caches, active/unknown inputs, other agents and selected compilers untouched. Free-space delta includes unrelated concurrent activity; no claim of exclusive reclaimed bytes.')
(HERE/'storage-cleanup.json').write_text(json.dumps(result,indent=2)+'\n')
for relative in keepers:
 (ROOT/relative/'retirement.json').write_text(json.dumps(dict(schema=1,removed=[p for p in removed if p.startswith(relative+'/')],report='bench/v8-learning/select-circuits/storage-cleanup.json'),indent=2)+'\n');(ROOT/relative/'progress.json').write_text(json.dumps(dict(schema=1,status='selected-results-published-or-ready-for-distribution-publication',active=[],scope='Campaign proofs/measurements retained; generated output retirement complete where unblocked. Entire V8 review remains unfinished.'),indent=2)+'\n')
print('Retired',len(removed),'owned paths;',len(blocked),'blocked;',len(failures),'errors; free bytes',result['free_after'])
