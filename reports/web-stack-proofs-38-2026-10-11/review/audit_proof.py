from pathlib import Path
import sys,json,hashlib,collections
R=Path(__file__).resolve().parents[1];B=R.parents[1];sys.path[:0]=[str(B/'knowledge'),str(B/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.web_pipeline38_laws import grouped_laws,named_laws,PRIOR_SNAPSHOT
rd=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
old=Store(B/'knowledge',snapshot=PRIOR_SNAPSHOT);P=R/'proofs';st=Store(P/'validated-store');rows=rd(R/'candidate-rows.json');supports,roots=grouped_laws();generic=named_laws();sources=rd(P/'source-witnesses.json');ids={r['id']for r in rows}
checks={'prior_full2534':len(old.members())==2534 and old.snapshot_id=='6df4df9aae82d58eba9eac5e8d36b41ce37147ed5d661285903745f4c136d9e3','sixpublic_six_support_four_sources':len(rows)==len(st.members())==16 and len(roots)==6 and len(supports)==6 and len(sources)==4 and ids==set(st.members()),'all_objects_new':not ids&set(old.members()),'all_exact_identity_payloads':all(r['id']==identity(semantic_entry(r['law']))and st.object(r['id'])==semantic_entry(r['law'])for r in rows),'all_dependencies_internal':all(set(st.object(i)['dependencies'])<=ids for i in ids)}
def uses(v):
 if isinstance(v,dict):return ([v['Use']['law']]if'Use'in v else [])+[i for x in v.values()for i in uses(x)]
 if isinstance(v,list):return [i for x in v for i in uses(x)]
 return []
lookup={identity(semantic_entry(v)):n for n,v in generic}
for n,v in generic:
 assert set(uses(v['proof']))==set(v.get('dependencies',[]));t=n.rsplit('_',1)[1];assert t in ['u32','i32','u64'];isort={'Arrow':[{'Value':'U32'},{'Arrow':[{'Value':t.upper()},{'Value':t.upper()}]}]};assert v['params']['f']==v['params']['g']==isort
 if '_beta_'in n:assert not uses(v['proof']) and v['params']['n']=='Nat'
 else:assert len(uses(v['proof']))==1 and 'nat.succ'in canonical(v['proof']).decode() and 'nat.word'in canonical(v['proof']).decode() and 'Induction'in canonical(v['proof']).decode()
checks['actual_generic_nat_index_induction_dependencies']=True
helper_details=[]
for row in sources:
 l=row['law'];defs=l['definition_context']['definitions'];n=row['name'];expected={'left_word','right_word','pair_word'}|({'left_signal','right_signal','pair_signal'}if'heldout'in n else set())
 assert set(defs)==expected and all(identity(d['definition'])==d['sha256']for d in defs.values()) and all(c in defs and defs[c]['sha256']==h for d in defs.values()for c,h in d['definition']['callees'].items())
 assert len(uses(l['proof']))==1 and set(uses(l['proof']))==set(l['dependencies']);dep=lookup[l['dependencies'][0]];assert ('left'if'_left_'in n else'right')in dep and dep.endswith('_u32')
 target=canonical(l['to']).decode();assert target.count('method:map_indexed')==1 and 'method:concat'not in target and 'method:zip'not in target and all('call:'+h in target for h in ['left_word','right_word','pair_word'])
 helper_details.append({'name':n,'helpers':sorted(defs),'generic':dep})
checks['four_sourcecontexts_exact_transitive_bodies']=True
controls=rd(P/'helper-binding-controls.json');checks['eighteen_rehashed_helper_changes_reject']=controls['status']=='rejected'and len(controls['records'])==18 and all(r['source_correctly_rehashed']and r['exit_code']!=0 and 'definition context body differs: '+r['helper']in r['stderr']for r in controls['records'])
false=rd(P/'false-theorem-controls.json');checks['three_false_extent_offset_pair_order_reject']=false['status']=='rejected'and len(false['records'])==3 and all(r['content_hash_valid']and r['exit_code']!=0 and r['stderr']=='error: semantic normal forms differ\n' for r in false['records'])
offsets=rd(P/'offset-checks.json');checks['42_nat_offset_closed_cases']=offsets['status']=='passed'and len(offsets['checks'])==42 and any(x['start_nat']==2**32-1 and min(x['lengths'])>1 for x in offsets['checks'])
sc=rd(P/'projection-scope-controls.json');checks['four_origin_append_cases_do_not_specialize']=sc['status']=='passed'and len(sc['records'])==4 and all(r['specializations']==0 for r in sc['records'])
interp=rd(P/'interpreter.json');checks['60_complete_source_replays']=interp['status']=='passed'and interp['frames']==60 and all(r['equal']for r in interp['records'])
nov=rd(P/'novelty.json');checks['full2534_forward_reverse_endpoint_novelty']=nov['status']=='passed'and nov['prior_entries']==2534 and nov['prior_semantic_pairs']==1728 and not nov['duplicates']
commands=rd(P/'test-commands.json');checks['ordinary_fullclosure_kernel_admitted']=all(c['exit_code']==0 for c in commands)and any('knowledge-check'in c['argv']and set(json.loads(c['stdout'])['entries'])==ids for c in commands)
# Optional final stage/test receipt gates, required before this audit reports passed.
u=rd(P/'unit-test-receipt.json');checks['six_pinned_tests']=u['status']=='passed'and rd(P/'proof-completion.json')['validation']['unit_tests']==6 and u['log_sha256']==sha(P/'unit-tests.log') and u['producer_sha256']==sha(B/'knowledge/producers/web_pipeline38_laws.py') and u['test_sha256']==sha(B/'knowledge/tests/test_web_pipeline38_laws.py') and u['candidate_rows_sha256']==sha(R/'candidate-rows.json') and u['exit_code']==0 and '\nOK\n'in(P/'unit-tests.log').read_text()
S=R/'staging';stage=rd(S/'stage.json');prior=Store(S/'fair-prior');current=Store(S/'current');checks['fair2534_current2550_exact_new16']=stage['status']=='checked'and prior.snapshot_id==old.snapshot_id and len(prior.members())==2534 and len(current.members())==2550 and set(current.members())-set(old.members())==ids and set(stage['fresh_entries'])==ids and not stage['shared_old_entries']
checks['names4281_to4297']=len(rd(prior.data/'names.json'))==4281 and len(rd(current.data/'names.json'))==4297
checks['old_names_preserved']=all(rd(current.data/'names.json').get(n)==h for n,h in rd(prior.data/'names.json').items())
checks['stage_bound_admission']=sha(R/'candidate-rows.json')==stage['rows_sha256']and all(sha(S/f)==h for f,h in stage['admission_bindings'].items())and sha(Path(stage['compiler']))==stage['compiler_sha256']=='04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536'
completion=rd(P/'proof-completion.json');checks['source_fixture_exact_bytes']=all(sha(P/f)==h for f,h in completion['source_scope']['source_file_sha256'].items())
checks['staging_commands_names_hashes']=sha(S/'commands.json')==stage['commands_sha256']and sha(prior.data/'names.json')==stage['original_names_sha256']and sha(current.data/'names.json')==stage['staged_names_sha256']
admitted=set()
for c in rd(S/'commands.json'):
 assert c['exit_code']==0
 if 'knowledge-check'in c['argv']:
  view=rd(Path(c['argv'][-1]));receipt=json.loads(c['stdout']);assert set(view['objects'])==set(receipt['entries'])and set(view['roots'])==ids;admitted.update(receipt['entries'])
checks['actual_staged16_admitted']=admitted==ids
assert all(checks.values()),{k:v for k,v in checks.items()if not v}
out={'status':'passed','checks':checks,'counts':{'prior':2534,'current':2550,'new_public':6,'new_support':6,'new_source':4,'full_new_closure':16,'old_shared':0,'prior_names':4281,'current_names':4297,'typed_offset_checks':42,'source_replays':60,'helper_mutations':18,'false_endpoints':3,'same_origin_append_scope_controls':4,'focused_tests':6},'helper_contexts':helper_details,'scope':'One same-origin padded observed indexed fusion family U32/I32/U64; both mappers and ordered pair callback total pure, wrapping U32 indexes and length(xs) retained; suffix appended only. Exact source structure is the condition, no caller check. Concrete source deployments U32 only; no F32 or runtime/target policy claim. Proof correctness does not establish physical GPU savings or profitability.','bindings':{str(p.relative_to(B)):sha(p)for p in [Path(__file__),B/'knowledge/producers/web_pipeline38_laws.py',B/'knowledge/tests/test_web_pipeline38_laws.py',R/'candidate-rows.json',S/'stage.json',P/'unit-test-receipt.json',P/'helper-binding-controls.json',P/'false-theorem-controls.json',P/'offset-checks.json',P/'projection-scope-controls.json',P/'interpreter.json',P/'novelty.json']}};(R/'review/proof-staging-review.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'status':'passed','counts':out['counts']}))
