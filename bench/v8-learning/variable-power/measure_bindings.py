from pathlib import Path
import argparse,json,time
from ink_knowledge import Store,identity
from ink_knowledge.published_bindings import bindings,build
p=argparse.ArgumentParser();p.add_argument('--root',type=Path);p.add_argument('--prepare',action='store_true');p.add_argument('--mode',choices=['legacy','indexed']);a=p.parse_args();b=Path('build/v8-variable-power-cases/search-profile');root=a.root or b/'wide-final-cli/knowledge';snapshot=root/'store/snapshots/14edbdd3dea8f2bea214b8badba800a004dfbeffc7c4feb02be8b9a1ad45e739.json'
if a.prepare:
 start=time.monotonic();store=Store(root);changed=store.ensure_index();print(json.dumps(dict(schema=1,mode='prepare',seconds=str(time.monotonic()-start),snapshot=store.snapshot_id,changed=changed)));raise SystemExit
s=Store(root,snapshot);reads=[0];read=s._read_object
def counted(*args,**kwargs):reads[0]+=1;return read(*args,**kwargs)
s._read_object=counted;start=time.monotonic();r=build(s)['entries']if a.mode=='legacy'else bindings(s);elapsed=time.monotonic()-start;print(json.dumps(dict(schema=1,mode=a.mode,seconds=str(elapsed),body_reads=reads[0],rows={k:len(v)for k,v in r.items()},bindings=identity(r),snapshot=s.snapshot_id)))
