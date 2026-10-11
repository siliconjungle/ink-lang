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
 ck((len(before),len(after),len(delta))==(1298,1343,45) and before<=after,'historical catalogue preservation/count')
 ck(current.snapshot_id==pub['snapshot']==m['new_snapshot'],'current snapshot binding')
 objects={i:current.object(i) for i in after}
 for i,o in objects.items():ck(identity(o)==i and set(o['dependencies'])<=after,'canonical identity/dependency '+i)
 groups={}
 for row in pub['producers']:
  name=row['producer'];ck(sha(ROOT/'knowledge/producers'/f'{name}.py')==row['source_sha256'],'published producer '+name)
  ids={identity(semantic_entry(l)) for _,l in importlib.import_module('producers.'+name).named_laws()}
  ck(len(ids)==row['entries'] and ids<=delta,'producer identity '+name);groups[name]=ids
 ck(set.union(*groups.values())==delta and sum(map(len,groups.values()))==45,'publication union')
 ck(set(pub['batch_entries'])==delta and delta<=set(pub['admission']['entries']),'publication admission binding')
 static_dir=ROOT/'knowledge/research/web-stack-proofs-19/static-derivation';w=read(static_dir/'witnesses.json');a=read(static_dir/'admission.json')
 old_shared={identity(semantic_entry(r['law'])) for r in w['shared_old']};new_static={identity(semantic_entry(r['law'])) for r in w['new_composed']};generic=groups['web_predicate19_laws']|groups['web_algebra19_laws'];fresh=generic|new_static
 ck((len(generic),len(old_shared),len(new_static))==(13,24,8) and delta==generic|old_shared|new_static,'13 generic/24 shared/8 static roles')
 ck(groups['web_static19_laws']==old_shared|new_static,'static wrapper bindings')
 ck(old_shared==set(m['shared_old_witness_ids']) and before.isdisjoint(old_shared),'effective prior shared identities')
 effective=before|old_shared;ck(len(effective)==1322 and w['effective_prior_snapshot']==m['effective_prior_snapshot'],'effective prior1322')
 for row in w['shared_old']:ck(set(row['law']['dependencies'])<=before,'old-only dependency '+row['name'])
 ck(sha(static_dir/'admission.json')==w['admission_sha256'] and a['exit_code']==0,'static admission binding')
 checks=a['individual_checks'];passed={r['content_id'] for r in checks if r['exit_code']==0};rejected={r['content_id'] for r in checks if r['exit_code']}
 ck(passed==delta and len(rejected)==a['old_rejected']==4 and a['old_candidate_count']==28,'individual admissions/false premises')
 for n,h in m['artifact_hashes'].items():ck((REPORT/n).is_file() and sha(REPORT/n)==h,'frozen artifact '+n)
 ck(sha(Path(m['compiler_path']))==m['compiler_sha256'],'frozen compiler')
 ck(sha(ROOT/'planner/ink_planner/semantic_search.py')==m['planner_policy_sha256'],'frozen planner')
 guardfile=REPORT/'policy-freeze.json'
 if not guardfile.exists():guardfile=ROOT/'reports/web-stack-proofs-18-2026-10-11/policy-freeze.json'
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
 author=ROOT/'knowledge/research/web-stack-proofs-19/predicate';e=read(author/'evidence.json')
 ck(e['producer_sha256']==sha(ROOT/'knowledge/producers/web_predicate19_laws.py') and e['test_sha256']==sha(ROOT/'knowledge/tests/test_web_predicate19_laws.py'),'author sources')
 ck(e['planner_sha256']==m['planner_policy_sha256'] and e['compiler_sha256']==m['compiler_sha256'],'author policy/compiler')
 for n,h in e['artifact_hashes'].items():ck(sha(author/n)==h,'author frozen '+n)
 for n,h in e['old_only_symmetry']['root_bindings'].items():ck(sha(ROOT/n)==h,'independent old admission '+n)
 ck(set(e['old_only_symmetry']['accepted_ids'])==old_shared and set(e['old_only_symmetry']['rejected_ids'])==rejected,'independent old-only ID results')
 observations=dict(status='pending post-timing imports',expected_prior=11106,expected_added=480)
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
   ck(variant_counts=={v:48 for v in ['ink_baseline_wasm','ink_prior_wasm','ink_checked_wasm','rust_literal_wasm','rust_expert_wasm']},'host variant/cell coverage '+host)
  ids={r['id'] for r in rows};ledger=list((ROOT/'knowledge/store/observations').glob('*.json'))
  ck(all(n==240 for n in hosts.values()) and len(ids)==len(rows)==480 and len(ledger)==11586,'final observation counts')
  ck(ids<={p.stem for p in ledger},'import presence')
  for p in ledger:
   o=read(p);Store.validate_observation(o);ck(identity(o)==p.stem and set(o['entries'])<=after,'canonical observation '+p.stem)
  with sqlite3.connect((ROOT/'knowledge/index.sqlite').as_uri()+'?mode=ro',uri=True) as db:
   cache=dict(proofs=db.execute('select count(*) from entries').fetchone()[0],members=db.execute('select count(*) from members where snapshot_id=?',(current.snapshot_id,)).fetchone()[0],observations=db.execute('select count(*) from observations').fetchone()[0])
   ck({r[0] for r in db.execute('select id from entries')}==after and {r[0] for r in db.execute('select entry_id from members where snapshot_id=?',(current.snapshot_id,))}==after,'index exact proof identities')
   ck({r[0] for r in db.execute('select id from observations')}=={p.stem for p in ledger},'index exact observation identities')
   ck(db.execute('pragma integrity_check').fetchall()==[('ok',)] and not db.execute('pragma foreign_key_check').fetchall(),'SQLite structural integrity')
  ck(cache==dict(proofs=1343,members=1343,observations=11586),'disposable index current membership/counts')
  observations=dict(status='passed' if not errors else 'issues',prior=11106,current=len(ledger),added=len(ids),hosts=hosts,index=cache,exact_archived_sample_and_host_bindings=True,imported_object_file_hashes=imported_files)
 result=dict(schema=1,status='passed' if not errors else 'issues',scope='Read-only identity, hash, membership/closure and authenticated recorded-checker receipts. No proof checking, target builds, test execution, timing or statistic recomputation.',phase='post-import final' if final else 'post-preparation',audit_helper_sha256=sha(Path(__file__)),errors=errors,catalog=dict(historical=1298,effective_prior=1322,current=1343,added=45,roles=dict(generic=13,shared_old_static=24,new_source_static=8),snapshot=current.snapshot_id),frozen_artifacts=len(m['artifact_hashes']),guarded_sources=102,guard_baseline=str(guardfile.relative_to(ROOT)),guard_baseline_sha256=sha(guardfile),selected_packages=len(plans),fresh_cpu_tasks=fresh_tasks,plans=plans,author_artifacts=len(e['artifact_hashes']),author_evidence_sha256=sha(author/'evidence.json'),observations=observations,bindings={n:sha(REPORT/n) for n in ['metadata.json','publication.json']+(['node-observations.json','browser-observations.json','node-results.json','browser-results.json','fixtures.json'] if final else [])})
 stem='catalogue-review' if final else 'catalogue-review.initial';out=REPORT/(stem+'.json');out.write_text(json.dumps(result,indent=2)+'\n');note=REPORT/(stem+'.md');note.write_text('# Round19 catalogue and proof-package integrity\n\n'+result['status'].upper()+'. '+result['scope']+'\n\nHistorical1298 is preserved; effective prior1322 includes the same24 checked old-only source compositions offered to the new catalogue. Current1343 adds13 generic laws,8 fresh source certificates and24 symmetric old-only compositions. Generic proofs and source-specific automation are counted separately.\n\n'+f"All {len(m['artifact_hashes'])} frozen artifacts,32 compact packages with minimal authenticated closures,8 fresh CPU body/proof gates and102 guarded source hashes pass. The author434-artifact archive and independently checked24 accepted/4 rejected prior-certificate IDs match root evidence.\n\n"+('The final canonical observation ledger and disposable index contain11586 observations, including480 imports (240 per web host). For every imported observation, exact sample values, memory peak, workload, program/proof plan and host/backend identity match the archived results; five Wasm variants each cover48 cells per host.\n\n' if final else 'Performance observations remain pending. This preparation audit makes no profitability claim.\n\n')+('No integrity issue found.\n' if not errors else '\n'.join('- '+x for x in errors)+'\n'))
 print(json.dumps(dict(status=result['status'],errors=errors,json_sha256=sha(out),md_sha256=sha(note)),indent=2));return not errors
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--final',action='store_true');sys.exit(0 if audit(p.parse_args().final) else 1)
