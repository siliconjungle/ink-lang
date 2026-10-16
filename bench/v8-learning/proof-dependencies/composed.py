from pathlib import Path
import json,subprocess,hashlib
from ink_knowledge import canonical,semantic_entry,identity,Store
from producers.frozen_laws import specialize
from ink_planner.semantic_search import positions,match
base=Path('build/v8-proof-dependencies');compiler=Path('build/v8-proof-transport/frozen/ink-integrated').resolve();data=Path('knowledge/producers/data/v8-integer-laws');subject=json.loads((base/'subject.json').read_bytes());rows=specialize(subject,data,'v8-integer/');assert len(rows)==4
objects=[semantic_entry(law)for _,law in rows];store=Store.publish(base/'shared-store',objects);applications=[];roots=[]
for name,law in rows:
 if '/dependency/'in name:continue
 entry=semantic_entry(law)
 for function,body in subject['functions'].items():
  for path,target in positions(body):
   arguments={}
   if match(law['from'],target,law['params'],arguments):applications.append(dict(function=function,path=list(path),law=identity(entry),arguments=arguments,premises=[]));roots.append(identity(entry))
assert len(applications)==3 and len(set(roots))==3
selection=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=subject['input_core_sha256'],knowledge=store.bundle(roots),applications=applications);raw=canonical(selection);(base/'shared.selection.json').write_bytes(raw)
r=subprocess.run([compiler,'check-selection',base/'core.json',base/'shared.selection.json'],capture_output=True,text=True,timeout=120);(base/'shared.stdout').write_text(r.stdout);(base/'shared.stderr').write_text(r.stderr)
receipt=dict(schema=1,exit_status=r.returncode,reason=r.stderr.strip(),selection_bytes=len(raw),selection_sha256=hashlib.sha256(raw).hexdigest(),source=subject['input_core_sha256'],roots=roots,objects=len(objects),discovery_labels=[name for name,_ in rows],scope='Same composed source and exact three rewrite statements. Four independently replayed objects share existing quotient witnesses; unchanged16MB file/catalogue limits and semantic/circuit/RUP budgets. No performance or automatic choice claim.')
(base/'composition.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt),flush=True);assert not r.returncode,r.stderr
