#!/usr/bin/env python3
"""Explicit fold projection authoring; every output replays before publication."""
import argparse,json,os,subprocess,tempfile
from pathlib import Path
from ink_knowledge import Store,canonical
from ink_knowledge.recipes import execute,load

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('source',type=Path)
 p.add_argument('--compiler',type=Path,required=True);p.add_argument('--function',required=True)
 p.add_argument('--field',required=True);p.add_argument('--target',default='javascript');p.add_argument('-o','--output',type=Path,required=True)
 a=p.parse_args();compiler=a.compiler.resolve()
 if a.source.stat().st_size>16_000_000:raise ValueError('source byte bound')
 def invoke(*args):
  r=subprocess.run([str(compiler),*map(str,args)],capture_output=True,text=True,timeout=180)
  if r.returncode:raise ValueError(r.stderr[-3000:])
  return json.loads(r.stdout)
 sid=invoke('check-core',a.source)['core_sha256'];core=json.loads(a.source.read_bytes())
 with tempfile.TemporaryDirectory(prefix='ink-author-fold-projection-')as temporary:
  d=Path(temporary);store=Store.publish(d/'knowledge',[])
  recipe=next(r for r in load(store=store)[0]['recipes']if r['id']=='fold-state-projection')
  label='fold-state-projection/'+a.function+'/'+a.field
  rows=[r for r in execute(recipe,dict(core=core,source=sid,compiler=str(compiler),knowledge_root=str(store.root),knowledge_snapshot=store.snapshot_id,check_timeout=180))if r['status']=='proposal'and r['label']==label]
  if len(rows)!=1:raise ValueError('expected one matching checked proposal: '+label)
  plan=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=sid,steps=rows[0]['steps']);pending=d/'plan.json';pending.write_bytes(canonical(plan))
  receipt=invoke('check-plan',a.source,pending,'--core','--target',a.target)
  a.output.parent.mkdir(parents=True,exist_ok=True)
  with tempfile.NamedTemporaryFile(dir=a.output.parent,prefix='.fold-projection-',delete=False)as f:
   staged=Path(f.name);f.write(pending.read_bytes())
  try:os.replace(staged,a.output)
  finally:staged.unlink(missing_ok=True)
  print(json.dumps(dict(status='checked-proposal',input=sid,selected=receipt['selected'],plan_sha256=receipt['plan_sha256'],profitability='unmeasured-explicit-only')))
if __name__=='__main__':main()
