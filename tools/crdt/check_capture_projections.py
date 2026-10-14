#!/usr/bin/env python3
"""Admit generic callback capture proposals against an exact source."""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from producers.capture_projections import specialize
from ink_knowledge import Store,semantic_entry,identity,canonical
p=argparse.ArgumentParser(description=__doc__);p.add_argument('source',type=Path);p.add_argument('output',type=Path);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True);compiler=ROOT/'build/compiler/debug/ink'
for cmd,name in [('emit-core','core'),('emit-semantic','semantic')]:subprocess.run([compiler,cmd,a.source,'-o',a.output/(name+'.json')],check=True,capture_output=True)
core=json.loads((a.output/'core.json').read_text());subject=json.loads((a.output/'semantic.json').read_text());receipts=[];objects=[];names={}
for name,law in specialize(subject,core):
 obj=semantic_entry(law);key=identity(obj);directory=a.output/key;store=Store.publish(directory,[obj]);view=directory/'view.json';view.write_bytes(canonical(store.bundle([key]))+b'\n');r=subprocess.run([compiler,'knowledge-check',a.output/'core.json',view],capture_output=True,text=True,timeout=60);(directory/'admission.log').write_text(r.stdout+r.stderr);receipts.append(dict(name=name,accepted=r.returncode==0,reason=r.stderr.strip()))
 if r.returncode==0:objects.append(obj);names[name]=key
 print(name,'accepted'if r.returncode==0 else'declined',flush=True)
store=Store.publish(a.output/'accepted',objects,names);store.rebuild();(a.output/'receipts.json').write_text(json.dumps(receipts,indent=2)+'\n');print('Accepted',len(objects),'of',len(receipts),'general projection hoists',flush=True)
