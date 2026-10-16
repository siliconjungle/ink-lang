#!/usr/bin/env python3
"""Observe this recipe on every captured corpus member, without selecting it."""
import argparse,json,subprocess,tempfile,time
from pathlib import Path
from ink_knowledge import Store,canonical
from ink_knowledge.recipes import execute,load

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--corpus',type=Path,required=True);p.add_argument('--compiler',type=Path,required=True);p.add_argument('-o','--output',type=Path,required=True);a=p.parse_args();compiler=str(a.compiler.resolve());records=json.loads((a.corpus/'records.json').read_bytes());observations=[]
 with tempfile.TemporaryDirectory(prefix='ink-projection-corpus-')as temporary:
  d=Path(temporary);store=Store.publish(d/'knowledge',[]);recipe=next(r for r in load(store=store)[0]['recipes']if r['id']=='fold-state-projection')
  for record in records:
   source=a.corpus/'inputs'/(record['core_sha256']+'.core.json');core=json.loads(source.read_bytes());checked=subprocess.run([compiler,'check-core',str(source)],capture_output=True,text=True,check=True);sid=json.loads(checked.stdout)['core_sha256'];start=time.monotonic()
   rows=list(execute(recipe,dict(core=core,source=sid,compiler=compiler,knowledge_root=str(store.root),knowledge_snapshot=store.snapshot_id,check_timeout=180)))
   admitted=0;rejected=[]
   for index,row in enumerate(rows):
    if row['status']!='proposal':continue
    plan=d/'plan.json';plan.write_bytes(canonical(dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=sid,steps=row['steps'])))
    result=subprocess.run([compiler,'check-plan',str(source),str(plan),'--core','--target','javascript'],capture_output=True,text=True,timeout=180)
    if result.returncode:rejected.append(result.stderr[-1500:])
    else:admitted+=1
   observations.append(dict(name=record['name'],source=sid,rows=len(rows),proposed=sum(row['status']=='proposal'for row in rows),admitted=admitted,rejected=rejected,declined=[r.get('reason','')for r in rows if r['status']=='declined'],seconds=time.monotonic()-start))
 assert len(observations)==10
 a.output.write_text(json.dumps(dict(schema=1,scope='Explicit recipe discovery and replay on all ten captured cores. No runtime measurement or automatic selection; bounded default corpus scheduling is reported separately.',programs=observations),indent=2)+'\n')
 print(json.dumps(dict(programs=10,proposed=sum(r['proposed']for r in observations),admitted=sum(r['admitted']for r in observations))))
if __name__=='__main__':main()
