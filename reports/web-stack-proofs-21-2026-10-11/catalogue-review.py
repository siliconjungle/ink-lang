#!/usr/bin/env python3
"""Independent read-only identities/closures/receipt audit, not proof replay."""
import argparse,collections,hashlib,importlib,json,sqlite3,sys
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
 ck((len(before),len(after),len(delta))==(1372,pub['entries'],pub['added_entries']) and before<=after,'historical catalogue preservation/count')
 ck(current.snapshot_id==pub['snapshot']==m['new_snapshot'],'current snapshot binding')
 objects={i:current.object(i) for i in after}
 for i,o in objects.items():ck(identity(o)==i and set(o['dependencies'])<=after,'canonical identity/dependency '+i)
 groups={}
 for row in pub['producers']:
  name=row['producer'];ck(sha(ROOT/'knowledge/producers'/f'{name}.py')==row['source_sha256'],'published producer '+name)
  ids={identity(semantic_entry(l)) for _,l in importlib.import_module('producers.'+name).named_laws()}
  ck(len(ids)==row['entries'] and ids<=delta,'producer identity '+name);groups[name]=ids
 ck(set.union(*groups.values())==delta and sum(map(len,groups.values()))==pub['added_entries'],'publication union')
 ck(set(pub['batch_entries'])==delta and delta<=set(pub['admission']['entries']),'publication admission binding')
 static_dir=ROOT/'knowledge/research/web-stack-proofs-21/static-derivation-reviewed';w=read(static_dir/'witnesses.json');a=read(static_dir/'admission.json')
 gw=read(ROOT/'knowledge/research/web-stack-proofs-21/static-gpu/witnesses.json');ga=read(ROOT/'knowledge/research/web-stack-proofs-21/static-gpu/admission.json')
 old_shared={identity(semantic_entry(r['law'])) for r in w['shared_old']};new_static={identity(semantic_entry(r['law'])) for r in w['new_composed']+gw['new_composed']};generic=groups['web_predicate21_laws']|groups['web_structure21_laws']|groups['web_gpu21_laws'];fresh=generic|new_static
 ck(len(generic)==42 and len(new_static)==18 and delta==generic|old_shared|new_static,'21 primitive+9 composed+12 support +old shared+18 static roles')
 ck(groups['web_static21_laws']==old_shared|new_static,'static wrapper bindings')
 ck(old_shared==set(m['shared_old_witness_ids']) and before.isdisjoint(old_shared),'effective prior shared identities')
 effective=before|old_shared;ck(len(effective)==1372+len(old_shared) and w['effective_prior_snapshot']==m['effective_prior_snapshot'],'effective prior identity/count')
 for row in w['shared_old']:ck(set(row['law']['dependencies'])<=before,'old-only dependency '+row['name'])
 ck(sha(static_dir/'admission.json')==w['admission_sha256'] and a['exit_code']==0,'static admission binding')
 checks=a['individual_checks']+ga['individual_checks'];passed={r['content_id'] for r in checks if r['exit_code']==0};rejected={r['content_id'] for r in checks if r['exit_code']}
 ck(passed>=delta and set(a['retained_root_ids'])|{x['content_id'] for x in ga['individual_checks']}==delta and passed-delta==set(a['initial_endpoint_deduplicated_ids']) and len(rejected)==28+a['continuation_rejected'] and len(a['admitted_continuation_ids'])==84 and a['retained_old_count']==156,'individual admissions/false premises')
 for n,h in m['artifact_hashes'].items():ck((REPORT/n).is_file() and sha(REPORT/n)==h,'frozen artifact '+n)
 ck(ga['exit_code']==0 and gw['generic_compositions']==9 and gw['static_certificates']==6 and len(ga['individual_checks'])==15,'GPU composition admission roles')
 ck(gw['reviewed_base_sha256']==sha(static_dir/'witnesses.json') and gw['admission_sha256']==sha(ROOT/'knowledge/research/web-stack-proofs-21/static-gpu/admission.json'),'GPU composition reviewed/admission bindings')
 for i in groups['web_gpu21_laws']:ck(set(objects[i]['dependencies'])<=before|groups['web_predicate21_laws'],'GPU composed existing math authority '+i)
 ck(sha(Path(m['compiler_path']))==m['compiler_sha256'],'frozen compiler')
 ck(sha(ROOT/'planner/ink_planner/semantic_search.py')==m['planner_policy_sha256'],'frozen planner')
 guardfile=REPORT/'policy-freeze.json'
 if not guardfile.exists():guardfile=ROOT/'reports/web-stack-proofs-20-2026-10-11/policy-freeze.json'
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
 ck(len(plans)==48 and len(fresh_tasks)==12,'selection coverage')
 # Author archives have explicit distinct path namespaces; do not resolve
 # lane-relative artifacts at repository root or vice versa.
 authors={};author_count=0
 for lane in ['predicate','structure']:
  author=ROOT/'knowledge/research/web-stack-proofs-21'/lane;e=read(author/'evidence.json')
  if lane=='predicate':
   ck(e['artifact_path_namespace']=='repository-root-relative','algebra artifact namespace')
   pairs=[(ROOT/n,h) for n,h in e['artifacts'].items()]
   ck(e['compiler']['sha256']==m['compiler_sha256'] and e['cpu_policy']['sha256']==m['cost_model_sha256'],'algebra compiler/policy')
   ck(e['scope']['frames']==180 and e['scope']['actual_interpreter_runs']==360 and e['focused_tests']['tests']==4,'algebra typed scope')
  else:
   pairs=[(author/n,h) for n,h in e['artifact_hashes'].items()]+[(ROOT/n,h) for n,h in e['author_source_hashes'].items()]
   ck(e['generic_public_roots']==12 and e['beta_transport_supports']==12,'structure public/support distinction')
  for p,h in pairs:ck(p.is_file() and sha(p)==h,'author frozen '+str(p))
  author_count+=len(pairs);authors[lane]=dict(evidence_sha256=sha(author/'evidence.json'),artifacts=len(pairs))
 # Review the generalized proof structure and actual selected prior shapes.
 opt=importlib.import_module('producers.web_structure21_laws');supports,optimizations=opt.grouped_laws()
 support_ids={identity(semantic_entry(l)) for _,l in supports};opt_ids={identity(semantic_entry(l)) for _,l in optimizations}
 ck(len(support_ids)==len(opt_ids)==12 and support_ids|opt_ids==groups['web_structure21_laws'],'12 public indexed endpoints/12 transports')
 for row in w['shared_old']:
  def uses(v):
   if isinstance(v,dict):
    if 'Use' in v:ck(v['Use']['law'] in before and v['Use']['law'] in row['law']['dependencies'],'old-only inline Use '+row['name'])
    for child in v.values():uses(child)
   elif isinstance(v,list):
    for child in v:uses(child)
  uses(row['law']['proof'])
 for s in w['subjects']:
  ck(sha(Path(s['subject']))==s['sha256'],'frozen derivation subject '+s['task'])
  search=s['old_composition_search'];ck(search['max_steps']==2 and search['max_first_targets']==128 and search['expanded_first_targets']<=128,'preserved initial old composition '+s['task'])
 bounds=w['old_composition_bounds'];ck(bounds['max_total_applications']==4 and bounds['max_continuation_rounds']==2 and bounds['max_expanded_bodies_per_task']==128 and all(v<=128 for v in bounds['expanded'].values()),'four-step checked continuation bounds')
 ck(sha(Path(w['original_two_step_witnesses']))==w['original_two_step_witnesses_sha256'] and sha(Path(w['continuation_helper']))==w['continuation_helper_sha256'],'immutable continuation inputs/helper')
 reviewed=read(static_dir/'continuation-review.json');ck(reviewed['status']=='passed' and reviewed['exact_endpoint_aliases_removed']==24 and len(reviewed['allocation_free_two_fold_candidates'])==6,'old endpoint equivalence and available allocation-free targets')
 for alias in reviewed['endpoint_deduplication']:ck(alias['exact_source_equal'] and alias['exact_target_equal'] and alias['omitted_id'] in passed-delta and alias['retained_id'] in old_shared,'exact admitted endpoint deduplication')
 for path,h in reviewed['bindings'].items():ck(sha(ROOT/path)==h,'continuation bound input '+path)
 def alpha(candidate):
  names={}
  def visit(v):
   if isinstance(v,dict):
    if set(v)=={'Free'}:
     n=v['Free'];names.setdefault(n,'v'+str(len(names)));return {'Free':names[n]}
    return {k:visit(v[k]) for k in sorted(v)}
   if isinstance(v,list):return [visit(x) for x in v]
   return v
  from ink_knowledge import canonical
  return canonical(visit([candidate['from'],candidate['to'],candidate.get('conditions',[])]))
 prior_endpoints={alpha(prior.object(i)['payload']) for i in before if isinstance(prior.object(i)['payload'].get('from'),dict) and 'node' in prior.object(i)['payload']['from']}
 for i in generic:ck(alpha(objects[i]['payload']) not in prior_endpoints,'alpha endpoint novelty '+i)
 def count_ops(v,c=None):
  c=collections.Counter() if c is None else c
  if isinstance(v,dict):
   if 'Op' in v:c[v['Op'][0]]+=1
   for x in v.values():count_ops(x,c)
  elif isinstance(v,list):
   for x in v:count_ops(x,c)
  return c
 shapes={};gpu_reference=[]
 for task in m['tasks']:
  folder=REPORT/'tasks'/task;shape={}
  for variant in ['prior','checked']:
   sem=read(folder/(variant+'-selected.core.json'))['program']['functions'][0]['body']
   def ast_count(v,c=None):
    c=collections.Counter() if c is None else c
    if isinstance(v,dict):
     if 'Method' in v:c['method:'+v['Method'][1]]+=1
     if 'MethodCall' in v:c['method:'+v['MethodCall'][1]]+=1
     if 'Call' in v:c['call:'+v['Call'][0]]+=1
     for child in v.values():ast_count(child,c)
    elif isinstance(v,list):
     for child in v:ast_count(child,c)
    return c
   shape[variant]=dict(ast_count(sem))
  # Semantic operation counts from the authenticated checker-selected core are
  # preferable where the executable AST encodes methods differently.
  shapes[task]=shape
  if task.startswith('partition_dual_'):
   for variant,folds in [('prior',2),('checked',1)]:
    c=shape[variant];ck(c.get('call:foldr',0)==folds and c.get('method:filter',0)==c.get('method:map',0)==c.get('call:sum',0)==0,'allocation-free selected partition shape '+task+variant)
  oldrow=m['tasks'][task]['gpu_selections']['prior'];newrow=m['tasks'][task]['gpu_selections']['checked']
  gpu_reference.append(dict(task=task,changed=oldrow['selected_core_sha256']!=newrow['selected_core_sha256'],prior_eligible=m['gpu_manifest']['prior'][task]['timing_eligible'],current_eligible=m['gpu_manifest']['checked'][task]['timing_eligible']))
 for task in m['tasks']:
  if task.startswith('partition_dual_'):
   ck(not m['gpu_manifest']['checked'][task]['timing_eligible'],'quotient-containing mapped total must preserve frozen GPU fallback '+task)
 fixture=read(REPORT/'fixtures.json');ck((len(fixture['cases']),len(fixture['cells']),len(fixture['inputs']))==(12,72,180),'task/cell/fixture coverage')
 observations=dict(status='pending post-timing imports',expected_prior=12306,expected_added=720)
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
  ck(all(n==360 for n in hosts.values()) and len(ids)==len(rows)==720 and len(ledger)==13026,'final observation counts')
  ck(ids<={p.stem for p in ledger},'import presence')
  for p in ledger:
   o=read(p);Store.validate_observation(o);ck(identity(o)==p.stem and set(o['entries'])<=after,'canonical observation '+p.stem)
  with sqlite3.connect((ROOT/'knowledge/index.sqlite').as_uri()+'?mode=ro',uri=True) as db:
   cache=dict(proofs=db.execute('select count(*) from entries').fetchone()[0],members=db.execute('select count(*) from members where snapshot_id=?',(current.snapshot_id,)).fetchone()[0],observations=db.execute('select count(*) from observations').fetchone()[0])
   ck({r[0] for r in db.execute('select id from entries')}==after and {r[0] for r in db.execute('select entry_id from members where snapshot_id=?',(current.snapshot_id,))}==after,'index exact proof identities')
   ck({r[0] for r in db.execute('select id from observations')}=={p.stem for p in ledger},'index exact observation identities')
   ck(db.execute('pragma integrity_check').fetchall()==[('ok',)] and not db.execute('pragma foreign_key_check').fetchall(),'SQLite structural integrity')
  ck(cache==dict(proofs=len(after),members=len(after),observations=13026),'disposable index current membership/counts')
  observations=dict(status='passed' if not errors else 'issues',prior=12306,current=len(ledger),added=len(ids),hosts=hosts,index=cache,exact_archived_sample_and_host_bindings=True,imported_object_file_hashes=imported_files)
 result=dict(schema=1,status='passed' if not errors else 'issues',scope='Read-only identity, hash, membership/closure and authenticated recorded-checker receipts. No proof checking, target builds, test execution, timing or statistic recomputation.',phase='post-import final' if final else 'post-preparation',audit_helper_sha256=sha(Path(__file__)),errors=errors,catalog=dict(historical=1372,effective_prior=len(effective),current=len(after),added=len(delta),roles=dict(primitive_optimization_endpoints=21,composed_gpu_deployment_endpoints=9,index_transport_support=12,shared_old_static=len(old_shared),new_source_static=18),snapshot=current.snapshot_id),frozen_artifacts=len(m['artifact_hashes']),guarded_sources=102,guard_baseline=str(guardfile.relative_to(ROOT)),guard_baseline_sha256=sha(guardfile),selected_packages=len(plans),fresh_cpu_tasks=fresh_tasks,plans=plans,author_artifacts=author_count,authors=authors,fixture_frames=180,timed_cells=72,selected_ast_shapes=shapes,gpu_plan_changes=gpu_reference,old_composition_bounds=w['old_composition_bounds'],observations=observations,bindings={n:sha(REPORT/n) for n in ['metadata.json','publication.json']+(['node-observations.json','browser-observations.json','node-results.json','browser-results.json','fixtures.json'] if final else [])})
 stem='catalogue-review' if final else 'catalogue-review.initial';out=REPORT/(stem+'.json');out.write_text(json.dumps(result,indent=2)+'\n');note=REPORT/(stem+'.md');note.write_text('# Round21 catalogue and proof-package integrity\n\n'+result['status'].upper()+'. '+result['scope']+'\n\n'+f"Historical1372 is preserved. Effective prior{len(effective)} includes the same {len(old_shared)} checked old-only certificates offered to current{len(after)}. The {len(delta)} added entries comprise21 primitive optimization endpoints,9 composed mapped-sum deployment endpoints,12 index-transport support equalities,{len(old_shared)} symmetric old-only certificates and18 accepted new source certificates. Old certificates are not additional new mechanisms, and transport helpers have no independent profitability claim.\n\n"+f"All {len(m['artifact_hashes'])} frozen artifacts,48 compact packages with minimal authenticated closures,12 fresh CPU body/proof gates and102 guarded source hashes pass. Both author archives and exact individual admission records bind to published bytes. The72 timed cells use180 correctness fixtures.\n\n"+'The preserved initial old-only derivation uses two applications and128 first targets per subject. Independently checked continuation reaches at most four old applications, with128 expanded intermediate bodies per task; exact recorded counts and every rejection are retained. Every declared dependency and every inline proof Use belongs to the historical catalogue; ordinary Trans composes the proof terms. Selected prior/checked executable AST operation counts and each GPU body/eligibility comparison are recorded in the JSON. Residual filters or other stages must not be described as allocation-free merely because mapped arrays were removed.\n\n'+('The final canonical ledger and disposable index contain13026 observations, including720 imports (360 per web host). Exact archived samples, memory peaks, workload, program/proof plans and host/backend identity bind every imported object; five Wasm variants each cover72 cells per host.\n\n' if final else 'Performance observations remain pending. This audit makes no profitability claim.\n\n')+('No integrity issue found.\n' if not errors else '\n'.join('- '+x for x in errors)+'\n'))
 print(json.dumps(dict(status=result['status'],errors=errors,json_sha256=sha(out),md_sha256=sha(note)),indent=2));return not errors
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--final',action='store_true');sys.exit(0 if audit(p.parse_args().final) else 1)
