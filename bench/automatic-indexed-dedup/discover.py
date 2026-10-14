#!/usr/bin/env python3
"""Measure normal discovery/selection on a development source, then unused inputs.

No producer, rewrite, or candidate is selected by this harness. The ordinary
registry and measured planner decide. Keep all outcomes, including baseline
retention and regressions outside the workload that selected a static plan.
"""
import argparse,datetime,hashlib,json,os,pathlib,shutil,subprocess,sys,time
R=pathlib.Path(__file__).resolve().parents[2]
sys.path[:0]=[str(R/'planner'),str(R/'knowledge')]
from ink_planner.corpus import clone_knowledge

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--compiler',type=pathlib.Path,default=R/'target/debug/ink')
 p.add_argument('--knowledge-root',type=pathlib.Path,default=R/'knowledge')
 p.add_argument('--output',type=pathlib.Path,required=True)
 args=p.parse_args();d=args.output.resolve();d.mkdir(parents=True,exist_ok=False)
 source=R/'bench/planning-corpus/heldout/compact-set.ink'
 sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
 registration=dict(schema=1,created=datetime.datetime.now(datetime.timezone.utc).isoformat(),
  source_sha256=sha(source),compiler_sha256=sha(args.compiler),harness_sha256=sha(pathlib.Path(__file__)),
  source_scope='Frozen compact-set was used to develop discovery; this is a development source, not an untouched program.',
  selection_scope='Default registry, balanced search. No forced recipe, candidate or rewrite. Automatic probes or supplied workload select a static compiled plan.',
  timing_scope='Complete pure call, including index and buffer construction and full output consumption. Import, compilation and input generation excluded and reported separately.',
  cases=['automatic-probes','automatic-memory-cap','small-profile','large-profile','duplicate-profile'],
  reference_budget=1_000_000_000,
  training={'small':17,'large':3072,'duplicate':4096,'seed':37},
  validation={'small':19,'large':3584,'duplicate':4608,'seed':101},
  evaluation=dict(sizes=[0,1,23,257,4097,12289],shapes=['unique','repeated64','reverseUnique'],seed=733,processes=3,rounds=7,minimum_batch_ms=3),
  memory_scope='automatic-probes uses default settings without a cap. Other cases request a512MB conservative whole-process peak RSS cap; missing lifecycle memory evidence can retain baseline. Evaluation reports whole-process peak RSS, not per-candidate memory.',
  policy='Validation may reject the trained choice. Evaluation never fits, selects, rejects, or repairs a plan. Report every case; static profile selection does not imply dynamic dispatch.')
 (d/'registration.json').write_text(json.dumps(registration,indent=2)+'\n')
 shutil.copy2(source,d/'source.ink');shutil.copy2(args.compiler,d/'ink')
 shutil.copy2(pathlib.Path(__file__),d/'discover.py')
 shutil.copytree(R/'planner',d/'planner',ignore=shutil.ignore_patterns('.git','__pycache__','build'))
 shutil.copy2(pathlib.Path(__file__).with_name('evaluate.mjs'),d/'evaluate.mjs')
 clone_knowledge(args.knowledge_root,d/'knowledge')
 # Every case starts from the same authenticated catalogue, even though the
 # private root accumulates observations and candidates during this run.
 from ink_knowledge import Store
 initial=Store(d/'knowledge').snapshot_id
 snapshot=d/'knowledge/store/snapshots'/(initial+'.json')
 registration['knowledge_snapshot']=initial
 (d/'registration.json').write_text(json.dumps(registration,indent=2)+'\n')
 env=dict(os.environ,PYTHONPATH=os.pathsep.join([str(d/'planner'),str(d/'knowledge')]))
 def run(command,log):
  start=time.monotonic()
  with log.open('w')as output:result=subprocess.run(list(map(str,command)),cwd=R,env=env,stdout=output,stderr=subprocess.STDOUT)
  if result.returncode:raise RuntimeError(f'command failed ({result.returncode}); see {log}')
  return time.monotonic()-start
 run([d/'ink','build',d/'source.ink','--target','javascript','-o',d/'baseline.mjs'],d/'baseline-build.log')
 def workload(n,seed,duplicate=False):
  xs=[((i%64 if duplicate else i)*2654435761+seed)&0xffffffff for i in range(n)]
  return dict(schema=1,phases={'call':[dict(function='run',args=[xs,seed])]},profile={'call':1},
   workload=dict(shape=dict(elements=n),distribution='repeated64'if duplicate else'unique',concurrency=1,residency='host whole call including construction and materialisation'))
 for label,train,validation,duplicate in [('small-profile',17,19,False),('large-profile',3072,3584,False),('duplicate-profile',4096,4608,True)]:
  for split,n,seed in [('training',train,37),('validation',validation,101)]:
   (d/f'{label}-{split}.json').write_text(json.dumps(workload(n,seed,duplicate))+'\n')
 timings={}
 for label in registration['cases']:
  print(time.strftime('%H:%M:%S'),label,'normal planning',flush=True)
  command=[sys.executable,'-m','ink_planner.compiled_planning','--compiler',d/'ink','--source',d/'source.ink',
   '--knowledge-root',d/'knowledge','--snapshot',snapshot,'--target','javascript','--planning-effort','balanced',
   '--measure-processes','3','--measure-timeout','600','--check-timeout','300','--reference-budget',str(registration['reference_budget']),
   '--cache','off','--emit',d/(label+'.mjs'),'-o',d/(label+'.plan.json')]
  if label!='automatic-probes':command+=['--memory-limit','512000000']
  if not label.startswith('automatic-'):command+=['--measure-workload',d/(label+'-training.json'),'--measure-holdout',d/(label+'-validation.json')]
  timings[label]=run(command,d/(label+'.log'))
  print(time.strftime('%H:%M:%S'),label,'evaluation',flush=True)
  for trial in range(registration['evaluation']['processes']):
   run(['node',d/'evaluate.mjs',d,label,str(trial)],d/f'{label}-evaluation-{trial}.json')
 (d/'complete.json').write_text(json.dumps(dict(complete=True,planning_seconds=timings,registration=registration),indent=2)+'\n')

if __name__=='__main__':main()
