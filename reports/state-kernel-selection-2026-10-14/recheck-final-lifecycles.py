import json,gzip
from pathlib import Path
from types import SimpleNamespace
from ink_knowledge import identity
from ink_knowledge.implementation_candidates import publish_candidates
from ink_planner.compiled_planning import Planner
from ink_planner.implementation_selection import measurement_id
from ink_planner.state_measurements import acquire
from ink_planner.representation_selection import rank
from ink_planner.state_selection import choose
r=Path.cwd();d=r/'build/state-lifecycle-gap/final-lifecycles';d.mkdir(parents=True,exist_ok=True);k=d/'knowledge'
p=json.loads(gzip.decompress((r/'reports/raw-signals-2026-10-14/map.json.gz').read_bytes()));p['steps']=[s for s in p['steps']if s['kind']not in ['protocol','physical']]
packages=[p,*[json.loads((r/f'build/state-lifecycle-gap/{name}.plan.json').read_text())for name in ['final-objects','final-columns','final-compact','final-inline']]]
# Private complete candidate/proof closure. No unrelated database entries are
# needed for frozen-candidate acquisition; every proof snapshot replays intact.
store,ids=publish_candidates(k,packages);print('private proof closure published',flush=True)
o=SimpleNamespace(target='javascript',check_timeout=90,measure_timeout=600,measure_processes=3,memory_bytes=512000000,time_seconds=1200,snapshot=None)
planner=Planner(r/'target/release/ink',r/'reports/planner-reliability-2026-10-14/filtered-input.core.json',k,d,[],identity([]),o)
try:
 states=[planner.check(p)for p in packages];ms=[measurement_id(i,planner.compiler_hash,'javascript')for i in ids];chosen=None
 for label,path in [('training','filtered-workload.json'),('holdout','filtered-holdout.json')]:
  indices=list(range(len(packages)))if chosen is None else [0]if chosen==ms[0]else[0,ms.index(chosen)]
  target,workload,profile,a=acquire(planner,store,[packages[i]for i in indices],[states[i]for i in indices],[ms[i]for i in indices],r/'reports/planner-reliability-2026-10-14'/path)
  _,s=rank(store,packages[0]['input_core_sha256'],[ms[i]for i in indices],target,workload,profile,ms[0],minimum_gain_ppm=100000,sample_guard=True)
  pick,guard=choose(a['acquisition'],profile,ms[0],list(s['total_ns']));s['uncertainty_guard']=guard
  (d/(label+'.json')).write_text(json.dumps(dict(labels=dict(zip(ms,['general guarded map','compiled getters dense','event columns dense','compact commits dense','inlined maintenance dense'])),selected=pick,selection=s,acquisition=a),indent=2))
  print(label,pick,guard['reason'],flush=True)
  if chosen is None:chosen=pick
  else:print('frozen winner accepted',chosen==pick,flush=True)
finally:planner.close()
