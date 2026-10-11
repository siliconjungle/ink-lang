#!/usr/bin/env python3
"""Lossless publication of large evidence files; originals are never removed."""
import argparse,gzip,hashlib,json,os
from pathlib import Path
sha=lambda data:hashlib.sha256(data).hexdigest()
def pack(root):
 manifest=root/'publication-archive.json'
 if manifest.exists():raise ValueError('preserve existing publication archive')
 rows=[]
 for p in sorted(root.rglob('*')):
  if not p.is_file() or p.suffix=='.gz' or p.stat().st_size<1024*1024:continue
  data=p.read_bytes();packed=gzip.compress(data,compresslevel=9,mtime=0);out=p.with_name(p.name+'.gz')
  if out.exists():raise ValueError('preserve '+str(out))
  out.write_bytes(packed)
  rows.append(dict(path=p.relative_to(root).as_posix(),sha256=sha(data),bytes=len(data),mode=p.stat().st_mode&0o777,gzip=out.relative_to(root).as_posix(),gzip_sha256=sha(packed),gzip_bytes=len(packed)))
 manifest.write_text(json.dumps(dict(schema=1,scope='Lossless publication packaging only. Original evidence remains local and unmodified. Restore before reproducing, auditing or serving bundles.',files=rows),indent=2)+'\n')
 ignore=root/'.gitignore'
 if ignore.exists():raise ValueError('preserve existing ignore file')
 ignore.write_text('# Large originals are published losslessly; restore with bench/web-stack-report-archive.py.\n'+''.join('/'+x['path']+'\n' for x in rows))
 print(json.dumps(dict(status='packed',files=len(rows),raw_bytes=sum(x['bytes']for x in rows),gzip_bytes=sum(x['gzip_bytes']for x in rows))))
def restore(root):
 rows=json.loads((root/'publication-archive.json').read_text())['files']
 for row in rows:
  p=root/row['path'];z=root/row['gzip'];packed=z.read_bytes()
  if sha(packed)!=row['gzip_sha256']:raise ValueError('compressed evidence drift '+str(z))
  data=gzip.decompress(packed)
  if sha(data)!=row['sha256'] or len(data)!=row['bytes']:raise ValueError('decompressed evidence drift '+str(p))
  if p.exists():
   if sha(p.read_bytes())!=row['sha256']:raise ValueError('existing evidence differs; refusing overwrite '+str(p))
  else:p.write_bytes(data);os.chmod(p,row['mode'])
 print(json.dumps(dict(status='restored_verified',files=len(rows))))
if __name__=='__main__':
 a=argparse.ArgumentParser(description=__doc__);a.add_argument('mode',choices=['pack','restore']);a.add_argument('--report',type=Path,required=True);v=a.parse_args();(pack if v.mode=='pack' else restore)(v.report)
