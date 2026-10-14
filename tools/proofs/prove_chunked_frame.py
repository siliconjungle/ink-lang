#!/usr/bin/env python3
"""Propose a concrete source observer frame and replay its complete proof."""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from definitional_frames_chunked import propose
p=argparse.ArgumentParser(description=__doc__);p.add_argument('core',type=Path);p.add_argument('subject',type=Path);p.add_argument('function');p.add_argument('parameter');p.add_argument('--frame-store',type=Path,required=True);p.add_argument('--compiler',type=Path,required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
frame=Store(a.frame_store);key=json.loads((a.frame_store/'store/names.json').read_text())['until_frame'];core=json.loads(a.core.read_text());subject=json.loads(a.subject.read_text());lemmas=[];obj=semantic_entry(propose(core,subject,a.function,a.parameter,key,lemmas=lemmas));ident=identity(obj);store=Store.publish(a.o,[frame.object(key),*lemmas,obj],{a.function:ident});view=a.o/'view.json';view.write_bytes(canonical(store.bundle([ident])))
r=subprocess.run([a.compiler.resolve(),'knowledge-check',a.core.resolve(),view.resolve()],capture_output=True,text=True,timeout=120);(a.o/'admission.log').write_text(r.stdout+r.stderr)
if r.returncode:raise ValueError(r.stderr[-3000:])
(a.o/'checked-source.json').write_bytes(a.core.read_bytes());print(json.dumps(dict(status='checked',identity=ident,function=a.function,lemmas=len(lemmas),scope='Complete source observer preserves its observed parameter, including every loop step; no convergence claim.')))
