import gzip,json,subprocess
from pathlib import Path
from ink_knowledge import Store,semantic_entry,identity,canonical
from producers.frozen_laws import read
root=Path.cwd();folder=root/'build/v8-rup-compaction';pin='920558c59d83b6cc82ccdfa73f1ee8b5f6ecd16c';rows=json.loads((folder/'work-filter.json').read_text())['rows'];current={r['name']:r['law']for r in read(root/'knowledge/producers/data/v8-word-laws')};old=[];new=[]
for row in rows:
 assert row['kept']
 raw=subprocess.check_output(['git','-C','knowledge','show',pin+':producers/data/v8-word-laws/'+row['old_identity']+'.json.gz']);old.append(semantic_entry(json.loads(gzip.decompress(raw))));new.append(semantic_entry(current[row['name']]))
groups=[];pending=[];size=0
for i,obj in enumerate(old):
 n=len(canonical(obj))
 if pending and size+n>8000000:groups.append(pending);pending=[];size=0
 pending.append(i);size+=n
if pending:groups.append(pending)
for group,indices in enumerate(groups):
 for label,objects in [('baseline',old),('compacted',new)]:
  selected=[objects[i]for i in indices];store=Store.publish(folder/('replay-'+label+'-'+str(group)),selected);(folder/(label+'-'+str(group)+'.bundle.json')).write_bytes(canonical(store.bundle([identity(obj)for obj in selected])))
(folder/'replay-groups.json').write_text(json.dumps(dict(schema=1,groups=[[rows[i]['name']for i in indices]for indices in groups],reason='Identical statement groups bounded by 8 MB of baseline entry bytes, below unchanged law-catalogue byte limit; all 43 statements retained.'),indent=2)+'\n')
print(len(old),len(groups),flush=True)
