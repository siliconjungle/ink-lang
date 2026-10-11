from pathlib import Path
import sys,json,hashlib,collections
R=Path(__file__).resolve().parents[1];B=R.parents[1];sys.path[:0]=[str(B/'knowledge'),str(B/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.web_pipeline37_laws import grouped_laws,named_laws,PRIOR_SNAPSHOT
rd=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
old=Store(B/'knowledge',snapshot=PRIOR_SNAPSHOT);P=R/'proofs';st=Store(P/'validated-store');rows=rd(R/'candidate-rows.json');supports,roots=grouped_laws();generic=named_laws();sources=rd(P/'source-witnesses.json');ids={r['id']for r in rows}
checks={'prior_full2512':len(old.members())==2512 and old.snapshot_id=='7f5e7a94b49db567af55f5d1129dd07c5e2b469ebd45cb6e5cbc53595782b2be','sixpublic_twelve_support_four_sources':len(rows)==len(st.members())==22 and len(roots)==6 and len(supports)==12 and len(sources)==4 and ids==set(st.members()),'all_objects_new':not ids&set(old.members()),'all_exact_identity_payloads':all(r['id']==identity(semantic_entry(r['law']))and st.object(r['id'])==semantic_entry(r['law'])for r in rows),'all_dependencies_internal':all(set(st.object(i)['dependencies'])<=ids for i in ids)}
def uses(v):
 if isinstance(v,dict):return ([v['Use']['law']]if'Use'in v else [])+[i for x in v.values()for i in uses(x)]
 if isinstance(v,list):return [i for x in v for i in uses(x)]
 return []
lookup={identity(semantic_entry(v)):n for n,v in generic}
for n,v in generic:
 assert set(uses(v['proof']))==set(v.get('dependencies',[]));t=n.rsplit('_',1)[1];assert t in ['u32','i32','u64'];assert v['params']['f']=={'Arrow':[{'Value':'U32'},{'Arrow':[{'Value':t.upper()},{'Value':t.upper()}]}]}
 if '_beta_'in n:assert not uses(v['proof'])
 elif '_state_'in n:assert len(uses(v['proof']))==1 and 'nat.succ'in canonical(v['proof']).decode() and 'Induction'in canonical(v['proof']).decode()
 else:assert len(uses(v['proof']))==1 and 'method:map_indexed'in canonical(v['from']).decode() and 'method:map_indexed'not in canonical(v['to']).decode() and 'method:zip'in canonical(v['to']).decode()
checks['actual_generic_dependency_nat_index_induction']=True
helper_details=[]
for row in sources:
 l=row['law'];defs=l['definition_context']['definitions'];n=row['name'];expected={'discarded_index','selected_word'}|({'index_signal','repair_word'}if'heldout'in n else set())
 assert set(defs)==expected and all(identity(d['definition'])==d['sha256']for d in defs.values()) and all(c in defs and defs[c]['sha256']==h for d in defs.values()for c,h in d['definition']['callees'].items())
 assert len(uses(l['proof']))==1 and set(uses(l['proof']))==set(l['dependencies']);dep=lookup[l['dependencies'][0]];assert ('left'if'_left_'in n else'right')in dep and dep.endswith('_u32')
 assert 'method:map_indexed'not in canonical(l['to']).decode() and 'call:discarded_index'not in canonical(l['to']).decode() and 'call:selected_word'in canonical(l['to']).decode() and 'method:zip'in canonical(l['to']).decode()
 helper_details.append({'name':n,'helpers':sorted(defs),'generic':dep})
checks['four_sourcecontexts_exact_transitive_bodies']=True
controls=rd(P/'helper-binding-controls.json');checks['twelve_rehashed_helper_changes_reject']=controls['status']=='rejected'and len(controls['records'])==12 and all(r['source_correctly_rehashed']and r['exit_code']!=0 and 'definition context body differs: '+r['helper']in r['stderr']for r in controls['records'])
false=rd(P/'false-theorem-controls.json');checks['two_false_extent_pair_order_reject']=false['status']=='rejected'and len(false['records'])==2 and all(r['content_hash_valid']and r['exit_code']!=0 for r in false['records'])
offsets=rd(P/'offset-checks.json');checks['42_nat_offset_closed_cases']=offsets['status']=='passed'and len(offsets['checks'])==42 and any(x['start_nat']==2**32-1 and min(x['lengths'])>1 for x in offsets['checks'])
sc=rd(P/'projection-scope-controls.json');checks['four_observed_closure_cases_reject']=sc['status']=='passed'and len(sc['records'])==4 and all(r['specializations']==0 for r in sc['records'])
interp=rd(P/'interpreter.json');checks['60_complete_source_replays']=interp['status']=='passed'and interp['frames']==60 and all(r['equal']for r in interp['records'])
nov=rd(P/'novelty.json');checks['full2512_forward_reverse_endpoint_novelty']=nov['status']=='passed'and nov['prior_entries']==2512 and nov['prior_semantic_pairs']==1706 and not nov['duplicates']
commands=rd(P/'test-commands.json');checks['ordinary_fullclosure_kernel_admitted']=all(c['exit_code']==0 for c in commands)and any('knowledge-check'in c['argv']and set(json.loads(c['stdout'])['entries'])==ids for c in commands)
# Optional final stage/test receipt gates, required before this audit reports passed.
u=rd(P/'unit-test-receipt.json');checks['six_pinned_tests']=u['status']=='passed'and rd(P/'proof-completion.json')['validation']['unit_tests']==6 and u['log_sha256']==sha(P/'unit-tests.log') and u['producer_sha256']==sha(B/'knowledge/producers/web_pipeline37_laws.py') and u['test_sha256']==sha(B/'knowledge/tests/test_web_pipeline37_laws.py') and u['candidate_rows_sha256']==sha(R/'candidate-rows.json') and u['exit_code']==0 and '\nOK\n'in(P/'unit-tests.log').read_text()
S=R/'staging';stage=rd(S/'stage.json');prior=Store(S/'fair-prior');current=Store(S/'current');checks['fair2512_current2534_exact_new22']=stage['status']=='checked'and prior.snapshot_id==old.snapshot_id and len(prior.members())==2512 and len(current.members())==2534 and set(current.members())-set(old.members())==ids and set(stage['fresh_entries'])==ids and not stage['shared_old_entries']
checks['old_names_preserved']=all(rd(current.data/'names.json').get(n)==h for n,h in rd(prior.data/'names.json').items())
checks['stage_bound_admission']=sha(R/'candidate-rows.json')==stage['rows_sha256']and all(sha(S/f)==h for f,h in stage['admission_bindings'].items())and sha(Path(stage['compiler']))==stage['compiler_sha256']=='04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536'
assert all(checks.values()),{k:v for k,v in checks.items()if not v}
out={'status':'passed','checks':checks,'counts':{'prior':2512,'current':2534,'new_public':6,'new_support':12,'new_source':4,'full_new_closure':22,'old_shared':0,'typed_offset_checks':42,'source_replays':60,'helper_mutations':12,'false_endpoints':2,'observed_scope_controls':4,'focused_tests':6},'helper_contexts':helper_details,'scope':'One independent indexed-map demand-erasure family U32/I32/U64; discarded callbacks total pure, U32 index wrapping and min extent retained. Concrete source deployments U32 only; no F32 or runtime/target policy claim. Proof correctness does not establish physical GPU savings or profitability.','bindings':{str(p.relative_to(B)):sha(p)for p in [Path(__file__),B/'knowledge/producers/web_pipeline37_laws.py',B/'knowledge/tests/test_web_pipeline37_laws.py',R/'candidate-rows.json',S/'stage.json',P/'unit-test-receipt.json',P/'helper-binding-controls.json',P/'false-theorem-controls.json',P/'offset-checks.json',P/'projection-scope-controls.json',P/'interpreter.json',P/'novelty.json']}};(R/'review/proof-staging-review.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'status':'passed','counts':out['counts']}))
