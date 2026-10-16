"""Recompute selection from retained observations, without timing new calls."""
import json,tempfile
from pathlib import Path
from ink_knowledge import Store
from ink_planner.representation_selection import rank
base=Path(__file__).resolve().parent
for cohort in ['native','native-scaled']:
 d=base/cohort;result=json.loads((d/'result.json').read_text());ids=result['measurements'];choices=[]
 with tempfile.TemporaryDirectory()as tmp:
  store=Store.publish(tmp,[])
  for observation in sorted((d/'observations').glob('*.json')):
   assert store.observe(json.loads(observation.read_text()))==observation.stem
  for split in ['training','holdout']:
   report=json.loads((d/(split+'-report.json')).read_text());acquisition=report['acquisition']
   spec=json.loads((d/(split+'.json')).read_text())
   # Preserve the exact target and per-phase workload cohort authenticated by
   # the original observation bytes; only remove the phase wrapper for rank.
   obj=json.loads((d/'observations'/(acquisition['observations'][0]+'.json')).read_text())
   workload=dict(obj['workload'],distribution=obj['workload']['distribution']['workload'])
   chosen,gate=rank(store,result['source'],ids,obj['target'],workload,spec['profile'],ids[0],minimum_gain_ppm=100000,sample_guard=True)
   assert chosen==report['chosen'];assert gate==report['selection'];choices.append(chosen)
  assert result['selected_after_independent_rejection']==(ids[1]if choices==[ids[1],ids[1]]else ids[0])
 print(cohort,'selection reproduced; final lane',ids.index(result['selected_after_independent_rejection']))
