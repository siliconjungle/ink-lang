"""Independent read-only proof/staging audit for batch35."""
from pathlib import Path
import json,hashlib,sys,collections
B=Path(__file__).resolve().parents[3];sys.path[:0]=[str(B/'knowledge'),str(B/'planner')]
from ink_knowledge import Store,identity,semantic_entry,canonical
from producers.web_pipeline35_laws import reference_laws,named_laws,PRIOR_SNAPSHOT
from producers.semantic_laws import op,lam,bound
from producers.web_pipeline32_laws import apply
from ink_planner.semantic_search import substitute
R=Path(__file__).resolve().parents[1];S=R/'staging';P=R/'proofs'
def rd(p):return json.loads(Path(p).read_text())
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
stage=rd(S/'stage.json');old=Store(B/'knowledge',snapshot=PRIOR_SNAPSHOT);prior=Store(S/'fair-prior');current=Store(S/'current');checks={}
checks['exact_prior_snapshots']=old.snapshot_id==prior.snapshot_id==stage['previous_snapshot']==stage['fair_prior_snapshot']
checks['exact_counts']=len(old.members())==len(prior.members())==2495 and len(current.members())==2508 and current.snapshot_id==stage['snapshot']
checks['no_shared_old_additions']=not stage['shared_old_entries'] and len(stage['fresh_entries'])==13 and set(current.members())-set(old.members())==set(stage['fresh_entries'])
checks['exact_old_preservation']=set(old.members())==set(prior.members())<=set(current.members())
checks['names_bound']=sha(prior.data/'names.json')==stage['original_names_sha256'] and sha(current.data/'names.json')==stage['staged_names_sha256']
checks['old_names_preserved']=all(rd(current.data/'names.json').get(n)==oid for n,oid in rd(prior.data/'names.json').items())
checks['frozen_compiler']=sha(stage['compiler'])==stage['compiler_sha256']=='04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536'
checks['all_stage_bindings']=sha(S/'commands.json')==stage['commands_sha256'] and sha(R/'candidate-rows.json')==stage['rows_sha256'] and all(sha(S/f)==h for f,h in stage['admission_bindings'].items())
commands=rd(S/'commands.json');admitted=set()
for c in commands:
 assert c['exit_code']==0
 if 'knowledge-check' in c['argv']:
  v=rd(c['argv'][-1]);result=json.loads(c['stdout']);assert set(v['objects'])==set(result['entries']);admitted.update(result['entries']);assert set(v['roots'])==set(stage['fresh_entries'])
checks['all_new_locally_checked']=set(stage['fresh_entries'])<=admitted and len(admitted)==34 and len(admitted-set(stage['fresh_entries']))==21
checks['all_old_dependencies_admitted']=all(set(prior.object(oid)['dependencies'])<=set(prior.members()) for oid in prior.members())
reference={n:v for n,v in reference_laws()};endpoints=named_laws()
for name,l in endpoints:
 typ=name.rsplit('_',1)[1];family=name.split('_')[1];s=l['from']['sort']['Value']['List'];ident=lam({'Value':s},bound({'Value':s},0));identity_law=reference['prior_identity_map_'+typ];fusion=reference['prior_independent_'+family+'_mapped_zip_postmap_'+typ]
 iid,fid=identity(semantic_entry(identity_law)),identity(semantic_entry(fusion))
 assert set(l['dependencies'])=={iid,fid} and iid in old.members() and fid in old.members()
 t=l['proof']['Trans'];assert t['middle']==op(l['from']['sort'],'method:map',l['from'],ident)
 assert t['left']['Sym']['Use']['law']==iid and t['left']['Sym']['Use']['arguments']=={'xs':l['from']}
 use=t['right']['Trans']['left']['Use'];assert use['law']==fid and use['arguments']['g']==ident and not use['premises']
 assert t['right']['Trans']['middle']==substitute(fusion['to'],use['arguments']) and t['right']['Trans']['right']=='Normalize'
 assert 'Induction' not in canonical(l['proof']).decode()
checks['actual_derived_shortcut_proofs']=len(endpoints)==9
helpers=[]
for row in rd(P/'source-witnesses.json'):
 l=row['law'];defs=l['definition_context']['definitions'];assert row['id']==identity(semantic_entry(l))
 assert all(identity(d['definition'])==d['sha256'] for d in defs.values())
 assert all(callee in defs and defs[callee]['sha256']==h for d in defs.values() for callee,h in d['definition']['callees'].items())
 assert 'method:map' not in canonical(l['to']).decode() and 'call:combine_words' in canonical(l['to']).decode()
 for h in ['left_word','right_word','post_word']:
  if 'call:'+h in canonical(l['from']).decode():assert 'call:'+h in canonical(l['to']).decode()
 expected={'combine_words','mix_words'}
 if any(f in row['name'] for f in ['_left_','_both_','_nested_']):expected|={'left_word','normalize_left'}
 if any(f in row['name'] for f in ['_right_','_both_','_nested_']):expected|={'right_word','normalize_right'}
 if '_nested_' in row['name']:expected|={'post_word','shift_word'}
 assert set(defs)==expected
 helpers.append({'name':row['name'],'bound_helpers':sorted(defs),'retained_helper_calls':True})
checks['content_bound_transitive_helpers']=len(helpers)==4
novelty=rd(P/'novelty.json');checks['alpha_forward_reverse_novelty']=novelty['prior_entries']==2495 and novelty['prior_semantic_pairs']==1689 and not novelty['duplicates'] and novelty['mechanisms']==0 and novelty['derived_endpoints']==9
interp=rd(P/'interpreter.json');checks['source_replays']=interp['status']=='passed' and interp['frames']==60 and all(x['equal']for x in interp['records'])
checks['typed_closed_checks']=len(rd(P/'typed-map-checks.json')['checks'])==63
checks['old_projection_rejections']=all(x['old_projection_specializations']==0 and x['new_fusion_specializations']==1 for x in rd(P/'observed-input-controls.json')['records'])
false=rd(P/'false-theorem-controls.json');checks['correctly_rehashed_false_negatives']=false['status']=='rejected' and len(false['records'])==3 and all(x['exit_code']!=0 and x['content_hash_valid']for x in false['records'])
mut=rd(P/'helper-context-controls.json');checks['eight_direct_transitive_negatives']=mut['status']=='rejected' and len(mut['records'])==8 and all(x['exit_code']!=0 and x['correctly_rehashed_source'] and 'definition context body differs: '+x['helper'] in x['stderr']for x in mut['records'])
completion=rd(P/'proof-completion.json');checks['producer_test_bytes_bound']=all(sha(B/f)==h for f,h in completion['source_files'].items())
u=rd(P/'unit-test-receipt.json');checks['six_tests_pass_pinned']=u['exit_code']==0 and u['passed']==6 and Path(u['prior_snapshot'])==PRIOR_SNAPSHOT and '\nOK\n' in (P/'unit-tests.log').read_text()
roles=collections.Counter(r['role']for r in rd(R/'candidate-rows.json'));assert roles==dict(derived_optimization_endpoint=9,definition_bound_source_certificate=4)
out={'status':'passed' if all(checks.values())else'failed','checks':checks,'counts':{'prior':2495,'current':2508,'new':13,'locally_checked_closure':34,'old_dependencies':21,'typed_closed_checks':63,'source_frames':60,'negative_theorems':3,'helper_mutations':8},'helpers':helpers,'roles':dict(roles),'bindings':{str(p.relative_to(R)):sha(p) for p in [S/'stage.json',S/'commands.json',R/'candidate-rows.json',P/'source-witnesses.json',P/'novelty.json',P/'interpreter.json',P/'unit-tests.log',P/'unit-test-receipt.json',P/'helper-context-controls.json',P/'false-theorem-controls.json']},'scope':'Universal typed pure function laws derived from admitted map identity and postmap fusion; exact source/calculated helper closure. No new kernel or numerical identity; no universal target correspondence or performance claim.'};assert out['status']=='passed',checks;(R/'review/proof-staging-review.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'status':out['status'],'counts':out['counts'],'checks':checks}))
