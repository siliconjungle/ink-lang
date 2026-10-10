"""Checked old-only continuation; no target/task whitelist or timing input."""
import collections,copy,hashlib,json,subprocess,sys
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sys.path[:0]=[str(B/'knowledge'),str(B/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.beta_sharing17 import beta_share,derive
from producers.beta_specialization15 import free_parameters
from producers.semantic_laws import law

sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda p:json.loads(Path(p).read_text())
origin=B/'knowledge/research/web-stack-proofs-21/static-derivation'
out=B/'knowledge/research/web-stack-proofs-21/static-derivation-reviewed';out.mkdir(parents=True,exist_ok=True)
if (out/'witnesses.json').exists():raise RuntimeError('immutable reviewed witnesses already exist')
w=read(origin/'witnesses.json');initial=read(origin/'admission.json');prep_path=R/'input-preparation/preparation.json';prep=read(prep_path)
assert w['historical_snapshot']==prep['historical_snapshot']=='1846f49f86f1451f7e4a21406ff48327691563f0bb36787925439d348c41da91'
old=Store(B/'knowledge',B/'knowledge/store/snapshots'/f"{w['historical_snapshot']}.json");before=set(old.members());assert len(before)==1372
compiler=B.parent/'toolchain/ink-sequence-proofs';assert sha(compiler)==w['compiler_sha256']
oldgeneric=[]
for oid in sorted(before):
 obj=old.object(oid);p=dict(obj['payload'],schema=1,semantics=obj['semantics'],dependencies=obj['dependencies'])
 if all(k in p for k in ['params','from','to','proof']) and isinstance(p['from'],dict) and 'node' in p['from']:
  assert identity(semantic_entry(p))==oid;oldgeneric.append(('prior_'+oid,p))
assert len(oldgeneric)==813


def use_ids(v):
 if isinstance(v,dict):return ([v['Use']['law']] if 'Use'in v else [])+sum((use_ids(x) for x in v.values()),[])
 if isinstance(v,list):return sum((use_ids(x) for x in v),[])
 return []


def endpoint(l):return canonical([l['from'],beta_share(l['to'])])


def oid(row):return identity(semantic_entry(row['law']))


def prior_only(l):
 assert set(l['dependencies'])<=before
 assert set(use_ids(l['proof']))<=set(l['dependencies'])<=before


def stage(folder,rows):
 objects={identity(semantic_entry(r['law'])):semantic_entry(r['law']) for r in rows}
 def add(i):
  if i not in objects:objects[i]=old.object(i)
  for dep in objects[i]['dependencies']:
   if dep not in objects:add(dep)
 for i in list(objects):add(i)
 st=Store.publish(folder,list(objects.values()))
 return st

initial_checks={c['content_id']:c for c in initial['individual_checks'] if c['role']=='shared_old' and c['exit_code']==0}
accepted={};dedup_initial=[]
for row in w['shared_old']:
 prior_only(row['law']);assert oid(row) in initial_checks
 key=endpoint(row['law']);previous=accepted.get(key)
 if previous is None or (len(use_ids(row['law']['proof'])),len(canonical(row['law'])),oid(row))<(len(use_ids(previous['law']['proof'])),len(canonical(previous['law'])),oid(previous)):
  if previous is not None:dedup_initial.append(oid(previous))
  accepted[key]=row
 else:dedup_initial.append(oid(row))
subjects={};task_for_source={}
for row in w['subjects']:
 path=Path(row['subject']);assert sha(path)==row['sha256'];subject=read(path);assert list(subject['functions'])==[row['task']]
 subjects[row['task']]=subject;task_for_source[canonical(subject['functions'][row['task']])]=row['task']
for row in accepted.values():assert canonical(row['law']['from']) in task_for_source
frontier=list(accepted.values());expanded=collections.defaultdict(set);attempts=[];bounds=[];new_admitted=[];normalizer_limit=128
for continuation_round in (1,2):
 candidates={};sources=[]
 for row in sorted(frontier,key=oid):
  a=row['law'];task=task_for_source[canonical(a['from'])];marker=canonical(beta_share(a['to']));depth=len(use_ids(a['proof']))
  if marker in expanded[task] or depth>=4:continue
  if len(expanded[task])>=normalizer_limit:
   bounds.append(dict(task=task,round=continuation_round,status='intermediate body budget reached',expanded=len(expanded[task])));continue
  expanded[task].add(marker);subject=dict(subjects[task],functions={task:a['to']});derived=derive(subject,oldgeneric);sources.append(dict(task=task,parent_id=oid(row),prior_applications=depth,candidates=len(derived)))
  for name,b in derived:
   extra=len(use_ids(b['proof']))
   if extra>1 or depth+extra>4:raise AssertionError('unexpected derivation application depth')
   if b['to']==a['from']:continue
   proof={'Trans':dict(middle=a['to'],left=a['proof'],right=b['proof'])}
   candidate=law(free_parameters(a['from']),a['from'],b['to'],proof,dependencies=sorted(set(a['dependencies'])|set(b['dependencies'])))
   prior_only(candidate);key=endpoint(candidate)
   if key in accepted:continue
   new=dict(name=task+'_old_continuation_'+str(depth+extra)+'_'+identity(semantic_entry(candidate)),law=candidate)
   candidates[oid(new)]=new
 print(json.dumps(dict(phase='generated',round=continuation_round,candidates=len(candidates),expanded_tasks={k:len(v) for k,v in expanded.items()})),flush=True)
 rounddir=out/f'round-{continuation_round}';rounddir.mkdir(exist_ok=True);st=stage(rounddir/'stage',list(accepted.values())+list(candidates.values()));views=rounddir/'views';views.mkdir(exist_ok=True);fresh=[]
 for i,row in sorted(candidates.items()):
  if endpoint(row['law']) in accepted:continue
  view=views/(i+'.json');view.write_bytes(canonical(st.bundle([i]))+b'\n');argv=[str(compiler),'knowledge-check',prep['sources'][0]['input_core'],str(view)];r=subprocess.run(argv,capture_output=True,text=True)
  attempts.append(dict(role='shared_old_continuation',round=continuation_round,name=row['name'],content_id=i,applications=len(use_ids(row['law']['proof'])),view=str(view),view_sha256=sha(view),argv=argv,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr))
  if not r.returncode:accepted[endpoint(row['law'])]=row;fresh.append(row);new_admitted.append(i)
 (rounddir/'generation.json').write_text(json.dumps(dict(sources=sources,candidates=[dict(content_id=i,**row) for i,row in sorted(candidates.items())],accepted=[oid(row) for row in fresh]),indent=2)+'\n')
 (out/'continuation-checks.json').write_text(json.dumps(attempts,indent=2)+'\n');frontier=fresh
 print(json.dumps(dict(phase='checked',round=continuation_round,accepted=len(fresh),rejected=sum(x['round']==continuation_round and x['exit_code']!=0 for x in attempts),retained_old_total=len(accepted))),flush=True)

oldrows=sorted(accepted.values(),key=oid)
# Preserve all unchanged generic/source instances and validate the final union.
generic=[]
for name in ['web_predicate21_laws','web_structure21_laws']:
 import importlib
 generic += [dict(name=n,law=l) for n,l in importlib.import_module('producers.'+name).named_laws()]
assert len(generic)==33 and len(w['new_composed'])==12
allrows=oldrows+generic+w['new_composed'];st=stage(out/'final-stage',allrows);roots=[oid(row) for row in allrows];view=out/'view.json';view.write_bytes(canonical(st.bundle(roots))+b'\n');argv=[str(compiler),'knowledge-check',prep['sources'][0]['input_core'],str(view)];r=subprocess.run(argv,capture_output=True,text=True)
receipt=dict(argv=argv,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr,individual_checks=initial['individual_checks']+attempts,initial_admission=str(origin/'admission.json'),initial_admission_sha256=sha(origin/'admission.json'),continuation_candidate_count=len(attempts),continuation_rejected=sum(x['exit_code']!=0 for x in attempts),retained_old_count=len(oldrows),retained_root_ids=roots,admitted_continuation_ids=new_admitted,initial_endpoint_deduplicated_ids=dedup_initial,old_composition_bounds=dict(max_total_applications=4,max_continuation_rounds=2,max_expanded_bodies_per_task=128,expanded={k:len(v) for k,v in expanded.items()},budget_events=bounds),generic_ids=[oid(x) for x in generic],new_static_ids=[oid(x) for x in w['new_composed']])
(out/'admission.json').write_text(json.dumps(receipt,indent=2)+'\n')
if r.returncode:raise RuntimeError(r.stderr)
base=[old.object(i) for i in sorted(before)];overlay=Store.publish(Path(prep['prior_overlay']),base+[semantic_entry(row['law']) for row in oldrows]);overlay.rebuild();assert set(overlay.members())==before|{oid(x) for x in oldrows}
saved=prep_path.parent/'preparation-2step.json';assert not saved.exists();saved.write_bytes(prep_path.read_bytes());prep.update(effective_prior_snapshot=overlay.snapshot_id,shared_old_witness_ids=[oid(x) for x in oldrows],scope='Same frozen subjects and old1372 only, independently checked continuation up to4 old applications/128 intermediate bodies per task, shared identically in prior/current. Original2step receipts retained; no timing or policy input.');prep_path.write_text(json.dumps(prep,indent=2)+'\n')
reviewed=dict(w,shared_old=oldrows,effective_prior_snapshot=overlay.snapshot_id,admission_sha256=sha(out/'admission.json'),original_two_step_witnesses=str(origin/'witnesses.json'),original_two_step_witnesses_sha256=sha(origin/'witnesses.json'),continuation_helper=str(Path(__file__)),continuation_helper_sha256=sha(Path(__file__)),old_composition_bounds=receipt['old_composition_bounds'],scope='Checked old-only continuation with explicit finite compile-time search bounds. All proof Use references and dependencies belong to immutable1372. No theorem/task whitelist, timing input or trusted core rule. Original33generic and12newstatic objects unchanged; old certificates are not new mechanisms.')
(out/'witnesses.json').write_text(json.dumps(reviewed,indent=2)+'\n')
print(json.dumps(dict(status='checked',retained_old_certificates=len(oldrows),effective_prior_entries=len(overlay.members()),effective_prior_snapshot=overlay.snapshot_id,continuation_attempts=len(attempts),continuation_rejected=receipt['continuation_rejected'],generic_unchanged=33,new_static_unchanged=12,expected_current_entries=len(overlay.members())+45,witnesses_sha256=sha(out/'witnesses.json'))),flush=True)
