#!/usr/bin/env python3
"""Propose and replay complete source loop-state embedding equality."""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.loop_state_embedding import propose
p=argparse.ArgumentParser(description=__doc__)
for n in ['core','subject','compiler','embedding_store']:p.add_argument('--'+n.replace('_','-'),type=Path,required=True)
for n in ['left','right']:p.add_argument('--'+n,required=True)
p.add_argument('-o',type=Path,required=True);a=p.parse_args()
if a.o.exists():raise ValueError('refusing to overwrite proof output')
parent=Store(a.embedding_store);key=json.loads((a.embedding_store/'store/names.json').read_text())['until_embedding']
obj=semantic_entry(propose(json.loads(a.core.read_text()),json.loads(a.subject.read_text()),a.left,a.right,key));ident=identity(obj)
store=Store.publish(a.o,[*parent.bundle([key])['objects'].values(),obj],{'source_loop_embedding':ident});view=a.o/'view.json';view.write_bytes(canonical(store.bundle([ident])))
r=subprocess.run([a.compiler.resolve(),'knowledge-check',a.core.resolve(),view.resolve()],capture_output=True,text=True,timeout=120);(a.o/'admission.log').write_text(r.stdout+r.stderr)
if r.returncode:raise ValueError(r.stderr[-3000:])
(a.o/'checked-source.json').write_bytes(a.core.read_bytes());print(json.dumps(dict(status='checked',identity=ident,scope='Complete source equality, including loop transitions, stopping and returned fields; arbitrary typed inputs.')))
