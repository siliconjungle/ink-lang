"""Publish exact cost observations after complete corpus validation; no new proof."""
from pathlib import Path
import json
from ink_knowledge import Store,identity
here=Path(__file__).resolve().parent
index=json.loads((here/'selected-inputs-index.json').read_bytes())
assert 'count-corpus/terminal.json'in index['files']
objects=json.loads((here/'observation-proposals.json').read_bytes())['objects']
assert len(objects)==168 and len({identity(o)for o in objects})==168
store=Store(here.parents[2]/'knowledge');before=store.snapshot_id;ids=[]
for obj in objects:
 Store.validate_observation(obj);assert obj['entries']==[];ident=store.observe(obj);assert ident==identity(obj);assert json.loads((store.data/'observations'/(ident+'.json')).read_bytes())==obj;ids.append(ident)
assert Store(store.root).snapshot_id==before
(here/'database-readback.json').write_text(json.dumps(dict(schema=1,observations=ids,count=168,proof_snapshot=before,proof_snapshot_unchanged=True,selection_policy_changed=False,scope='Exact120 CPU and48 explicit-device cost observations, including rejected quotient and native count choices. No context, sample, memory or plan relabel; no proof authority or automatic GPU placement.'),indent=2)+'\n');print('Published/read back168 exact observations; proof snapshot and selection policy unchanged')
