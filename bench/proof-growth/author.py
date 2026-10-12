"""Bounded conformance replay: discover from database patterns, not function names.

This evaluates proof capabilities, not an automatic profitability claim. The
ordinary measured planner experiment is kept separate from this ablation.
"""
import copy,json,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity
from ink_knowledge.law_templates import generate
from ink_knowledge.proposal_views import ProposalViews
from producers.pipeline_templates import templates
from ink_planner.semantic_search import positions,match,substitute,set_child,selection_roots,cost,children

def set_at(term,path,replacement):
 if not path:return replacement
 return set_child(term,path[0],set_at(list(children(term))[path[0]],path[1:],replacement))

def selection(compiler,source,directory,count,option=False):
 directory=Path(directory);directory.mkdir(parents=True,exist_ok=True)
 def invoke(*args):
  r=subprocess.run([str(compiler),*map(str,args)],capture_output=True,text=True,timeout=120)
  if r.returncode:raise ValueError(r.stderr)
  return json.loads(r.stdout)if r.stdout.lstrip().startswith('{')else r.stdout
 start=time.perf_counter();core=directory/'core.json';subject=directory/'subject.json'
 receipt=invoke('emit-core',source,'-o',core);invoke('emit-semantic',core,'--core','-o',subject)
 original=json.loads(core.read_bytes());current=json.loads(subject.read_bytes());rows=templates()
 # Existing 11 families retain their original identities. Growth checkpoints
 # add only newly published families; no workload-specific proof producer.
 old=[r for r in rows if r['name']not in {'foldr-map','foldl-map','foldl-filter-map','foldl-map-filter','foldr-first-replacement','fold-until-some-absorption','foldr-first-option'}]
 new=[r for r in rows if r not in old];chosen=(old+new)[:count]
 st=Store.publish(directory/'database',[r['object']for r in chosen],{r['name']:identity(r['object'])for r in chosen});st.ensure_index()
 objects={};applications=[];rounds=[];seen=set()
 for iteration in range(12):
  proposed,receipts=generate(st,current,original);objects.update(proposed)
  changed=0
  deprioritised=set()
  if option:
   direct=identity(next(r['object']for r in rows if r['name']=='foldr-first-replacement'))
   deprioritised={law for receipt in receipts if receipt['template']==direct for law in receipt['laws']}
  for name,body in list(current['functions'].items()):
   candidates=[]
   for path,target in positions(body):
    for ident,obj in proposed.items():
     law=obj['payload'];args={}
     if match(law['from'],target,law['params'],args)and set(args)==set(law['params']):
      replacement=substitute(law['to'],args)
      changed_body=set_at(body,path,replacement)
      key=(name,canonical(changed_body))
      if key not in seen and replacement!=target:
       candidates.append((ident in deprioritised,cost(replacement),ident,list(path),args,changed_body,key))
   if candidates:
    _,_,ident,path,args,body,key=min(candidates,key=lambda x:(x[0],x[1],x[2],x[3]));seen.add(key)
    current['functions'][name]=body;applications.append(dict(function=name,path=path,law=ident,arguments=args,premises=[]));changed+=1
  rounds.append(dict(iteration=iteration,changed=changed,receipts=receipts))
  if not changed:break
 view=ProposalViews(st,objects,directory/'views')
 package=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=receipt['core_sha256'],knowledge=view.bundle(selection_roots(applications)),applications=applications)
 path=directory/'selection.json';path.write_bytes(canonical(package));checked=invoke('check-selection',core,path)
 report=dict(schema=1,template_count=count,snapshot=st.snapshot_id,source_functions=len(current['functions']),unavailable=current['unavailable'],generated_laws=len(objects),applications=applications,rounds=rounds,seconds=time.perf_counter()-start,evidence=checked)
 (directory/'receipt.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
 import argparse
 p=argparse.ArgumentParser();p.add_argument('--compiler',required=True,type=Path);p.add_argument('--source',required=True,type=Path);p.add_argument('--directory',required=True,type=Path);p.add_argument('--count',type=int,required=True);p.add_argument('--option',action='store_true');a=p.parse_args();print(json.dumps(selection(a.compiler.resolve(),a.source.resolve(),a.directory,a.count,a.option)))
