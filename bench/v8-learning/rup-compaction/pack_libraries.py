import copy,gzip,hashlib,json,subprocess,tempfile,time
from pathlib import Path
from producers.frozen_laws import read,update
from producers.rup_compaction import compact_certificate
from ink_knowledge import canonical,semantic_entry,identity,Store
root=Path.cwd();folder=root/'build/v8-rup-compaction';compiler=root/'build/v8-signed-division/frozen/ink-final-merged';core=folder/'core.json';results=[]
for lib in ['v8-word-laws','v8-float-laws']:
 directory=root/'knowledge/producers/data'/lib;rows=read(directory);replacements=[]
 for row in rows:
  start=time.monotonic();law=row['law'];item=dict(library=lib,name=row['name'],before_bytes=len(canonical(law)),old_identity=identity(law))
  if 'BitVector' not in law['proof']:item.update(status='unchanged-nonroot-bitvector',after_bytes=item['before_bytes']);results.append(item);continue
  with tempfile.TemporaryDirectory(dir=folder)as tmp:
   d=Path(tmp);proof=law['proof']['BitVector'];original=proof['certificate'];goal={k:law[k]for k in ['params','conditions','from','to']};g=d/'goal.json';g.write_bytes(canonical(goal));cnf=d/'cnf.json';args=[str(compiler),'semantic-bitvector-obligation',str(core),str(g),'--core','-o',str(cnf)]
   if 'semantics'in proof:args+=['--semantics',proof['semantics']]
   if 'encoding'in original:args+=['--encoding',original['encoding']]
   subprocess.run(args,capture_output=True,check=True);problem=json.loads(cnf.read_bytes());assert problem['sha256']==original['problem_sha256']
   try:packed,stats=compact_certificate(problem,original,seconds=30)
   except ValueError as error:packed=original;stats=dict(selected='original',authoring_reason=str(error))
   candidate=copy.deepcopy(law);candidate['proof']['BitVector']['certificate']=packed
   assert {k:v for k,v in candidate.items()if k!='proof'}=={k:v for k,v in law.items()if k!='proof'}
   assert {k:v for k,v in candidate['proof']['BitVector'].items()if k!='certificate'}=={k:v for k,v in proof.items()if k!='certificate'}
   obj=semantic_entry(candidate);store=Store.publish(d/'knowledge',[obj]);bundle=d/'bundle.json';bundle.write_bytes(canonical(store.bundle([identity(obj)])));checked=subprocess.run([compiler,'knowledge-check',core,bundle],capture_output=True,text=True,timeout=120)
   assert checked.returncode==0,checked.stderr
   if canonical(candidate)!=canonical(law):replacements.append(dict(name=row['name'],law=candidate))
   item.update(status='checked',after_bytes=len(canonical(candidate)),new_identity=identity(candidate),before_steps=len(original['steps']),after_steps=len(packed['steps']),seconds=round(time.monotonic()-start,3),**stats)
  results.append(item);print(json.dumps(item),flush=True)
  (folder/'library-results.json').write_text(json.dumps(dict(schema=1,source_knowledge='920558c59d83b6cc82ccdfa73f1ee8b5f6ecd16c',compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),rows=results),indent=2)+'\n')
 update(directory,replacements)
 # Only replaced, no-longer-indexed content files retire. Git history retains
 # every original proof and the exact preceding index for reproducibility.
 from producers.frozen_laws import index
 current={r['sha256']for r in index(directory)}
 for old in rows:
  digest=identity(old['law'])
  if digest not in current:(directory/(digest+'.json.gz')).unlink()
 print('updated',lib,len(replacements),flush=True)
