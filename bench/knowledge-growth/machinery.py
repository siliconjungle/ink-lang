"""Archive tracked execution source directly from the exact independent pins."""
from common import *
import tarfile
pins=read(OUT/'protocol.json')['pins'];files={};bad=[]
for repo,pin in [('distribution',pins['distribution'])]+[(k,v)for k,v in pins.items()if k not in ['distribution','core']]:
 base=ROOT if repo=='distribution'else ROOT/repo
 for line in subprocess.check_output(['git','-C',str(base),'ls-tree','-r',pin],text=True).splitlines():
  meta,name=line.split('\t',1);mode,kind,oid=meta.split()
  if kind!='blob':continue
  if repo=='distribution':include=name.startswith(('src/','core/','stdlib/'))or name in ['Cargo.toml','Cargo.lock']
  elif repo=='knowledge':include=name.startswith(('ink_knowledge/','producers/','schemas/'))or name=='pyproject.toml'
  else:include=not name.startswith(('.github/','docs/','reports/','research/','tests/','examples/','bench/'))and name not in ['README.md','LICENSE','AGENTS.md']
  if not include:continue
  p=base/name;b=p.read_bytes();actual=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest();rel=str(p.relative_to(ROOT));files[rel]=dict(git_blob=oid,sha256=hashlib.sha256(b).hexdigest())
  if actual!=oid:bad.append(rel)
assert not bad,bad
save(OUT/'complete-machinery-audit.json',dict(schema=1,status='exact original Git blobs',files=files,scope='Includes Cargo roots, .rs.txt templates, SQL and producer gzip data omitted by the initial suffix filter. Original compiler/producer fingerprints independently remained fixed. New source helpers are authoring data. No original tracked execution file changed.'))
with tarfile.open(OUT/'frozen-machinery.tar.xz','w:xz',preset=6)as archive:
 for rel in sorted(files):archive.add(ROOT/rel,arcname=rel)
print('exact tracked source files',len(files))
