#!/usr/bin/env python3
"""Independent read-only identities/closures/receipt audit, not proof replay."""
import argparse,hashlib,importlib,json,sqlite3,sys
from pathlib import Path
REPORT=Path(__file__).resolve().parent;ROOT=REPORT.parents[1]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,identity,semantic_entry

def audit(final=False):
 errors=[]
 def ck(ok,message):
  if not ok:errors.append(message)
 def read(p):return json.loads(p.read_text())
 def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
 m=read(REPORT/'metadata.json');pub=read(REPORT/'publication.json')
 prior=Store(ROOT/'knowledge',ROOT/'knowledge/store/snapshots'/f"{m['prior_snapshot']}.json")
 current=Store(ROOT/'knowledge',ROOT/'knowledge/store/snapshots'/f"{m['new_snapshot']}.json")
 before=set(prior.members());after=set(current.members());delta=after-before
 ck((len(before),len(after),len(delta))==(1343,1372,29) and before<=after,'historical catalogue preservation/count')
 ck(current.snapshot_id==pub['snapshot']==m['new_snapshot'],'current snapshot binding')
 objects={i:current.object(i) for i in after}
 for i,o in objects.items():ck(identity(o)==i and set(o['dependencies'])<=after,'canonical identity/dependency '+i)
 groups={}
 for row in pub['producers']:
  name=row['producer'];ck(sha(ROOT/'knowledge/producers'/f'{name}.py')==row['source_sha256'],'published producer '+name)
  ids={identity(semantic_entry(l)) for _,l in importlib.import_module('producers.'+name).named_laws()}
  ck(len(ids)==row['entries'] and ids<=delta,'producer identity '+name);groups[name]=ids
 ck(set.union(*groups.values())==delta and sum(map(len,groups.values()))==29,'publication union')
 ck(set(pub['batch_entries'])==delta and delta<=set(pub['admission']['entries']),'publication admission binding')
 static_dir=ROOT/'knowledge/research/web-stack-proofs-20/static-derivation';w=read(static_dir/'witnesses.json');a=read(static_dir/'admission.json')
 old_shared={identity(semantic_entry(r['law'])) for r in w['shared_old']};new_static={identity(semantic_entry(r['law'])) for r in w['new_composed']};generic=groups['web_algebra20_laws']|groups['web_reduction20_laws'];fresh=generic|new_static
 ck((len(generic),len(old_shared),len(new_static))==(19,1,9) and delta==generic|old_shared|new_static,'19 generic/1 shared/9 static roles')
 ck(groups['web_static20_laws']==old_shared|new_static,'static wrapper bindings')
 ck(old_shared==set(m['shared_old_witness_ids']) and before.isdisjoint(old_shared),'effective prior shared identities')
 effective=before|old_shared;ck(len(effective)==1344 and w['effective_prior_snapshot']==m['effective_prior_snapshot'],'effective prior1344')
 for row in w['shared_old']:ck(set(row['law']['dependencies'])<=before,'old-only dependency '+row['name'])
 ck(sha(static_dir/'admission.json')==w['admission_sha256'] and a['exit_code']==0,'static admission binding')
 checks=a['individual_checks'];passed={r['content_id'] for r in checks if r['exit_code']==0};rejected={r['content_id'] for r in checks if r['exit_code']}
 ck(passed==delta and len(rejected)==a['new_rejected']==2 and a['old_rejected']==0 and a['old_candidate_count']==1 and a['new_candidate_count']==11,'individual admissions/false premises')
 for n,h in m['artifact_hashes'].items():ck((REPORT/n).is_file() and sha(REPORT/n)==h,'frozen artifact '+n)
 ck(sha(Path(m['compiler_path']))==m['compiler_sha256'],'frozen compiler')
 ck(sha(ROOT/'planner/ink_planner/semantic_search.py')==m['planner_policy_sha256'],'frozen planner')
 guardfile=REPORT/'policy-freeze.json'
 if not guardfile.exists():guardfile=ROOT/'reports/web-stack-proofs-19-2026-10-11/policy-freeze.json'
 guard=read(guardfile)['source_guard'];ck(guard['status']=='passed' and guard['tracked_files']==guard['unchanged']==len(guard['after'])==102 and not guard['changed'],'source guard coverage')
 for n,h in guard['after'].items():ck(sha(ROOT/n)==h,'guarded source '+n)
 plans=[];fresh_tasks=[]
 for task,t in m['tasks'].items():
  folder=REPORT/'tasks'/task
  oldbody=read(folder/'prior-selected.core.json')['program']['functions'][0]['body'];newbody=read(folder/'checked-selected.core.json')['program']['functions'][0]['body']
  ck(oldbody!=newbody and t['checked_changes_prior'],'fresh CPU body '+task)
  for prefix,backend,rows in [('', 'cpu',t['selections']),('gpu-', 'gpu',t['gpu_selections'])]:
   for variant,row in rows.items():
    p=REPORT/row['path'];package=read(p);r=read(folder/f'{prefix}{variant}-selection.receipt.json');k=package['knowledge'];roots={app['law'] for app in package['applications']};ids=set(k['objects'])
    ck(sha(p)==row['sha256']==r['compact_selection_sha256'],'compact package '+task+prefix+variant)
    ck(sha(folder/f'{prefix}{variant}-selection.receipt.json')==row['compact_receipt_sha256'],'compact receipt '+task+prefix+variant)
    ck(r['status']=='passed' and not r['search']['exhausted'],'bounded checked selection '+task+prefix+variant)
    ck(r['search']['cost_model']['sha256']==sha(REPORT/f'{backend}-cost-model.json'),'same-backend policy '+task+prefix+variant)
    ck(roots==set(k['roots'])==set(row['laws'])==set(r['check']['applied_laws']) and ids==set(r['check']['closure']),'roots/closure/check '+task+prefix+variant)
    ck(identity(k['snapshot'])==r['check']['snapshot_sha256']==(m['effective_prior_snapshot'] if variant=='prior' else m['new_snapshot']),'package snapshot '+task+prefix+variant)
    for i,o in k['objects'].items():
     ck(identity(o)==i and objects.get(i)==o and set(o['dependencies'])<=ids,'compact canonical object '+i)
     witness=k['membership'][i];node=identity(dict(schema=1,entries=witness['entries']));ck(i in witness['entries'],'membership leaf '+i)
     for edge in witness['path']:node=identity(dict(schema=1,left=edge['sibling'] if edge['left'] else node,right=node if edge['left'] else edge['sibling']))
     ck(node==k['snapshot']['root'],'membership root '+i)
    reachable=set()
    def visit(i):
     if i in reachable:return
     reachable.add(i)
     for dep in k['objects'][i]['dependencies']:visit(dep)
    for i in roots:visit(i)
    ck(reachable==ids,'minimal dependency closure '+task+prefix+variant)
    if variant=='prior':ck(ids<=effective,'fair prior authority '+task+prefix)
    if variant=='checked' and backend=='cpu':ck(bool(roots&fresh),'fresh generic/source proof '+task);fresh_tasks.append(task)
    plans.append(dict(task=task,backend=backend,variant=variant,roots=sorted(roots),closure_objects=len(ids)))
 ck(len(plans)==32 and len(fresh_tasks)==8,'selection coverage')
 # Author archives have explicit distinct path namespaces; do not resolve
 # lane-relative artifacts at repository root or vice versa.
 authors={};author_count=0
 for lane in ['algebra','reduction']:
  author=ROOT/'knowledge/research/web-stack-proofs-20'/lane;e=read(author/'evidence.json')
  if lane=='algebra':
   ck(e['artifact_path_namespace']=='repository-root-relative','algebra artifact namespace')
   pairs=[(ROOT/n,h) for n,h in e['artifacts'].items()]
   ck(e['compiler']['sha256']==m['compiler_sha256'] and e['cpu_policy']['sha256']==m['cost_model_sha256'],'algebra compiler/policy')
   ck(e['scope']['frames']==220 and e['scope']['actual_interpreter_runs']==440 and e['focused_tests']['tests']==4,'algebra typed scope')
  else:
   pairs=[(author/n,h) for n,h in e['artifact_hashes'].items()]+[(ROOT/n,h) for n,h in e['author_source_hashes'].items()]
   ck(e['generic_new_ordered_fold_roots']==4 and e['composed_existing_math_endpoints']==4,'reduction generic/composed distinction')
  for p,h in pairs:ck(p.is_file() and sha(p)==h,'author frozen '+str(p))
  author_count+=len(pairs);authors[lane]=dict(evidence_sha256=sha(author/'evidence.json'),artifacts=len(pairs))
 # No fresh GPU proof for the count reference: both GPU selections deliberately
 # retain identical prior code even though the CPU selection hoists its gate.
 count_task='gated_predicate_count_u32';ct=m['tasks'][count_task]
 cg=read(REPORT/ct['gpu_selections']['checked']['path']);pg=read(REPORT/ct['gpu_selections']['prior']['path'])
 ck(not cg['applications'] and not pg['applications'] and ct['gpu_selections']['checked']['selected_core_sha256']==ct['gpu_selections']['prior']['selected_core_sha256'],'unchanged GPU count reference')
 ck(all(m['gpu_manifest'][v][count_task]['timing_eligible'] for v in ['baseline','prior','checked']),'count actual eligible reference')
 new_fold={identity(semantic_entry(l)) for _,l in importlib.import_module('producers.web_reduction20_laws').fold_laws()}
 composed_math={identity(semantic_entry(l)) for _,l in importlib.import_module('producers.web_reduction20_laws').composed_zip_laws()}
 ck(len(new_fold)==len(composed_math)==4 and new_fold|composed_math==groups['web_reduction20_laws'],'reduction role split')
 for i in composed_math:ck(set(objects[i]['dependencies'])<=before,'composed existing math dependency '+i)
 fixture=read(REPORT/'fixtures.json');ck((len(fixture['cases']),len(fixture['cells']),len(fixture['inputs']))==(8,72,128),'task/cell/fixture coverage')
 observations=dict(status='pending post-timing imports',expected_prior=11586,expected_added=720)
 if final:
  rows=[];hosts={};imported_files={};fixture=read(REPORT/'fixtures.json');inputs={x['id']:x for x in fixture['inputs']}
  for host in ['node','browser']:
   imported=read(REPORT/f'{host}-observations.json');hosts[host]=len(imported);rows+=imported
   raw=read(REPORT/f'{host}-results.json');sample_groups={};variant_counts={}
   for row in raw['samples']:sample_groups.setdefault((row['case'],row['input'],row['variant']),[]).append(row)
   for row in imported:
    path=ROOT/'knowledge/store/observations'/f"{row['id']}.json";o=read(path);imported_files[row['id']]=sha(path);variant=row['variant'];case=row['case'];input_id=row['input'];samples=sorted(sample_groups.get((case,input_id,variant),[]),key=lambda r:r['round']);x=inputs[input_id];task=m['tasks'][case]
    ck(bool(samples),'import source samples '+host+row['id'])
    expected_metrics=dict(complete_call_ns=[str(round(r['ns_per_call'])) for r in samples],peak_bytes=max(r['linear_memory_bytes'] for r in samples)) if samples else None
    kind=variant.split('_')[1] if variant.startswith('ink_') else 'baseline'
    expected_plan=task['selections'][kind]['sha256'] if kind in ['prior','checked'] else m['artifact_hashes'][f'rust-{variant.split("_")[1]}.wasm' if variant.startswith('rust_') else f'baseline/{case}/cpu.wasm']
    expected_entries=task['selections'][kind]['laws'] if kind in ['prior','checked'] else []
    ck(identity(o)==row['id'] and o['program']==task['core_sha256'] and o['plan']==expected_plan and o['entries']==expected_entries,'import identity/program/proofs '+host+row['id'])
    ck(o['metrics']==expected_metrics,'import exact measured samples '+host+row['id'])
    ck(o['target']['backend']==variant and o['target']['driver']==f'{host}:{raw["host"]}; exported Wasm memory only' and o['target']['hardware']==str(m['environment']['cpu']),'import host/backend '+host+row['id'])
    ck(o['workload']['distribution']==input_id and o['workload']['shape']==dict(case=case,length=len(x['xs']),second_length=len(x['ys']),seed=x['seed'],factor=x['factor']),'import exact workload '+host+row['id'])
    variant_counts[variant]=variant_counts.get(variant,0)+1
   ck(variant_counts=={v:72 for v in ['ink_baseline_wasm','ink_prior_wasm','ink_checked_wasm','rust_literal_wasm','rust_expert_wasm']},'host variant/cell coverage '+host)
  ids={r['id'] for r in rows};ledger=list((ROOT/'knowledge/store/observations').glob('*.json'))
  ck(all(n==360 for n in hosts.values()) and len(ids)==len(rows)==720 and len(ledger)==12306,'final observation counts')
  ck(ids<={p.stem for p in ledger},'import presence')
  for p in ledger:
   o=read(p);Store.validate_observation(o);ck(identity(o)==p.stem and set(o['entries'])<=after,'canonical observation '+p.stem)
  with sqlite3.connect((ROOT/'knowledge/index.sqlite').as_uri()+'?mode=ro',uri=True) as db:
   cache=dict(proofs=db.execute('select count(*) from entries').fetchone()[0],members=db.execute('select count(*) from members where snapshot_id=?',(current.snapshot_id,)).fetchone()[0],observations=db.execute('select count(*) from observations').fetchone()[0])
   ck({r[0] for r in db.execute('select id from entries')}==after and {r[0] for r in db.execute('select entry_id from members where snapshot_id=?',(current.snapshot_id,))}==after,'index exact proof identities')
   ck({r[0] for r in db.execute('select id from observations')}=={p.stem for p in ledger},'index exact observation identities')
   ck(db.execute('pragma integrity_check').fetchall()==[('ok',)] and not db.execute('pragma foreign_key_check').fetchall(),'SQLite structural integrity')
  ck(cache==dict(proofs=1372,members=1372,observations=12306),'disposable index current membership/counts')
  observations=dict(status='passed' if not errors else 'issues',prior=11586,current=len(ledger),added=len(ids),hosts=hosts,index=cache,exact_archived_sample_and_host_bindings=True,imported_object_file_hashes=imported_files)
 result=dict(schema=1,status='passed' if not errors else 'issues',scope='Read-only identity, hash, membership/closure and authenticated recorded-checker receipts. No proof checking, target builds, test execution, timing or statistic recomputation.',phase='post-import final' if final else 'post-preparation',audit_helper_sha256=sha(Path(__file__)),errors=errors,catalog=dict(historical=1343,effective_prior=1344,current=1372,added=29,roles=dict(new_general=15,composed_existing_math=4,shared_old_static=1,new_source_static=9),snapshot=current.snapshot_id),frozen_artifacts=len(m['artifact_hashes']),guarded_sources=102,guard_baseline=str(guardfile.relative_to(ROOT)),guard_baseline_sha256=sha(guardfile),selected_packages=len(plans),fresh_cpu_tasks=fresh_tasks,plans=plans,author_artifacts=author_count,authors=authors,fixture_frames=128,timed_cells=72,unchanged_gpu_count_reference=True,observations=observations,bindings={n:sha(REPORT/n) for n in ['metadata.json','publication.json']+(['node-observations.json','browser-observations.json','node-results.json','browser-results.json','fixtures.json'] if final else [])})
 stem='catalogue-review' if final else 'catalogue-review.initial';out=REPORT/(stem+'.json');out.write_text(json.dumps(result,indent=2)+'\n');note=REPORT/(stem+'.md');note.write_text('# Round20 catalogue and proof-package integrity\n\n'+result['status'].upper()+'. '+result['scope']+'\n\nHistorical1343 is preserved. Effective prior1344 includes the same single checked old-only source composition offered to current1372. The29 added entries comprise15 new general typed equations,4 endpoints composed from existing mathematics,1 symmetric old-only certificate and9 accepted new source certificates. Two accumulator-dependent gate extractions were rejected before publication. Generic equations, composed old mathematics and static automation are counted separately.\n\n'+f"All {len(m['artifact_hashes'])} frozen artifacts,32 compact packages with minimal authenticated closures,8 fresh CPU body/proof gates and102 guarded source hashes pass. Both author archives and exact admission records bind to current published source bytes. The72 timed cells use128 correctness fixtures.\n\n"+'The eligible count GPU reference has zero applications in both prior and current GPU packages and identical selected core; it cannot evidence a fresh GPU proof gain. Other GPU eligibility and fallback are recorded by the workload harness. This audit makes no profitability claim.\n\n'+('The final canonical ledger and disposable index contain12306 observations, including720 imports (360 per web host). Exact archived samples, memory peaks, workload, program/proof plans and host/backend identity bind every imported object; five Wasm variants each cover72 cells per host.\n\n' if final else 'Performance observations remain pending.\n\n')+('No integrity issue found.\n' if not errors else '\n'.join('- '+x for x in errors)+'\n'))
 print(json.dumps(dict(status=result['status'],errors=errors,json_sha256=sha(out),md_sha256=sha(note)),indent=2));return not errors
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--final',action='store_true');sys.exit(0 if audit(p.parse_args().final) else 1)
