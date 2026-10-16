import copy,gzip,hashlib,json,subprocess,tempfile,time
from pathlib import Path
from producers.frozen_laws import read
from producers.rup_compaction import compact_certificate
from ink_knowledge import canonical,semantic_entry,identity,Store
root=Path.cwd();folder=root/'build/v8-rup-compaction';compiler=root/'build/v8-signed-division/frozen/ink-final-merged';core=folder/'core.json'
rows=[(p.parent.name,json.loads(gzip.decompress(p.read_bytes()))) for p in sorted(folder.glob('*/baseline.law.json.gz'))]
assert len(rows)==7
(folder/'core.json').write_bytes(core.read_bytes());out=[]
for name,law in rows:
 start=time.monotonic();case=folder/name;case.mkdir(exist_ok=True);proof=law['proof']['BitVector'];original=proof['certificate'];goal={k:law[k]for k in ['params','conditions','from','to']}
 (case/'goal.json').write_bytes(canonical(goal))
 with tempfile.TemporaryDirectory(dir=folder)as tmp:
  d=Path(tmp);cnf=d/'cnf.json';args=[str(compiler),'semantic-bitvector-obligation',str(core),str(case/'goal.json'),'--core','-o',str(cnf)]
  if 'semantics'in proof:args+=['--semantics',proof['semantics']]
  if 'encoding'in original:args+=['--encoding',original['encoding']]
  subprocess.run(args,capture_output=True,check=True);problem=json.loads(cnf.read_bytes());assert problem['sha256']==original['problem_sha256']
  compact,stats=compact_certificate(problem,original,seconds=60);candidate=copy.deepcopy(law);candidate['proof']['BitVector']['certificate']=compact
  for label,current in [('baseline',law),('compacted',candidate)]:
   obj=semantic_entry(current);store=Store.publish(d/label,[obj]);bundle=d/(label+'.json');bundle.write_bytes(canonical(store.bundle([identity(obj)])))
   checked=subprocess.run([compiler,'knowledge-check',core,bundle],capture_output=True,text=True,timeout=120)
   assert checked.returncode==0,checked.stderr
   (case/(label+'.check.log')).write_text(checked.stdout+checked.stderr)
   with gzip.GzipFile(case/(label+'.law.json.gz'),'wb',mtime=0)as f:f.write(canonical(current))
  corrupted=copy.deepcopy(candidate);corrupted['proof']['BitVector']['certificate']['steps'][-1]['hints']=[]
  obj=semantic_entry(corrupted);store=Store.publish(d/'corrupted',[obj]);bundle=d/'corrupted.json';bundle.write_bytes(canonical(store.bundle([identity(obj)])));checked=subprocess.run([compiler,'knowledge-check',core,bundle],capture_output=True,text=True,timeout=120)
  assert checked.returncode!=0,'rehashed empty-hint contradiction admitted'
  (case/'corrupted.check.log').write_text(checked.stdout+checked.stderr)
  with gzip.GzipFile(case/'problem.json.gz','wb',mtime=0)as f:f.write(cnf.read_bytes())
 result=dict(name=name,status='checked-both-and-rejected-rehashed-corruption',before_bytes=len(canonical(law)),after_bytes=len(canonical(candidate)),before_steps=len(original['steps']),after_steps=len(compact['steps']),seconds=round(time.monotonic()-start,3),**stats);out.append(result);print(json.dumps(result),flush=True)
 (folder/'results.json').write_text(json.dumps(dict(schema=1,compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),scope='Required same-CNF packaging/replay control on a checked conditional U64 lemma and six installed certificates. Durations include construction, compaction and both ordinary replays; shared host, not runtime/compiler performance evidence.',rows=out),indent=2)+'\n')
