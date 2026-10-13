from pathlib import Path
import sys,os,json,time,shutil
root=Path(__file__).resolve().parents[2];sys.path[:0]=[str(root/'knowledge'),str(root/'planner')]
from ink_knowledge import Store,canonical
out=root/'reports/real-software-delivery-2026-10-13';work=root/'build/real-software-delivery';rows=[]
for name in ['base','grown']:
 src=work/'databases'/name;before=Store(src,src/'input-snapshot.json');ids=set(before.members());dest=work/'databases'/('packed-'+name);data=dest/'store';(data/'objects').mkdir(parents=True,exist_ok=True)
 for ident in ids:os.link(src/'store/objects'/(ident+'.json'),data/'objects'/(ident+'.json'))
 names=json.loads((src/'store/names.json').read_bytes());names={n:i for n,i in names.items() if i in ids}
 t=time.monotonic();after=Store._publish_ids(dest,ids,names,64);(dest/'input-snapshot.json').write_bytes(canonical(after.snapshot)+b'\n')
 # Reuse discovery summaries from a consistent SQLite backup, never proof state.
 import sqlite3
 with sqlite3.connect((src/'index.sqlite').as_uri()+'?mode=ro',uri=True) as a,sqlite3.connect(dest/'index.sqlite') as b:a.backup(b)
 with sqlite3.connect(dest/'index.sqlite') as db,db:
  for table in ['observation_attribution','observation_entries','observations','members','witnesses','snapshots']:db.execute('DELETE FROM '+table)
 after.ensure_index();assert set(after.members())==ids
 rows.append(dict(label='packed-'+name,original_snapshot=before.snapshot_id,snapshot=after.snapshot_id,entries=len(ids),leaf_size=64,construction_seconds=time.monotonic()-t,logical_entry_ids_unchanged=True))
 print(rows[-1],flush=True)
(out/'transport-checkpoints.json').write_text(json.dumps(rows,indent=2)+'\n')
