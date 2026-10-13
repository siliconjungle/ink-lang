"""Keep all generated evidence in hash-verified archives, excluding disposable caches."""
from pathlib import Path
import argparse,hashlib,json,tarfile
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/real-software-delivery-2026-10-13'
p=argparse.ArgumentParser();p.add_argument('group',choices=['execution','inputs','profiles','warm']);a=p.parse_args()
folders={'execution':['compiled','failed-bootstrap','failed-environment'],'inputs':['inputs','reference','typecheck'],'profiles':['cold-profile','fresh-cold-profile','validation-tests'],'warm':['warm']}[a.group]
files=sorted(q for folder in folders for q in (OUT/folder).rglob('*') if q.is_file())
if not files:raise ValueError('No evidence')
manifest={str(q.relative_to(OUT)):hashlib.sha256(q.read_bytes()).hexdigest() for q in files}
archive=OUT/('artifacts-'+a.group+'.tar.gz')
with tarfile.open(archive,'w:gz',compresslevel=9) as tar:
 for q in files:
  if q.is_symlink():raise ValueError('Only ordinary evidence files')
  tar.add(q,arcname=str(q.relative_to(OUT)),recursive=False)
with tarfile.open(archive) as tar:
 actual={m.name:hashlib.sha256(tar.extractfile(m).read()).hexdigest() for m in tar.getmembers() if m.isfile()}
assert actual==manifest
(OUT/('archive-'+a.group+'.json')).write_text(json.dumps({'file':archive.name,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'members':manifest},indent=2)+'\n')
print(a.group,len(files),'verified files',archive.stat().st_size,'bytes')
