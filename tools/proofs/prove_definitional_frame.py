#!/usr/bin/env python3
"""Propose a concrete source observer frame and replay its complete proof."""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.definitional_frames import propose
p=argparse.ArgumentParser(description=__doc__);p.add_argument('core',type=Path);p.add_argument('subject',type=Path);p.add_argument('function');p.add_argument('parameter');p.add_argument('--frame-store',type=Path,required=True);p.add_argument('--source-frame-store',type=Path,action='append',default=[]);p.add_argument('--compiler',type=Path,required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
if a.o.exists():raise ValueError('refusing to overwrite output')
frame=Store(a.frame_store);key=frame.names['until_frame'];objects=dict(frame.bundle([key])['objects']);rules=[]
for path in a.source_frame_store:
 source=Store(path);root=source.names['source_frame'];obj=source.object(root)
 rules.append((root,dict(schema=1,semantics=obj['semantics'],dependencies=obj['dependencies'],**obj['payload'])))
 for ident,entry in source.bundle([root])['objects'].items():
  if ident in objects and objects[ident]!=entry:raise ValueError('source frame object collision')
  objects[ident]=entry
core=json.loads(a.core.read_text());subject=json.loads(a.subject.read_text());obj=semantic_entry(propose(core,subject,a.function,a.parameter,key,source_frames=rules));ident=identity(obj);objects[ident]=obj;store=Store.publish(a.o,list(objects.values()),{a.function:ident});view=a.o/'view.json';view.write_bytes(canonical(store.bundle([ident])))
r=subprocess.run([a.compiler.resolve(),'knowledge-check',a.core.resolve(),view.resolve()],capture_output=True,text=True,timeout=120);(a.o/'admission.log').write_text(r.stdout+r.stderr)
if r.returncode:raise ValueError(r.stderr[-3000:])
(a.o/'checked-source.json').write_bytes(a.core.read_bytes());print(json.dumps(dict(status='checked',identity=ident,function=a.function,scope='Complete source observer preserves its observed parameter, including every loop step; no convergence claim.')))
