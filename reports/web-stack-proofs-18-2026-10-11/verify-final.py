"""Final identity/count integration audit; no new execution or performance trials."""
from pathlib import Path
import hashlib,json,sqlite3,sys
R=Path(__file__).resolve().parent;B=R.parents[1];P=B.parent
sys.path.insert(0,str(B/'knowledge'))
from ink_knowledge import Store
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda n:json.loads((R/n).read_text())
m=read('metadata.json')
for name,digest in m['artifact_hashes'].items():assert sha(R/name)==digest,name
assert sha(Path(m['compiler_path']))==m['compiler_sha256']
policy=read('policy-freeze.json')
for name,digest in policy['artifacts'].items():assert sha(B/name)==digest,name
initial=R/'initial-preparation';im=json.loads((initial/'metadata.json').read_text())
for name,digest in im['artifact_hashes'].items():assert sha(initial/name)==digest,'initial/'+name
assert sha(initial/'metadata.json')==read('abi-revision.json')['initial_metadata_sha256']
assert sha(initial/'policy-freeze.json')==read('abi-revision.json')['initial_policy_sha256']
reviews={n:read(n) for n in ['native-final-review.json','catalogue-review.json','protocol-final-review.json','code-shape-review.json']}
for name,d in reviews.items():
 assert d['status'] in ['passed','Final review passes'],name
 for rel,digest in d.get('bindings',{}).items():
  p=Path(rel)
  if not p.is_absolute():p=B/p if (B/p).is_file() else R/p
  assert sha(p)==digest,(name,rel)
assert reviews['protocol-final-review.json']['final_report_sha256']==sha(R/'REPORT.md')
g=read('source-boundary-after.json');assert g['tracked_files']==g['unchanged']==102 and not g['changed']
for name,digest in g['after'].items():assert sha(B/name)==digest,name
raw=[read('node-results.json'),read('browser-results.json'),read('native/results.json')]
assert [len(d['samples']) for d in raw]==[7776,9072,6480]
assert all(d['status']=='passed' for d in raw)
assert read('native/validation.json')['exact_comparisons']==780
assert sum(d['validation']['comparisons'] for d in raw[:2])+780==6936
w=read('root-interval-verification.json');n=reviews['native-final-review.json'];c=reviews['catalogue-review.json']
assert w['status']=='passed' and w['intervals_recomputed']==1728
assert n['independently_recomputed_paired_intervals']==576
assert n['calibration_trials']==3051 and n['zero_calibration_trials']==3 and n['recovery_journal_rows']==10251
assert c['selected_packages']==48 and len(c['fresh_CPU_tasks'])==12 and not c['errors']
assert len(read('fresh-regressions.json')['rows'])==4
gpu=raw[1]['gpu_validation'];assert (gpu['comparisons'],gpu['actual_gpu'],gpu['fallbacks'])==(468,312,156)
assert (w['actual_gpu_variant_cells'],w['gpu_timed_samples'],w['gpu_fallback_variant_cells'])==(144,1296,72)
st=Store(B/'knowledge');prior=Store(B/'knowledge',B/f'knowledge/store/snapshots/{m["prior_snapshot"]}.json')
assert st.snapshot_id==m['new_snapshot'] and len(st.members())==1298 and len(prior.members())==1247
assert set(prior.members())<=set(st.members()) and len(set(st.members())-set(prior.members()))==51
assert len(list((st.data/'observations').glob('*.json')))==11106
db=sqlite3.connect('file:'+str(B/'knowledge/index.sqlite')+'?mode=ro',uri=True)
assert db.execute('pragma integrity_check').fetchone()==('ok',)
counts={t:db.execute('select count(*) from '+t).fetchone()[0] for t in ['entries','members','observations']};db.close()
assert counts==dict(entries=1298,members=1298,observations=11106)
mapping=read('native-review-recovery-binding.json')
for path_key,sha_key in [('original_path','original_sha256'),('recovered_path','recovered_sha256')]:assert sha(R/mapping[path_key])==mapping[sha_key]
recovery=read('native-zero-timer-recovery.json')
assert sha(B/recovery['original_harness'])==recovery['original_sha256']
assert sha(B/recovery['recovered_harness'])==recovery['recovered_sha256']
assert sha(R/'native-timing.log')==recovery['failure_log_sha256']
verification=dict(status='passed',catalog_entries=1298,added_entries=51,entry_roles=dict(generic_optimization=11,proof_support=16,callback_premises=12,scalar_literal_instances=12),mechanisms=2,snapshot=st.snapshot_id,prior_snapshot=prior.snapshot_id,frozen_report_artifacts=len(m['artifact_hashes']),preserved_initial_artifacts=len(im['artifact_hashes']),selection_packages=48,fresh_CPU_changed_tasks=12,timing_samples=23328,exact_benchmark_comparisons=6936,independently_recomputed_saved_intervals=2304,canonical_observations=11106,new_Wasm_observations=720,sqlite_counts=counts,source_guard=dict(files=102,unchanged=102,changed=[]),gpu=dict(prevalidation_requests=468,actual_fixture_paths=312,fallback_fixture_paths=156,timed_variant_cells=144,samples=1296,prior_current_gain_loss_inconclusive=[0,1,35],newly_eligible_recipes=6),native_recovery=dict(calibration_trials=3051,zero_trials=3,journal_rows=10251,original_partial_samples_pooled=False),proof_test_scopes=dict(permutation=3,idempotence=4),semantic_negative_controls=5,full_historical_suite_rerun=False,broad_native_expert_superiority_established=False,no_runtime_optimizer_or_input_checks_added=True,no_compiler_backend_runtime_or_planner_changes=True,all_four_regressions_retained=True,commit_push_PR=False)
(R/'verification.json').write_text(json.dumps(verification,indent=2)+'\n')
names=['REPORT.md','verification.json','metadata.json','policy-freeze.json','publication.json','abi-revision.json','node-results.json','browser-results.json','native/results.json','node-summary.json','browser-summary.json','native/summary.json','outcome-tables.json','fresh-regressions.json','all-expert-comparisons.json','profitability.json','backend-routing.json','root-interval-verification.json','native-final-review.json','native-final-review.md','catalogue-review.json','catalogue-review.md','protocol-final-review.json','protocol-final-review.md','code-shape-review.json','code-shape-review.md','source-boundary-before.json','source-boundary-after.json','gpu-audit-recovered.py','gpu-audit-recovery.json','native-recover-zero-timer.py','native-zero-timer-recovery.json','native-final-review.py','native-final-review-recovered.py','native-review-recovery-binding.json','native-timing.log','native-recovery-timing.log','native/recovery-trials.jsonl','browser-batches/manifest.json','browser-batches/b0/browser-results.json','browser-batches/b1/browser-results.json','browser-completed.html','browser-completed.jpg','parent-REPORT.md.before','parent-agent-ownership.json.before','analyse.py','summarise-outcomes.py','verify-final.py']
for name in names:assert (R/name).is_file(),name
binding=dict(status='bound',artifacts={name:sha(R/name) for name in names},parent_report_sha256=sha(P/'REPORT.md'),ownership_sha256=sha(P/'agent-ownership.json'),compiler_sha256=m['compiler_sha256'],snapshot=m['new_snapshot'],scope='All frozen measured input/target hashes preserved. Explicit recovery helpers separately bound. Initial untimed ABI build and failed native timer attempt retained; final complete restart independently audited. No raw measured-row editing or omission.')
(R/'final-binding.json').write_text(json.dumps(binding,indent=2)+'\n');print(json.dumps(verification))
