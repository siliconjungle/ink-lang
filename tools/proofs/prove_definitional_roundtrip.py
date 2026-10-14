#!/usr/bin/env python3
"""Propose and replay a complete source-bound definitional codec inverse."""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.definitional_roundtrips import propose

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('core',type=Path);p.add_argument('subject',type=Path);p.add_argument('function')
p.add_argument('--compiler',type=Path,required=True);p.add_argument('-o',type=Path,required=True)
a=p.parse_args()
core=json.loads(a.core.read_text());subject=json.loads(a.subject.read_text())
proposal=semantic_entry(propose(core,subject,a.function));key=identity(proposal)
store=Store.publish(a.o,[proposal],{a.function:key});view=a.o/'view.json'
view.write_bytes(canonical(store.bundle([key])))
r=subprocess.run([a.compiler.resolve(),'knowledge-check',a.core.resolve(),view.resolve()],capture_output=True,text=True,timeout=120)
(a.o/'admission.log').write_text(r.stdout+r.stderr)
if r.returncode:
 print(r.stderr,file=sys.stderr);sys.exit(r.returncode)
(a.o/'checked-source.json').write_bytes(a.core.read_bytes())
print(json.dumps(dict(status='checked',identity=key,function=a.function,scope='Complete source-bound definitional inverse; no maintained algorithm or convergence claim')))
