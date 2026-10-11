from pathlib import Path
import json,hashlib,sys
BASE=Path(__file__).resolve().parents[3];sys.path[:0]=[str(BASE/'knowledge')]
from ink_knowledge import Store
r=Path(__file__).resolve().parent.parent;direct='--direct'in sys.argv;st=r/('staging-direct'if direct else'staging');proof=r/('proofs-direct'if direct else'proofs');rows_path=r/('candidate-rows-direct.json'if direct else'candidate-rows.json');receipt=json.load(open(st/'stage.json'));sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
checks={}
checks['canonical_snapshot_unchanged']=Store(BASE/'knowledge').snapshot_id==receipt['previous_snapshot']
checks['canonical_names']=sha(BASE/'knowledge/store/names.json')==receipt['original_names_sha256']
checks['staged_names']=sha(st/'current/store/names.json')==receipt['staged_names_sha256']
checks['commands']=sha(st/'commands.json')==receipt['commands_sha256']
checks['all_admission_views']=all(sha(st/p)==h for p,h in receipt['admission_bindings'].items())
checks['compiler']=sha(receipt['compiler'])==receipt['compiler_sha256']
commands=json.load(open(st/'commands.json'));admitted=set()
for c in commands:
 if 'knowledge-check'in c['argv']:
  assert c['exit_code']==0
  d=json.loads(c['stdout']);v=json.load(open(c['argv'][-1]));assert set(d['entries'])==set(v['objects']);admitted.update(d['entries'])
checks['all_extension_checked']=set(receipt['fresh_entries']+receipt['shared_old_entries'])<=admitted
prior=Store(st/'fair-prior');current=Store(st/'current');old=Store(BASE/'knowledge');pn=json.load(open(prior.data/'names.json'));cn=json.load(open(current.data/'names.json'));on=json.load(open(old.data/'names.json'))
checks['all_old_objects_in_prior_and_current']=set(old.members())<=set(prior.members())<=set(current.members())
checks['all_old_names_in_prior_and_current']=all(pn.get(n)==cn.get(n)==i for n,i in on.items())
checks['prior_dependency_closed_without_fresh']=all(set(prior.object(i)['dependencies'])<=set(prior.members())for i in prior.members())
checks['no_failed_staging_commands']=all(c['exit_code']==0 for c in commands)
roles={};rows=json.load(open(rows_path));rows=rows if isinstance(rows,list)else rows['rows']
for row in rows:roles[row['role']]=roles.get(row['role'],0)+1
result=dict(status='passed'if all(checks.values())else'failed',checks=checks,counts=dict(old=len(old.members()),fair_prior=len(prior.members()),current=len(current.members()),checked_closure=len(admitted)),roles=roles,binding={str(p.relative_to(r)):sha(p)for p in [st/'stage.json',st/'commands.json',rows_path,proof/'negative-controls.json',proof/'interpreter.json',proof/'state-checks.json',proof/'projection-scope-controls.json',proof/'novelty.json']},scope='Read-only independent artifact/provenance review; kernel commands supply proof admission, finite checks corroborate. No timed performance claim.')
assert result['status']=='passed';(r/('review/proof-staging-direct-review.json'if direct else'review/proof-staging-review.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result)[:1800])
