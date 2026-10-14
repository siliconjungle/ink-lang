import json,copy
from pathlib import Path
from types import SimpleNamespace
from ink_knowledge import Store,identity
from ink_knowledge.implementation_candidates import publish_candidates
from ink_planner.compiled_planning import Planner
from ink_planner.implementation_selection import measurement_id
from ink_planner.state_measurements import acquire
from ink_planner.representation_selection import rank
root=Path.cwd();d=root/'build/raw-signals-gap/lifecycles';d.mkdir(exist_ok=True)
source=root/'reports/planner-reliability-2026-10-14/filtered-input.core.json';knowledge=root/'build/state-protocol-selection/knowledge';compiler=root/'target/release/ink'
artifact=root/'build/raw-signals-gap/accepted'
packages=[json.loads((root/'build/raw-signals-gap/artifacts/general.json').read_text()),*[json.loads((artifact/(n+'.json')).read_text())for n in ['zero-map','zero-dense']]]
store,ids=publish_candidates(knowledge,packages)
options=SimpleNamespace(target='javascript',check_timeout=45,measure_timeout=600,measure_processes=3,memory_bytes=512000000,time_seconds=1200,snapshot=None)
planner=Planner(compiler,source,knowledge,d,[],identity([]),options)
try:
 states=[planner.check(p)for p in packages];measurements=[measurement_id(i,planner.compiler_hash,'javascript')for i in ids]
 target,workload,profile,report=acquire(planner,store,packages,states,measurements,root/'reports/planner-reliability-2026-10-14/filtered-workload.json')
 chosen,selection=rank(store,packages[0]['input_core_sha256'],measurements,target,workload,profile,measurements[0],minimum_gain_ppm=100000,sample_guard=True)
 (d/'training.json').write_text(json.dumps(dict(labels=dict(zip(measurements,['general','zero-map','zero-dense'])),selected=chosen,selection=selection,acquisition=report),indent=2))
 # Frozen candidates also undergo independent unseen histories. Holdout remains
 # a rejection gate; it never changes the training winner to another candidate.
 target,workload,profile,held=acquire(planner,store,packages,states,measurements,root/'reports/planner-reliability-2026-10-14/filtered-holdout.json')
 _,hs=rank(store,packages[0]['input_core_sha256'],measurements,target,workload,profile,measurements[0],minimum_gain_ppm=100000,sample_guard=True)
 (d/'holdout.json').write_text(json.dumps(dict(frozen_training_winner=chosen,selection=hs,acquisition=held),indent=2))
 print(json.dumps(dict(status='checked',selected=chosen,validated=report['validated_measurements'],held_validated=held['validated_measurements'])))
finally:planner.close()
