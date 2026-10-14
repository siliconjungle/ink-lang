#!/usr/bin/env python3
"""Bounded general definition unfolding; every selected edge is kernel replayed."""
import argparse,json,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical
from ink_planner.semantic_search import positions,match,substitute,replace,children,selection_roots,SelectionChecker
p=argparse.ArgumentParser(description=__doc__);p.add_argument('directory',type=Path);p.add_argument('--max-body',type=int,default=100);p.add_argument('--max-result',type=int,default=3000);p.add_argument('--budget',type=int,default=64);p.add_argument('--seconds',type=int,default=90);p.add_argument('--root',action='append',default=[]);a=p.parse_args()
d=a.directory.resolve();core=json.loads((d/'core.json').read_text());subject=json.loads((d/'semantic.json').read_text());store=Store(d/'accepted');view=json.loads((d/'accepted/store/rewrite-view.json').read_text());compiler=ROOT/'build/compiler/debug/ink'
def size(t):return 1+sum(size(c)for c in children(t))
laws={ident:o['payload']for ident,o in view['objects'].items()if o['kind']=='rewrite'and not o['payload']['conditions']and size(o['payload']['to'])<=a.max_body}
index={l['from']['node']['Op'][0]:(ident,l)for ident,l in laws.items()}
bodies=dict(subject['functions']);apps=[];rejections=[];attempts=0
checker=SelectionChecker(compiler,d/'core.json',store,d)
started=time.monotonic()
order=[];pending=list(a.root)
while pending:
 name=pending.pop(0)
 if name in order:continue
 if name not in bodies:raise ValueError('unknown source function '+name)
 order.append(name)
 for _,term in positions(bodies[name]):
  op=term['node'].get('Op',[None])[0]if isinstance(term['node'],dict)else None
  if isinstance(op,str)and op.startswith('call:')and op[5:]in bodies:pending.append(op[5:])
if not order:order=list(bodies)
try:
 for name in order:
  ignored=set()
  while attempts<a.budget and time.monotonic()-started<a.seconds:
   body=bodies[name];found=False
   for path,t in positions(body):
    operation=t['node'].get('Op',[None])[0]if isinstance(t['node'],dict)else None
    if operation not in index:continue
    ident,law=index[operation]
    key=(tuple(path),ident,json.dumps(t,sort_keys=True))
    if key in ignored or operation=='call:'+name:continue
    args={}
    if not match(law['from'],t,set(law['params']),args):continue
    target=substitute(law['to'],args);new=replace(body,path,target)
    if size(new)>a.max_result:ignored.add(key);continue
    step=dict(function=name,path=list(path),law=ident,arguments=args,premises=[]);attempts+=1
    if checker.check(apps+[step]):
     apps.append(step);bodies[name]=new;found=True
     (d/'inline-progress.json').write_text(json.dumps(dict(attempts=attempts,accepted=len(apps),seconds=time.monotonic()-started)))
     break
    ignored.add(key);rejections.append(dict(function=name,path=path,law=ident))
   if not found:break
except KeyboardInterrupt:pass
finally:checker.close()
packet=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=subject['input_core_sha256'],knowledge=store.bundle(selection_roots(apps)),applications=apps)
(d/'selected.json').write_bytes(canonical(packet)+b'\n');(d/'inline-receipt.json').write_text(json.dumps(dict(attempts=attempts,accepted=len(apps),rejected=rejections,max_body=a.max_body,max_result=a.max_result),indent=2)+'\n')
r=subprocess.run([compiler,'check-selection',d/'core.json',d/'selected.json'],capture_output=True,text=True);(d/'selection-admission.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stderr
print('Accepted',len(apps),'of',attempts,'bounded general inline applications',flush=True)
