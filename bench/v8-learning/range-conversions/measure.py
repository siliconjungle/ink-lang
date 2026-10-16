"""Default semantic discovery followed by official offline measured selection.

A two-candidate mechanism control, not unrestricted global recipe enumeration.
All native projects, locks and requests remain in the supplied owned directory.
"""
import argparse,hashlib,json,subprocess,sys
from pathlib import Path
from types import SimpleNamespace
from ink_knowledge import Store,canonical,identity
from ink_knowledge.implementation_candidates import publish_candidates
from ink_planner.compiled_planning import Planner,SEMANTICS
from ink_planner.implementation_selection import measurement_id
from ink_planner.offline_measurements import acquire,validated,target_context,read_workload
from ink_planner.representation_selection import rank

p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--target',choices=['javascript','rust'],default='javascript');a=p.parse_args()
d=a.output.resolve();d.mkdir(parents=True,exist_ok=False);repo=Path(__file__).resolve().parents[3];source=Path(__file__).with_name('source.ink');compiler=repo/'target/debug/ink'
def invoke(*args):
 r=subprocess.run(list(map(str,args)),check=True,capture_output=True,text=True);return r.stdout
core=d/'core.json';invoke(compiler,'emit-core',source,'-o',core);store=Store.publish(d/'knowledge',[])
selection=d/'semantic.json'
r=invoke(sys.executable,'-m','ink_planner.semantic_search','--compiler',compiler,'--core',core,'--snapshot',store.data/'snapshot.json','--knowledge-root',store.root,'--budget','32','--rounds','4','--time-seconds','30','-o',selection)
(d/'search-report.json').write_text(r)
packet=json.loads(selection.read_text());source_hash=packet['input_core_sha256']
selected_functions=sorted({row['function']for row in packet['applications']})
assert selected_functions and set(selected_functions)<={'guarded','relational','wrapped'}
packages=[dict(schema=1,semantics=SEMANTICS,input_core_sha256=source_hash,steps=[]),dict(schema=1,semantics=SEMANTICS,input_core_sha256=source_hash,steps=[dict(kind='rewrite',package=packet)])]
options=SimpleNamespace(target=a.target,snapshot=None,time_seconds=1800,check_timeout=600,measure_timeout=600,measure_processes=3,memory_bytes=512000000,reference_budget=100000000)
planner=Planner(compiler,core,store.root,d,[],'0'*64,options)
try:
 states=[planner.check(pkg)for pkg in packages]
 store,candidates=publish_candidates(store.root,packages);measurements=[measurement_id(c,planner.compiler_hash,a.target)for c in candidates]
 for name,pkg in zip(['baseline','searched'],packages):(d/(name+'.plan.json')).write_bytes(canonical(pkg))
 controls=dict(processes=3,rounds=11,minimum_batch_ms=5,maximum_calls_per_sample=1024)
 results={};previous=[]
 for split,offset in [('training',0),('holdout',19)]:
  work=[]
  for x in [1+offset,71+offset,10001+offset,4294967200+offset,4294967300+offset,8589934500+offset]:
   for function in ['guarded','wrapped']:
    work.append(dict(function=function,args=[x]))
   for upper in [4294967296-offset,4294967380+offset]:
    work.append(dict(function='relational',args=[x,upper]))
  
  if a.target=='javascript':
   work=[dict(row,boundary='compact')for row in work]
  spec=dict(schema=3 if a.target=='javascript'else 1,phases={'calls':work},profile={'calls':1},workload=dict(shape={'protocol':'three range-conversion functions; both branches and boundary controls'},distribution=split+' disjoint typed scalar calls',concurrency=1,residency='complete generated compact-wire JS calls or JSON native calls; scalar results fully consumed'))
  path=d/(split+'.json');path.write_text(json.dumps(spec))
  if split=='training':
   _,digest=read_workload(path);unmeasured=dict(spec['workload'],shape=dict(inputs_sha256=digest,declared=spec['workload']['shape']))
   no_evidence,gate=rank(store,source_hash,measurements,target_context(planner),unmeasured,spec['profile'],measurements[0]);assert no_evidence==measurements[0]
   (d/'missing-evidence-gate.json').write_text(json.dumps(gate,indent=2)+'\n')
  target,workload,profile,acquisition=acquire(planner,store,packages,states,measurements,path,controls,disjoint_inputs=previous)
  chosen,gate=rank(store,source_hash,validated(measurements,acquisition),target,workload,profile,measurements[0],minimum_gain_ppm=100000,sample_guard=True)
  results[split]=dict(chosen=chosen,selection=gate,acquisition=acquisition)
  (d/(split+'-report.json')).write_text(json.dumps(results[split],indent=2)+'\n')
  previous=acquisition['acquisition']['input_fingerprints']
 accepted=results['training']['chosen']==results['holdout']['chosen']==measurements[1]
 result=dict(schema=1,target=a.target,selected_functions=selected_functions,search_checks=32,compiler_sha256=planner.compiler_hash,source=source_hash,measurements=measurements,selected_after_independent_rejection=measurements[1]if accepted else measurements[0],heldout_accepted=accepted,controls=controls,scope='Default semantic discovery; two checked candidates using official complete-call acquisition/rank and disjoint holdout; resident-call objective excludes compile/startup, which are recorded separately; shared host')
 (d/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
finally:planner.close()
