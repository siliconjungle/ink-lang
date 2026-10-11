"""Use declared immutable legacy packages, excluding benchmark archives."""
import hashlib,json,os,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];R=Path(__file__).resolve().parent;src=ROOT/'knowledge/research';dest=R/'planner-fixture/research';dest.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
c=json.loads((src/'catalogue.json').read_text());records=[]
for pkg in c['packages']:
 if pkg['semantics']!='first-order-inductive-equality-v1':continue
 lock=src/pkg['lock'];assert lock.resolve().is_relative_to(src.resolve());assert sha(lock)==pkg['lock_sha256']
 for p in sorted((lock.parent/'objects').glob('*.json')):
  target=dest/lock.parent.relative_to(src)/'objects'/p.name;target.parent.mkdir(parents=True,exist_ok=True)
  if not target.exists():os.link(p,target)
  assert target.read_bytes()==p.read_bytes();records.append(dict(source=str(p.relative_to(ROOT)),fixture=str(target.relative_to(R)),sha256=sha(p)))
sys.path.insert(0,str(ROOT/'planner/research'));from database_query import Database
q=Database(dest);assert q.discovery['scalar_rules']>0
receipt=dict(status='passed',declared_catalogue_sha256=sha(src/'catalogue.json'),linked_package_objects=len(records),discovery=q.discovery,records=records,scope='Configured original planner test via INK_KNOWLEDGE_ROOT using all declared first-order packages; no source/test/rules edits, no empty fixture. Default recursive historical archive scan limit remains unchanged.')
(R/'planner-fixture-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:v for k,v in receipt.items() if k!='records'}))
