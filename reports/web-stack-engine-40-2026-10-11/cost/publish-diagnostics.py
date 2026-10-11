"""Publish separately scoped diagnostic data using existing canonical Store APIs.
No mathematical admission is asserted for these untrusted definitions.
"""
import hashlib,json,sys
from pathlib import Path
B=Path(__file__).resolve().parents[3];sys.path.insert(0,str(B/'knowledge'))
from ink_knowledge.store import Store,read,identity,validate_entry,immutable

sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
R=Path(__file__).resolve().parent;prepared=R/'canonical-import-with-context';receipt=read(prepared/'receipt.json')
if (R/'canonical-publication.json').exists():raise ValueError('preserve diagnostic publication receipt')
for name,digest in receipt['artifacts'].items():
 if sha(prepared/name)!=digest:raise ValueError('prepared diagnostic drift')
if sha(B/'knowledge/producers/import_target_work40.py')!=receipt['producer_sha256']:raise ValueError('import producer drift')
root=B/'knowledge';original=Store(root);previous=set(original.members());old_names=read(root/'store/names.json');objects={i:original.object(i)for i in previous};new=read(prepared/'entries.json');names=read(prepared/'names.json')
for obj in new:
 validate_entry(obj)
 if obj['kind']!='definition' or obj['semantics']not in ('ink-target-work-measurement-v1','ink-target-work-prices-v1','ink-target-work-publication-context-v1'):raise ValueError('non-diagnostic canonical entry')
 objects[identity(obj)]=obj
for name,i in names.items():
 if name in old_names and old_names[name]!=i:raise ValueError('existing name collision')
combined=dict(old_names,**names)
staged=Store.publish(R/'diagnostic-candidate-store',objects.values(),combined)
if not previous<=set(staged.members()):raise ValueError('old immutable member omitted')
if Store(root).snapshot_id!=original.snapshot_id or read(root/'store/names.json')!=old_names:raise ValueError('canonical catalogue changed while staging')
published=Store.publish(root,objects.values(),combined)
if published.snapshot_id!=staged.snapshot_id:raise ValueError('published diagnostic differs from stage')
published.rebuild()
observations=read(prepared/'observations.json');ids=[published.observe(o)for o in observations]
old=Store(root,root/'store/snapshots'/f'{original.snapshot_id}.json')
if set(old.members())!=previous or not previous<=set(published.members()):raise ValueError('old snapshot not preserved')
context=read(R/'publication-context.json')
result=dict(schema=1,status='diagnostic_data_published_no_mathematical_admission',previous_snapshot=original.snapshot_id,previous_root=original.snapshot['root'],previous_entries=len(previous),snapshot=published.snapshot_id,root=published.snapshot['root'],entries=len(published.members()),fresh_entries=sorted(set(published.members())-previous),observation_ids=ids,observations=len(ids),names_preserved=True,previous_snapshot_preserved=True,import_receipt_sha256=sha(prepared/'receipt.json'),publication_context_sha256=sha(R/'publication-context.json'),publication_context=context,publisher_sha256=sha(__file__),scope='Existing canonical Store.publish/rebuild/observe contracts. Diagnostic definitions and opt-in prices only; no correctness/application authority, default promotion or isolated/general speed claim. Poor heldout and provisional contention context embedded in all data.')
immutable(R/'canonical-publication.json',result)
print(json.dumps(dict(snapshot=result['snapshot'],root=result['root'],entries=result['entries'],fresh_entries=len(result['fresh_entries']),observations=len(ids))))
