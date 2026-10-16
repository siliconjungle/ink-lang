"""Required checked two-plan resident-call control; independent source oracle."""
import argparse,json
from pathlib import Path
from types import SimpleNamespace
from ink_knowledge import Store,identity
from ink_knowledge.implementation_candidates import publish_candidates
from ink_planner.compiled_planning import Planner
from ink_planner.implementation_selection import measurement_id
from ink_planner.offline_measurements import acquire,validated,target_context
from ink_planner.representation_selection import rank
p=argparse.ArgumentParser();p.add_argument('--target',choices=['javascript','rust'],required=True);p.add_argument('--variant',choices=['original','refined'],default='original');a=p.parse_args()
base=Path('build/v8-variable-power-cases').resolve();program=base/('program'if a.variant=='original'else'program-refined');out=base/('runtime-'+a.target+(''if a.variant=='original'else'-refined'));out.mkdir()
packages=[json.loads((program/(n+'.plan.json')).read_bytes())for n in ['baseline','searched']]
store,candidates=publish_candidates(out/'knowledge',packages)
options=SimpleNamespace(target=a.target,snapshot=None,time_seconds=1800,check_timeout=600,measure_timeout=900,measure_processes=3,memory_bytes=512000000,reference_budget=100000000)
planner=Planner(Path('build/v8-proof-dependencies-final-cli/frozen/ink-integrated'),program/'core.json',store.root,out,[],'0'*64,options)
try:
 states=[planner.check(pkg)for pkg in packages];measurements=[measurement_id(c,planner.compiler_hash,a.target)for c in candidates]
 results={};previous=[];controls=dict(processes=3,rounds=11,minimum_batch_ms=5,maximum_calls_per_sample=1024)
 for split in ['training','holdout']:
  spec=json.loads((program/(split+'.json')).read_bytes())
  if a.target=='javascript':
   spec['schema']=3;spec['phases']={k:[dict(r,boundary='compact')for r in rows]for k,rows in spec['phases'].items()}
  path=out/(split+'.json');path.write_text(json.dumps(spec));target,workload,profile,acquisition=acquire(planner,store,packages,states,measurements,path,controls,disjoint_inputs=previous)
  chosen,gate=rank(store,packages[0]['input_core_sha256'],validated(measurements,acquisition),target,workload,profile,measurements[0],minimum_gain_ppm=100000,sample_guard=True)
  results[split]=dict(chosen=chosen,selection=gate,acquisition=acquisition);(out/(split+'-report.json')).write_text(json.dumps(results[split],indent=2)+'\n');previous=acquisition['acquisition']['input_fingerprints']
 result=dict(schema=1,target=a.target,compiler_sha256=planner.compiler_hash,source=packages[0]['input_core_sha256'],measurements=measurements,heldout_accepted=all(r['chosen']==measurements[1]for r in results.values()),controls=controls,scope='Explicit guarded U32 variable-remainder two-candidate mechanism control, independent source oracle and normalized typed holdout; resident complete calls with full result consumption; shared host, no automatic placement claim.')
 (out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
finally:planner.close()
