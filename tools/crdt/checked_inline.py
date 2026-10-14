#!/usr/bin/env python3
"""Instantiate the existing general database inliner and admit every proposal."""
import argparse,concurrent.futures,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.inline_laws import specialize
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path,default=ROOT/'examples/crdts/main.ink');p.add_argument('--out',type=Path,default=ROOT/'build/crdt/inline');a=p.parse_args()
compiler=ROOT/'build/compiler/debug/ink';source=a.source.resolve();out=a.out.resolve();out.mkdir(parents=True,exist_ok=True)
def run(args):return subprocess.run(list(map(str,args)),capture_output=True,text=True)
for command,file in [('emit-core','core.json'),('emit-semantic','semantic.json')]:
 r=run([compiler,command,source,'-o',out/file]);assert r.returncode==0,r.stderr
core=json.loads((out/'core.json').read_text());subject=json.loads((out/'semantic.json').read_text())
rows=specialize(subject,core)
def check(pair):
 name,proposal=pair;obj=semantic_entry(proposal);id=identity(obj);directory=out/id
 store=Store.publish(directory,[obj],{name:id});view=directory/'view.json';view.write_bytes(canonical(store.bundle([id]))+b'\n')
 r=run([compiler,'knowledge-check',out/'core.json',view])
 (directory/'admission.log').write_text(r.stdout+r.stderr)
 return dict(name=name,id=id,accepted=r.returncode==0,reason=r.stderr.strip()),obj
with concurrent.futures.ThreadPoolExecutor(max_workers=4)as pool:results=list(pool.map(check,rows))
accepted=[obj for row,obj in results if row['accepted']];names={'rewrite/'+row['name']:row['id']for row,obj in results if row['accepted']}
store=Store.publish(out/'accepted',accepted,names);store.rebuild()
view=store.bundle(sorted(names.values()));(out/'accepted/store/rewrite-view.json').write_bytes(canonical(view)+b'\n')
(out/'admission.json').write_text(json.dumps(dict(proposed=len(rows),accepted=len(accepted),results=[r for r,o in results]),indent=2)+'\n')
print('General inline laws:',len(accepted),'accepted of',len(rows),flush=True)
print('Snapshot',store.snapshot_id)
