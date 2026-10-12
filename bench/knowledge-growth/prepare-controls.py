"""Restore actual upstream controls from immutable integrity-checked tarballs."""
from common import *
import tarfile,io,base64
up=OUT/'upstream';meta=read(OUT/'upstreams.json')
for name in ['lodash','rbush','typescript','gl-matrix','rxjs']:
 m=meta[name];dest=up/name;dest.mkdir(parents=True,exist_ok=True);archive=dest/'source.tgz'
 if not archive.exists():archive.write_bytes(subprocess.check_output(['curl','--fail','--location','--silent','--show-error',m['tarball']]))
 raw=archive.read_bytes();assert hashlib.sha256(raw).hexdigest()==m['sha256'];assert base64.b64encode(hashlib.sha512(raw).digest()).decode()==m['integrity'].split('-',1)[1]
 with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz')as t:
  for entry in t.getmembers():
   if entry.isfile()and '..'not in Path(entry.name).parts:
    p=dest/entry.name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(t.extractfile(entry).read())
 deps=up/'dependencies'
subprocess.run(['npm','ci','--ignore-scripts'],cwd=deps,check=True)
for package,dep in [('rbush','quickselect'),('rxjs','tslib')]:
 path=up/package/'package/node_modules'/dep;path.parent.mkdir(parents=True,exist_ok=True)
 if not path.exists():path.symlink_to((deps/'node_modules'/dep).resolve(),target_is_directory=True)
rows=[]
for package,rel in [('lodash','lodash.js'),('rbush','index.js'),('typescript','lib/typescript.js'),('gl-matrix','cjs/vec2.js'),('rxjs','dist/cjs/internal/operators/distinctUntilChanged.js')]:
 file=up/package/'package'/rel;rows.append(dict(package=package,version=meta[package]['version'],file=str(file.relative_to(ROOT)),sha256=sha(file)))
save(OUT/'control-source-hashes.json',rows)
