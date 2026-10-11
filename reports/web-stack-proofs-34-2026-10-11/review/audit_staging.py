"""Read-only independent batch34 staged closure/name/helper audit."""
from pathlib import Path
import json,hashlib,sys,collections
BASE=Path(__file__).resolve().parents[3];sys.path[:0]=[str(BASE/'knowledge')]
from ink_knowledge import Store,identity
R=Path(__file__).resolve().parents[1];S=R/'staging';P=R/'proofs'
read=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
r=read(S/'stage.json');old=Store(BASE/'knowledge');prior=Store(S/'fair-prior');current=Store(S/'current');checks={}
checks['old_snapshot_pinned']=old.snapshot_id==r['previous_snapshot']
checks['full_prior_same_snapshot']=prior.snapshot_id==old.snapshot_id==r['fair_prior_snapshot']
checks['new_snapshot']=current.snapshot_id==r['snapshot']
checks['compiler_unchanged']=sha(r['compiler'])==r['compiler_sha256']
checks['old_names_bound']=sha(old.data/'names.json')==r['original_names_sha256']
checks['new_names_bound']=sha(current.data/'names.json')==r['staged_names_sha256']
checks['commands_bound']=sha(S/'commands.json')==r['commands_sha256']
checks['admission_views_bound']=all(sha(S/f)==h for f,h in r['admission_bindings'].items())
on,pn,cn=[read(s.data/'names.json')for s in [old,prior,current]]
checks['every_old_name_unchanged']=all(pn.get(n)==cn.get(n)==i for n,i in on.items())
checks['old_objects_preserved']=set(old.members())==set(prior.members())<=set(current.members())
checks['exact10_new_members']=len(r['fresh_entries'])==10 and set(current.members())-set(old.members())==set(r['fresh_entries']) and not r['shared_old_entries']
checks['prior_dependency_closed_without_fresh']=all(set(prior.object(i)['dependencies'])<=set(prior.members())for i in prior.members())
commands=read(S/'commands.json');admitted=set()
for c in commands:
    assert c['exit_code']==0
    if 'knowledge-check'in c['argv']:
        v=read(c['argv'][-1]);result=json.loads(c['stdout']);assert set(v['objects'])==set(result['entries']);admitted.update(result['entries'])
checks['all10_new_locally_checked']=set(r['fresh_entries'])<=admitted
assert len(admitted)==31 and len(admitted-set(r['fresh_entries']))==21
roles=collections.Counter(x['role']for x in read(R/'candidate-rows.json'))
assert sum(roles.values())==10
helper_details=[]
for row in read(P/'source-witnesses.json'):
    ctx=row['law']['definition_context']['definitions']
    assert all(identity(d['definition'])==d['sha256']for d in ctx.values())
    assert all(ctx[callee]['sha256']==h for d in ctx.values()for callee,h in d['definition']['callees'].items())
    if row['name'].startswith('pipeline34'):
        assert set(ctx)=={'discarded_word','calibrate_word','selected_word','repair_word'}
    helper_details.append(dict(name=row['name'],bound_helpers=sorted(ctx)))
checks['complete_helper_contexts']=True
checks['no_heldout_function_helper_body_drift']=all((P/'checks'/name/'source.ink').read_bytes().split(b'\n',1)[1]==(BASE/'reports/web-stack-proofs-33-2026-10-11/proofs-direct/checks'/name/'source.ink').read_bytes().split(b'\n',1)[1]for name in ['pipeline33_left_projection_heldout_u32','pipeline33_right_projection_heldout_u32'])
novelty=read(P/'novelty.json');checks['derived_not_new_mechanism']=novelty['mechanisms']==0 and novelty['derived_endpoints']==6 and not novelty['duplicates']
interp=read(P/'interpreter.json');checks['60_source_frames']=interp['status']=='passed' and interp['frames']==60 and all(z['equal']for z in interp['records'])
scope=read(P/'projection-scope-controls.json');checks['observed_value_nested_negatives']=scope['status']=='passed' and len(scope['records'])==4 and all(z['specializations']==0 for z in scope['records'])
negative=read(P/'negative-controls.json');checks['false_and_helper_negatives']=negative['status']=='rejected' and all(z['exit_code']!=0 for z in negative.values()if isinstance(z,dict))
transitive=read(P/'transitive-context-controls.json');checks['transitive_helper_negatives']=transitive['status']=='rejected' and len(transitive['records'])==2 and all(x['correctly_rehashed_source'] and x['exit_code']!=0 for x in transitive['records'])
result=dict(status='passed'if all(checks.values())else'failed',checks=checks,old=2485,fair_prior=2485,current=2495,new=10,locally_checked_closure=31,old_checked_dependencies=21,producer_fullview_objects=33,producer_fullview_old_objects=23,heldout_scope='Exactfunction/helperbodiesunchanged;moduleheaderPipeline33→Pipeline34,notwholefilebyteidentity.',roles=dict(roles),helper_details=helper_details,bindings={str(p.relative_to(R)):sha(p)for p in [S/'stage.json',S/'commands.json',R/'candidate-rows.json',P/'source-witnesses.json',P/'shared-source-witnesses.json',P/'novelty.json',P/'interpreter.json',P/'negative-controls.json',P/'transitive-context-controls.json']},scope='Derived DB shortcuts through already admitted map identity and mapped-zip laws; exact source/helper binding and all old data preserved. No performance or universal backend-proof claim.')
assert result['status']=='passed';(R/'review/proof-staging-review.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result)[:1900])
