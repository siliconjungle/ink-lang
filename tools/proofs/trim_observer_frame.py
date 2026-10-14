#!/usr/bin/env python3
"""Remove one source-observer wrapper from an explicit checked frame proof.

This authors another ordinary law and replays it; no previous admission or
function name grants authority to the trimmed proof.
"""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.definition_context28 import bind
from portable_context import prune
p=argparse.ArgumentParser(description=__doc__)
for n in ['core','subject','store','compiler']:p.add_argument('--'+n,type=Path,required=True)
p.add_argument('--law',required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
if a.o.exists():raise ValueError('refusing to overwrite output')
store=Store(a.store);key=json.loads((a.store/'store/names.json').read_text())[a.law];obj=store.object(key);law=dict(schema=1,semantics=obj['semantics'],dependencies=obj['dependencies'],**obj['payload']);proof=law['proof']
if not isinstance(proof,dict)or set(proof)!= {'Trans'}:raise ValueError('observer proof has no explicit calculation prefix')
law['from']=proof['Trans']['middle'];law['proof']=proof['Trans']['right'];law.pop('definition_context',None)
core=json.loads(a.core.read_text());subject=json.loads(a.subject.read_text());obj=semantic_entry(prune(bind(law,core,subject)));ident=identity(obj);objects=dict(store.bundle(law['dependencies'])['objects']);objects[ident]=obj
out=Store.publish(a.o,list(objects.values()),{'source_frame':ident});view=a.o/'view.json';view.write_bytes(canonical(out.bundle([ident])))
r=subprocess.run([a.compiler.resolve(),'knowledge-check',a.core.resolve(),view.resolve()],capture_output=True,text=True,timeout=120);(a.o/'admission.log').write_text(r.stdout+r.stderr)
if r.returncode:raise ValueError(r.stderr[-3000:])
(a.o/'checked-source.json').write_bytes(a.core.read_bytes());print(json.dumps(dict(status='checked',identity=ident,scope='Exact source operation frame; no index-selection or maintained-invariant claim.')))
