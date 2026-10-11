#!/usr/bin/env python3
"""Bounded checked symmetric old-only frontier and fresh source bridges.

No target builds/timing/canonical publication. Every generated candidate is
untrusted and checker-admitted before it expands the old-only frontier.
"""
import collections,copy,hashlib,json,subprocess,sys
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sys.path[:0]=[str(B/'knowledge'),str(B/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.beta_sharing17 import beta_share,derive
from producers.beta_specialization15 import free_parameters
from producers.semantic_laws import law
from producers import web_demand24_laws as guard
from types import SimpleNamespace
indexed=SimpleNamespace(named_laws=lambda:[],specialize=lambda s:[])
PIN='dfb31ef951db9bb8a7737208dec2514e8488ce35093342e37bad70dce80e007f'
COMPILER_HASH='45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda p:json.loads(Path(p).read_text())
MAX_STEPS=4;MAX_BODIES=128

def uses(v):
 if isinstance(v,dict):return ([v['Use']['law']] if 'Use' in v else [])+sum((uses(x) for x in v.values()),[])
 if isinstance(v,list):return sum((uses(x) for x in v),[])
 return []

def identifier(row):return identity(semantic_entry(row['law']))
def endpoint(row):return canonical([row['law']['from'],beta_share(row['law']['to'])])
def score(row):return len(uses(row['law']['proof'])),len(canonical(row['law'])),identifier(row)

def main():
 out=B/'knowledge/research/web-stack-proofs-24/static-derivation';out.mkdir(parents=True,exist_ok=True)
 if (out/'witnesses.json').exists():raise RuntimeError('immutable witnesses already exist')
 prep_path=R/'input-preparation/preparation.json';prep=read(prep_path);assert prep['historical_snapshot']==PIN
 compiler=B.parent/'toolchain/ink-sequence-proofs';assert sha(compiler)==COMPILER_HASH
 old=Store(B/'knowledge',B/'knowledge/store/snapshots'/f'{PIN}.json');before=set(old.members());assert len(before)==1688
 general_old=[dict(name=n,law=v,role='general_old_consequence') for n,v in getattr(guard,"old_composition_laws",lambda:[])()+getattr(indexed,"old_composition_laws",lambda:[])()]
 source_old=[dict(name=n,law=v,role='old_source_bridge') for n,v in getattr(guard,"old_source_laws",lambda:[])()+getattr(indexed,"old_source_laws",lambda:[])()]
 generic_new=[dict(name=n,law=v,role='fresh_generic') for n,v in guard.named_laws()+indexed.named_laws()]
 # Distinct mathematics versus application surfaces remains recorded explicitly.
 assert generic_new
 extra={identifier(r):semantic_entry(r['law']) for r in general_old+source_old+generic_new}
 all_admissions=[];aliases=[];bounds=[];generation=[];accepted={};object_cache=dict(extra)
 def closure(rows):
  objects={identifier(r):semantic_entry(r['law']) for r in rows}
  def add(i):
   if i not in objects:objects[i]=object_cache.get(i) or old.object(i)
   for dep in objects[i]['dependencies']:
    if dep not in objects:add(dep)
  for i in list(objects):add(i)
  object_cache.update(objects);return list(objects.values())
 def admit(row,stage,view,phase,steps=None):
  oid=identifier(row);bundle=stage.bundle([oid]);view.write_bytes(canonical(bundle)+b'\n');argv=list(map(str,[compiler,'knowledge-check',prep['sources'][0]['input_core'],view]));r=subprocess.run(argv,capture_output=True,text=True)
  receipt=dict(role=phase,name=row['name'],content_id=oid,source_applications=steps,proof_use_references=uses(row['law']['proof']),view_sha256=sha(view),loaded_object_ids=sorted(bundle['objects']),argv=argv,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr)
  if r.returncode:
   failed=out/'failures'/oid;failed.mkdir(parents=True,exist_ok=True);(failed/'candidate.json').write_text(json.dumps(row,indent=2)+'\n');(failed/'view.json').write_bytes(view.read_bytes());receipt['preserved_failure']=str(failed)
  all_admissions.append(receipt);return r.returncode==0
 def retain(row):
  key=endpoint(row);prior=accepted.get(key)
  if prior is None or score(row)<score(prior):
   if prior is not None:aliases.append(dict(discarded=identifier(prior),retained=identifier(row),reason='same normalized endpoints; lower proof-use/byte/id score'))
   accepted[key]=row;return True
  if identifier(row)!=identifier(prior):aliases.append(dict(discarded=identifier(row),retained=identifier(prior),reason='same normalized endpoints; higher proof-use/byte/id score'))
  return False
 # Seed old-only consequences supplied independently, admitting each again.
 seed=general_old+source_old;stage=Store.publish(out/'seed-stage',closure(seed+generic_new));view=out/'current-view.json'
 for row in seed+generic_new:
  assert admit(row,stage,view,row['role']),row['name']
 for row in seed:
  assert set(row['law']['dependencies'])<=before|{identifier(r) for r in seed}
  assert set(uses(row['law']['proof']))<=before|{identifier(r) for r in seed}
  if identifier(row) not in before:retain(row)
 oldgeneric=[]
 for i in sorted(before):
  obj=old.object(i);p=dict(obj['payload'],schema=1,semantics=obj['semantics'],dependencies=obj['dependencies'])
  if all(k in p for k in ('params','from','to','proof')) and isinstance(p['from'],dict) and 'node' in p['from']:
   assert identity(semantic_entry(p))==i;oldgeneric.append(('prior_'+i,p))
 oldgeneric_count=len(oldgeneric)
 oldgeneric += [(r['name'],r['law']) for r in general_old]
 allowed_old=before|{identifier(r) for r in seed};subjects={};newrows=[]
 for prepared in prep['sources']:
  p=Path(prepared['input_subject']);assert sha(p)==prepared['input_subject_sha256'];s=read(p);assert list(s['functions'])==[prepared['task']];subjects[prepared['task']]=s
  for n,v in guard.specialize(s)+indexed.specialize(s):
   row=dict(name=n,law=v,role='fresh_source_bridge')
   newrows.append(row)
 assert newrows
 # Breadth-first complete admitted frontier, never expanding rejected candidates.
 frontier={task:[dict(name='source_identity',law=law(free_parameters(s['functions'][task]),s['functions'][task],s['functions'][task]),steps=0)] for task,s in subjects.items()}
 for task,s in subjects.items():
  for row in source_old:
   if row['law']['from']==s['functions'][task]:frontier[task].append(dict(row,task=task,steps=1))
 expanded=collections.defaultdict(set)
 for depth in range(MAX_STEPS):
  candidates={};source_records=[]
  for task in sorted(frontier):
   for row in sorted(frontier[task],key=identifier):
    marker=canonical(beta_share(row['law']['to']))
    if marker in expanded[task]:continue
    if len(expanded[task])>=MAX_BODIES:bounds.append(dict(task=task,depth=depth,status='intermediate body limit reached',expanded=len(expanded[task])));continue
    expanded[task].add(marker);subject=dict(subjects[task],functions={task:row['law']['to']});derived=derive(subject,oldgeneric);source_records.append(dict(task=task,parent=identifier(row),parent_steps=row['steps'],candidates=len(derived)))
    for name,b in derived:
     steps=row['steps']+int(bool(uses(b['proof'])))
     if steps>MAX_STEPS:
      bounds.append(dict(task=task,depth=depth,status='source application bound reached',parent_steps=row['steps']));continue
     if b['to']==subjects[task]['functions'][task]:continue
     if row['steps']==0:v=b
     else:v=law(free_parameters(row['law']['from']),row['law']['from'],b['to'],{'Trans':dict(middle=row['law']['to'],left=row['law']['proof'],right=b['proof'])},dependencies=sorted(set(row['law']['dependencies'])|set(b['dependencies'])))
     assert set(v['dependencies'])<=allowed_old and set(uses(v['proof']))<=allowed_old
     candidate=dict(name=task+'_old_checked_'+str(steps)+'_'+identity(semantic_entry(v)),law=v,role='shared_old_frontier',task=task,steps=steps)
     if endpoint(candidate) not in accepted:candidates[identifier(candidate)]=candidate
     else:retain(candidate)
  generation.append(dict(round=depth+1,sources=source_records,candidates=[dict(content_id=i,**r) for i,r in sorted(candidates.items())]))
  (out/'generation.json').write_text(json.dumps(generation,indent=2)+'\n')
  if not candidates:break
  stage=Store.publish(out/f'frontier-{depth+1}',closure(list(candidates.values())));next_frontier=collections.defaultdict(list)
  for i,row in sorted(candidates.items()):
   if admit(row,stage,view,'shared_old_frontier',row['steps']):
    retain(row);next_frontier[row['task']].append(row);allowed_old.add(i)
  (out/'admission-checks.json').write_text(json.dumps(all_admissions,indent=2)+'\n');frontier=next_frontier
  print(json.dumps(dict(round=depth+1,candidates=len(candidates),accepted=sum(len(v) for v in frontier.values()),retained_shared=len(accepted),expanded={k:len(v) for k,v in expanded.items()})),flush=True)
 shared=sorted(accepted.values(),key=identifier)
 newrows=[dict(r,name=r['name']+'_'+identifier(r)) for r in newrows]
 # Validate complete final union with all selected dependencies available.
 stage=Store.publish(out/'final-stage',closure(shared+generic_new+newrows));roots=[identifier(r) for r in shared+generic_new+newrows];view=out/'view.json';view.write_bytes(canonical(stage.bundle(roots))+b'\n');argv=list(map(str,[compiler,'knowledge-check',prep['sources'][0]['input_core'],view]));r=subprocess.run(argv,capture_output=True,text=True)
 receipt=dict(argv=argv,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr,individual_checks=all_admissions,endpoint_aliases=aliases,old_composition_bounds=dict(max_source_applications=MAX_STEPS,max_expanded_bodies_per_task=MAX_BODIES,expanded={k:len(v) for k,v in expanded.items()},events=bounds),generic_ids=[identifier(x) for x in generic_new],new_static_ids=[identifier(x) for x in newrows],shared_old_ids=[identifier(x) for x in shared]);(out/'admission.json').write_text(json.dumps(receipt,indent=2)+'\n');assert r.returncode==0,r.stderr
 # Effective prior is a local research overlay; canonical store is untouched.
 overlay=Store.publish(Path(prep['prior_overlay']),[old.object(i) for i in sorted(before)]+[semantic_entry(x['law']) for x in shared]);overlay.rebuild();assert set(overlay.members())==before|{identifier(x) for x in shared}
 saved=prep_path.parent/'preparation-before-fair.json';assert not saved.exists();saved.write_bytes(prep_path.read_bytes());prep.update(effective_prior_snapshot=overlay.snapshot_id,shared_old_witness_ids=[identifier(x) for x in shared],new_composed_witness_ids=[identifier(x) for x in newrows],scope='Same frozen subjects and immutable1688 plus checked old-only consequences/bridges/frontier up to4 source applications and128 expanded bodies per task, identically available prior/current. Fresh/reference roles depend on actual selected bodies under the symmetric static opportunities. No timing/backend/policy changes.');prep_path.write_text(json.dumps(prep,indent=2)+'\n')
 witnesses=dict(schema=1,status='checked',historical_snapshot=PIN,effective_prior_snapshot=overlay.snapshot_id,effective_prior_entries=len(overlay.members()),shared_old=shared,new_composed=newrows,generic_roots=generic_new,subjects=[dict(task=t,subject=str(Path(next(v['input_subject'] for v in prep['sources'] if v['task']==t))),sha256=next(v['input_subject_sha256'] for v in prep['sources'] if v['task']==t)) for t in subjects],old_semantic_laws=oldgeneric_count,extra_old_general_consequences=len(general_old),compiler_sha256=COMPILER_HASH,admission_sha256=sha(out/'admission.json'),helper_sha256=sha(Path(__file__)),old_composition_bounds=receipt['old_composition_bounds'],scope=prep['scope']);(out/'witnesses.json').write_text(json.dumps(witnesses,indent=2)+'\n')
 print(json.dumps(dict(status='checked',shared_old=len(shared),new_static=len(newrows),new_generic=len(generic_new),effective_prior_entries=len(overlay.members()),effective_prior_snapshot=overlay.snapshot_id,rejected=sum(c['exit_code']!=0 for c in all_admissions),witnesses_sha256=sha(out/'witnesses.json'))),flush=True)
if __name__=='__main__':main()
