"""Untimed checked input/prior/specialization preparation; never a benchmark run."""
import argparse,hashlib,json,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner'),str(Path(__file__).resolve().parent)]
from spec import TASKS,source
from ink_knowledge import Store,identity,semantic_entry
from producers.beta_specialization15 import derive
from producers.web_predicated15_laws import named_laws as predicated
from producers.web_reduction15_laws import named_laws as reduction
PRIOR='0510381225f45dc33922b2ead3794abd79c190bc3b3cbc34ce41d50e959ed8b1'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,default=ROOT.parent/'toolchain/ink-sequence-proofs');p.add_argument('--output',type=Path,default=ROOT/'reports/web-stack-proofs-15-2026-10-10/input-preparation');p.add_argument('--cost-model',type=Path,default=ROOT/'reports/web-stack-proofs-15-2026-10-10/aggregate-cost-model.json');p.add_argument('--reuse-existing',action='store_true');a=p.parse_args();out=a.output.resolve()
 if (out/'preparation.json').exists():raise ValueError('immutable prepared inputs exist')
 out.mkdir(parents=True,exist_ok=True);compiler=a.compiler.resolve();compiler_hash=sha(compiler);commands=[]
 def run(argv):
  argv=list(map(str,argv));r=subprocess.run(argv,cwd=ROOT,capture_output=True,text=True);commands.append(dict(argv=argv,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr));(out/'command-log.json').write_text(json.dumps(commands,indent=2)+'\n')
  if r.returncode:raise RuntimeError(r.stderr+'\n'+str(argv))
  return r.stdout
 original=Store(ROOT/'knowledge',ROOT/f'knowledge/store/snapshots/{PRIOR}.json')
 old=Store.publish(out/'historical-store',[original.object(i) for i in sorted(original.members())]);old.rebuild()
 assert old.snapshot_id==PRIOR
 old_named=[]
 for i in sorted(old.members()):
  e=old.object(i)
  if e['kind']=='rewrite' and e['semantics']=='ink-conditional-laws-v1':
   law=dict(schema=1,semantics=e['semantics'],dependencies=e['dependencies'],**e['payload']);assert identity(semantic_entry(law))==i
   old_named.append(('old_'+i,law))
 shared={};composed={};sources=[];generic=predicated()+reduction()
 for index,t in enumerate(TASKS):
  name=t['name'];folder=out/name;folder.mkdir(exist_ok=True);core=folder/'input.core.json';src=folder/'source.ink';src.write_text('module Recipe15;\n'+source(t)+'\n')
  provenance=None
  if t['cohort']=='anchor':
   origin=ROOT/f'reports/web-stack-proofs-14-2026-10-10/tasks/{t["original_name"]}/checked-selected.core.json'
   raw=origin.read_bytes();archived=folder/'round14-exact.core.json';archived.write_bytes(raw);package=json.loads(raw);oldfn=package['program']['functions'][0];body=json.loads(json.dumps(oldfn['body']));params=json.loads(json.dumps(oldfn['params']));oldfn['name']=name;core.write_text(json.dumps(package,separators=(',',':'))+'\n');assert oldfn['body']==body and oldfn['params']==params
   provenance=dict(original_path=str(origin),original_sha256=sha(origin),archived_path=str(archived),export_name_before=t['original_name'],export_name_after=name,body_and_params_identical=True)
  else:
   if not a.reuse_existing:run([compiler,'emit-core',src,'-o',core])
   elif not core.exists():raise ValueError('missing reusable core')
  subject=folder/'input.semantic.json'
  if not a.reuse_existing:run([compiler,'emit-semantic',core,'--core','-o',subject])
  semantic=json.loads(subject.read_text())
  selected=folder/'historical-selection.json'
  if not a.reuse_existing:run([sys.executable,ROOT/'planner/plan.py','--compiler',compiler,'--core',core,'--knowledge-root',old.root,'--snapshot',old.data/'snapshot.json','--cost-model',a.cost_model.resolve(),'--budget',4096,'-o',selected])
  if not a.reuse_existing:
   check=json.loads(run([compiler,'check-selection',core,selected]));(folder/'historical-selection-check.json').write_text(json.dumps(check,indent=2)+'\n')
  else:check=json.loads((folder/'historical-selection-check.json').read_text())
  selected_core=folder/'historical-selected.core.json';selected_subject=folder/'historical-selected.semantic.json'
  if not a.reuse_existing:
   run([compiler,'emit-core',core,'--core','--selection',selected,'-o',selected_core]);run([compiler,'emit-semantic',selected_core,'--core','-o',selected_subject])
  for label,rows in [('old-composed',derive(semantic,old_named)),('old-selected-normalize',derive(json.loads(selected_subject.read_text()),[]))]:
   for n,v in rows:
    e=semantic_entry(v);ident=identity(e)
    if ident not in old.members():shared[ident]=dict(name=f'input{index}_{label}_{n}',law=v)
  for n,v in derive(semantic,generic):
   e=semantic_entry(v);ident=identity(e)
   if ident not in old.members():composed[ident]=dict(name=f'input{index}_new_{n}',law=v)
  sources.append(dict(task=name,cohort=t['cohort'],input_core=str(core),input_core_sha256=sha(core),input_subject=str(subject),input_subject_sha256=sha(subject),prior_selection=str(selected),prior_selection_sha256=sha(selected),prior_selected_core=str(selected_core),prior_selected_core_sha256=sha(selected_core),prior_applications=len(json.loads(selected.read_text())['applications']),anchor_provenance=provenance))
  print(json.dumps(dict(task=name,shared_so_far=len(shared),new_composed_so_far=len(composed))),flush=True)
 composed={i:r for i,r in composed.items() if i not in shared}
 objects={i:old.object(i) for i in old.members()}
 for i,row in shared.items():objects[i]=semantic_entry(row['law'])
 overlay=Store.publish(out/'prior-overlay',list(objects.values()));overlay.rebuild()
 view=out/'old-specialization-view.json';view.write_text(json.dumps(overlay.bundle(sorted(shared)),indent=2)+'\n')
 if shared:run([compiler,'knowledge-check',sources[0]['input_core'],view])
 for label,rows in [('old-witnesses',shared),('new-witnesses',composed)]:
  (out/f'{label}.json').write_text(json.dumps(dict(schema=1,laws=[rows[i] for i in sorted(rows)],ids=sorted(rows),scope='Capture-safe known-callback specialization with Normalize or checked old/new theorem composition. Static callback bodies specialized; runtime scalar/list parameters remain universal.'),indent=2)+'\n')
 receipt=dict(status='passed',historical_snapshot=PRIOR,effective_prior_snapshot=overlay.snapshot_id,prior_overlay=str(overlay.root),shared_old_witness_ids=sorted(shared),new_composed_witness_ids=sorted(composed),sources=sources,old_generic_laws=len(old_named),new_generic_laws=len(generic),compiler_sha256=compiler_hash,cost_model_sha256=sha(a.cost_model),helper_sha256=sha(ROOT/'knowledge/producers/beta_specialization15.py'),commands=commands,reused_existing_inputs_and_plans=a.reuse_existing,scope='No benchmark timings or target builds; original and selected historical subjects use same preset external cost model. Both catalogues receive old-only specialization witnesses; only current receives new generic/composed witnesses. Anchors preserve exact round14 checked body/params with an export-only alias.')
 assert sha(compiler)==compiler_hash
 (out/'preparation.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:receipt[k] for k in ['status','historical_snapshot','effective_prior_snapshot','old_generic_laws','new_generic_laws']}),flush=True)
if __name__=='__main__':main()
