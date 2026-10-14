"""Freeze ordinary planning and explicit checked controls before evaluation.

The source is a development fixture, not an untouched library. No candidate or
producer is chosen for the measured plan. Explicit indexing is a separate control.
"""
import argparse,datetime,hashlib,json,os,pathlib,shutil,subprocess,sys,time
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'planner'),str(ROOT/'knowledge')]
from ink_planner.corpus import clone_knowledge
from ink_knowledge import Store,canonical,semantic_entry,identity

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path,required=True);p.add_argument('--seed-offset',type=int,default=0);p.add_argument('--training-grid',action='store_true');a=p.parse_args()
 if not 0<=a.seed_offset<2**31:p.error('seed offset must be a nonnegative signed 32-bit integer')
 d=a.output.resolve();d.mkdir(parents=True,exist_ok=False)
 for name in ['source.ink','run.mjs','prepare.py']:shutil.copy2(pathlib.Path(__file__).with_name(name),d/name)
 shutil.copy2(ROOT/'bench/gpu/engine-profile-order.mjs',d/'order.mjs')
 shutil.copy2(a.compiler,d/'ink');shutil.copytree(ROOT/'planner',d/'planner',ignore=shutil.ignore_patterns('.git','__pycache__','build'))
 clone_knowledge(ROOT/'knowledge',d/'knowledge')
 # Canonical objects stay immutable. Authoring files are separate copies so an
 # in-place development edit cannot alter a frozen experiment through hardlinks.
 for f in (d/'knowledge').rglob('*'):
  if f.is_file()and not f.is_symlink()and 'store'not in f.relative_to(d/'knowledge').parts and f.stat().st_nlink>1:
   tmp=f.with_name(f.name+'.freeze');shutil.copy2(f,tmp);os.replace(tmp,f)
 files={str(p.relative_to(d)):hashlib.sha256(p.read_bytes()).hexdigest()for folder in ['knowledge/producers','knowledge/ink_knowledge','planner/ink_planner']for p in (d/folder).rglob('*.py')}
 files.update({f:hashlib.sha256((d/f).read_bytes()).hexdigest()for f in ['source.ink','ink','prepare.py','run.mjs','order.mjs']})
 bank=Store(d/'knowledge');initial=bank.snapshot_id
 registration=dict(schema=1,seed_offset=a.seed_offset,training_grid=a.training_grid,at=datetime.datetime.now(datetime.timezone.utc).isoformat(),files=files,knowledge_snapshot=initial,
  scope='Development fixture for contextual membership indexing; not an unseen library. Default registry and balanced planning; no forced producer or candidate. Complete call includes index construction, all query results and full consumption. Import, input generation and compilation excluded. Explicit indexed control is checked separately and never supplies selection authority. All held-out cells are reported, including losses outside a selected workload.',
  selection='Independent large and small workload plans, each with three timing processes and rejection-only validation; evaluation never selects or repairs a plan.',
  evaluation=dict(sizes=[0,1,31,257,4097],queries=[0,1,17,257],shapes=['unique','repeated16'],processes=3,rounds=8,batch_ns=3000000,seed=733+a.seed_offset))
 if a.training_grid:
  registration['selection']='Independent mixed-size and small plans; mixed training and rejection-only validation use independently registered Cartesian grids. Evaluation never selects or repairs a plan.'
  registration['grids']=dict(training=dict(keys=[0,3,97,1537],queries=[0,3,193]),validation=dict(keys=[0,7,149,2053],queries=[0,7,263]))
 (d/'registration.json').write_text(json.dumps(registration,indent=2)+'\n')
 env=dict(os.environ,PYTHONPATH=os.pathsep.join([str(d/'planner'),str(d/'knowledge')]))
 def run(command,log):
  start=time.monotonic()
  with log.open('w')as stream:r=subprocess.run(list(map(str,command)),cwd=ROOT,env=env,stdout=stream,stderr=subprocess.STDOUT)
  if r.returncode:raise RuntimeError(f'command failed ({r.returncode}); see {log}')
  return time.monotonic()-start
 def workload(n,q,seed):
  keys=[(i*2654435761+seed)&0xffffffff for i in range(n)]
  requests=[dict(key=keys[i%n]if n and i%2==0 else i+seed,other=keys[(i+1)%n]if n and i%3==0 else i+1,enabled=i%4!=0,probes=[0,1,0xffffffff,i])for i in range(q)]
  calls={'records':[keys,requests,seed,0],'predicate':[keys,keys[::3],requests],'nested':[keys,requests]}
  return dict(schema=1,phases={name:[dict(function=name,args=args)]for name,args in calls.items()},profile={name:1 for name in calls},
   workload=dict(shape=dict(elements=n,queries=q),distribution='alternating membership',concurrency=1,residency='complete host call including index construction and output'))
 for label,n,q,seed in [('large-training',1536,128,37),('large-validation',2049,193,101),('small-training',3,1,41),('small-validation',5,2,103)]:
  (d/(label+'.json')).write_text(json.dumps(workload(n,q,seed+a.seed_offset))+'\n')
 if a.training_grid:
  for label,grid,seed in [('large-training',registration['grids']['training'],37),('large-validation',registration['grids']['validation'],101)]:
   phases={}
   for n in grid['keys']:
    for q in grid['queries']:
     sample=workload(n,q,seed+a.seed_offset)
     for name,calls in sample['phases'].items():phases[f'{name}:keys:{n}:queries:{q}']=calls
   spec=dict(schema=1,phases=phases,profile={phase:1 for phase in phases},
    workload=dict(shape=grid,distribution='registered mixed-size Cartesian grid',concurrency=1,residency='complete host call including construction and output'))
   (d/(label+'.json')).write_text(json.dumps(spec)+'\n')
 for stage in ['core','semantic']:run([d/'ink','emit-'+stage,d/'source.ink','-o',d/(stage+'.json')],d/(stage+'.log'))
 # This separately checked counterfactual is a measurement control only.
 sys.path[:0]=[str(d/'planner'),str(d/'knowledge')]
 import producers.indexed_lookup as indexed
 if pathlib.Path(indexed.__file__).resolve()!=d/'knowledge/producers/indexed_lookup.py':raise ValueError('control producer was not loaded from frozen code')
 subject=json.loads((d/'semantic.json').read_text());laws=indexed.specialize(subject,json.loads((d/'core.json').read_text()))
 controls=Store.publish(d/'control-proofs',[semantic_entry(l)for _,l in laws]);roots=[];apps=[]
 for name,law in laws:
  if name.startswith('index_membership_'):continue
  ident=identity(semantic_entry(law));roots.append(ident)
  apps.append(dict(function=name.split('_indexed_lookup_')[0],path=[],law=ident,arguments={n:dict(sort=s,node={'Free':n})for n,s in law['params'].items()},premises=[]))
 selection=d/'control-selection.json';selection.write_bytes(canonical(dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=subject['input_core_sha256'],knowledge=controls.bundle(roots),applications=apps)))
 run([d/'ink','check-selection',d/'core.json',selection],d/'control-check.log')
 for name,extra in [('baseline',[]),('indexed',['--selection',selection])]:
  run([d/'ink','build',d/'core.json','--core','--target','javascript',*extra,'-o',d/(name+'.mjs')],d/(name+'-build.log'))
 timings={}
 for label in ['large','small']:
  print(time.strftime('%H:%M:%S'),label,'ordinary planning',flush=True)
  timings[label]=run([sys.executable,'-m','ink_planner.compiled_planning','--compiler',d/'ink','--source',d/'source.ink','--knowledge-root',d/'knowledge','--snapshot',d/'knowledge/store/snapshots'/(initial+'.json'),'--target','javascript','--planning-effort','balanced','--measure-workload',d/(label+'-training.json'),'--measure-holdout',d/(label+'-validation.json'),'--measure-processes','3','--measure-timeout','600','--check-timeout','300','--reference-budget','1000000000','--cache','off','--emit',d/(label+'.mjs'),'-o',d/(label+'.plan.json')],d/(label+'.log'))
  for trial in range(registration['evaluation']['processes']):
   print(time.strftime('%H:%M:%S'),label,'evaluation',trial,flush=True)
   run(['node',d/'run.mjs',d,label,str(trial),d/f'{label}-evaluation-{trial}.json'],d/f'{label}-evaluation-{trial}.log')
 changed=[name for name,sha in files.items()if hashlib.sha256((d/name).read_bytes()).hexdigest()!=sha]
 if changed:raise ValueError('frozen source changed: '+repr(changed))
 (d/'complete.json').write_text(json.dumps(dict(complete=True,planning_seconds=timings,source_files_verified=len(files)),indent=2)+'\n')
if __name__=='__main__':main()
