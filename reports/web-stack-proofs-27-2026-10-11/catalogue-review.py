#!/usr/bin/env python3
"""Independent read-only R27 identities, fair closure and factorial catalogue audit."""
import argparse,collections,hashlib,importlib,json,sqlite3,sys
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sys.path[:0]=[str(B/'knowledge'),str(B/'planner')]
from ink_knowledge import Store,identity,semantic_entry
from producers import web_zip27_laws as demand,web_static27_laws as static
PIN='a2a756dc7174ab62c2806e09dd0e3769e507f4ed5e455d687346c544cd788abd'
OLD_COMPILER='719fd6ff95ea7cd600d7f4078677b46c46fdd545ef2b21ae5643ca5eba085787'
PRIOR_OBSERVATIONS=17026
read=lambda p:json.loads(Path(p).read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
encoded=lambda v:json.dumps(v,separators=(',',':')).encode()+b'\n'
def use_ids(v):
 if isinstance(v,dict):return ([v['Use']['law']] if 'Use' in v else [])+sum((use_ids(x) for x in v.values()),[])
 if isinstance(v,list):return sum((use_ids(x) for x in v),[])
 return []
def closure(objects,roots):
 seen=set()
 def visit(i):
  if i in seen:return
  o=objects[i];assert identity(o)==i;seen.add(i)
  for d in o['dependencies']:visit(d)
 for i in roots:visit(i)
 return seen

def source_guard():
 before=read(R/'source-boundary-before.json');after=read(R/'source-boundary-after.json');pins=read(R/'initial-pins.json');build=read(R/'compiler-build.json')
 assert len(before)==102 and set(before)==set(after)
 changed=[]
 for p,h in before.items():
  now=sha(B/p);assert now==after[p],p
  if now!=h:assert sha(R/'original-source'/p)==h,p;changed.append(p)
 assert set(changed)==set(pins['expected_source_changes'])
 assert set(pins['expected_production_changes'])=={'lowerings/js/src/lib.rs','lowerings/c/src/compute.rs'}
 assert set(build['changed_production_files'])==set(pins['expected_production_changes'])
 assert build['status']=='passed' and build['unchanged_guarded_files']==102-len(changed) and build['original_source_hashes_authenticated']
 if 'changed_guarded_files' in build:assert set(build['changed_guarded_files'])==set(changed)
 for k in ['old','new']:assert sha(build[k+'_path'])==build[k+'_sha256']
 assert build['old_sha256']==OLD_COMPILER and build['old_sha256']!=build['new_sha256']
 return dict(keys=102,unchanged=102-len(changed),changed=sorted(changed),production_changed=sorted(pins['expected_production_changes']),authenticated_original_copies=True)

def prepared_audit(before,old_ids,fresh_ids,current,pub):
 m=read(R/'metadata.json');prep=read(R/'input-preparation/preparation.json')
 assert m['prior_snapshot']==PIN and m['new_snapshot']==pub['snapshot'] and m['effective_prior_snapshot']==prep['effective_prior_snapshot']
 assert set(m['compilers'])=={'old','new'} and m['compilers']['old']['sha256']==OLD_COMPILER
 for k,v in m['compilers'].items():assert sha(v['path'])==v['sha256']==m['compiler_hashes'][k] and v['path']==m['compiler_paths'][k]
 assert m['compiler_sha256']==m['compilers']['new']['sha256'] and m['compiler_path']==m['compilers']['new']['path']
 assert m['planner_policy_sha256']==sha(B/'planner/ink_planner/semantic_search.py')
 assert m['input_preparation_sha256']==sha(R/'input-preparation/preparation.json') and m['cost_model_sha256']==sha(R/'cpu-cost-model.json') and m['gpu_cost_model_sha256']==sha(R/'gpu-cost-model.json')
 for p,h in m['artifact_hashes'].items():assert (R/p).is_file() and sha(R/p)==h,p
 objects={i:current.object(i) for i in current.members()};plans=[];builds=[];fresh=[];references=[];fingerprints={}
 for task,t in m['tasks'].items():
  folder=R/'tasks'/task;assert sha(folder/'core.json')==t['core_sha256']==t['input_provenance']['input_core_sha256'] and sha(folder/'source.ink')==t['source_sha256']
  original=next(f['body'] for f in read(folder/'core.json')['program']['functions'] if f['name']==task)
  cores={p:read(R/t['selections'][p]['selected_core_path']) for p in ['prior','checked']};bodies={p:next(f['body'] for f in c['program']['functions'] if f['name']==task) for p,c in cores.items()}
  original_functions={f['name']:f for f in read(folder/'core.json')['program']['functions']}
  for proof,c in cores.items():
   selected_functions={f['name']:f for f in c['program']['functions']}
   assert set(selected_functions)==set(original_functions)
   assert all(selected_functions[n]==original_functions[n] for n in original_functions if n!=task),'Ancillary helper must remain byte-equivalent in selected cores'
  assert t['prior_equals_original']==(bodies['prior']==original) and t['checked_changes_prior']==(bodies['prior']!=bodies['checked'])
  if t['fresh_proof_required']:assert bodies['prior']!=bodies['checked'];fresh.append(task)
  else:assert bodies['prior']==bodies['checked'];references.append(task)
  assert set(t['selections'])=={'prior','checked'} and set(t['matrix_bundles'])=={'old_prior','old_checked','new_prior','new_checked'}
  for proof,row in t['selections'].items():
   authority=before|old_ids if proof=='prior' else set(current.members());pin=m['effective_prior_snapshot'] if proof=='prior' else m['new_snapshot'];store=Store(prep['prior_overlay']) if proof=='prior' else current
   store.members()  # Match preparation's Merkle traversal witness insertion order before byte reconstruction.
   p=R/row['path'];package=read(p);receipt_path=p.with_suffix('.receipt.json');receipt=read(receipt_path);bundle=package['knowledge'];roots={a['law'] for a in package['applications']};ids=set(bundle['objects'])
   assert sha(p)==row['sha256']==receipt['compact_selection_sha256'] and sha(receipt_path)==row['compact_receipt_sha256']
   assert sha(R/row['selected_core_path'])==row['selected_core_sha256']
   assert receipt['status']=='passed' and not receipt['search']['exhausted'] and receipt['search']['cost_model']['sha256']==m['cost_model_sha256']
   assert roots==set(bundle['roots'])==set(row['laws'])==set(receipt['check']['applied_laws']) and ids==set(receipt['check']['closure'])
   assert receipt['check']['input_core_sha256']==t['core_sha256'] and identity(bundle['snapshot'])==receipt['check']['snapshot_sha256']==pin
   assert bundle==store.bundle(sorted(roots)) and closure(objects,roots)==ids and ids<=authority
   if proof=='checked' and t['fresh_proof_required']:assert roots&fresh_ids
   orchestration=receipt['orchestration'];assert orchestration['helper_sha256']==sha(B/'bench/compact_selection22.py') and orchestration['planner_sha256']==m['planner_policy_sha256']
   offered=set()
   for query in orchestration['queries']:
    expected=sorted(i for i in authority if (o:=objects[i])['kind']=='rewrite' and o['semantics']=='ink-conditional-laws-v1' and o['interface']['result']==query['sort'])[:1024]
    assert query['roots']==expected;offered.update(expected)
   assert offered==set(orchestration['discovery_roots'])
   discovery=store.bundle(sorted(offered));assert sorted(discovery['objects'])==orchestration['discovery_closure']
   assert hashlib.sha256(encoded(discovery)).hexdigest()==orchestration['discovery_view_sha256'] and len(encoded(discovery))==orchestration['discovery_view_bytes']
   accepted=set()
   for batch in orchestration['admissions']:
    part=set(batch['roots']);assert part<=offered and part and len(batch['roots'])==len(part);view=store.bundle(batch['roots'])
    assert set(view['objects'])==set(batch['closure'])==closure(objects,part) and set(batch['closure'])<=authority
    assert hashlib.sha256(encoded(view)).hexdigest()==batch['view_sha256'] and len(encoded(view))==batch['view_bytes']
    if batch['exit_code']==0:
     checked=json.loads(batch['stdout']);assert batch['action']=='accepted' and set(checked['entries'])==set(batch['closure']) and checked['snapshot_sha256']==pin;accepted.update(part)
    else:assert batch['action']=='split aggregate budget' and len(part)>1 and 'semantic proof work/depth limit' in batch['stderr']
   assert accepted==offered,'No discovered root silently discarded'
   for check in orchestration['selection_checks']:
    assert set(check['roots'])<=offered and set(check['closure'])==closure(objects,check['roots']) and set(check['closure'])<=authority
    if check['exit_code']==0:
     checked=json.loads(check['stdout']);assert checked['input_core_sha256']==t['core_sha256'] and checked['snapshot_sha256']==pin and set(checked['closure'])==set(check['closure'])
   assert orchestration['selection_checks'][-1]['exit_code']==0 and set(orchestration['selection_checks'][-1]['closure'])==ids
   assert hashlib.sha256(encoded(package['applications'])).hexdigest()==receipt['applications_sha256']==orchestration['selection_checks'][-1]['applications_sha256']
   plans.append(dict(task=task,proof=proof,roots=sorted(roots),closure_objects=len(ids),sha256=sha(p)))
   semantic_hashes=[]
   for backend in ['old','new']:
    lane=t['matrix_bundles'][backend+'_'+proof];target=R/lane['bundle'];manifest=read(target/'manifest.json')
    assert lane['selected_core_sha256']==row['selected_core_sha256'] and sha(target/'manifest.json')==lane['manifest_sha256'] and sha(target/'program.mjs')==lane['program_sha256']
    assert manifest['cpu_c_sha256']==sha(target/'cpu.c') and (target/'cpu.wasm').read_bytes()[:8]==b'\x00asm\x01\x00\x00\x00'
    semantic_hashes.append(manifest['core_sha256']);builds.append(dict(task=task,backend=backend,proof=proof,selected_core_sha256=row['selected_core_sha256'],manifest_sha256=lane['manifest_sha256']))
   assert len(set(semantic_hashes))==1,'Same proof-selected expression must reach both backends'
  seen={};eligible={}
  for backend in ['old','new']:
   for proof in ['prior','checked']:
    variant=f'ink_{backend}_{proof}_gpu';target=R/t['matrix_bundles'][backend+'_'+proof]['bundle'];manifest=read(target/'manifest.json');fn=next(f for f in manifest['functions'] if f['name']==task)
    fp=dict(files={str(f.relative_to(target)):sha(f) for f in target.rglob('*') if f.is_file() and (f.suffix=='.wgsl' or f.name in ['ink-device.mjs','ink-gpu.mjs'])},abi=dict(schema=manifest['schema'],parameters=fn.get('params',fn.get('parameters')),result=fn.get('result'),shader=fn.get('shader'),gpu=fn.get('gpu')))
    digest=hashlib.sha256(json.dumps(fp,sort_keys=True,separators=(',',':')).encode()).hexdigest();is_eligible=bool(fn.get('gpu')) if manifest['schema']==1 else bool(fn.get('shader'));eligible[variant]=is_eligible
    if is_eligible and digest in seen:assert m['gpu_aliases'][task][variant]==seen[digest]
    elif is_eligible or (backend=='old' and proof=='prior'):
     d=m['gpu_manifest'][variant][task];assert d['fingerprint_inputs']==fp and d['fingerprint']==digest and d['timing_eligible']==is_eligible and d['bundle']==str(target.relative_to(R))
     if is_eligible:seen[digest]=variant
    else:assert m['gpu_aliases'][task][variant]=='ineligible (canonical old_prior fallback validation)'
  fingerprints[task]=dict(unique_eligible=len(seen),eligibility=eligible)
 assert len(m['tasks'])==8 and len(plans)==16 and len(builds)==32 and len(fresh)==2 and len(references)==6
 return dict(status='passed',metadata_sha256=sha(R/'metadata.json'),frozen_artifacts=len(m['artifact_hashes']),selected_packages=len(plans),matrix_build_packages=len(builds),fresh_cpu_tasks=fresh,unchanged_old_only_references=references,plans=plans,matrix_builds=builds,GPU_reference_fingerprints=fingerprints)

def observation_audit(current,final=False):
 ledger={p.stem:p for p in (B/'knowledge/store/observations').glob('*.json')};dbpath=B/'knowledge/index.sqlite'
 with sqlite3.connect(dbpath.as_uri()+'?mode=ro',uri=True) as db:
  assert {r[0] for r in db.execute('select id from entries')}==set(current.members())
  assert {r[0] for r in db.execute('select entry_id from members where snapshot_id=?',(current.snapshot_id,))}==set(current.members())
  assert {r[0] for r in db.execute('select id from observations')}==set(ledger)
  assert db.execute('pragma integrity_check').fetchall()==[('ok',)] and not db.execute('pragma foreign_key_check').fetchall()
  cache=dict(proofs=db.execute('select count(*) from entries').fetchone()[0],observations=db.execute('select count(*) from observations').fetchone()[0])
 result=dict(status='passed',current=len(ledger),immutable_prior_observation_count=PRIOR_OBSERVATIONS,disposable_index=cache,post_timing_imports='pending')
 if not final:assert len(ledger)==PRIOR_OBSERVATIONS;return result
 m=read(R/'metadata.json');fixture=read(R/'fixtures.json');inputs={x['id']:x for x in fixture['inputs']};hashes={};hosts={};imported_ids=set();variants={f'ink_{backend}_{proof}_wasm' for backend in ['old','new'] for proof in ['prior','checked']}|{'rust_expert_wasm'}
 for host in ('node','browser'):
  imported=read(R/f'{host}-observations.json');raw=read(R/f'{host}-results.json');groups=collections.defaultdict(list);counts=collections.Counter();hosts[host]=len(imported)
  assert raw['status']=='passed'
  for row in raw['samples']:groups[(row['case'],row['input'],row['variant'])].append(row)
  for row in imported:
   oid=row['id'];assert oid not in imported_ids;imported_ids.add(oid);o=read(ledger[oid]);v=row['variant'];case=row['case'];x=inputs[row['input']];task=m['tasks'][case];samples=sorted(groups[(case,row['input'],v)],key=lambda r:r['round']);assert [s['round'] for s in samples]==list(range(9))
   if v.startswith('ink_'):
    _,backend,proof,_=v.split('_');plan=task['selections'][proof]['sha256'];entries=task['selections'][proof]['laws'];compiler=m['compilers'][backend]['sha256'];binary=m['artifact_hashes'][f'{backend}/{proof}/{case}/cpu.wasm']
   else:assert v=='rust_expert_wasm';plan=m['artifact_hashes']['rust-expert.wasm'];entries=[];compiler=None;binary=plan
   expected=dict(schema=1,program=task['core_sha256'],entries=sorted(entries),plan=plan,target=dict(hardware=str(m['environment']['cpu']),driver=f'{host}:{raw["host"]}; exported Wasm memory only',toolchain=json.dumps(dict(ink=compiler,rustc=m['environment']['rustc'],zig=m['zig'],wasm_sha256=binary),sort_keys=True),backend=v,bridge='Declared natural list inputs captured and full-result transport; runner '+sha(R/'runner.mjs')),workload=dict(shape=dict(case=case,length=len(x['xs']),second_length=len(x['ys']),seed=x['seed'],factor=x['factor']),distribution=row['input'],concurrency=1,residency='resident host inputs; warm modules; captured complete calls'),metrics=dict(complete_call_ns=[str(round(s['ns_per_call'])) for s in samples],peak_bytes=max(s['linear_memory_bytes'] for s in samples)))
   assert identity(o)==oid and o==expected;counts[v]+=1;hashes[oid]=sha(ledger[oid])
  assert counts=={v:len(fixture['cells']) for v in variants}
 assert len(fixture['cells'])==32 and len(imported_ids)==320 and len(ledger)==17346
 for i,p in ledger.items():
  o=read(p);Store.validate_observation(o);assert identity(o)==i and set(o['entries'])<=set(current.members())
 result.update(post_timing_imports='passed',added=len(imported_ids),hosts=hosts,exact_archived_samples_and_memory=True,imported_object_file_hashes=hashes)
 return result

def main(final=False,prepared=False):
 d=B/'knowledge/research/web-stack-proofs-27/static-derivation';w=read(d/'witnesses.json');admission=read(d/'admission.json');prep=read(R/'input-preparation/preparation.json');old=Store(B/'knowledge',B/'knowledge/store/snapshots'/f'{PIN}.json');before=set(old.members());assert len(before)==1790 and w['historical_snapshot']==PIN
 typed_path=Path(w['typed_source_witnesses']);assert sha(typed_path)==w['typed_source_witnesses_sha256']
 typed_rows=read(typed_path);assert len(typed_rows)==16
 assert {identity(semantic_entry(r['law'])) for r in typed_rows}=={identity(semantic_entry(r['law'])) for r in w['new_composed']}
 generic=demand.named_laws();roles=collections.Counter(demand.law_roles().values());assert roles=={'optimization_endpoint':8,'proof_support':8}
 oldrows=w['shared_old'];newrows=w['new_composed'];old_ids={identity(semantic_entry(r['law'])) for r in oldrows};fresh_ids={identity(semantic_entry(v)) for _,v in generic}|{identity(semantic_entry(r['law'])) for r in newrows}
 assert len(old_ids)==len(oldrows) and len(fresh_ids)==len(generic)+len(newrows)==32 and len(newrows)==16
 assert not fresh_ids&(before|old_ids)
 offered=static.named_laws()+generic;ids=[identity(semantic_entry(v)) for _,v in offered];assert len(ids)==len(set(ids)) and set(ids)==(old_ids-before)|fresh_ids
 overlay=Store(prep['prior_overlay']);assert set(overlay.members())==before|old_ids and overlay.snapshot_id==w['effective_prior_snapshot']==prep['effective_prior_snapshot'] and len(overlay.members())==w['effective_prior_entries']==1790+len(old_ids-before)
 view=read(d/'view.json');objects=view['objects'];roots=set(view['roots']);assert roots==old_ids|fresh_ids and closure(objects,roots)==set(objects)
 assert set(json.loads(admission['stdout'])['entries'])==set(objects) and admission['exit_code']==0 and w['admission_sha256']==sha(d/'admission.json') and w['helper_sha256']==sha(R/'derive-static.py')
 assert json.loads(admission['stdout'])['snapshot_sha256']==identity(view['snapshot']) and sha(admission['argv'][0])==OLD_COMPILER and Path(admission['argv'][-1]).resolve()==(d/'view.json').resolve()
 new_admission=read(R/'new-checker-admission.json');build=read(R/'compiler-build.json');assert new_admission['exit_code']==0 and not new_admission['stderr'] and new_admission['compiler_sha256']==build['new_sha256']==sha(new_admission['argv'][0])
 assert new_admission['view_sha256']==sha(d/'view.json') and Path(new_admission['argv'][-1]).resolve()==(d/'view.json').resolve() and new_admission['source_sha256']==sha(new_admission['argv'][2]) and new_admission['argv'][2]==admission['argv'][2]
 admitted=json.loads(new_admission['stdout']);assert admitted['status']=='checked' and admitted['snapshot_sha256']==identity(view['snapshot']) and set(admitted['entries'])==set(objects)
 assert all(closure(objects,[i])<=before|old_ids for i in old_ids) and all(set(use_ids(r['law']['proof']))<=before|old_ids for r in oldrows)
 assert len(generic)==len(w['generic_roots'])==16 and w['old_semantic_laws']==1231 and w['extra_old_general_consequences']==0
 bounds=w['old_composition_bounds'];assert bounds['max_source_applications']==4 and bounds['max_expanded_bodies_per_task']==128 and all(n<=128 for n in bounds['expanded'].values())
 rejected=0
 for check in admission['individual_checks']:
  assert check['source_applications'] is None or check['source_applications']<=4
  if check['exit_code']!=0:
   rejected+=1;folder=Path(check['preserved_failure']);candidate=read(folder/'candidate.json');failure_view=read(folder/'view.json');assert identity(semantic_entry(candidate['law'] if 'law' in candidate else candidate))==check['content_id'] and sha(folder/'view.json')==check['view_sha256'];assert set(failure_view['objects'])==set(check['loaded_object_ids'])
 assert rejected==1
 assert all(c['exit_code']==0 or c['stderr'].strip()=='error: unknown semantic function' for c in admission['individual_checks'])
 assert all(c['exit_code']==0 or c['name'].startswith('helper_accepted_projection_u32_old_checked_0_') for c in admission['individual_checks'])
 guard=source_guard();pub=read(R/'publication.json');current=Store(B/'knowledge',B/'knowledge/store/snapshots'/f"{pub['snapshot']}.json");after=set(current.members());assert before<=after and after-before==(old_ids-before)|fresh_ids and len(after)==pub['entries']==1790+len(after-before) and len(after-before)==pub['added_entries']==len((old_ids-before)|fresh_ids)
 assert pub['previous_snapshot']==PIN and pub['previous_entries']==1790 and set(pub['batch_entries'])==after-before and set(pub['admission']['entries'])==closure(objects,after-before) and pub['compiler_sha256']==OLD_COMPILER and pub['admission']['snapshot_sha256']==pub['snapshot'] and pub['admission']['status']=='checked'
 producer_sets=[]
 for row in pub['producers']:
  module=importlib.import_module('producers.'+row['producer']);assert sha(Path(module.__file__))==row['source_sha256'];members={identity(semantic_entry(v)) for _,v in module.named_laws()};assert len(members)==row['entries'];producer_sets.append(members)
 assert set.union(*producer_sets)==after-before and sum(map(len,producer_sets))==len(after-before)
 for i in after:assert identity(current.object(i))==i and set(current.object(i)['dependencies'])<=after
 preparation=prepared_audit(before,old_ids,fresh_ids,current,pub) if prepared or final else dict(status='pending metadata');observations=observation_audit(current,final)
 files=[d/'witnesses.json',d/'admission.json',d/'generation.json',d/'view.json',R/'derive-static.py',R/'input-preparation/preparation-before-fair.json',R/'input-preparation/preparation.json',R/'initial-pins.json',R/'source-boundary-before.json',R/'source-boundary-after.json',R/'compiler-build.json',Path(__file__),Path(demand.__file__),Path(static.__file__),R/'publication.json',R/'new-checker-admission.json',B/'knowledge/research/web-stack-proofs-27/proofs/evidence.json']
 files.extend(R/'original-source'/p for p in guard['changed'])
 result=dict(status='passed',errors=[],catalog=dict(historical=len(before),effective_prior=len(overlay.members()),current=len(after),added=len(after-before),snapshot=current.snapshot_id,roles=dict(roles,shared_old_static=len(old_ids),new_source_static=len(newrows),typed_primary_zip_static=8,typed_heldout_zip_static=8)),selected_packages=preparation.get('selected_packages',0),historical_entries=len(before),effective_prior_entries=len(overlay.members()),effective_prior_snapshot=overlay.snapshot_id,current_entries=len(after),generic_roles=dict(roles),fresh_static_bridges=len(newrows),shared_old_entries=len(old_ids-before),historical_shared_aliases=len(old_ids&before),checked_minimal_closure_objects=len(objects),both_checker_admissions=dict(old=OLD_COMPILER,new=new_admission['compiler_sha256'],closure_objects=len(objects),view_sha256=sha(d/'view.json')),source_guard=guard,search_bounds=bounds,rejected_candidates=rejected,endpoint_aliases=len(admission['endpoint_aliases']),preparation=preparation,observations=observations,bindings={str(p.relative_to(B)):sha(p) for p in files},scope='Independent read-only roles, content identity, old-only authority, compact memberships and backend/proof factorial core bindings. Checked proofs do not prove lowering or speed; no builds, tests, timings or canonical writes by this audit.')
 destination=R/('catalogue-review.json' if final else 'catalogue-review.initial.json');destination.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(dict(status='passed',effective_prior_entries=len(overlay.members()),current_entries=len(after),selected_packages=result['selected_packages'],receipt_sha256=sha(destination))))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--prepared',action='store_true');parser.add_argument('--final',action='store_true');args=parser.parse_args();main(args.final,args.prepared)
