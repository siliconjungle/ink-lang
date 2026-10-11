import argparse,json
from pathlib import Path
from .store import Store,canonical
p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('--snapshot',type=Path)
p.add_argument('command',choices=['rebuild','query','export']);p.add_argument('--kind');p.add_argument('--semantics');p.add_argument('--operation');p.add_argument('--effect');p.add_argument('--result');p.add_argument('--entries',nargs='*');p.add_argument('-o',type=Path)
a=p.parse_args();s=Store(a.root,a.snapshot)
if a.command=='rebuild':print(json.dumps(dict(snapshot=s.snapshot_id,entries=s.rebuild())))
elif a.command=='query':print(json.dumps(s.query(kind=a.kind,semantics=a.semantics,operation=a.operation,effect=a.effect,result=json.loads(a.result) if a.result else None)))
else:
 if not a.o:p.error('export requires -o')
 a.o.write_bytes(canonical(s.bundle(a.entries or []))+b'\n')
