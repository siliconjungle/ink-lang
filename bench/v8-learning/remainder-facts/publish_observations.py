"""Publish immutable measured rows after stable corpus completion; no new proof."""
from pathlib import Path
import json
from ink_knowledge import Store,identity
here=Path('bench/v8-learning/remainder-facts');corpus=here.parent/'corpus-remainder-facts'
assert json.loads((corpus/'terminal.json').read_bytes())['exit_status']==0
objects=json.loads((here/'observation-proposals.json').read_bytes())['objects'];assert len(objects)==36
store=Store('knowledge');before=store.snapshot_id;ids=[]
for obj in objects:
 Store.validate_observation(obj);assert obj['entries']==[];ident=store.observe(obj);assert ident==identity(obj)
 assert json.loads((store.data/'observations'/(ident+'.json')).read_bytes())==obj;ids.append(ident)
assert Store('knowledge').snapshot_id==before and len(set(ids))==36
(here/'database-readback.json').write_text(json.dumps(dict(schema=1,observations=ids,count=36,proof_snapshot=before,proof_snapshot_unchanged=True,selection_policy_changed=False,scope='Exact24 CPU and12 corrected explicit-device timing rows. No context/sample relabel, proof premise, automatic placement or fabricated peak-memory measurement.'),indent=2)+'\n');print('Published/read back36 immutable observations; proof snapshot and policy unchanged')
