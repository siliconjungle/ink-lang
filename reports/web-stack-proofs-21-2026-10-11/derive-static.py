"""Before-timing symmetric callback specialization from the same frozen subjects."""
import hashlib,json,sys,subprocess
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sys.path[:0]=[str(B/'knowledge'),str(B/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.beta_sharing17 import derive
from producers.beta_specialization15 import free_parameters
from producers.semantic_laws import law
from producers.web_predicate21_laws import named_laws as algebra,specialize as algebra_specialize
from producers.web_structure21_laws import named_laws as reduction,specialize as reduction_specialize
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
prep_path=R/'input-preparation/preparation.json';prep=json.loads(prep_path.read_text())
old=Store(prep['prior_overlay']);assert old.snapshot_id==prep['historical_snapshot']
out=B/'knowledge/research/web-stack-proofs-21/static-derivation';out.mkdir(parents=True,exist_ok=True)
if (out/'witnesses.json').exists():raise ValueError('immutable derivation exists')
oldgeneric=[]
for i in sorted(old.members()):
 obj=old.object(i);p=dict(obj['payload'],schema=1,semantics=obj['semantics'],dependencies=obj['dependencies'])
 if all(k in p for k in ['params','from','to','proof']) and isinstance(p['from'],dict) and 'node' in p['from']:
  assert identity(semantic_entry(p))==i
  oldgeneric.append(('prior_'+i,p))
oldrows=[];newrows=[];subjects=[]
def compose_old(subject):
 """Two checked old-only rewrite steps; bounded by target uniqueness, not timing."""
 rows=derive(subject,oldgeneric);first=list(rows);seen={identity(semantic_entry(v)) for _,v in rows};expanded=set();attempts=0
 # Derive emits a whole-function certificate for a single nested application.
 # Compose a second application so both independent consumers get equal prior
 # opportunities instead of comparing against only one improved branch.
 for name,a in first:
  marker=json.dumps(a['to'],sort_keys=True)
  if marker in expanded:continue
  if len(expanded)>=128:break
  expanded.add(marker)
  second_subject=dict(subject,functions={'old_intermediate':a['to']})
  for second_name,b in derive(second_subject,oldgeneric):
   attempts+=1
   if b['to']==a['from']:continue
   proof={'Trans':dict(middle=a['to'],left=a['proof'],right=b['proof'])}
   candidate=law(free_parameters(a['from']),a['from'],b['to'],proof,dependencies=sorted(set(a['dependencies'])|set(b['dependencies'])))
   oid=identity(semantic_entry(candidate))
   if oid not in seen:seen.add(oid);rows.append((name+'_old_second_'+second_name,candidate))
 return rows,dict(max_steps=2,max_first_targets=128,first_candidates=len(first),expanded_first_targets=len(expanded),second_candidates=attempts,total_unique_certificates=len(rows))
for row in prep['sources']:
 path=Path(row['input_subject']);assert sha(path)==row['input_subject_sha256'];subject=json.loads(path.read_text())
 a,search=compose_old(subject);n=algebra_specialize(subject)+reduction_specialize(subject)
 oldrows+=a;newrows+=n;subjects.append(dict(task=row['task'],subject=str(path),sha256=sha(path),old_candidates=len(a),old_composition_search=search,new_candidates=len(n)))
def unique(rows):return [dict(name=n+'_'+identity(semantic_entry(v)),law=v) for i,(n,v) in sorted({identity(semantic_entry(v)):(n,v) for n,v in rows}.items()) if i not in set(old.members())]
oldrows=unique(oldrows);newrows=unique(newrows)
assert not {identity(semantic_entry(r['law'])) for r in oldrows}&{identity(semantic_entry(r['law'])) for r in newrows}
baseobjects=[old.object(i) for i in sorted(old.members())];generic=[semantic_entry(v) for _,v in algebra()+reduction()]
objects=baseobjects+generic+[semantic_entry(r['law']) for r in oldrows+newrows]
stage=Store.publish(out/'stage',objects);stage.rebuild();view=out/'view.json';roots=[identity(semantic_entry(r['law'])) for r in oldrows+newrows]+[identity(x) for x in generic]
checks=[];accepted_old=[];accepted_new=[]
for role,rows in [('generic',[dict(name=n,law=v) for n,v in algebra()+reduction()]),('shared_old',oldrows),('new_composed',newrows)]:
 for row in rows:
  root=identity(semantic_entry(row['law']));view.write_bytes(canonical(stage.bundle([root]))+b'\n')
  command=[str(B.parent/'toolchain/ink-sequence-proofs'),'knowledge-check',prep['sources'][0]['input_core'],str(view)]
  r=subprocess.run(command,capture_output=True,text=True);checks.append(dict(role=role,name=row['name'],content_id=root,argv=command,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr))
  if role=='generic' and r.returncode:
   (out/'admission-root-failure.json').write_text(json.dumps(checks,indent=2)+'\n');raise RuntimeError(r.stderr)
  if not r.returncode and role=='shared_old':accepted_old.append(row)
  if not r.returncode and role=='new_composed':accepted_new.append(row)
old_attempts=oldrows;new_attempts=newrows;oldrows=accepted_old;newrows=accepted_new
roots=[identity(semantic_entry(r['law'])) for r in oldrows+newrows]+[identity(x) for x in generic]
view.write_bytes(canonical(stage.bundle(roots))+b'\n')
command=[str(B.parent/'toolchain/ink-sequence-proofs'),'knowledge-check',prep['sources'][0]['input_core'],str(view)]
r=subprocess.run(command,capture_output=True,text=True)
receipt=dict(argv=command,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr,individual_checks=checks,old_candidate_count=len(old_attempts),old_rejected=sum(x['role']=='shared_old' and x['exit_code']!=0 for x in checks),new_candidate_count=len(new_attempts),new_rejected=sum(x['role']=='new_composed' and x['exit_code']!=0 for x in checks))
(out/'admission.json').write_text(json.dumps(receipt,indent=2)+'\n')
if r.returncode:raise RuntimeError(r.stderr)
prior=Store.publish(old.root,baseobjects+[semantic_entry(r['law']) for r in oldrows]);prior.rebuild()
assert set(old.members())<=set(prior.members())
(prep_path.parent/'preparation-original.json').write_bytes(prep_path.read_bytes())
prep.update(effective_prior_snapshot=prior.snapshot_id,shared_old_witness_ids=[identity(semantic_entry(r['law'])) for r in oldrows],new_composed_witness_ids=[identity(semantic_entry(r['law'])) for r in newrows],scope='Same frozen inputs, unmodified historical1372 plus checked old-only sharing certificates in BOTH prior/current. New arbitrary callback laws and checked static bridges separately counted; no target/timing measurements used. Original input-preparation receipt retained.')
prep_path.write_text(json.dumps(prep,indent=2)+'\n')
data=dict(schema=1,status='checked',historical_snapshot=old.snapshot_id,effective_prior_snapshot=prior.snapshot_id,shared_old=oldrows,new_composed=newrows,generic_roots=len(generic),subjects=subjects,compiler_sha256=sha(B.parent/'toolchain/ink-sequence-proofs'),admission_sha256=sha(out/'admission.json'),scope='Known static callback bodies with universal runtime values; each bridge uses ordinary checked Normalize/Use. No trusted whitelist or matcher change. All old semantic laws afforded same sharing-derivation opportunity; new static extraction separately uses Normalize to check complete callback and source correlation.')
(out/'witnesses.json').write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps(dict(status='checked',old_semantic_candidates=len(oldgeneric),old_attempted=len(old_attempts),old_rejected=receipt['old_rejected'],new_attempted=receipt['new_candidate_count'],new_rejected=receipt['new_rejected'],shared_old_certificates=len(oldrows),new_static_certificates=len(newrows),generic_roots=len(generic),effective_prior_snapshot=prior.snapshot_id)))
