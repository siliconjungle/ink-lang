from pathlib import Path
import json,hashlib,sys,collections
B=Path(__file__).resolve().parents[3];sys.path[:0]=[str(B/'knowledge'),str(B/'planner')]
from ink_knowledge import Store,identity,canonical,semantic_entry
from producers.web_pipeline36_laws import reference_laws,named_laws,PRIOR_SNAPSHOT
R=Path(__file__).resolve().parents[1];S=R/'staging';P=R/'proofs'
rd=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
stage=rd(S/'stage.json');old=Store(B/'knowledge',snapshot=PRIOR_SNAPSHOT);prior=Store(S/'fair-prior');current=Store(S/'current');checks={}
checks['pinned_full_prior']=old.snapshot_id==prior.snapshot_id==stage['previous_snapshot']==stage['fair_prior_snapshot'] and len(old.members())==len(prior.members())==2508
checks['only_four_new_deployments']=len(current.members())==2512 and current.snapshot_id==stage['snapshot'] and not stage['shared_old_entries'] and len(stage['fresh_entries'])==4 and set(current.members())-set(old.members())==set(stage['fresh_entries'])
checks['old_objects_and_names_preserved']=set(old.members())==set(prior.members())<=set(current.members()) and all(rd(current.data/'names.json').get(n)==oid for n,oid in rd(prior.data/'names.json').items())
checks['stage_bindings']=sha(prior.data/'names.json')==stage['original_names_sha256'] and sha(current.data/'names.json')==stage['staged_names_sha256'] and sha(S/'commands.json')==stage['commands_sha256'] and sha(R/'candidate-rows.json')==stage['rows_sha256'] and all(sha(S/f)==h for f,h in stage['admission_bindings'].items())
checks['frozen_compiler']=sha(stage['compiler'])==stage['compiler_sha256']=='04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536'
admitted=set()
for c in rd(S/'commands.json'):
 assert c['exit_code']==0
 if 'knowledge-check'in c['argv']:
  view=rd(c['argv'][-1]);result=json.loads(c['stdout']);assert set(view['objects'])==set(result['entries']) and set(view['roots'])==set(stage['fresh_entries']);admitted.update(result['entries'])
checks['seven_object_u32_staged_closure']=len(admitted)==7 and len(admitted-set(stage['fresh_entries']))==3 and set(stage['fresh_entries'])<=admitted
refs={identity(semantic_entry(l)):n for n,l in reference_laws()};assert len(refs)==9 and set(refs)<=set(old.members()) and not named_laws()
producer=Store(P/'validated-store');checks['full_producer_13_distinct_from_staged_7']=len(producer.members())==13 and set(producer.members())-set(old.members())==set(stage['fresh_entries']) and set(producer.members())&set(old.members())==set(refs)
rows=rd(P/'source-witnesses.json');assert len(rows)==4
helpers=[]
def uses(v):
 out=[]
 if isinstance(v,dict):
  if 'Use'in v:out.append(v['Use']['law'])
  for x in v.values():out+=uses(x)
 if isinstance(v,list):
  for x in v:out+=uses(x)
 return out
def alpha(l):
 names={}
 def go(v):
  if isinstance(v,dict):
   if set(v)=={'Free'}:names.setdefault(v['Free'],str(len(names)));return {'Free':names[v['Free']]}
   return {k:go(v[k])for k in sorted(v)}
  if isinstance(v,list):return [go(x)for x in v]
  return v
 return canonical(go([l['from'],l['to']]))
old_pairs=[]
for oid in old.members():
 p=old.object(oid)['payload']
 if isinstance(p.get('from'),dict)and'node'in p['from']:old_pairs.extend([(oid,alpha(p)),(oid,alpha({'from':p['to'],'to':p['from']}))])
for row in rows:
 l=row['law'];defs=l['definition_context']['definitions'];assert row['id']==identity(semantic_entry(l)) and row['id']not in old.members();family=next(f for f in ['plain','nested','filtered','concat']if '_'+f+'_'in row['name'])
 assert all(identity(d['definition'])==d['sha256']for d in defs.values())
 assert all(callee in defs and defs[callee]['sha256']==h for d in defs.values()for callee,h in d['definition']['callees'].items())
 expected={'left_word','calibrate_left','reduce_word','mix_word'}
 if family=='nested':expected|={'post_word','repair_word'}
 if family=='filtered':expected|={'accepts_word','acceptance_test'}
 if family=='concat':expected|={'right_word','calibrate_right'}
 assert set(defs)==expected
 us=uses(l['proof']);assert set(us)==set(l['dependencies']) and set(us)<=set(refs) and len(us)=={'plain':1,'nested':2,'filtered':1,'concat':3}[family]
 assert all(n.endswith('_u32')for oid,n in refs.items()if oid in us)
 assert 'Induction'not in canonical(l['proof']).decode()
 for op in ['method:map','method:filter','method:concat']:assert op not in canonical(l['to']).decode()
 for helper in ['left_word','right_word','post_word','accepts_word','reduce_word']:
  if 'call:'+helper in canonical(l['from']).decode():assert 'call:'+helper in canonical(l['to']).decode()
 duplicates=[oid for oid,a in old_pairs if a==alpha(l)];assert not duplicates
 if family=='concat':
  op,args=l['to']['node']['Op'];assert op=='call:foldr'and args[0]['node']=={'Free':'xs'} and args[1]['node']['Op'][0]=='call:foldr'and args[1]['node']['Op'][1][0]['node']=={'Free':'ys'}
 helpers.append({'name':row['name'],'family':family,'helpers':sorted(defs),'old_law_uses':[refs[oid]for oid in us],'forward_reverse_alpha_source_duplicates':duplicates})
checks['all_actual_old_uses_and_contexts']=True
controls=rd(P/'helper-context-controls.json');checks['22_rehashed_helper_mutations']=controls['status']=='rejected'and len(controls['records'])==22 and all(c['correctly_rehashed_source']and c['exit_code']!=0 and 'definition context body differs: '+c['helper']in c['stderr']for c in controls['records'])
false=rd(P/'false-theorem-controls.json');checks['three_false_order_default_result']=false['status']=='rejected'and len(false['records'])==3 and all(c['content_hash_valid']and c['exit_code']!=0 for c in false['records'])and false['order_witness']['reverse']!=false['order_witness']['forward']
interp=rd(P/'interpreter.json');checks['60_scalar_replays']=interp['status']=='passed'and interp['frames']==60 and all(c['equal']for c in interp['records'])
checks['63_checks_of_old_typed_laws']=len(rd(P/'typed-old-law-checks.json')['checks'])==63
completion=rd(P/'proof-completion.json');u=rd(P/'unit-test-receipt.json');checks['five_pinned_tests_and_source_bindings']=u['passed']==5 and u['exit_code']==0 and Path(u['prior_snapshot'])==PRIOR_SNAPSHOT and '\nOK\n'in(P/'unit-tests.log').read_text()and all(sha(B/f)==h for f,h in completion['source_files'].items())
probe_folder=R/'benchmark-preparation/prior-probe-exact';probe=rd(probe_folder/'summary.json');packet=rd(probe_folder/'pipeline36_mapped_ordered_probe_u32/prior.selection.json');receipt=rd(probe_folder/'pipeline36_mapped_ordered_probe_u32/prior.selection.receipt.json');diag=next(x for x in receipt['orchestration']['selection_checks']if 'd9bc98a2cbd5ac313f91d300779d184c3eeb77f7a9f48b433f119732827ca772'in x['roots'])
checks['plain_probe_ordinary_prior_gap']=probe['prior_snapshot']==old.snapshot_id and receipt['search']['initial_cost']==receipt['search']['selected_cost']==273 and not packet['applications']and diag['exit_code']==1 and diag['stderr']=='error: unresolved function hole cannot execute\n'
roles=collections.Counter(x['role']for x in rd(R/'candidate-rows.json'));assert roles=={'source_deployment_certificate':4}
out={'status':'passed'if all(checks.values())else'failed','checks':checks,'counts':{'canonical_prior':2508,'candidate_current':2512,'new_generic_theorems':0,'new_source_deployments':4,'staged_admission_closure':7,'staged_old_u32_dependencies':3,'producer_fullview':13,'producer_reused_generic_roots':9,'source_scalar_replays':60,'old_typed_closed_checks':63,'helper_mutations':22,'false_theorems':3,'tests':5},'source_details':helpers,'prior_gap_diagnostic':diag,'generic_novelty':'None; full catalogue scout establishes old17/16/concat generic availability. Four new source-bound certificates do not create new generic mathematics.','scope':'Complete prior preserved; source endpoint alpha novelty is scoped to these exact typed helper-call forms. Pending ordinary prior misses across the four final benchmark recipes and profitability. No new core machinery, universal emitted-code proof or timing claim.','bindings':{str(p.relative_to(R)):sha(p)for p in [S/'stage.json',S/'commands.json',R/'candidate-rows.json',P/'source-witnesses.json',P/'interpreter.json',P/'helper-context-controls.json',P/'false-theorem-controls.json',P/'deployment-novelty.json',P/'unit-tests.log',P/'unit-test-receipt.json',probe_folder/'summary.json',probe_folder/'pipeline36_mapped_ordered_probe_u32/prior.selection.receipt.json']}}
assert out['status']=='passed',checks;(R/'review/proof-staging-review.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'status':out['status'],'counts':out['counts'],'checks':checks}))
