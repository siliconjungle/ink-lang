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

p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--target',choices=['javascript','rust'],default='javascript');p.add_argument('--compiler',type=Path);a=p.parse_args()
d=a.output.resolve();d.mkdir(parents=True,exist_ok=False);repo=Path(__file__).resolve().parents[3];source=Path(__file__).with_name('source.ink');compiler=(a.compiler or repo/'target/debug/ink').resolve()
def invoke(*args):
 r=subprocess.run(list(map(str,args)),check=True,capture_output=True,text=True);return r.stdout
core=d/'core.json';invoke(compiler,'emit-core',source,'-o',core);store=Store.publish(d/'knowledge',[])
selection=d/'semantic.json'
r=invoke(sys.executable,'-m','ink_planner.semantic_search','--compiler',compiler,'--core',core,'--snapshot',store.data/'snapshot.json','--knowledge-root',store.root,'--budget','32','--rounds','4','--time-seconds','30','-o',selection)
(d/'search-report.json').write_text(r)
packet=json.loads(selection.read_text());source_hash=packet['input_core_sha256']
# Default ranking may correctly retain the call. Measure one separately checked
# quotient replacement as a mechanism control, without claiming default selection.
(d/'default-semantic.json').write_bytes(canonical(packet))
from producers.frozen_laws import read
from ink_knowledge import semantic_entry
from ink_planner.semantic_search import match,positions
subject=d/'subject.json';invoke(compiler,'emit-semantic',core,'--core','-o',subject)
model=json.loads(subject.read_text());law=next(row['law']for row in read(repo/'knowledge/producers/data/v8-integer-laws')if row['name']=='u64_quot_or_power_3')
obj=semantic_entry(law);store=Store.publish(store.root,[obj]);apps=[]
for path,term in positions(model['functions']['reduce']):
 arguments={}
 if match(law['from'],term,law['params'],arguments):
  apps.append(dict(function='reduce',path=list(path),law=identity(obj),arguments=arguments,premises=[]));break
assert len(apps)==1
packet=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=source_hash,knowledge=store.bundle([identity(obj)]),applications=apps)
selection.write_bytes(canonical(packet));invoke(compiler,'check-selection',core,selection)
selected_functions=['reduce']
packages=[dict(schema=1,semantics=SEMANTICS,input_core_sha256=source_hash,steps=[]),dict(schema=1,semantics=SEMANTICS,input_core_sha256=source_hash,steps=[dict(kind='rewrite',package=packet)])]
options=SimpleNamespace(target=a.target,snapshot=None,time_seconds=1800,check_timeout=600,measure_timeout=600,measure_processes=3,memory_bytes=512000000,reference_budget=100000000)
planner=Planner(compiler,core,store.root,d,[],'0'*64,options)
try:
 states=[planner.check(pkg)for pkg in packages]
 store,candidates=publish_candidates(store.root,packages);measurements=[measurement_id(c,planner.compiler_hash,a.target)for c in candidates]
 for name,pkg in zip(['baseline','searched'],packages):(d/(name+'.plan.json')).write_bytes(canonical(pkg))
 controls=dict(processes=3,rounds=11,minimum_batch_ms=5,maximum_calls_per_sample=1024)
 results={};previous=[]
 for split,seed,shapes in [('training',7193,[256,2048,8192]),('holdout',8371,[263,2053,8209])]:
  work=[];empty=[dict(function='score',args=[[],seed])]
  for n in shapes:
   xs=[(i*seed*0x100000001+0x8000000000000011)&((1<<64)-1) for i in range(n)]
   work.append(dict(function='score',args=[xs,seed]))
  if a.target=='javascript':
   work=[dict(row,boundary='compact')for row in work];empty=[dict(row,boundary='compact')for row in empty]
  spec=dict(schema=3 if a.target=='javascript'else 1,phases={'work':work,'empty':empty},profile={'work':10000,'empty':1},workload=dict(shape={'protocol':'checked U64 quotient by eight inside an ordered wrapping fold; complete scalar result; nonempty and empty controls'},distribution=split+' disjoint typed input lengths and values',concurrency=1,residency='complete generated calls, fully consumed U64 scalar results; setup/loading excluded'))
  path=d/(split+'.json');path.write_text(json.dumps(spec))
  if split=='training':
   _,digest=read_workload(path);unmeasured=dict(spec['workload'],shape=dict(inputs_sha256=digest,declared=spec['workload']['shape']))
   no_evidence,gate=rank(store,source_hash,measurements,target_context(planner,encoded=a.target=='javascript'),unmeasured,spec['profile'],measurements[0]);assert no_evidence==measurements[0]
   (d/'missing-evidence-gate.json').write_text(json.dumps(gate,indent=2)+'\n')
  target,workload,profile,acquisition=acquire(planner,store,packages,states,measurements,path,controls,disjoint_inputs=previous)
  chosen,gate=rank(store,source_hash,validated(measurements,acquisition),target,workload,profile,measurements[0],minimum_gain_ppm=100000,sample_guard=True)
  results[split]=dict(chosen=chosen,selection=gate,acquisition=acquisition)
  (d/(split+'-report.json')).write_text(json.dumps(results[split],indent=2)+'\n')
  previous=acquisition['acquisition']['input_fingerprints']
 accepted=results['training']['chosen']==results['holdout']['chosen']==measurements[1]
 result=dict(schema=1,target=a.target,selected_functions=selected_functions,measured_functions=['score'],search_checks=32,compiler_sha256=planner.compiler_hash,source=source_hash,measurements=measurements,selected_after_independent_rejection=measurements[1]if accepted else measurements[0],heldout_accepted=accepted,controls=controls,scope='Explicit checked quotient-strength-reduction mechanism control; default discovery/ranking receipt retained separately and may retain source calls. Two candidates use official complete-call acquisition/rank and disjoint holdout; resident-call objective excludes recorded build/startup; shared host')
 (d/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
finally:planner.close()
