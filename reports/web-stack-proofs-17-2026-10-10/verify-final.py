from pathlib import Path
import hashlib,json,sqlite3
R=Path(__file__).resolve().parent;B=R.parents[1];P=B.parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda n:json.loads((R/n).read_text())
m=read('metadata.json')
for p,h in m['artifact_hashes'].items():assert sha(R/p)==h,p
assert sha(Path(m['compiler_path']))==m['compiler_sha256']
audit=read('post-freeze-audit-patch.json');assert sha(B/audit['path'])==audit['current_sha256'];assert sha(B/audit['original_archive'])==audit['original_sha256']
c=read('catalog-final-review.json');n=read('native-final-review.json');p=read('protocol-final-review.json');w=read('root-interval-verification.json');g=read('source-boundary-after.json')
assert c['status']==n['status']==w['status']==g['status']=='passed';assert not c['errors'];assert p['status']=='Final review passes'
for k,h in n['bindings'].items():assert sha(B/k)==h,k
assert g['tracked_files']==102 and g['unchanged']==101 and g['changed']==['planner/ink_planner/semantic_search.py']
for name,h in g['after'].items():assert sha(B/name)==h,name
raw=[read('node-results.json'),read('browser-results.json'),read('native/results.json')]
assert [len(d['samples']) for d in raw]==[7776,8100,6480]
assert read('native/validation.json')['exact_comparisons']==780
assert sum(d['validation']['comparisons'] for d in raw[:2])+780==6936
assert w['intervals_recomputed']==1476 and n['independently_recomputed_paired_intervals']==576
assert c['selection_packages_checked']==48 and len(c['fresh_CPU_gate_tasks'])==12
assert len(read('fresh-regressions.json')['rows'])==21
conn=sqlite3.connect('file:'+str((B/'knowledge/index.sqlite').resolve())+'?mode=ro',uri=True)
assert conn.execute('pragma integrity_check').fetchone()==('ok',)
counts={t:conn.execute('select count(*) from '+t).fetchone()[0] for t in ['entries','observations']};conn.close();assert counts==dict(entries=1247,observations=10386)
verification=dict(status='passed',catalog_entries=1247,added_entries=83,entry_roles=dict(optimization_endpoints=24,proof_support=12,static_certificates=47),snapshot=m['new_snapshot'],effective_prior=m['effective_prior_snapshot'],frozen_report_artifacts=len(m['artifact_hashes']),selection_packages=48,fresh_CPU_changed_tasks=12,timing_samples=22356,exact_benchmark_comparisons=6936,independently_recomputed_saved_intervals=2052,canonical_observations=10386,new_observations=720,sqlite_counts=counts,source_guard=dict(files=102,unchanged=101,changed=g['changed']),gpu=dict(prevalidation_requests=468,actual_fixture_calls=78,fallback_fixture_calls=390,timed_cells=36,samples=324),configured_planner_tests=16,proof_test_scopes=dict(fold=3,zip=3,sharing=3),historical_full_suite_rerun=False,broad_native_expert_superiority_established=False,failures_retained=True,no_runtime_optimizer_or_input_checks_added=True,commit_push_PR=False)
(R/'verification.json').write_text(json.dumps(verification,indent=2)+'\n')
names=['REPORT.md','verification.json','metadata.json','policy-freeze.json','post-freeze-audit-patch.json','node-results.json','browser-results.json','native/results.json','node-summary.json','browser-summary.json','native/summary.json','outcome-tables.json','fresh-regressions.json','all-expert-comparisons.json','profitability.json','backend-routing.json','root-interval-verification.json','native-final-review.json','native-final-review.md','catalog-final-review.json','catalog-final-review.md','protocol-final-review.json','protocol-final-review.md','code-shape-review.json','code-shape-review.md','source-boundary-after.json','publication.json','sharing-publication.json','browser-batches/manifest.json','browser-batches/b0/browser-results.json','browser-batches/b1/browser-results.json','browser-completed.html','browser-completed.png','parent-REPORT.md.before','parent-agent-ownership.json.before','native-storage-failure.json','post-prepare-capacity-recovery.json','summarise-outcomes-corrected.py','verify-final.py']
for name in names:assert (R/name).is_file(),name
binding=dict(status='bound',artifacts={name:sha(R/name) for name in names},parent_report_sha256=sha(P/'REPORT.md'),ownership_sha256=sha(P/'agent-ownership.json'),compiler_sha256=m['compiler_sha256'],snapshot=m['new_snapshot'],scope='Frozen measured inputs retain original hashes. Post-timing audit helper and corrected descriptive GPU orientation are separately bound; raw samples unchanged. All failures and before-bytes retained.')
(R/'final-binding.json').write_text(json.dumps(binding,indent=2)+'\n');print(json.dumps(verification))
