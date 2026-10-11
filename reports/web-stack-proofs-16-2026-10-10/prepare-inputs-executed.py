"""Untimed callback certificates with identical old support on both sides."""
import copy,hashlib,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner'),str(ROOT/'bench/web-stack-proofs-16'),str(ROOT/'bench')]
from ink_knowledge import Store,identity,semantic_entry
from producers.beta_specialization15 import derive
from producers.web_fold16_laws import named_laws as folds
from producers.web_reduction16_laws import named_laws as weights,specialize
from compact_selection16 import plan
from spec import TASKS,source
COMPILER=ROOT.parent/'toolchain/ink-sequence-proofs'
PRIOR='57bbee1835725fd3af939cf11e3dda25ac51e12001fde0f006aeb64bb9ab2378'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
 out=HERE/'input-preparation';out.mkdir(exist_ok=True)
 if (out/'preparation.json').exists():raise ValueError('immutable inputs already prepared')
 original=Store(ROOT/'knowledge',ROOT/f'knowledge/store/snapshots/{PRIOR}.json')
 old_named=[('old_'+i,dict(schema=1,semantics=e['semantics'],dependencies=e['dependencies'],**e['payload'])) for i in sorted(original.members()) if (e:=original.object(i))['kind']=='rewrite' and e['semantics']=='ink-conditional-laws-v1']
 generic=folds()+weights();shared={};new={};sources=[];commands=[]
 def run(argv):
  r=subprocess.run(list(map(str,argv)),capture_output=True,text=True,cwd=ROOT);commands.append(dict(command=list(map(str,argv)),exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr))
  if r.returncode:raise RuntimeError(r.stderr)
  return r.stdout
 for t in TASKS:
  name=t['name'];folder=out/name;folder.mkdir(exist_ok=True);src=folder/'source.ink';src.write_text('module Recipe16;\n'+source(t)+'\n');core=folder/'input.core.json'
  old_core=ROOT/'reports/web-stack-proofs-15-2026-10-10/tasks'/name/'core.json'
  if old_core.exists():core.write_bytes(old_core.read_bytes())
  else:run([COMPILER,'emit-core',src,'-o',core])
  sp=folder/'input.semantic.json';run([COMPILER,'emit-semantic',core,'--core','-o',sp]);subject=json.loads(sp.read_text())
  rows=derive(subject,folds())
  if (t.get('generic_family') or '').startswith(('shared_contribution','masked_contribution')):
   alias=copy.deepcopy(subject);body=alias['functions'].pop(name);alias['functions']={t['generic_family']:body}
   rows+=specialize(alias)
  for n,v in rows:
   i=identity(semantic_entry(v))
   if i not in original.members():new[i]=dict(name='round16_'+name+'_'+n,law=v)
  # Old-only compositions are admitted independently on the old snapshot.
  # Include targets of new proofs too: their old-only simplification is shared.
  queue=[subject]+[dict(subject,functions={name:v['to']}) for _,v in rows];seen=set();expansions=0
  while queue:
   sub=queue.pop(0);key=json.dumps(sub['functions'],sort_keys=True)
   if key in seen:continue
   seen.add(key);expansions+=1
   if expansions>128:raise ValueError('bounded specialization closure exhausted '+name)
   for n,v in derive(sub,old_named):
    i=identity(semantic_entry(v))
    if i not in original.members():shared[i]=dict(name='round16_old_'+name+'_'+n,law=v)
    queue.append(dict(subject,functions={name:v['to']}))
  sources.append(dict(task=name,cohort=t['cohort'],input_core=str(core),input_core_sha256=sha(core),input_subject=str(sp),input_subject_sha256=sha(sp),exact_round15_core=old_core.exists(),specialization_subjects=expansions))
  print(json.dumps(dict(task=name,shared=len(shared),new=len(new))),flush=True)
 new={i:r for i,r in new.items() if i not in shared}
 objects={i:original.object(i) for i in original.members()}
 for i,r in shared.items():objects[i]=semantic_entry(r['law'])
 overlay=Store.publish(out/'prior-overlay',list(objects.values()));overlay.rebuild()
 for label,rows in [('old-witnesses',shared),('new-witnesses',new)]:
  (out/f'{label}.json').write_text(json.dumps(dict(schema=1,laws=[rows[i] for i in sorted(rows)],ids=sorted(rows)),indent=2)+'\n')
 if shared:
  view=out/'old-specialization-view.json';view.write_text(json.dumps(overlay.bundle(sorted(shared)),separators=(',',':'))+'\n');run([COMPILER,'knowledge-check',sources[0]['input_core'],view])
 receipt=dict(status='passed',historical_snapshot=PRIOR,effective_prior_snapshot=overlay.snapshot_id,prior_overlay=str(overlay.root),shared_old_witness_ids=sorted(shared),new_composed_witness_ids=sorted(new),sources=sources,old_generic_laws=len(old_named),new_generic_laws=len(generic),compiler_sha256=sha(COMPILER),cost_model_sha256=sha(HERE/'cpu-cost-model.json'),commands=commands,scope='Only old dependencies in shared certificates; same CPU cost model. New callbacks remain static, lists/scalars universally quantified. No timing or target build.')
 (out/'preparation.json').write_text(json.dumps(receipt,indent=2)+'\n')
 for label in ['old-witnesses','new-witnesses']:
  data=out/f'{label}.json';producer=ROOT/'knowledge/producers'/('cpu_specialization16_'+label.replace('-','_')+'.py')
  producer.write_text('import json\nfrom ink_knowledge import identity,semantic_entry\nfrom pathlib import Path\ndef named_laws():\n data=Path(__file__).resolve().parents[2]/'+repr(str(data.relative_to(ROOT)))+'\n return [(r["name"]+"_"+identity(semantic_entry(r["law"])),r["law"]) for r in json.loads(data.read_text())["laws"]]\n')
 print(json.dumps(dict(status='passed',shared=len(shared),new=len(new),sources=len(sources))),flush=True)
if __name__=='__main__':main()
