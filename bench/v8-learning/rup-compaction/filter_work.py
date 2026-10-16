"""Untrusted replay-work observation/filter; ordinary kernel checks grant authority."""
import gzip,json,subprocess,tempfile
from pathlib import Path
from producers.frozen_laws import read,update,index
from ink_knowledge import canonical,identity
root=Path.cwd();folder=root/'build/v8-rup-compaction';compiler=root/'build/v8-signed-division/frozen/ink-final-merged';pin='920558c59d83b6cc82ccdfa73f1ee8b5f6ecd16c'
def previous(path):return subprocess.check_output(['git','-C','knowledge','show',pin+':'+str(path)])
def work(problem,cert):
 # Observe the existing checker's explicit charge: one assignment arena, prior
 # touched-variable reset, goal literals and every literal in each hinted clause.
 # This Python model is a selection estimate, never an admission shortcut.
 clauses=list(problem['clauses']);total=problem['variables'];previous_touched=0
 for step in cert['steps']:
  values={};total+=previous_touched+len(step['clause']);conflict=False
  for lit in step['clause']:
   if abs(lit)in values:conflict|=values[abs(lit)]!=(lit<0)
   else:values[abs(lit)]=lit<0
  for hint in step['hints']:
   assert not conflict;clause=clauses[hint];total+=len(clause)
   assert not any(abs(lit)in values and values[abs(lit)]==(lit>0)for lit in clause)
   unknown=[lit for lit in clause if abs(lit)not in values];assert len(unknown)<=1
   if unknown:values[abs(unknown[0])]=unknown[0]>0
   else:conflict=True
  assert conflict;previous_touched=len(values);clauses.append(step['clause'])
 assert not clauses[-1]
 return total
out=[]
for lib in ['v8-word-laws','v8-float-laws']:
 relative=Path('producers/data')/lib;directory=root/'knowledge'/relative
 oldindex=json.loads(previous(relative/'index.json'))['rows'];old={r['name']:r for r in oldindex};restored=[]
 for row in read(directory):
  r=old[row['name']];new=row['law'];new_id=identity(new)
  if new_id==r['sha256']:continue
  law=json.loads(gzip.decompress(previous(relative/(r['sha256']+'.json.gz'))));proof=law['proof']['BitVector'];original=proof['certificate'];goal={k:law[k]for k in ['params','conditions','from','to']}
  with tempfile.TemporaryDirectory(dir=folder)as tmp:
   d=Path(tmp);g=d/'goal.json';g.write_bytes(canonical(goal));cnf=d/'cnf.json';args=[str(compiler),'semantic-bitvector-obligation',str(folder/'core.json'),str(g),'--core','-o',str(cnf)]
   if 'semantics'in proof:args+=['--semantics',proof['semantics']]
   if 'encoding'in original:args+=['--encoding',original['encoding']]
   subprocess.run(args,capture_output=True,check=True);problem=json.loads(cnf.read_bytes());assert problem['sha256']==original['problem_sha256']
  before=work(problem,original);after=work(problem,new['proof']['BitVector']['certificate']);retain=after<=before
  if not retain:restored.append(dict(name=row['name'],law=law))
  result=dict(library=lib,name=row['name'],before_work=before,after_work=after,kept=retain,before_bytes=len(canonical(law)),after_bytes=len(canonical(new)),old_identity=r['sha256'],candidate_identity=new_id);out.append(result);print(json.dumps(result),flush=True)
 update(directory,restored)
 current={r['sha256']for r in index(directory)}
 for row in read(directory):assert identity(row['law'])in current
 for r in out:
  if r['library']==lib and not r['kept'] and r['candidate_identity']not in current:(directory/(r['candidate_identity']+'.json.gz')).unlink()
(folder/'work-filter.json').write_text(json.dumps(dict(schema=1,scope='Untrusted work estimate matching the existing explicit RUP checker charges, used only to conservatively retain original proofs when a smaller candidate increases replay work. CNF construction charge unchanged. Not wall-time, runtime performance or proof authority.',rows=out),indent=2)+'\n')
