#!/usr/bin/env python3
"""Independent read-only composition/role/dependency catalogue audit."""
import argparse,hashlib,importlib,importlib.util,json,sqlite3,sys
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sys.path[:0]=[str(B/'knowledge'),str(B/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers import web_skip23_laws as guard,web_pipeline23_laws as indexed,web_static23_laws as static
PIN='95c096ab4a28114fb70c334b662057bd8abfffe135a3198032f4ea38a679bd57'
read=lambda p:json.loads(Path(p).read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def use_ids(v):
 if isinstance(v,dict):return ([v['Use']['law']] if 'Use' in v else [])+sum((use_ids(x) for x in v.values()),[])
 if isinstance(v,list):return sum((use_ids(x) for x in v),[])
 return []
def prepared_audit(before,old_ids,fresh_ids,current,pub):
 m=read(R/'metadata.json');assert m['prior_snapshot']==PIN and m['new_snapshot']==pub['snapshot'] and m['effective_prior_snapshot']==read(R/'input-preparation/preparation.json')['effective_prior_snapshot']
 assert m['compiler_sha256']==sha(Path(m['compiler_path'])) and m['planner_policy_sha256']==sha(B/'planner/ink_planner/semantic_search.py')
 for n,h in m['artifact_hashes'].items():assert (R/n).is_file() and sha(R/n)==h,n
 current_objects={i:current.object(i) for i in current.members()}
 plans=[];fresh_tasks=[];references=[]
 for task,t in m['tasks'].items():
  folder=R/'tasks'/task;prior=read(folder/'prior-selected.core.json')['program']['functions'][0]['body'];checked=read(folder/'checked-selected.core.json')['program']['functions'][0]['body']
  if t['fresh_proof_required']:assert prior!=checked and t['checked_changes_prior'];fresh_tasks.append(task)
  else:assert prior==checked and not t['checked_changes_prior'];references.append(task)
  for prefix,backend,rows in [('', 'cpu',t['selections']),('gpu-', 'gpu',t['gpu_selections'])]:
   for variant,row in rows.items():
    p=R/row['path'];k=read(p);receipt_path=folder/f'{prefix}{variant}-selection.receipt.json';receipt=read(receipt_path);bundle=k['knowledge'];roots={a['law'] for a in k['applications']};ids=set(bundle['objects'])
    assert sha(p)==row['sha256']==receipt['compact_selection_sha256'] and sha(receipt_path)==row['compact_receipt_sha256']
    assert receipt['status']=='passed' and not receipt['search']['exhausted'] and receipt['search']['cost_model']['sha256']==sha(R/f'{backend}-cost-model.json')
    assert roots==set(bundle['roots'])==set(row['laws'])==set(receipt['check']['applied_laws']) and ids==set(receipt['check']['closure'])
    pin=m['effective_prior_snapshot'] if variant=='prior' else m['new_snapshot'];assert identity(bundle['snapshot'])==receipt['check']['snapshot_sha256']==pin
    orchestrated=receipt.get('orchestration')
    if orchestrated:
     assert orchestrated['helper_sha256']==sha(B/'bench/compact_selection22.py') and orchestrated['planner_sha256']==m['planner_policy_sha256']
     authority=before|old_ids if variant=='prior' else set(current.members());offered=set(orchestrated['discovery_roots']);recomputed=set()
     for query in orchestrated['queries']:
      expected=sorted(i for i in authority if (o:=current_objects[i])['kind']=='rewrite' and o['semantics']=='ink-conditional-laws-v1' and o['interface']['result']==query['sort'])[:1024]
      assert query['roots']==expected,'exact independently reconstructed type-indexed query'
      recomputed.update(expected)
     assert offered==recomputed
     accepted=set()
     for batch in orchestrated['admissions']:
      part=set(batch['roots']);assert part<=offered and part and len(batch['roots'])==len(part)
      reached=set()
      def visit_batch(i):
       if i in reached:return
       reached.add(i)
       for dep in current_objects[i]['dependencies']:visit_batch(dep)
      for i in part:visit_batch(i)
      assert reached==set(batch['closure']) and reached<=authority
      if batch['exit_code']==0:
       assert batch['action']=='accepted' and set(json.loads(batch['stdout'])['entries'])==reached;accepted.update(part)
      else:assert batch['action']=='split aggregate budget' and len(part)>1 and 'semantic proof work/depth limit' in batch['stderr']
     assert accepted==offered,'every discovered root checker-admitted; none silently excluded'
     assert all(c['exit_code'] in (0,1) and set(c['closure'])<=authority for c in orchestrated['selection_checks'])
     assert orchestrated['selection_checks'][-1]['exit_code']==0 and set(orchestrated['selection_checks'][-1]['closure'])==ids

    for i,o in bundle['objects'].items():
     assert identity(o)==i and current.object(i)==o and set(o['dependencies'])<=ids
     witness=bundle['membership'][i];node=identity(dict(schema=1,entries=witness['entries']));assert i in witness['entries']
     for edge in witness['path']:node=identity(dict(schema=1,left=edge['sibling'] if edge['left'] else node,right=node if edge['left'] else edge['sibling']))
     assert node==bundle['snapshot']['root']
    reached=set()
    def visit(i):
     if i in reached:return
     reached.add(i)
     for dep in bundle['objects'][i]['dependencies']:visit(dep)
    for i in roots:visit(i)
    assert reached==ids
    if variant=='prior':assert ids<=before|old_ids
    if variant=='checked' and backend=='cpu':assert not t['fresh_proof_required'] or bool(roots&fresh_ids)
    plans.append(dict(task=task,backend=backend,variant=variant,roots=sorted(roots),closure_objects=len(ids),sha256=sha(p)))
 assert len(plans)==4*len(m['tasks']) and len(fresh_tasks)+len(references)==len(m['tasks'])
 return dict(status='passed',metadata_sha256=sha(R/'metadata.json'),frozen_artifacts=len(m['artifact_hashes']),selected_packages=len(plans),fresh_cpu_tasks=fresh_tasks,unchanged_old_only_references=references,plans=plans)

def observation_audit(current,final=False):
 ledger={p.stem:p for p in (B/'knowledge/store/observations').glob('*.json')};dbpath=B/'knowledge/index.sqlite'
 with sqlite3.connect(dbpath.as_uri()+'?mode=ro',uri=True) as db:
  assert {r[0] for r in db.execute('select id from entries')}==set(current.members())
  assert {r[0] for r in db.execute('select entry_id from members where snapshot_id=?',(current.snapshot_id,))}==set(current.members())
  assert {r[0] for r in db.execute('select id from observations')}==set(ledger)
  assert db.execute('pragma integrity_check').fetchall()==[('ok',)] and not db.execute('pragma foreign_key_check').fetchall()
  cache=dict(proofs=db.execute('select count(*) from entries').fetchone()[0],members=db.execute('select count(*) from members where snapshot_id=?',(current.snapshot_id,)).fetchone()[0],observations=db.execute('select count(*) from observations').fetchone()[0])
 result=dict(status='passed',current=len(ledger),canonical_observations=len(ledger),disposable_index=cache,immutable_prior_observation_count=13746,post_timing_imports='pending')
 if not final:return result
 m=read(R/'metadata.json');fixture=read(R/'fixtures.json');inputs={x['id']:x for x in fixture['inputs']};allimports=[];hashes={};hosts={}
 for host in ('node','browser'):
  imported=read(R/f'{host}-observations.json');raw=read(R/f'{host}-results.json');groups={};counts={};hosts[host]=len(imported)
  for row in raw['samples']:groups.setdefault((row['case'],row['input'],row['variant']),[]).append(row)
  for row in imported:
   o=read(ledger[row['id']]);variant=row['variant'];case=row['case'];x=inputs[row['input']];task=m['tasks'][case];samples=sorted(groups[(case,row['input'],variant)],key=lambda r:r['round']);assert len(samples)==9
   metrics=dict(complete_call_ns=[str(round(r['ns_per_call'])) for r in samples],peak_bytes=max(r['linear_memory_bytes'] for r in samples));kind=variant.split('_')[1] if variant.startswith('ink_') else 'baseline';plan=task['selections'][kind]['sha256'] if kind in ('prior','checked') else m['artifact_hashes'][f'rust-{variant.split("_")[1]}.wasm' if variant.startswith('rust_') else f'baseline/{case}/cpu.wasm'];entries=task['selections'][kind]['laws'] if kind in ('prior','checked') else []
   assert identity(o)==row['id'] and o['program']==task['core_sha256'] and o['plan']==plan and o['entries']==entries and o['metrics']==metrics
   assert o['target']['backend']==variant and o['target']['driver']==f'{host}:{raw["host"]}; exported Wasm memory only' and o['target']['hardware']==str(m['environment']['cpu'])
   assert o['workload']['distribution']==row['input'] and o['workload']['shape']==dict(case=case,length=len(x['xs']),second_length=len(x['ys']),seed=x['seed'],factor=x['factor'])
   counts[variant]=counts.get(variant,0)+1;hashes[row['id']]=sha(ledger[row['id']]);allimports.append(row)
  assert counts=={v:len(fixture['cells']) for v in ('ink_baseline_wasm','ink_prior_wasm','ink_checked_wasm','rust_literal_wasm','rust_expert_wasm')}
 ids={r['id'] for r in allimports};assert len(ids)==len(allimports)==2*5*len(fixture['cells']) and len(ledger)==13746+len(ids)
 for i,p in ledger.items():
  o=read(p);Store.validate_observation(o);assert identity(o)==i and set(o['entries'])<=set(current.members())
 result.update(post_timing_imports='passed',added=len(ids),hosts=hosts,exact_archived_samples_and_memory=True,imported_object_file_hashes=hashes)
 return result

def main(final=False,prepared=False):
 d=B/'knowledge/research/web-stack-proofs-23/static-derivation';w=read(d/'witnesses.json');admission=read(d/'admission.json');prep=read(R/'input-preparation/preparation.json');old=Store(B/'knowledge',B/'knowledge/store/snapshots'/f'{PIN}.json');before=set(old.members());assert len(before)==1648 and w['historical_snapshot']==PIN
 role_counts=__import__('collections').Counter(role for mod in [guard,indexed] for role in mod.law_roles().values())
 oldrows=w['shared_old'];newrows=w['new_composed'];generic=guard.named_laws()+indexed.named_laws();old_ids={identity(semantic_entry(r['law'])) for r in oldrows};fresh_ids={identity(semantic_entry(v)) for _,v in generic}|{identity(semantic_entry(r['law'])) for r in newrows};assert len(old_ids)==len(oldrows) and len(fresh_ids)==len(generic)+len(newrows);assert not old_ids&before and not fresh_ids&(before|old_ids)
 offered=static.named_laws()+generic;ids=[identity(semantic_entry(v)) for _,v in offered];assert len(ids)==len(set(ids)) and set(ids)==old_ids|fresh_ids
 overlay=Store(prep['prior_overlay']);assert set(overlay.members())==before|old_ids;assert overlay.snapshot_id==w['effective_prior_snapshot']==prep['effective_prior_snapshot'];assert w['effective_prior_entries']==len(overlay.members())
 view=read(d/'view.json');objects=view['objects'];roots=set(view['roots']);assert roots==old_ids|fresh_ids
 def reachable(start):
  seen=set()
  def visit(i):
   if i in seen:return
   seen.add(i);o=objects[i];assert identity(o)==i
   for dep in o['dependencies']:visit(dep)
  for i in start:visit(i)
  return seen
 assert reachable(roots)==set(objects),'minimal exact dependency closure'
 assert set(json.loads(admission['stdout'])['entries'])==set(objects) and admission['exit_code']==0
 assert all(reachable([i])<=before|old_ids for i in old_ids),'all old consequence dependency authority historical or checked old'
 assert all(set(use_ids(r['law']['proof']))<=before|old_ids for r in oldrows),'no fresh proof use in old-only rows'
 assert len(generic)==len(w['generic_roots']) and len(newrows)==len(w['new_composed']) and w['old_semantic_laws']>1000
 bound=w['old_composition_bounds'];assert bound['max_source_applications']==4 and bound['max_expanded_bodies_per_task']==128 and all(n<=128 for n in bound['expanded'].values())
 for check in admission['individual_checks']:
  assert check['source_applications'] is None or check['source_applications']<=4
  if check['exit_code']!=0:assert Path(check['preserved_failure'],'candidate.json').is_file() and Path(check['preserved_failure'],'view.json').is_file()
 spec_path=R/'spec.json'
 if spec_path.exists():spec=read(spec_path)
 else:
  spec_path=B/'bench/web-stack-proofs-23/spec.py';loader=importlib.util.spec_from_file_location('frozen23_spec',spec_path);module=importlib.util.module_from_spec(loader);loader.loader.exec_module(module);spec=module.public_spec()
 tasks={t['name']:t for t in spec['tasks']};assert len(tasks)==12
 guard_hashes=read(R/'source-boundary-before.json');assert len(guard_hashes)==102 and all(sha(B/p)==h for p,h in guard_hashes.items())
 pub_path=R/'publication.json';pub=read(pub_path);current=Store(B/'knowledge',B/'knowledge/store/snapshots'/f"{pub['snapshot']}.json");after=set(current.members());assert before<=after and after-before==old_ids|fresh_ids and len(after)==pub['entries'] and len(after-before)==pub['added_entries']
 assert pub['previous_snapshot']==PIN and pub['previous_entries']==1648 and set(pub['batch_entries'])==after-before and set(pub['admission']['entries'])>=after-before
 producer_sets=[]
 for row in pub['producers']:
  module=importlib.import_module('producers.'+row['producer']);assert sha(Path(module.__file__))==row['source_sha256'];members={identity(semantic_entry(v)) for _,v in module.named_laws()};assert len(members)==row['entries'];producer_sets.append(members)
 assert set.union(*producer_sets)==after-before and sum(map(len,producer_sets))==len(after-before)
 for i in after:assert identity(current.object(i))==i and set(current.object(i)['dependencies'])<=after
 preparation=prepared_audit(before,old_ids,fresh_ids,current,pub) if prepared or final else dict(status='pending metadata')
 observations=observation_audit(current,final)
 files=[d/'witnesses.json',d/'admission.json',d/'generation.json',d/'view.json',R/'derive-static.py',R/'input-preparation/preparation-before-fair.json',R/'input-preparation/preparation.json',spec_path,R/'source-boundary-before.json',Path(__file__),Path(guard.__file__),Path(indexed.__file__),Path(static.__file__),pub_path]
 result=dict(status='passed',errors=[],catalog=dict(historical=len(before),effective_prior=len(overlay.members()),current=len(after),added=len(after-before),snapshot=current.snapshot_id,roles=dict(role_counts,shared_old_static=len(old_ids),new_source_static=len(newrows))),selected_packages=preparation.get('selected_packages',0),fresh_cpu_tasks=preparation.get('fresh_cpu_tasks',[]),historical_entries=len(before),shared_old_entries=len(old_ids),effective_prior_entries=len(overlay.members()),effective_prior_snapshot=overlay.snapshot_id,generic_roles=dict(role_counts),new_public_generic_endpoints=role_counts["optimization_endpoint"],new_support_objects=role_counts["proof_support"],fresh_static_bridges=len(newrows),expected_current_entries=len(before|old_ids|fresh_ids),checked_minimal_closure_objects=len(objects),proof_admission_entries=len(objects),old_semantic_candidates=w["old_semantic_laws"],old_general_consequences=w["extra_old_general_consequences"],reference_sources=len(preparation.get("unchanged_old_only_references",[])),fresh_sources=len(preparation.get("fresh_cpu_tasks",[])),source_guard=dict(keys=102,changed=[]),search_bounds=bound,rejected_candidates=sum(c['exit_code']!=0 for c in admission['individual_checks']),endpoint_aliases=len(admission['endpoint_aliases']),preparation=preparation,observations=observations,bindings={str(p.relative_to(B)):sha(p) for p in files},scope='Independent read-only catalogue role, identity and transitive dependency audit; no target builds, timing or canonical publication. Correctness evidence is checked-object admission, not these hashes.')
 destination=R/('catalogue-review.json' if final else 'catalogue-review.initial.json')
 destination.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(dict(status='passed',effective_prior_entries=result['effective_prior_entries'],expected_current_entries=result['expected_current_entries'],receipt_sha256=sha(destination))))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--prepared',action='store_true');parser.add_argument('--final',action='store_true');args=parser.parse_args();main(args.final,args.prepared)
