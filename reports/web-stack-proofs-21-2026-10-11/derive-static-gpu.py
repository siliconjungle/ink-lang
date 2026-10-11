"""Admit composed GPU-facing certificates before publication or measurements."""
import json,hashlib,subprocess,sys
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sys.path[:0]=[str(B/'knowledge'),str(B/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.web_predicate21_laws import named_laws as predicate
from producers.web_structure21_laws import named_laws as structure
from producers.web_gpu21_laws import named_laws as gpu,specialize
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
prep_path=R/'input-preparation/preparation.json';prep=json.loads(prep_path.read_text());old=Store(prep['prior_overlay'])
assert old.snapshot_id==prep['effective_prior_snapshot']
reviewed=B/'knowledge/research/web-stack-proofs-21/static-derivation-reviewed/witnesses.json';base=json.loads(reviewed.read_text())
out=B/'knowledge/research/web-stack-proofs-21/static-gpu';out.mkdir(parents=True,exist_ok=True)
assert not (out/'witnesses.json').exists()
rows=[];subjects=[]
for s in prep['sources']:
 p=Path(s['input_subject']);assert sha(p)==s['input_subject_sha256']
 found=specialize(json.loads(p.read_text()));rows += [dict(name=n+'_'+identity(semantic_entry(v)),law=v) for n,v in found];subjects.append(dict(task=s['task'],candidates=len(found),subject_sha256=sha(p)))
assert len(rows)==6
allgeneric=predicate()+structure()+gpu()
objects=[old.object(i) for i in sorted(old.members())]+[semantic_entry(v) for _,v in allgeneric]+[semantic_entry(r['law']) for r in base['new_composed']+rows]
stage=Store.publish(out/'stage',objects);stage.rebuild();view=out/'view.json';checks=[]
for role,items in [('composed_generic',[dict(name=n,law=v) for n,v in gpu()]),('new_composed',rows)]:
 for row in items:
  oid=identity(semantic_entry(row['law']));view.write_bytes(canonical(stage.bundle([oid]))+b'\n');argv=[str(B.parent/'toolchain/ink-sequence-proofs'),'knowledge-check',prep['sources'][0]['input_core'],str(view)]
  r=subprocess.run(argv,capture_output=True,text=True);checks.append(dict(role=role,name=row['name'],content_id=oid,argv=argv,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr))
  if r.returncode:(out/'admission-failure.json').write_text(json.dumps(checks,indent=2)+'\n');raise RuntimeError(r.stderr)
roots=[identity(semantic_entry(v)) for _,v in allgeneric]+[identity(semantic_entry(r['law'])) for r in base['shared_old']+base['new_composed']+rows]
view.write_bytes(canonical(stage.bundle(roots))+b'\n');argv=[str(B.parent/'toolchain/ink-sequence-proofs'),'knowledge-check',prep['sources'][0]['input_core'],str(view)];r=subprocess.run(argv,capture_output=True,text=True)
receipt=dict(status='passed' if not r.returncode else 'failed',argv=argv,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr,individual_checks=checks)
(out/'admission.json').write_text(json.dumps(receipt,indent=2)+'\n');assert not r.returncode
(out/'witnesses.json').write_text(json.dumps(dict(status='checked',new_composed=rows,subjects=subjects,generic_compositions=9,static_certificates=6,effective_prior_snapshot=old.snapshot_id,reviewed_base_sha256=sha(reviewed),compiler_sha256=sha(B.parent/'toolchain/ink-sequence-proofs'),admission_sha256=sha(out/'admission.json'),scope='Checked equivalent parallel-total deployment candidates; quot_or is unsupported by frozen scalar GPU shader emission. These certificates establish equality, not GPU eligibility or profitability.'),indent=2)+'\n')
(prep_path.parent/'preparation-before-gpu.json').write_bytes(prep_path.read_bytes());prep['new_gpu_composed_witness_ids']=[identity(semantic_entry(r['law'])) for r in rows];prep_path.write_text(json.dumps(prep,indent=2)+'\n')
print(json.dumps(dict(status='checked',generic_compositions=9,static_certificates=6,current_entries=len(stage.members()),prior_entries=len(old.members()))))
