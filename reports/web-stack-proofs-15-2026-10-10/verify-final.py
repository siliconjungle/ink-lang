"""Authenticate checked round15 evidence without taking new measurements."""
import json,hashlib,sys,re
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1]
sys.path.insert(0,str(ROOT/'knowledge'))
from ink_knowledge import Store
read=lambda p:json.loads(Path(p).read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def authenticate(root,hashes):
 for p,h in hashes.items():assert sha(root/p)==h,p
 return len(hashes)
pub=read(HERE/'publication.json');m=read(HERE/'metadata.json');native=read(HERE/'native/metadata.json')
assert pub['status']=='checked' and pub['added_entries']==58 and pub['entries']==1089
assert m['new_snapshot']==pub['snapshot']
assert m['prior_snapshot']==pub['previous_snapshot']
assert len(pub['admission']['entries'])==61
assert sha(m['compiler_path'])==m['compiler_sha256']=='45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08'
main_count=authenticate(HERE,m['artifact_hashes']);native_count=authenticate(HERE/'native',native['artifact_hashes'])
before=read(HERE/'source-boundary-before.json');after=read(HERE/'source-boundary-after.json');authenticate(ROOT,after)
assert [p for p in before if before[p]!=after[p]]==['planner/ink_planner/semantic_search.py']
assert len(after)==102
canonical=Store(ROOT/'knowledge');old=Store(ROOT/'knowledge',ROOT/f'knowledge/store/snapshots/{m["prior_snapshot"]}.json');prior=Store(HERE/'prior-store')
assert canonical.snapshot_id==m['new_snapshot'] and len(canonical.members())==1089 and len(old.members())==1031
assert set(old.members())<=set(prior.members())<=set(canonical.members())
assert prior.snapshot_id==m['effective_prior_snapshot'] and len(prior.members())==1057
assert set(m['shared_old_witness_ids'])==set(prior.members())-set(old.members())
spec=read(HERE/'spec.json');assert len(spec['tasks'])==18
for t in spec['tasks']:
 info=m['tasks'][t['name']]
 if t['fresh_proof_required']:assert info['checked_changes_prior'] and info['new_laws']
 for k in ['prior','checked']:
  receipt=read(HERE/'tasks'/t['name']/f'{k}-selection-check.json')
  assert receipt['snapshot_sha256']==(m['effective_prior_snapshot'] if k=='prior' else m['new_snapshot'])
  assert sorted(set(receipt['applied_laws']))==info['selections'][k]['laws']
for host in ['node','browser']:assert read(HERE/f'{host}-summary.json')['status']=='passed'
web=read(HERE/'root-interval-verification.json');nv=read(HERE/'native-verification.json');assert web['status']==nv['status']=='passed'
authors={}
for lane,filename in [('predicated','evidence.json'),('reduction','evidence.json'),('predicated','beta-helper-review-evidence.json')]:
 e=read(ROOT/f'knowledge/research/web-stack-proofs-15/{lane}/{filename}');authors[lane+'/'+filename]=authenticate(ROOT,e['artifact_hashes'])
logs=[(HERE/'planner-tests.log',5),(HERE/'beta-tests.log',3),(HERE/'store-tests.log',7),(HERE/'publisher-tests.log',3),(HERE/'performance-store-tests.log',3),(ROOT/'knowledge/research/web-stack-proofs-15/predicated/focused-policy-execution.log',4),(ROOT/'knowledge/research/web-stack-proofs-15/predicated/beta-helper-final-tests.log',3),(ROOT/'knowledge/research/web-stack-proofs-15/reduction/final-focused-tests.log',3)]
for path,n in logs:
 text=path.read_text();assert re.search(r'Ran '+str(n)+r' tests? in ',text) and text.rstrip().endswith('OK'),str(path)
imports=read(HERE/'canonical-observation-import.json');assert imports['status']=='passed' and imports['imported_observations']==1080
assert len(list((canonical.data/'observations').glob('*.json')))==7866
for r in imports['rows']:assert sha(canonical.data/'observations'/(r['id']+'.json'))==r['artifact_sha256']
assert (HERE/'browser-completed.png').stat().st_size>1000
summaries={h:read(HERE/f'{h}-summary.json') for h in ['node','browser']}
files=['REPORT.md','publication.json','publication-closure-repair.json','planner-change.json','pre-timing-freeze.json','metadata.json','source-boundary-before.json','source-boundary-after.json','node-results.json','browser-results.json','native/results.json','node-summary.json','browser-summary.json','native/summary.json','root-interval-verification.json','native-verification.json','canonical-observation-import.json','profitability.json','strong-controls.json','backend-routing.json','independent-source-review.md','independent-reduction-review.md','performance-review.md','browser-completed.png','verify-final.py','verify-native.py','analyse.py','disk-recovery.json']
result=dict(status='passed',catalogue_entries=1089,added_entries=58,general_laws=18,specialization_certificates=40,shared_prior_certificates=26,new_composed_certificates=14,snapshot=m['new_snapshot'],previous_snapshot=m['prior_snapshot'],effective_prior_snapshot=m['effective_prior_snapshot'],current_scoped_tests=sum(n for _,n in logs),full_historical_suite_rerun=False,main_frozen_artifacts=main_count,native_frozen_artifacts=native_count,author_artifacts=authors,guarded_sources=102,unchanged_guarded_sources=101,web_samples=sum(s['samples'] for s in summaries.values()),native_samples=nv['samples'],web_exact_comparisons=sum(s['validation']['comparisons'] for s in summaries.values()),native_exact_comparisons=nv['complete_validation_comparisons'],web_intervals=web['intervals_recomputed'],native_intervals=nv['independently_recomputed_paired_intervals'],gpu_samples=web['gpu_timed_samples'],gpu_variant_cells=web['actual_gpu_variant_cells'],canonical_observations=7866,added_observations=1080,caller_checks_added=False,artifact_hashes={p:sha(HERE/p) for p in files})
(HERE/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print({k:v for k,v in result.items() if k!='artifact_hashes'})
