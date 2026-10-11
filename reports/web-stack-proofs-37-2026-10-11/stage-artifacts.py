"""Curate and stage immutable batch37 evidence; no prior artifacts touched."""
from pathlib import Path
import hashlib,json,subprocess
R=Path(__file__).resolve().parent;B=R.parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text())
assert read(R/'review/final-delivery-review.json')['status']=='passed'
assert read(R/'verification.json')['status']=='passed'
assert all(sha(B/p)==h for p,h in read(R/'production-baseline.json')['source_bindings'].items())
knowledge=subprocess.check_output(['git','rev-parse','HEAD'],cwd=B/'knowledge',text=True).strip()
assert not subprocess.check_output(['git','diff','--cached','--name-only'],cwd=B)
paths=[B/'README.md',B/'bench/web-stack-proofs-37.py']
paths+=list((B/'bench/web-stack-proofs-37').rglob('*'))+list(R.rglob('*'))
def include(p):
 if not p.is_file() or '__pycache__'in p.parts or p.suffix in ['.pyc','.nul','.sqlite','.sqlite-wal','.sqlite-shm']:return False
 if p.name=='artifact-bindings.json':return False
 if p.is_relative_to(R/'staging/fair-prior')or p.is_relative_to(R/'staging/current'):return False
 return True
paths=sorted(set(p for p in paths if include(p)));assert all(p.stat().st_size<50*1024*1024 for p in paths)
manifest=dict(status='bound',knowledge_commit=knowledge,files={str(p.relative_to(B)):sha(p)for p in paths},source_scope='Six integer indexed-map projection endpoints, twelve Nat-offset/beta supports and four helper-bound U32 source certificates; no production changes',scope='Batch37 source/proof/target preparation/raw measurements/review/summary evidence; private duplicated staging stores, SQLite indexes, bytecode and pathspecs excluded. All old artifacts preserved.')
m=R/'artifact-bindings.json';m.write_text(json.dumps(manifest,indent=2)+'\n');paths.append(m)
file_names=[str(p.relative_to(B))for p in paths]+['knowledge'];pathspec=R/'root-stage-paths.nul';pathspec.write_bytes(b''.join(p.encode()+b'\0'for p in file_names));subprocess.run(['git','add','--pathspec-from-file='+str(pathspec),'--pathspec-file-nul'],cwd=B,check=True)
staged=set(subprocess.check_output(['git','diff','--cached','--name-only','-z'],cwd=B).decode().split('\0'))-{''};assert staged==set(file_names),(staged-set(file_names),set(file_names)-staged)
for p in paths:
 name=str(p.relative_to(B));assert subprocess.check_output(['git','show',':'+name],cwd=B)==p.read_bytes(),name
assert subprocess.check_output(['git','ls-files','--stage','knowledge'],cwd=B,text=True).split()[1]==knowledge
subprocess.run(['git','diff','--cached','--check'],cwd=B,check=True)
print(json.dumps(dict(status='scoped',files=len(paths),bytes=sum(p.stat().st_size for p in paths),knowledge_commit=knowledge,manifest_sha256=sha(m))))
