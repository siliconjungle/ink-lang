"""Publish exact completed timing proposals; proof snapshot and policy unchanged."""
import json,hashlib
from pathlib import Path
from ink_knowledge import Store,identity,canonical
base=Path('build/v8-proof-transport');out=Path('bench/v8-learning/hint-transport');terminal=json.loads((base/'corpus/terminal.json').read_bytes());assert terminal['exit_status']==0
store=Store('knowledge');before=store.snapshot_id;objects=[]
for name in ['runtime-javascript','runtime-rust']:
 private=Store(base/name/'knowledge')
 for split in ['training','holdout']:
  report=json.loads((base/name/(split+'-report.json')).read_bytes());assert report['acquisition']['rejected']==[]
  for ident in report['acquisition']['observations']:
   obj=json.loads((private.data/'observations'/(ident+'.json')).read_bytes());assert identity(obj)==ident;objects.append(obj)
gpu=json.loads((base/'runtime-gpu/receipt.json').read_bytes());objects+=gpu['observation_proposals'];assert len(objects)==36 and len({identity(o)for o in objects})==36
ids=[]
for obj in objects:
 assert obj['entries']==[];Store.validate_observation(obj);ident=store.observe(obj);assert json.loads((store.data/'observations'/(ident+'.json')).read_bytes())==obj;ids.append(ident)
assert Store('knowledge').snapshot_id==before
receipt=dict(schema=1,observations=ids,count=len(ids),proof_snapshot=before,proof_snapshot_unchanged=True,selection_policy_changed=False,scope='Exact original complete-call observations:24 CPU and12 explicit-device timing-only rows; no context/sample/plan relabel, new proof fact, automatic placement or fabricated GPU peak memory.')
(out/'database-readback.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
