from pathlib import Path
import copy,hashlib,json,subprocess,time
from ink_knowledge import Store,canonical,identity,semantic_entry
b=Path('build/v8-variable-power-cases');out=b/'mixed';out.mkdir(exist_ok=False);compiler=Path('build/v8-proof-dependencies-final-cli/frozen/ink-integrated').resolve();begin=time.monotonic()
root=json.loads((b/'law.json').read_bytes());old=Store(b/'candidate').bundle([identity(semantic_entry(root))])['objects'];terminal=json.loads((b/'quotient-assisted/terminal.json').read_bytes());assert terminal['exit_status']==0
selected={};mapping={};rows=[]
for ident in root['dependencies']:
 entry=old[ident];original=dict(schema=1,semantics=entry['semantics'],dependencies=entry['dependencies'],**entry['payload']);k=original['from']['node']['Op'][1][1]['node']['Word'].bit_length()-1;trial=next(r for r in terminal['rows']if r['k']==k);chosen=original;objects=[original]
 if trial['status']=='admitted':
  d=b/'quotient-assisted'/str(k);alternative=json.loads((d/'law.json').read_bytes());q=json.loads((d/'quotient.json').read_bytes())
  if sum(len(canonical(semantic_entry(x)))for x in [alternative,q])<len(canonical(entry)):
   chosen=alternative;objects=[q,alternative]
 for obj in objects:selected[identity(semantic_entry(obj))]=obj
 mapping[ident]=identity(semantic_entry(chosen));rows.append(dict(k=k,variant='quotient-assisted'if len(objects)==2 else'original-packed',original_bytes=len(canonical(entry)),selected_bytes=sum(len(canonical(semantic_entry(x)))for x in objects),root=mapping[ident]))
def replace(v):
 if isinstance(v,list):return [replace(x)for x in v]
 if not isinstance(v,dict):return v
 v={k:replace(x)for k,x in v.items()}
 if 'Use'in v:v['Use']['law']=mapping.get(v['Use']['law'],v['Use']['law'])
 return v
root['proof']=replace(root['proof']);root['dependencies']=sorted(set(mapping.values()));selected[identity(semantic_entry(root))]=root
(out/'law.json').write_bytes(canonical(root));(out/'objects.json').write_bytes(canonical(list(selected.values())))
store=Store.publish(out/'candidate',[semantic_entry(x)for x in selected.values()]);(out/'view.json').write_bytes(canonical(store.bundle([identity(semantic_entry(root))])))
r=subprocess.run([compiler,'knowledge-check',b/'core.json',out/'view.json'],capture_output=True,text=True,timeout=120);(out/'check.stdout').write_text(r.stdout);(out/'check.stderr').write_text(r.stderr)
receipt=dict(schema=1,exit_status=r.returncode,law=identity(root),entry=identity(semantic_entry(root)),objects=len(selected),law_bytes=len(canonical(root)),view_bytes=(out/'view.json').stat().st_size,original_view_bytes=(b/'view.json').stat().st_size,default_leaf_size=64,compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),rows=sorted(rows,key=lambda x:x['k']),seconds=str(time.monotonic()-begin));(out/'terminal.json').write_bytes(canonical(receipt));print(json.dumps(receipt));assert not r.returncode,r.stderr
